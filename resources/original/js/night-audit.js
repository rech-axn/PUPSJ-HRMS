/* ==========================================================================
   PUPSJ Hotel & Restaurant — Night Audit System (night-audit.js)
   5-Step PMS Day Close Wizard:
   1. Pre-Audit Blocker Checks (Pending arrivals, pending departures, room readiness)
   2. Idempotent Room Folio Rate Posting
   3. Cashier & Shift Payment Reconciliation
   4. Night Audit Flash Report Generation
   5. Day Close & Business Date Advance
   ========================================================================== */
'use strict';

(function () {
  let currentStep = 1;
  let auditSummary = null;

  function init() {
    renderApp();
  }

  function getActiveBusinessDate() {
    return Data.getBusinessDate() || today();
  }

  // ─── Step 1: Blocker Diagnostics ───
  function getPreAuditDiagnostics() {
    const bDate = getActiveBusinessDate();
    const reservations = Data.getReservations();
    const rooms = Data.getRooms();
    const hk = Data.getHK();
    const maintenance = Data.getMaintenance();

    // 1. Pending Arrivals scheduled for or before today
    const pendingArrivals = reservations.filter(r =>
      (r.st === 'Confirmed' || r.st === 'Pending') && r.i <= bDate
    );

    // 2. Pending Departures (Checked-in stays with checkout date <= today)
    const pendingDepartures = reservations.filter(r =>
      r.st === 'Checked-in' && r.o <= bDate
    );

    // 3. Checked-in stays in-house tonight
    const inHouseStays = reservations.filter(r =>
      r.st === 'Checked-in' && r.i <= bDate && r.o > bDate
    );

    // 4. Dirty rooms needing turnover
    const dirtyRooms = Object.entries(hk).filter(([no, h]) => h.s === 'Dirty');

    // 5. Open Urgent maintenance
    const urgentMaintenance = maintenance.filter(m => m.status === 'Open' && m.priority === 'Urgent');

    const canProceed = true; // PMS allows audit with warnings logged

    return {
      bDate,
      pendingArrivals,
      pendingDepartures,
      inHouseStays,
      dirtyRooms,
      urgentMaintenance,
      canProceed
    };
  }

  // ─── Step 2: Idempotent Room Folio Rate Posting ───
  function previewFolioPostings() {
    const bDate = getActiveBusinessDate();
    const reservations = Data.getReservations();
    const inHouse = reservations.filter(r => r.st === 'Checked-in' && r.i <= bDate && r.o > bDate);

    return inHouse.map(r => {
      const alreadyPosted = (r.x || []).some(chg =>
        (chg.cat === 'Room' || (chg.desc && chg.desc.toLowerCase().includes('accommodation'))) &&
        chg.date === bDate
      );
      return {
        code: r.c,
        guest: r.g,
        room: r.n,
        type: r.t,
        rate: r.rt || 3200,
        alreadyPosted
      };
    });
  }

  function executeFolioPostings() {
    const bDate = getActiveBusinessDate();
    const reservations = Data.getReservations();
    let postedCount = 0;
    let totalPostedAmt = 0;

    reservations.forEach(r => {
      if (r.st === 'Checked-in' && r.i <= bDate && r.o > bDate) {
        r.x = r.x || [];
        const alreadyPosted = r.x.some(chg =>
          (chg.cat === 'Room' || (chg.desc && chg.desc.toLowerCase().includes('accommodation'))) &&
          chg.date === bDate
        );

        if (!alreadyPosted) {
          const chgId = Data.nextId('CHG-');
          const amt = Number(r.rt || 3200);
          r.x.push({
            id: chgId,
            date: bDate,
            desc: `Nightly room accommodation (${r.t} · Room ${r.n})`,
            amt: amt,
            cat: 'Room',
            source: 'Night Audit'
          });
          postedCount++;
          totalPostedAmt += amt;
        }
      }
    });

    Data.saveReservations(reservations);
    Data.audit('Night Audit Folio Posting', 'NightAudit', bDate, `Posted ${postedCount} room charges totaling ${peso(totalPostedAmt)}`);
    return { postedCount, totalPostedAmt };
  }

  // ─── Step 3: Cashier Reconciliation ───
  function getCashierReconciliation(cashCounted = 0) {
    const bDate = getActiveBusinessDate();
    const payments = store.get('payments', []);
    const reservations = Data.getReservations();
    const orders = Data.getOrders();

    // Sum all payments recorded today
    let cashExpected = 0;
    let gcashTotal = 0;
    let mayaTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;
    let totalCollections = 0;

    // A. Unified payments store if populated
    if (payments.length > 0) {
      payments.filter(p => (p.date || '').startsWith(bDate)).forEach(p => {
        const amt = Number(p.amount || 0);
        totalCollections += amt;
        const m = (p.method || '').toLowerCase();
        if (m.includes('cash')) cashExpected += amt;
        else if (m.includes('gcash')) gcashTotal += amt;
        else if (m.includes('maya')) mayaTotal += amt;
        else if (m.includes('card')) cardTotal += amt;
        else if (m.includes('bank')) bankTotal += amt;
      });
    } else {
      // Fallback: scan reservation payment logs + orders
      reservations.forEach(r => {
        (r.pay || []).filter(p => (p.d || '').startsWith(bDate)).forEach(p => {
          const amt = Number(p.a || 0);
          totalCollections += amt;
          const m = (p.m || '').toLowerCase();
          if (m.includes('cash')) cashExpected += amt;
          else if (m.includes('gcash')) gcashTotal += amt;
          else if (m.includes('maya')) mayaTotal += amt;
          else if (m.includes('card')) cardTotal += amt;
          else if (m.includes('bank')) bankTotal += amt;
        });
      });

      orders.filter(o => o.payStatus === 'Paid' && (o.created || '').startsWith(bDate)).forEach(o => {
        const amt = Number(o.subtotal || 0);
        totalCollections += amt;
        const m = (o.paymentKind || o.method || 'Cash').toLowerCase();
        if (m.includes('cash')) cashExpected += amt;
        else if (m.includes('gcash')) gcashTotal += amt;
        else if (m.includes('maya')) mayaTotal += amt;
        else if (m.includes('card')) cardTotal += amt;
        else if (m.includes('bank')) bankTotal += amt;
      });
    }

    const variance = cashCounted - cashExpected;

    return {
      bDate,
      cashExpected,
      cashCounted: Number(cashCounted),
      variance,
      gcashTotal,
      mayaTotal,
      cardTotal,
      bankTotal,
      totalCollections
    };
  }

  // ─── Step 4: Flash Audit Report Calculation ───
  function compileAuditReport(cashCounted = 0) {
    const bDate = getActiveBusinessDate();
    const rooms = Data.getRooms();
    const totalRooms = rooms.length;
    const reservations = Data.getReservations();
    const inHouse = reservations.filter(r => r.st === 'Checked-in' && r.i <= bDate && r.o > bDate);
    const occupiedRooms = inHouse.length;
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : '0.0';

    const roomRevenue = inHouse.reduce((s, r) => s + Number(r.rt || 0), 0);
    const orders = Data.getOrders().filter(o => (o.created || '').startsWith(bDate));
    const fbRevenue = orders.reduce((s, o) => s + Number(o.subtotal || 0), 0);

    const cashier = getCashierReconciliation(cashCounted);

    return {
      auditId: Data.nextId('AUD-RUN-'),
      businessDate: bDate,
      runTimestamp: nowISO(),
      auditor: (Data.getStaffSession() && Data.getStaffSession().name) || 'Night Auditor',
      metrics: {
        totalRooms,
        occupiedRooms,
        occupancyRate: Number(occupancyRate),
        roomRevenue,
        fbRevenue,
        totalRevenue: roomRevenue + fbRevenue,
        collections: cashier.totalCollections,
        cashExpected: cashier.cashExpected,
        cashCounted: cashier.cashCounted,
        variance: cashier.variance,
        inHouseCount: inHouse.reduce((s, r) => s + Number(r.gu || 1), 0)
      }
    };
  }

  // ─── Step 5: Day Close ───
  function completeDayClose(report) {
    const bDate = getActiveBusinessDate();
    const nextDate = addDays(bDate, 1);

    // 1. Save Night Audit Historical Record
    const history = store.get('nightAuditHistory', []);
    history.unshift(report);
    store.set('nightAuditHistory', history);

    // 2. Advance PMS Business Date
    Data.setBusinessDate(nextDate);

    // 3. Auto-expire past holds & no-shows
    Data.runExpiryJobs();

    // 4. Audit Log
    Data.audit('Night Audit Day Close', 'NightAudit', report.auditId, `Closed date ${bDate}. Advanced business date to ${nextDate}. Occupancy: ${report.metrics.occupancyRate}%`);

    toast(`Night Audit Day Close completed! Active business date is now ${fmtDate(nextDate)}.`, 'ok');
  }

  // ─── Render Main UI ───
  function renderApp() {
    const app = $('nightAuditApp');
    if (!app) return;

    const bDate = getActiveBusinessDate();
    const isCustomDate = !!Data.getBusinessDate();
    const history = store.get('nightAuditHistory', []);

    app.innerHTML = `
      <div class="page-head" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="site-section-tag">PMS FRONT DESK OPERATIONS</span>
            <h1 style="font-size: 28px; margin: 4px 0 0 0;">Night Audit &amp; Day Close</h1>
            <p class="text-sm" style="color: var(--ink-2); margin-top: 4px;">
              Property Management System end-of-day reconciliation, folio postings, and business date transition.
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <div class="card" style="padding: 8px 16px; display: flex; align-items: center; gap: 10px; background: var(--gold-soft); border-color: var(--gold);">
              <span class="ic" data-icon="calendar">[ICON: calendar]</span>
              <div>
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--gold-ink);">Active Business Date</div>
                <div style="font-size: 16px; font-weight: 700;">${fmtDate(bDate)}</div>
              </div>
              ${isCustomDate ? `
                <button type="button" class="btn-ghost btn-sm" id="btnResetBDate" title="Reset to device local calendar date" style="color: var(--bad); font-size: 12px; margin-left: 8px;">
                  Reset
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Stepper Wizard Navigation Header -->
      <div class="card" style="padding: 16px 24px; margin-bottom: 24px; background: var(--surface);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          ${renderStepBadge(1, 'Pre-Audit Checks', 'clipboard')}
          <div style="flex: 1; height: 2px; background: ${currentStep > 1 ? 'var(--gold)' : 'var(--line)'}; min-width: 20px;"></div>
          ${renderStepBadge(2, 'Room Rate Postings', 'bed')}
          <div style="flex: 1; height: 2px; background: ${currentStep > 2 ? 'var(--gold)' : 'var(--line)'}; min-width: 20px;"></div>
          ${renderStepBadge(3, 'Cashier Balancing', 'wallet')}
          <div style="flex: 1; height: 2px; background: ${currentStep > 3 ? 'var(--gold)' : 'var(--line)'}; min-width: 20px;"></div>
          ${renderStepBadge(4, 'Audit Flash Report', 'chart-bar')}
          <div style="flex: 1; height: 2px; background: ${currentStep > 4 ? 'var(--gold)' : 'var(--line)'}; min-width: 20px;"></div>
          ${renderStepBadge(5, 'Day Close Roll', 'check-circle')}
        </div>
      </div>

      <!-- Active Wizard Step Content -->
      <div id="nightAuditStepContent">
        ${renderCurrentStepContent()}
      </div>

      <!-- Historical Audit Runs Ledger -->
      ${renderHistorySection(history)}
    `;

    bindEvents();
  }

  function renderStepBadge(stepNum, label, icon) {
    const isPast = currentStep > stepNum;
    const isCur = currentStep === stepNum;
    const bg = isCur ? 'var(--gold)' : isPast ? 'var(--gold-soft)' : 'var(--bg)';
    const color = isCur ? '#FFFFFF' : isPast ? 'var(--gold-ink)' : 'var(--ink-3)';
    const border = isCur ? 'var(--gold)' : isPast ? 'var(--gold)' : 'var(--line)';

    return `
      <div style="display: flex; align-items: center; gap: 10px; cursor: ${isPast ? 'pointer' : 'default'};" ${isPast ? `onclick="window.goToAuditStep(${stepNum})"` : ''}>
        <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; background: ${bg}; color: ${color}; border: 2px solid ${border};">
          ${isPast ? '✓' : stepNum}
        </div>
        <div>
          <div style="font-size: 11px; color: var(--ink-3); text-transform: uppercase;">Step ${stepNum}</div>
          <div style="font-size: 13px; font-weight: ${isCur ? '700' : '500'}; color: ${isCur ? 'var(--ink)' : 'var(--ink-2)'};">${label}</div>
        </div>
      </div>
    `;
  }

  function renderCurrentStepContent() {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  }

  // ─── Render Step 1 ───
  function renderStep1() {
    const diag = getPreAuditDiagnostics();
    return `
      <div class="card" style="padding: 24px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">Step 1: Pre-Audit Blocker Checks</h2>
        <p class="text-sm text-secondary" style="margin-bottom: 20px;">
          The PMS validates room status, scheduled arrivals, and due-outs before advancing folio rates.
        </p>

        <div class="grid-3" style="gap: 16px; margin-bottom: 24px;">
          <div class="card" style="padding: 16px; border-left: 4px solid ${diag.pendingArrivals.length > 0 ? 'var(--warn)' : 'var(--ok)'};">
            <div style="font-size: 12px; color: var(--ink-3); text-transform: uppercase; font-weight: 600;">Pending Arrivals Today</div>
            <div style="font-size: 24px; font-weight: 700; margin: 4px 0;">${diag.pendingArrivals.length}</div>
            <div style="font-size: 12px; color: var(--ink-2);">
              ${diag.pendingArrivals.length === 0 ? 'All scheduled arrivals accounted for.' : 'Bookings not yet checked in.'}
            </div>
          </div>

          <div class="card" style="padding: 16px; border-left: 4px solid ${diag.pendingDepartures.length > 0 ? 'var(--warn)' : 'var(--ok)'};">
            <div style="font-size: 12px; color: var(--ink-3); text-transform: uppercase; font-weight: 600;">Due-Outs Today</div>
            <div style="font-size: 24px; font-weight: 700; margin: 4px 0;">${diag.pendingDepartures.length}</div>
            <div style="font-size: 12px; color: var(--ink-2);">
              ${diag.pendingDepartures.length === 0 ? 'All departures checked out.' : 'Guests awaiting departure folio settlement.'}
            </div>
          </div>

          <div class="card" style="padding: 16px; border-left: 4px solid var(--gold);">
            <div style="font-size: 12px; color: var(--ink-3); text-transform: uppercase; font-weight: 600;">Stays in House Tonight</div>
            <div style="font-size: 24px; font-weight: 700; margin: 4px 0;">${diag.inHouseStays.length}</div>
            <div style="font-size: 12px; color: var(--ink-2);">Eligible for nightly room rate posting.</div>
          </div>
        </div>

        ${diag.pendingArrivals.length > 0 ? `
          <div style="margin-bottom: 20px; background: var(--warn-soft); border: 1px solid var(--warn); border-radius: var(--r); padding: 16px;">
            <b style="color: var(--warn-ink); font-size: 14px;">Attention: ${diag.pendingArrivals.length} Pending Arrivals</b>
            <div style="margin-top: 8px; font-size: 13px;">
              ${diag.pendingArrivals.map(r => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                  <span><b>${r.c}</b> — ${esc(r.g)} (${esc(r.t)} · Room ${r.n})</span>
                  <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn-secondary btn-sm" onclick="window.markNoShowRes('${r.c}')">Mark No-Show</button>
                    <button type="button" class="btn btn-sm" onclick="location.href='../hotel/reservations.html?code=${r.c}'">Open Folio</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${diag.pendingDepartures.length > 0 ? `
          <div style="margin-bottom: 20px; background: var(--warn-soft); border: 1px solid var(--warn); border-radius: var(--r); padding: 16px;">
            <b style="color: var(--warn-ink); font-size: 14px;">Attention: ${diag.pendingDepartures.length} Pending Departures</b>
            <div style="margin-top: 8px; font-size: 13px;">
              ${diag.pendingDepartures.map(r => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                  <span><b>${r.c}</b> — ${esc(r.g)} (Room ${r.n})</span>
                  <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn-secondary btn-sm" onclick="window.extendStayOneNight('${r.c}')">Extend +1 Night</button>
                    <button type="button" class="btn btn-sm" onclick="location.href='../hotel/payments.html?code=${r.c}'">Settle &amp; Check Out</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line);">
          <button type="button" class="btn" style="min-width: 180px;" onclick="window.goToAuditStep(2)">
            Proceed to Rate Postings &rarr;
          </button>
        </div>
      </div>
    `;
  }

  // ─── Render Step 2 ───
  function renderStep2() {
    const postings = previewFolioPostings();
    const unposted = postings.filter(p => !p.alreadyPosted);
    const totalDue = unposted.reduce((s, p) => s + p.rate, 0);

    return `
      <div class="card" style="padding: 24px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">Step 2: Idempotent Folio Room Rate Posting</h2>
        <p class="text-sm text-secondary" style="margin-bottom: 20px;">
          Automatically post nightly room charges to guest folios for all checked-in rooms. Idempotency guarantees no double-charging.
        </p>

        <div class="table-wrap" style="margin-bottom: 20px;">
          <table>
            <thead>
              <tr>
                <th>Booking Code</th>
                <th>Guest Name</th>
                <th>Room</th>
                <th>Room Type</th>
                <th>Nightly Rate</th>
                <th>Audit Posting Status</th>
              </tr>
            </thead>
            <tbody>
              ${postings.map(p => `
                <tr>
                  <td><b>${p.code}</b></td>
                  <td>${esc(p.guest)}</td>
                  <td><b>Room ${p.room}</b></td>
                  <td>${esc(p.type)}</td>
                  <td><b>${peso(p.rate)}</b></td>
                  <td>
                    ${p.alreadyPosted ? `
                      <span class="pill pill--ok">✓ Already Posted for Tonight</span>
                    ` : `
                      <span class="pill pill--warn">Pending Audit Charge</span>
                    `}
                  </td>
                </tr>
              `).join('')}
              ${postings.length === 0 ? `
                <tr>
                  <td colspan="6" class="text-center text-muted" style="padding: 32px;">
                    No checked-in stays currently in-house.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div style="background: var(--bg); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; color: var(--ink-2);">Unposted Charges to Apply:</div>
            <b style="font-size: 18px; color: var(--gold-ink);">${unposted.length} stay(s) &bull; ${peso(totalDue)}</b>
          </div>
          ${unposted.length > 0 ? `
            <button type="button" class="btn" id="btnExecutePostings">
              Post Charges Now
            </button>
          ` : `
            <span class="pill pill--ok" style="font-size: 13px;">✓ All Stays Up to Date</span>
          `}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--line);">
          <button type="button" class="btn-secondary" onclick="window.goToAuditStep(1)">&larr; Back to Step 1</button>
          <button type="button" class="btn" style="min-width: 180px;" onclick="window.goToAuditStep(3)">
            Proceed to Cashier Balancing &rarr;
          </button>
        </div>
      </div>
    `;
  }

  // ─── Render Step 3 ───
  function renderStep3() {
    const cashInput = window.__auditCashCounted || 0;
    const rec = getCashierReconciliation(cashInput);

    return `
      <div class="card" style="padding: 24px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">Step 3: Cashier &amp; Shift Payment Reconciliation</h2>
        <p class="text-sm text-secondary" style="margin-bottom: 20px;">
          Reconcile physical cash counted in the drawer against system collections. Enter your physical cash count.
        </p>

        <div class="grid-2" style="gap: 24px; margin-bottom: 24px;">
          <!-- Cash Drawer Input -->
          <div class="card" style="padding: 20px; background: var(--surface-2);">
            <h3 style="font-size: 16px; margin-bottom: 12px;">Physical Cash Count</h3>
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="cashCountedInput">Physical Cash in Drawer (₱):</label>
              <input type="number" id="cashCountedInput" class="input" style="font-size: 18px; font-weight: 700;" value="${cashInput}" min="0" step="1">
            </div>

            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--line); font-size: 14px;">
              <span>System Expected Cash:</span>
              <b>${peso(rec.cashExpected)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--line); font-size: 14px;">
              <span>Physical Counted:</span>
              <b id="displayCounted">${peso(rec.cashCounted)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px;">
              <span>Over / Short Discrepancy:</span>
              <b style="color: ${rec.variance === 0 ? 'var(--ok)' : rec.variance > 0 ? 'var(--gold-ink)' : 'var(--bad)'};" id="displayVariance">
                ${peso(rec.variance)} ${rec.variance === 0 ? '(Balanced)' : rec.variance > 0 ? '(Over)' : '(Short)'}
              </b>
            </div>
          </div>

          <!-- Digital & Other Methods -->
          <div class="card" style="padding: 20px; background: var(--surface-2);">
            <h3 style="font-size: 16px; margin-bottom: 12px;">Electronic Settlements Today</h3>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                <span>GCash Settlements:</span>
                <b>${peso(rec.gcashTotal)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                <span>Maya Settlements:</span>
                <b>${peso(rec.mayaTotal)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                <span>Credit &amp; Debit Cards:</span>
                <b>${peso(rec.cardTotal)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--line);">
                <span>Bank Transfers:</span>
                <b>${peso(rec.bankTotal)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; border-top: 2px solid var(--line); margin-top: 6px;">
                <span>Total Collections Today:</span>
                <b style="color: var(--gold-ink);">${peso(rec.totalCollections)}</b>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--line);">
          <button type="button" class="btn-secondary" onclick="window.goToAuditStep(2)">&larr; Back to Step 2</button>
          <button type="button" class="btn" style="min-width: 180px;" onclick="window.goToAuditStep(4)">
            Generate Flash Report &rarr;
          </button>
        </div>
      </div>
    `;
  }

  // ─── Render Step 4 ───
  function renderStep4() {
    const cashCount = window.__auditCashCounted || 0;
    auditSummary = compileAuditReport(cashCount);
    const m = auditSummary.metrics;

    return `
      <div class="card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="site-section-tag">BIR &amp; PMS AUDIT TRAIL</span>
            <h2 style="font-size: 22px; margin: 4px 0 0 0;">Step 4: Daily Flash Audit Report</h2>
            <div class="text-sm" style="color: var(--ink-2); margin-top: 2px;">
              Report ID: <b>${auditSummary.auditId}</b> &bull; Business Date: <b>${fmtDate(auditSummary.businessDate)}</b>
            </div>
          </div>
          <button type="button" class="btn-secondary" onclick="window.print()">
            <span class="ic" data-icon="printer">[ICON: printer]</span> Print Flash Report
          </button>
        </div>

        <!-- Printable Flash Report Card -->
        <div class="card folio-receipt-card" style="padding: 24px; margin-bottom: 24px; background: #FFFDF9; border: 1px solid var(--gold);">
          <div style="text-align: center; border-bottom: 2px solid var(--gold); padding-bottom: 16px; margin-bottom: 20px;">
            <h3 style="font-size: 20px; margin: 0;">${CONFIG.hotelName}</h3>
            <div style="font-size: 13px; color: var(--ink-2); margin-top: 4px;">DAILY NIGHT AUDIT FLASH SUMMARY</div>
            <div style="font-size: 12px; color: var(--ink-3); margin-top: 2px;">San Juan City, Metro Manila &bull; TIN ${CONFIG.legal.tin}</div>
          </div>

          <div class="grid-3" style="gap: 16px; margin-bottom: 20px;">
            <div class="card" style="padding: 12px; background: var(--surface);">
              <div style="font-size: 11px; color: var(--ink-3); text-transform: uppercase;">Occupancy Rate</div>
              <div style="font-size: 20px; font-weight: 700; color: var(--gold-ink);">${m.occupancyRate}%</div>
              <div style="font-size: 11px; color: var(--ink-2);">${m.occupiedRooms} / ${m.totalRooms} Rooms</div>
            </div>
            <div class="card" style="padding: 12px; background: var(--surface);">
              <div style="font-size: 11px; color: var(--ink-3); text-transform: uppercase;">Room Accommodation Revenue</div>
              <div style="font-size: 20px; font-weight: 700;">${peso(m.roomRevenue)}</div>
              <div style="font-size: 11px; color: var(--ink-2);">${m.inHouseCount} Guest(s) in house</div>
            </div>
            <div class="card" style="padding: 12px; background: var(--surface);">
              <div style="font-size: 11px; color: var(--ink-3); text-transform: uppercase;">F&amp;B Restaurant Revenue</div>
              <div style="font-size: 20px; font-weight: 700;">${peso(m.fbRevenue)}</div>
              <div style="font-size: 11px; color: var(--ink-2);">Dining &amp; In-room dining</div>
            </div>
          </div>

          <div style="border-top: 1px solid var(--line); padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span>Total Recognized Revenue:</span>
              <b>${peso(m.totalRevenue)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span>Total Cash &amp; Digital Collections:</span>
              <b>${peso(m.collections)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span>Cashier Variance:</span>
              <b style="color: ${m.variance === 0 ? 'var(--ok)' : 'var(--warn)'};">${peso(m.variance)}</b>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--line);">
          <button type="button" class="btn-secondary" onclick="window.goToAuditStep(3)">&larr; Back to Step 3</button>
          <button type="button" class="btn" style="min-width: 180px;" onclick="window.goToAuditStep(5)">
            Proceed to Day Close &rarr;
          </button>
        </div>
      </div>
    `;
  }

  // ─── Render Step 5 ───
  function renderStep5() {
    const bDate = getActiveBusinessDate();
    const nextDate = addDays(bDate, 1);

    return `
      <div class="card" style="padding: 24px; text-align: center; max-width: 680px; margin: 0 auto;">
        <div style="font-size: 14px; font-weight: 600; color: var(--gold-ink); margin-bottom: 12px;">[PLACEHOLDER: Night Moon Icon - Insert day close crescent moon SVG here]</div>
        <h2 style="font-size: 24px; margin-bottom: 8px;">Step 5: Execute Day Close &amp; Date Advance</h2>
        <p class="text-sm text-secondary" style="margin-bottom: 24px;">
          You are about to close business operations for <b>${fmtDate(bDate)}</b>. The system will advance the official Property Management System calendar date to <b>${fmtDate(nextDate)}</b>.
        </p>

        <div class="card" style="padding: 16px; background: var(--surface-2); margin-bottom: 24px; text-align: left;">
          <div style="font-weight: 700; margin-bottom: 8px;">Automated Actions Upon Confirmation:</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--ink-2); display: flex; flex-direction: column; gap: 6px;">
            <li>Record final immutable Night Audit Record (<code>${auditSummary ? auditSummary.auditId : 'AUD-RUN-1001'}</code>).</li>
            <li>Advance PMS business date forward to <b>${fmtDate(nextDate)}</b>.</li>
            <li>Release any expired reservation holds and execute auto-no-show checks.</li>
            <li>Log timestamped system transaction to immutable Security Audit Log.</li>
          </ul>
        </div>

        <div style="display: flex; justify-content: center; gap: 12px;">
          <button type="button" class="btn-secondary" onclick="window.goToAuditStep(4)">&larr; Review Report</button>
          <button type="button" class="btn" style="min-width: 200px; height: 42px; font-size: 15px;" id="btnConfirmDayClose">
            ✓ Complete Day Close
          </button>
        </div>
      </div>
    `;
  }

  // ─── Historical Runs Section ───
  function renderHistorySection(history) {
    if (!history || history.length === 0) return '';
    return `
      <div class="card" style="padding: 24px; margin-top: 32px;">
        <h3 style="font-size: 18px; margin-bottom: 16px;">Historical Night Audit Records</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Audit Run ID</th>
                <th>Business Date</th>
                <th>Timestamp</th>
                <th>Auditor</th>
                <th>Occupancy</th>
                <th>Room Revenue</th>
                <th>Collections</th>
                <th>Cash Variance</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(h => `
                <tr>
                  <td><b>${h.auditId}</b></td>
                  <td>${fmtDate(h.businessDate)}</td>
                  <td>${h.runTimestamp}</td>
                  <td>${esc(h.auditor)}</td>
                  <td><span class="pill pill--gold">${h.metrics.occupancyRate}%</span></td>
                  <td>${peso(h.metrics.roomRevenue)}</td>
                  <td>${peso(h.metrics.collections)}</td>
                  <td>
                    <span class="pill ${h.metrics.variance === 0 ? 'pill--ok' : 'pill--warn'}">
                      ${peso(h.metrics.variance)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── Event Handlers ───
  function bindEvents() {
    window.goToAuditStep = function (step) {
      currentStep = step;
      renderApp();
    };

    const resetBtn = $('btnResetBDate');
    if (resetBtn) {
      resetBtn.onclick = () => {
        Data.resetBusinessDate();
        toast('PMS business date reset to current local calendar date.', 'info');
        renderApp();
      };
    }

    const postBtn = $('btnExecutePostings');
    if (postBtn) {
      postBtn.onclick = () => {
        const res = executeFolioPostings();
        toast(`Successfully posted ${res.postedCount} room charges (${peso(res.totalPostedAmt)}).`, 'ok');
        renderApp();
      };
    }

    const cashInput = $('cashCountedInput');
    if (cashInput) {
      cashInput.oninput = () => {
        const val = Number(cashInput.value) || 0;
        window.__auditCashCounted = val;
        const rec = getCashierReconciliation(val);
        const dispCount = $('displayCounted');
        const dispVar = $('displayVariance');
        if (dispCount) dispCount.textContent = peso(rec.cashCounted);
        if (dispVar) {
          dispVar.textContent = `${peso(rec.variance)} ${rec.variance === 0 ? '(Balanced)' : rec.variance > 0 ? '(Over)' : '(Short)'}`;
          dispVar.style.color = rec.variance === 0 ? 'var(--ok)' : rec.variance > 0 ? 'var(--gold-ink)' : 'var(--bad)';
        }
      };
    }

    const confirmBtn = $('btnConfirmDayClose');
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const ok = await confirmDialog('Are you sure you want to finalize Day Close and advance the PMS date?', 'Execute Day Close');
        if (!ok) return;

        if (!auditSummary) {
          auditSummary = compileAuditReport(window.__auditCashCounted || 0);
        }
        completeDayClose(auditSummary);
        currentStep = 1;
        renderApp();
      };
    }
  }

  // Helper actions for Step 1
  window.markNoShowRes = async function (code) {
    const ok = await confirmDialog(`Mark reservation ${code} as No-Show? First night room rate will be retained per policy.`, 'Mark No-Show', { danger: true });
    if (!ok) return;
    const reservations = Data.getReservations();
    const r = reservations.find(x => x.c === code);
    if (r) {
      r.st = 'No-show';
      Data.saveReservations(reservations);
      Data.audit('Reservation No-Show', 'Reservation', code, 'Marked No-Show during Night Audit');
      toast(`Reservation ${code} marked No-show.`, 'warn');
      renderApp();
    }
  };

  window.extendStayOneNight = async function (code) {
    const reservations = Data.getReservations();
    const r = reservations.find(x => x.c === code);
    if (r) {
      const oldOut = r.o;
      r.o = addDays(r.o, 1);
      Data.saveReservations(reservations);
      Data.audit('Extend Stay', 'Reservation', code, `Departure date extended from ${oldOut} to ${r.o}`);
      toast(`Stay ${code} extended by 1 night until ${fmtDate(r.o)}.`, 'ok');
      renderApp();
    }
  };

  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  let initialized = false;
  function safeInit() {
    if (initialized) return;
    initialized = true;
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();
