/* ==========================================================================
   PUPSJ Hotel & Restaurant — Guest Portal Logic (guest-portal.js)
   Full guest self-service: Current stay management, folio, in-room dining,
   housekeeping/maintenance requests, reservations, reviews, loyalty, and messaging.
   ========================================================================== */
'use strict';

(function () {
  const T = today();
  let guestSession = Data.getGuestSession();

  const urlParams = new URLSearchParams(window.location.search);
  const queryCode = urlParams.get('code');

  // Strict session check: redirect to login with ?next= set
  if (!guestSession) {
    const returnTarget = window.location.pathname + window.location.search;
    if (queryCode) {
      window.location.replace(`../auth/login.html?code=${encodeURIComponent(queryCode)}&next=${encodeURIComponent(returnTarget)}`);
    } else {
      window.location.replace(`../auth/login.html?next=${encodeURIComponent(returnTarget)}`);
    }
    return;
  }

  
  // ─── Tab: My Table Reservations ───
  function renderTableReservations() {
    const container = $('tabTableReservations');
    if (!container) return;

    const allTables = store.get('tableReservations', []);
    const myName = (guestSession.name || '').toLowerCase();
    const myPhone = guestSession.phone || '';
    const myEmail = (guestSession.email || '').toLowerCase();

    const myBookings = allTables.filter(t => {
      const g = (t.guestName || t.name || '').toLowerCase();
      const ph = t.phone || '';
      const em = (t.email || '').toLowerCase();
      return (myName && g.includes(myName)) || (myPhone && ph === myPhone) || (myEmail && em === myEmail);
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0 0 4px 0;">Restaurant Table Reservations</h2>
          <p class="text-sm text-secondary" style="margin: 0;">View your dining reservations at PUPSJ Restaurant &amp; Lounge.</p>
        </div>
        <a href="../main/menu.html#reserve-table" class="btn btn-sm">
          <span class="ic" data-icon="plus">[ICON: plus]</span> Reserve a Table
        </a>
      </div>

      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Dining Date &amp; Time</th>
                <th>Area / Table</th>
                <th>Party Size</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${myBookings.map(b => `
                <tr>
                  <td><b>${esc(b.code || b.id || 'TRS-1001')}</b></td>
                  <td>${fmtDate(b.date)} at <b>${esc(b.time)}</b></td>
                  <td>${esc(b.area || 'Main Dining')} ${b.table ? '(Table ' + b.table + ')' : ''}</td>
                  <td>${b.partySize || b.guests || 2} guest(s)</td>
                  <td>
                    <span class="pill ${b.status === 'Confirmed' ? 'pill--ok' : b.status === 'Cancelled' ? 'pill--bad' : 'pill--info'}">
                      ${esc(b.status || 'Confirmed')}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${b.status === 'Confirmed' ? `
                      <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="cancelTableBooking('${b.code || b.id}')">
                        Cancel
                      </button>
                    ` : '<span class="text-xs text-muted">—</span>'}
                  </td>
                </tr>
              `).join('')}
              ${myBookings.length === 0 ? `
                <tr>
                  <td colspan="6" class="text-center text-muted" style="padding: 32px;">
                    No dining reservations found. Enjoy breakfast, lunch, or dinner at PUPSJ Restaurant.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.cancelTableBooking = async function (code) {
    const ok = await confirmDialog(`Are you sure you want to cancel table reservation ${code}?`, 'Cancel Table Reservation', { danger: true });
    if (!ok) return;

    const allTables = store.get('tableReservations', []);
    const b = allTables.find(t => (t.code || t.id) === code);
    if (b) {
      b.status = 'Cancelled';
      store.set('tableReservations', allTables);
      Data.audit('Cancel Table Reservation', 'Table', code, 'Cancelled by guest');
      toast(`Reservation ${code} cancelled.`, 'info');
      renderTableReservations();
    }
  };

  // ─── Tab: My Orders (POS & In-Room) ───
  function renderDiningOrders() {
    const container = $('tabDiningOrders');
    if (!container) return;

    const allOrders = Data.getOrders();
    const activeRes = getActiveReservation();
    const roomTarget = activeRes ? `Room ${activeRes.n}` : null;

    const myOrders = allOrders.filter(o => {
      if (roomTarget && o.target === roomTarget) return true;
      if (activeRes && o.resCode === activeRes.c) return true;
      return false;
    });

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0 0 4px 0;">In-Room Dining &amp; Orders</h2>
          <p class="text-sm text-secondary" style="margin: 0;">Review your in-room dining orders, billed items, and payment status.</p>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${myOrders.map(o => {
          const isSettled = o.payStatus === 'Paid' || o.payStatus === 'Room folio' || o.status === 'Paid' || o.status === 'Charged to room';
          const payLabel = (o.payStatus === 'Room folio' || o.status === 'Charged to room') ? 'Room Folio' : (isSettled ? 'Paid' : (o.payStatus || 'Unpaid'));

          return `
            <div class="card" style="padding: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--gold-ink); font-weight: 600;">${esc(o.type || o.source || 'In-room Dining')}</div>
                  <h3 style="margin: 2px 0 0 0; font-size: 18px;">Order ${esc(o.code)}</h3>
                  <div class="text-xs text-muted" style="margin-top: 2px;">Placed at ${esc(o.time || '12:00')} &middot; Destination: <b>${esc(o.target)}</b></div>
                </div>
                <div style="text-align: right;">
                  <span class="pill ${isSettled ? 'pill--ok' : 'pill--warn'}">
                    ${esc(payLabel)}
                  </span>
                  <div style="font-weight: 600; font-size: 15px; margin-top: 4px;">${peso(o.subtotal || o.total)}</div>
                </div>
              </div>

              <!-- Order Billing & Status Summary -->
              <div style="background: var(--surface-2); border-radius: 4px; padding: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 13px;">
                  <span class="text-secondary">Billing Status:</span> <b>${esc(payLabel)}</b>
                  ${o.paymentKind ? `<span class="text-muted" style="margin-left: 8px;">(${esc(o.paymentKind)})</span>` : ''}
                </div>
                <div class="text-xs font-semibold" style="color: ${isSettled ? 'var(--ok)' : 'var(--warn)'};">
                  ${isSettled ? '✓ Fully Settled' : '● Awaiting Settlement'}
                </div>
              </div>

              <!-- Ordered Dishes -->
              <div style="font-size: 13px;">
                <b style="font-size: 12px; text-transform: uppercase; color: var(--text-secondary);">Items Ordered:</b>
                <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                  ${(o.lines || o.items || []).map(item => `
                    <div style="display: flex; justify-content: space-between;">
                      <span>${item.qty}x ${esc(item.name)}</span>
                      <span>${peso(item.unitPrice ? item.unitPrice * item.qty : item.price * item.qty)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        ${myOrders.length === 0 ? `
          <div class="card" style="padding: 40px; text-align: center;">
            <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Dining Tray Icon - Insert dining cloche / plate illustration here]</div>
            <h3>No Active Dining Orders</h3>
            <p class="text-sm text-secondary">You haven't ordered room service or dining for this stay yet.</p>
            ${activeRes ? `
              <button class="btn btn-sm" onclick="switchTab('stay'); setTimeout(() => $('btnGpOrderDining')?.click(), 200);">
                Order In-Room Dining &rarr;
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── Tab: Service Requests ───
  function renderServiceRequests() {
    const container = $('tabServiceRequests');
    if (!container) return;

    const activeRes = getActiveReservation();
    const roomNum = activeRes ? Number(activeRes.n) : 0;

    const allHk = Data.getHKRequests ? Data.getHKRequests() : store.get('hkRequests', []);
    const allMx = Data.getMaintenance();

    const myHk = allHk.filter(r => roomNum && Number(r.room || r.n) === roomNum);
    const myMx = allMx.filter(m => roomNum && Number(m.room) === roomNum);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; margin: 0 0 4px 0;">Guest Service Requests</h2>
          <p class="text-sm text-secondary" style="margin: 0;">Track housekeeping amenities and facilities maintenance for your room.</p>
        </div>
        ${activeRes ? `
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" onclick="switchTab('stay'); setTimeout(() => $('btnGpHousekeeping')?.click(), 200);">
              <span class="ic" data-icon="plus">[ICON: plus]</span> Housekeeping Request
            </button>
            <button class="btn-secondary btn-sm" onclick="switchTab('stay'); setTimeout(() => $('btnGpMaintenance')?.click(), 200);">
              <span class="ic" data-icon="wrench">[ICON: wrench]</span> Report Issue
            </button>
          </div>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Housekeeping Requests -->
        <div class="card" style="padding: 20px;">
          <h3 style="font-size: 18px; margin: 0 0 12px 0;">Housekeeping Requests</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${myHk.map(req => `
              <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 12px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <b>${esc(req.item || req.service)}</b>
                  <span class="pill ${req.status === 'Done' || req.status === 'Delivered' ? 'pill--ok' : 'pill--warn'}">${esc(req.status || 'Pending')}</span>
                </div>
                <div class="text-xs text-muted" style="margin-top: 4px;">${esc(req.notes || 'No special instructions')}</div>
                <div class="text-xs text-secondary" style="margin-top: 4px;">Created: ${fmtDate(req.created || today())}</div>
              </div>
            `).join('')}
            ${myHk.length === 0 ? '<p class="text-xs text-muted">No housekeeping requests submitted for this stay.</p>' : ''}
          </div>
        </div>

        <!-- Maintenance Requests -->
        <div class="card" style="padding: 20px;">
          <h3 style="font-size: 18px; margin: 0 0 12px 0;">Facilities &amp; Maintenance Reports</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${myMx.map(wo => `
              <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 12px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <b>${esc(wo.title || wo.issue)}</b>
                  <span class="pill ${wo.status === 'Resolved' ? 'pill--ok' : 'pill--warn'}">${esc(wo.status || 'Open')}</span>
                </div>
                <div class="text-xs text-muted" style="margin-top: 4px;">Priority: <b>${esc(wo.priority || 'Medium')}</b></div>
                <div class="text-xs text-secondary" style="margin-top: 4px;">Ref: ${esc(wo.id)} &middot; Reported: ${fmtDate(wo.reportedDate || today())}</div>
              </div>
            `).join('')}
            ${myMx.length === 0 ? '<p class="text-xs text-muted">No maintenance work orders reported for this stay.</p>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Header Info ───
  if ($('gpWelcomeTitle')) {
    $('gpWelcomeTitle').textContent = `Welcome, ${esc(guestSession.name)}`;
  }

  const guestNights = Data.getGuestNights(guestSession.name);
  const guestTier = Data.getGuestTier(guestNights);

  if ($('gpGuestMeta')) {
    $('gpGuestMeta').innerHTML = `
      <span>${esc(guestSession.email || guestSession.phone || 'Guest Member')}</span> &middot;
      <span class="pill pill--ok" style="font-size: 11px;">${esc(guestTier.name)} Tier (${guestNights} Nights)</span>
    `;
  }

  if ($('gpHeaderActions')) {
    $('gpHeaderActions').innerHTML = `
      <a href="../rooms/rooms-deals.html" class="btn-secondary btn-sm">
        + Book Another Room
      </a>
    `;
  }

  // ─── Tab Switching ───
  const tabBtns = $$('#gpTabs .tab-btn');
  const tabContents = {
    stay: $('tabCurrentStay'),
    reservations: $('tabMyReservations'),
    loyalty: $('tabLoyaltyRewards'),
    messages: $('tabMessages'),
    profile: $('tabProfile')
  };

  const initialTab = urlParams.get('tab') || (location.hash ? location.hash.replace('#', '') : 'stay');
  let activeTabKey = tabContents[initialTab] ? initialTab : 'stay';

  function switchTab(tabKey) {
    activeTabKey = tabKey;
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });
    Object.entries(tabContents).forEach(([k, el]) => {
      if (el) el.style.display = k === tabKey ? 'block' : 'none';
    });

    if (tabKey === 'stay') renderCurrentStay();
    else if (tabKey === 'reservations') renderMyReservations();
    else if (tabKey === 'loyalty') renderLoyalty();
    else if (tabKey === 'messages') renderMessages();
    else if (tabKey === 'profile') renderProfile();
  }

  tabBtns.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // ─── Find Guest's Primary Active Stay ───
  function getActiveReservation() {
    // If a specific ?code= was passed in URL, verify ownership strictly:
    if (queryCode) {
      const target = Data.findRes(queryCode);
      if (target) {
        const owns = (guestSession.email && target.email && target.email.toLowerCase() === guestSession.email.toLowerCase()) ||
                     (guestSession.phone && target.ph && target.ph === guestSession.phone);
        if (owns) {
          return target;
        } else {
          toast('Access restricted: Reservation ' + queryCode + ' belongs to another guest account.', 'bad');
        }
      }
    }

    const all = Data.getReservations().filter(r =>
      (guestSession.email && r.email && r.email.toLowerCase() === guestSession.email.toLowerCase()) ||
      (guestSession.phone && r.ph && r.ph === guestSession.phone)
    );

    // Prioritize Checked-in -> Confirmed -> Pending
    const checkedIn = all.find(r => r.st === 'Checked-in');
    if (checkedIn) return checkedIn;

    const confirmed = all.find(r => r.st === 'Confirmed');
    if (confirmed) return confirmed;

    const pending = all.find(r => r.st === 'Pending');
    if (pending) return pending;

    // Most recent reservation
    return all[0] || null;
  }

  // ─── 1. Tab: Current Stay ───
  function renderCurrentStay() {
    const container = $('tabCurrentStay');
    if (!container) return;

    const res = getActiveReservation();

    if (!res || res.st === 'Cancelled' || res.st === 'Checked-out') {
      container.innerHTML = `
        <div class="empty-state">
          <span class="ic" data-icon="key" style="font-size: 24px; margin-bottom: 8px;">[ICON: key]</span>
          <h3 style="margin-bottom: 6px;">No Active In-Stay Reservation</h3>
          <p class="empty-state-text">
            ${res && res.st === 'Checked-out'
              ? 'Your previous stay has been checked out. We look forward to welcoming you back!'
              : 'You do not have a room currently checked in or confirmed.'}
          </p>
          <a href="../rooms/rooms-deals.html" class="btn">
            Explore Available Rooms &rarr;
          </a>
        </div>
      `;
      return;
    }

    const nts = Data.nts(res);
    const total = Data.tot(res);
    const paid = Data.paidAmt(res);
    const balance = Data.balOf(res);
    const isCheckedIn = res.st === 'Checked-in';

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;" class="grid-2">
        <!-- Left: Stay Summary & Digital Key -->
        <div>
          <div class="card" style="margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
              <div>
                <span class="pill ${isCheckedIn ? 'pill--info' : 'pill--ok'}">
                  ${isCheckedIn ? 'Currently In-House' : res.st}
                </span>
                <h2 style="font-size: 26px; margin: 8px 0 2px;">${esc(res.t)}</h2>
                <div class="text-sm text-muted">Confirmation Code: <b>${res.c}</b></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: 700; color: var(--gold-ink);">
                  ${res.n ? 'Room ' + res.n : 'Room Assigned at Check-in'}
                </div>
                <div class="text-sm text-muted">${res.gu} Guest${res.gu > 1 ? 's' : ''}</div>
              </div>
            </div>

            <div class="card card-sm" style="background-color: var(--surface-2); margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
                <div><b>Check-In:</b> ${fmtDate(res.i)} (From 2:00 PM)</div>
                <div><b>Check-Out:</b> ${fmtDate(res.o)} (Until 12:00 PM)</div>
                <div><b>Duration:</b> ${nts} Night${nts > 1 ? 's' : ''}</div>
                <div><b>Primary Contact:</b> ${esc(res.ph || guestSession.phone || 'On file')}</div>
              </div>
            </div>

            <!-- In-Stay Service Actions -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-sm" id="btnGpOrderDining" ${isCheckedIn ? '' : 'disabled'}>
                <span class="ic" data-icon="utensils">[ICON: utensils]</span> Order In-Room Dining
              </button>
              <button class="btn-secondary btn-sm" id="btnGpHousekeeping" ${isCheckedIn ? '' : 'disabled'}>
                <span class="ic" data-icon="broom">[ICON: broom]</span> Request Housekeeping
              </button>
              <button class="btn-secondary btn-sm" id="btnGpMaintenance">
                <span class="ic" data-icon="wrench">[ICON: wrench]</span> Report an Issue
              </button>
              <button class="btn-secondary btn-sm" id="btnGpEditRes" ${isCheckedIn ? 'disabled title="Date modifications locked once checked in"' : ''}>
                <span class="ic" data-icon="edit">[ICON: edit]</span> Modify Booking
              </button>
            </div>
            ${!isCheckedIn ? '<div class="text-sm text-muted" style="margin-top: 8px;">In-room dining and housekeeping requests activate upon check-in.</div>' : ''}
          </div>

          <!-- Room Wi-Fi Access Card -->
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
              <h3>High-Speed Guest Wi-Fi</h3>
              <span class="pill pill--ok">Complimentary</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 14px;">
              <div>
                <span class="text-muted text-sm">Network Name:</span>
                <div style="font-weight: 600; margin-top: 2px;">${CONFIG.wifi.network}</div>
              </div>
              <div>
                <span class="text-muted text-sm">Passcode:</span>
                <div style="font-weight: 600; margin-top: 2px; font-family: monospace; font-size: 15px;">${CONFIG.wifi.password}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Folio & Billing Settlement -->
        <div>
          <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
              <h3>Stay Folio &amp; Ledger</h3>
              <span class="pill ${balance > 0 ? 'pill--warn' : 'pill--ok'}">
                ${balance > 0 ? 'Balance Due' : 'Paid in Full'}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between;">
                <span class="text-secondary">Room accommodation:</span>
                <span>${peso(Data.roomChg(res))}</span>
              </div>
              ${(res.x || []).map(x => `
                <div style="display: flex; justify-content: space-between;">
                  <span class="text-secondary">${esc(x.desc)}:</span>
                  <span>${peso(x.amt)}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 6px; font-weight: 600;">
                <span>Total Charges:</span>
                <b>${peso(total)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; color: var(--ok);">
                <span>Payments Settled:</span>
                <b>&minus; ${peso(paid)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); padding-top: 8px; font-size: 15px; font-weight: 700; color: ${balance > 0 ? 'var(--bad)' : 'var(--ok)'};">
                <span>Current Balance:</span>
                <span>${balance > 0 ? peso(balance) : '₱0 (Settled)'}</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${balance > 0 ? `
                <button class="btn btn-sm btn-block" id="btnGpPayBalance">
                  Pay Balance Due (${peso(balance)}) &rarr;
                </button>
              ` : ''}
              <button class="btn-secondary btn-sm btn-block" onclick="printTaxInvoice('${res.c}')">
                <span class="ic" data-icon="print">[ICON: print]</span> View &amp; Print Official Tax Invoice
              </button>
              ${isCheckedIn ? `
                <button class="btn-ghost btn-sm btn-block" id="btnGpExpressCheckout" style="color: var(--bad); margin-top: 6px;">
                  Express Check-out &rarr;
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup action handlers
    setupStayActionHandlers(res);
  }

  function setupStayActionHandlers(res) {
    // 1. Order In-Room Dining
    const orderBtn = $('btnGpOrderDining');
    if (orderBtn) {
      orderBtn.onclick = () => {
        const menu = Data.getMenu().filter(m => m.available);
        showModal(
          `Order In-Room Dining (Room ${res.n})`,
          `
          <p class="text-sm">Select dishes to be delivered directly to your room. Charges will be posted to your room folio.</p>
          <div style="max-height: 280px; overflow-y: auto; margin: 12px 0;">
            ${menu.map(m => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line);">
                <div style="flex: 1; padding-right: 12px;">
                  <b>${esc(m.name)}</b>
                  <div class="text-sm text-muted">${peso(m.price)} &middot; ${esc(m.category)}</div>
                </div>
                <input type="number" min="0" max="10" value="0" data-dish-id="${m.id}" data-price="${m.price}" data-name="${esc(m.name)}" style="width: 60px; height: 32px;">
              </div>
            `).join('')}
          </div>
          <div class="field">
            <label for="diningNotes">Preparation Notes (Optional)</label>
            <input type="text" id="diningNotes" placeholder="No spicy sauce, extra cutlery, ice water…">
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitDiningOrder">Place Order to Room Folio</button>
          `,
          {
            onOpen(modal) {
              const submitBtn = modal.querySelector('#btnSubmitDiningOrder');
              submitBtn.onclick = () => {
                const lines = [];
                modal.querySelectorAll('input[type="number"]').forEach(inp => {
                  const qty = +inp.value;
                  if (qty > 0) {
                    lines.push({
                      id: inp.dataset.dishId,
                      name: inp.dataset.name,
                      qty,
                      unitPrice: +inp.dataset.price,
                      note: ''
                    });
                  }
                });

                if (!lines.length) {
                  toast('Please select at least one dish.');
                  return;
                }

                const notes = modal.querySelector('#diningNotes').value.trim();

                // Create real order
                const newOrder = Data.createOrder({
                  type: 'In-room',
                  target: `Room ${res.n}`,
                  resCode: res.c,
                  lines
                });

                // Bill directly to room folio
                Data.billOrder(newOrder.code, 'room');

                closeModal();
                toast(`Order ${newOrder.code} placed. Charged ${peso(newOrder.subtotal)} to room folio.`);
                renderCurrentStay();
              };
            }
          }
        );
      };
    }

    // 2. Request Housekeeping
    const hkBtn = $('btnGpHousekeeping');
    if (hkBtn) {
      hkBtn.onclick = () => {
        showModal(
          `Request Housekeeping (Room ${res.n})`,
          `
          <div class="field">
            <label for="hkItem">Select Service / Item Needed</label>
            <select id="hkItem">
              <option>Fresh Towel Replenishment</option>
              <option>Extra Feather Pillows</option>
              <option>Bed Linen Change &amp; Make Up Room</option>
              <option>Bottled Water &amp; Tea Refill</option>
              <option>Dental &amp; Toiletry Kit</option>
              <option>Evening Turndown Service</option>
            </select>
          </div>
          <div class="field">
            <label for="hkNotes">Additional Request Notes</label>
            <textarea id="hkNotes" rows="2" placeholder="Delivery time, specific item count, etc."></textarea>
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitHkReq">Send Request to Housekeeping</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnSubmitHkReq').onclick = () => {
                const item = modal.querySelector('#hkItem').value;
                const notes = modal.querySelector('#hkNotes').value.trim();
                const req = Data.createHkRequest(res.n, res.g, item, notes, res.c);
                closeModal();
                toast(`Housekeeping notified (Ref: ${req.id}).`);
              };
            }
          }
        );
      };
    }

    // 3. Report Maintenance Issue
    const maintBtn = $('btnGpMaintenance');
    if (maintBtn) {
      maintBtn.onclick = () => {
        showModal(
          `Report a Room Issue (Room ${res.n})`,
          `
          <div class="field">
            <label for="mIssue">Describe the Problem *</label>
            <textarea id="mIssue" rows="3" placeholder="e.g. AC cooling slowly, bathroom lamp flickering…" required></textarea>
          </div>
          <div class="field">
            <label for="mPriority">Urgency</label>
            <select id="mPriority">
              <option value="Low">Low (Can inspect anytime today)</option>
              <option value="Medium" selected>Medium (Please inspect today)</option>
              <option value="Urgent">Urgent (Immediate assistance requested)</option>
            </select>
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitMReq">Submit Maintenance Request</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnSubmitMReq').onclick = () => {
                const issue = modal.querySelector('#mIssue').value.trim();
                const priority = modal.querySelector('#mPriority').value;
                if (!issue) {
                  toast('Please describe the issue.');
                  return;
                }
                const req = Data.createMaintenanceRequest(res.n, issue, priority, false, 'Reported by in-stay guest');
                closeModal();
                toast(`Maintenance team dispatched (Ref: ${req.id}).`);
              };
            }
          }
        );
      };
    }

    // 4. Pay Balance Due (Online Gateway)
    const payBalBtn = $('btnGpPayBalance');
    if (payBalBtn) {
      payBalBtn.onclick = () => openPayBalanceModal(res.c, renderCurrentStay);
    }

    
    // Late Check-Out Request Flow
    const lateCoBtn = $('btnGpLateCheckout');
    if (lateCoBtn) {
      lateCoBtn.onclick = () => {
        showModal(
          `Request Late Check-Out (Room ${res.n})`,
          `
          <div style="font-size: 13px;">
            <p class="text-sm text-secondary" style="margin-bottom: 12px;">
              Standard check-out is at 12:00 PM. Requests are subject to room turnover schedule and availability.
            </p>
            <div class="field" style="margin-bottom: 12px;">
              <label for="lateCoTime">Requested Check-Out Time</label>
              <select id="lateCoTime">
                <option value="1:00 PM">1:00 PM (Complimentary Member Privilege)</option>
                <option value="2:00 PM" selected>2:00 PM (Gold / Platinum Privilege)</option>
                <option value="3:00 PM">3:00 PM (Late Departure - Subject to ₱500 fee)</option>
              </select>
            </div>
            <div class="field">
              <label for="lateCoReason">Reason / Special Circumstance (Optional)</label>
              <textarea id="lateCoReason" rows="2" placeholder="e.g. Afternoon flight from NAIA, late business meeting…"></textarea>
            </div>
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitLateCo">Submit Request to Front Desk</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnSubmitLateCo').onclick = () => {
                const time = modal.querySelector('#lateCoTime').value;
                const reason = modal.querySelector('#lateCoReason').value.trim();

                // Send request message thread to front desk
                const threads = Data.getThreads();
                const threadId = 'TH-LCO-' + Date.now().toString().slice(-4);
                threads.unshift({
                  id: threadId,
                  guestName: res.g,
                  subject: `Late Check-out Request: Room ${res.n} (${res.c})`,
                  status: 'Open',
                  unreadStaff: 1,
                  unreadGuest: 0,
                  updated: nowISO(),
                  messages: [
                    {
                      from: 'Guest',
                      sender: res.g,
                      text: `Requesting late check-out until ${time} on departure date (${res.o || res.co}). ${reason ? 'Notes: ' + reason : ''}`,
                      time: nowISO()
                    }
                  ]
                });
                Data.saveThreads(threads);
                Data.audit('Late Check-Out Request', 'Reservation', res.c, `Requested departure until ${time}`);
                closeModal();
                toast('Late check-out request sent to the Front Desk for review.', 'ok');
              };
            }
          }
        );
      };
    }

    // 5. Express Check-out Flow
    const checkOutBtn = $('btnGpExpressCheckout');
    if (checkOutBtn) {
      checkOutBtn.onclick = () => {
        const bal = Data.balOf(res);
        if (bal > 0) {
          toast(`Please settle outstanding balance of ${peso(bal)} before check-out.`);
          $('btnGpPayBalance').click();
          return;
        }

        showModal(
          `Express Check-Out Confirmation`,
          `
          <p class="text-sm">You are checking out of <b>Room ${res.n}</b> (${esc(res.t)}). Your folio has zero outstanding balance.</p>
          <p class="text-sm">Keycards may be left on your room desk or deposited at the front desk key return box.</p>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Keep Room</button>
          <button class="btn" id="btnConfirmCheckout">Confirm Check-Out</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnConfirmCheckout').onclick = () => {
                const checkOutResult = (typeof ReservationService !== 'undefined')
                  ? ReservationService.checkOut(res.c)
                  : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.ReservationService.checkOut(res.c) : null);

                if (checkOutResult && !checkOutResult.ok) {
                  toast(checkOutResult.error, 'bad');
                  return;
                }

                closeModal();
                toast('Express check-out completed. Thank you for staying with us!', 'ok');
                renderCurrentStay();
              };
            }
          }
        );
      };
    }

    // 6. Modify Booking
    const editResBtn = $('btnGpEditRes');
    if (editResBtn) {
      editResBtn.onclick = () => openModifyStayModal(res.c, renderCurrentStay);
    }
  }

  // ─── Modal: Settle Balance Online ───
  function openPayBalanceModal(resCode, onComplete = null) {
    const res = Data.findRes(resCode);
    if (!res) {
      toast('Reservation not found', 'bad');
      return;
    }
    const bal = res.balanceDue != null ? res.balanceDue : Data.balOf(res);
    if (bal <= 0) {
      toast('Outstanding balance is already settled in full.', 'ok');
      return;
    }

    const modalHtml = `
      <div style="font-size: 14px;">
        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line);">
          <div style="display: flex; justify-content: space-between;">
            <span>Reservation:</span>
            <b>${res.c} &middot; ${esc(res.t)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <span>Stay Dates:</span>
            <span>${fmtDate(res.i)} to ${fmtDate(res.o)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 8px; padding-top: 6px; font-weight: 700; color: var(--bad);">
            <span>Outstanding Balance:</span>
            <span style="font-size: 16px;">${peso(bal)}</span>
          </div>
        </div>

        <form id="payBalanceForm" onsubmit="return false;">
          <div class="field">
            <label for="gpPayMethod">Online Payment Method *</label>
            <select id="gpPayMethod">
              <option value="Credit card">Credit / Debit Card (Visa, MasterCard, JCB)</option>
              <option value="GCash">GCash E-Wallet</option>
              <option value="Maya">Maya Digital Bank</option>
              <option value="Bank Transfer">Bank Transfer (Online Banking / QR Ph)</option>
            </select>
          </div>
          <div class="field">
            <label for="gpPayAmount">Settlement Amount (₱) *</label>
            <input type="number" id="gpPayAmount" value="${bal}" min="1" max="${bal}" step="0.01" required>
            <span class="text-xs text-muted">Remaining balance can be settled at check-in or anytime before.</span>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="button" class="btn" id="btnConfirmPayBalance">Authorize Payment &rarr;</button>
          </div>
        </form>
      </div>
    `;

    showModal(`Pay Folio Balance &mdash; ${res.c}`, modalHtml, '', {
      maxWidth: '460px',
      onOpen(modal) {
        modal.querySelector('#btnConfirmPayBalance').onclick = () => {
          const amt = +modal.querySelector('#gpPayAmount').value;
          const method = modal.querySelector('#gpPayMethod').value;
          if (amt <= 0 || amt > bal) {
            toast('Please enter a valid payment amount.', 'warn');
            return;
          }

          const pay = Data.addPayment(res, amt, method, 'Payment', 'Online guest portal balance settlement', {
            auth: 'AUTH-' + Math.floor(100000 + Math.random() * 900000),
            cardLast4: '8842'
          });

          res.balanceDue = Math.max(0, typeof Money !== 'undefined' ? Money.round2(bal - amt) : Math.round(bal - amt));
          Data.updateReservation(res.c, res);
          window.dispatchEvent(new CustomEvent('pupsj:data-change'));

          closeModal();
          toast(`Payment recorded (OR: ${pay.id}) &middot; ${peso(amt)} via ${method}`, 'ok');
          if (typeof onComplete === 'function') onComplete();
          renderMyReservations();
        };
      }
    });
  }

  // ─── Modal: Modify Reservation Stay ───
  function openModifyStayModal(resCode, onComplete = null) {
    const res = Data.findRes(resCode);
    if (!res) {
      toast('Reservation not found', 'bad');
      return;
    }
    if (res.st === 'Checked-in' || res.st === 'Checked-out' || res.st === 'Cancelled') {
      toast('Modification is locked for stays that are in-house, completed, or cancelled.', 'warn');
      return;
    }

    const types = typeof Data !== 'undefined' && Data.getTypes ? Data.getTypes() : [];
    const modalHtml = `
      <div style="font-size: 14px;">
        <p class="text-secondary text-sm" style="margin: 0 0 14px;">
          Update your stay dates, room type, or guest headcount. Modifying to a higher tariff requires settling the 50% deposit difference.
        </p>

        <form id="modifyStayForm" onsubmit="return false;">
          <div class="field">
            <label for="modType">Room Category</label>
            <select id="modType">
              ${types.map(t => `<option value="${esc(t.n)}" ${t.n === res.t ? 'selected' : ''}>${esc(t.n)} (${peso(t.r)}/nt)</option>`).join('')}
            </select>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label for="modCi">Check-in Date *</label>
              <input type="date" id="modCi" value="${res.i}" min="${today()}" required>
            </div>
            <div class="field">
              <label for="modCo">Check-out Date *</label>
              <input type="date" id="modCo" value="${res.o}" min="${addDays(res.i, 1)}" required>
            </div>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label for="modGuests">Guests *</label>
              <input type="number" id="modGuests" value="${res.gu}" min="1" max="10" required>
            </div>
            <div class="field">
              <label for="modPhone">Contact Mobile</label>
              <input type="tel" id="modPhone" value="${esc(res.ph || '')}">
            </div>
          </div>
          <div class="field">
            <label for="modNotes">Special Requests</label>
            <textarea id="modNotes" rows="2">${esc(res.note || '')}</textarea>
          </div>

          <div id="modQuotePreview" style="background: var(--surface-2); padding: 12px; border-radius: var(--r); margin: 12px 0; border: 1px solid var(--line); font-size: 13px;">
            <!-- Dynamically recomputed -->
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            <button type="button" class="btn" id="btnConfirmModify">Save Changes &rarr;</button>
          </div>
        </form>
      </div>
    `;

    showModal(`Modify Reservation &mdash; ${res.c}`, modalHtml, '', {
      maxWidth: '520px',
      onOpen(modal) {
        const typeEl = modal.querySelector('#modType');
        const ciEl = modal.querySelector('#modCi');
        const coEl = modal.querySelector('#modCo');
        const guEl = modal.querySelector('#modGuests');
        const previewEl = modal.querySelector('#modQuotePreview');
        const submitBtn = modal.querySelector('#btnConfirmModify');

        const recompute = () => {
          const typeName = typeEl.value;
          const ciVal = ciEl.value;
          const coVal = coEl.value;
          const guVal = +guEl.value;
          const typeObj = types.find(t => t.n === typeName) || { r: res.rt || 3200 };
          const nights = Math.max(1, dateDiff(ciVal, coVal));

          const quote = typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.PricingService
            ? PUPSJ_Services.PricingService.quote({ roomType: typeName, baseRate: typeObj.r, nights, guestCount: guVal })
            : { total: typeObj.r * nights, depositDue: Math.ceil(typeObj.r * nights * 0.5) };

          const currentPaid = res.depositPaid != null ? res.depositPaid : Data.paidAmt(res);
          const topUpDue = Math.max(0, typeof Money !== 'undefined' ? Money.round2(quote.depositDue - currentPaid) : (quote.depositDue - currentPaid));

          previewEl.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
              <span>New Accommodation Tariff (${nights} nights):</span>
              <b>${peso(quote.total)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
              <span>Required Deposit (${CONFIG.depositPct}%):</span>
              <span>${peso(quote.depositDue)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; color: var(--ok);">
              <span>Deposit Already Paid:</span>
              <span>&minus; ${peso(currentPaid)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 6px; padding-top: 6px; font-weight: 700; color: ${topUpDue > 0 ? 'var(--warn)' : 'var(--ok)'};">
              <span>${topUpDue > 0 ? 'Deposit Top-up Required:' : 'Deposit Status:'}</span>
              <span>${topUpDue > 0 ? peso(topUpDue) : 'Covered in Full'}</span>
            </div>
          `;

          submitBtn.dataset.topup = topUpDue;
        };

        typeEl.onchange = recompute;
        ciEl.onchange = () => {
          if (coEl.value <= ciEl.value) coEl.value = addDays(ciEl.value, 1);
          coEl.min = addDays(ciEl.value, 1);
          recompute();
        };
        coEl.onchange = recompute;
        guEl.oninput = recompute;
        recompute();

        submitBtn.onclick = () => {
          const newCi = ciEl.value;
          const newCo = coEl.value;
          const newType = typeEl.value;
          const newGu = +guEl.value;
          const newNotes = modal.querySelector('#modNotes').value.trim();
          const newPh = modal.querySelector('#modPhone').value.trim();

          if (newCo <= newCi) {
            toast('Check-out date must be after check-in date.', 'warn');
            return;
          }

          if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.ReservationService) {
            const modRes = PUPSJ_Services.ReservationService.modifyStay(res.c, {
              checkIn: newCi,
              checkOut: newCo,
              typeId: newType,
              guests: newGu,
              notes: newNotes,
              phone: newPh
            });
            if (!modRes.ok) {
              toast(modRes.error || 'Modification failed: No rooms free for selected dates', 'bad');
              return;
            }
          } else {
            // Direct update fallback
            res.i = newCi;
            res.o = newCo;
            res.t = newType;
            res.gu = newGu;
            res.note = newNotes;
            res.ph = newPh;
            Data.updateReservation(res.c, res);
          }

          window.dispatchEvent(new CustomEvent('pupsj:data-change'));
          closeModal();
          toast(`Reservation ${res.c} modified successfully.`, 'ok');
          if (typeof onComplete === 'function') onComplete();
          renderMyReservations();
        };
      }
    });
  }

  // ─── 2. Tab: My Reservations ───
  let filterRes = 'all';

  function renderMyReservations() {
    const container = $('tabMyReservations');
    if (!container) return;

    const all = Data.getReservations().filter(r =>
      (guestSession.email && r.email && r.email.toLowerCase() === guestSession.email.toLowerCase()) ||
      (guestSession.phone && r.ph && r.ph === guestSession.phone)
    );

    // Also detect any active holds / intents awaiting bank payment
    const holds = store.get('bookingHolds', []).filter(h =>
      (h.guestId === guestSession.id || h.email === guestSession.email) &&
      h.status === 'Active' &&
      new Date(h.expiresAt).getTime() > Date.now()
    );

    const filtered = all.filter(r => {
      if (filterRes === 'upcoming') return r.st === 'Confirmed' || r.st === 'Pending';
      if (filterRes === 'past') return r.st === 'Checked-out';
      if (filterRes === 'cancelled') return r.st === 'Cancelled' || r.st === 'No-show';
      return true;
    });

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div class="tabs" style="margin-bottom: 0;">
          <button class="tab-btn ${filterRes === 'all' ? 'active' : ''}" data-rf="all">All (${all.length})</button>
          <button class="tab-btn ${filterRes === 'upcoming' ? 'active' : ''}" data-rf="upcoming">Upcoming</button>
          <button class="tab-btn ${filterRes === 'past' ? 'active' : ''}" data-rf="past">Past Stays</button>
          <button class="tab-btn ${filterRes === 'cancelled' ? 'active' : ''}" data-rf="cancelled">Cancelled</button>
        </div>
        <a href="../rooms/rooms-deals.html" class="btn btn-sm">
          + Book New Stay
        </a>
      </div>

      <!-- Active Booking Holds Banner (if guest has pending payment) -->
      ${holds.map(h => {
        const expSec = Math.max(0, Math.floor((new Date(h.expiresAt).getTime() - Date.now()) / 1000));
        const m = String(Math.floor(expSec / 60)).padStart(2, '0');
        const s = String(expSec % 60).padStart(2, '0');
        return `
          <div class="card" style="margin-bottom: 16px; border-left: 4px solid var(--gold); background: var(--surface-2);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
              <div>
                <span class="pill pill--warn" style="font-size: 11px;">Awaiting payment (bank confirmation)</span>
                <h4 style="margin: 4px 0 2px;">Hold ${h.holdId} &middot; ${esc(h.typeId)}</h4>
                <div class="text-xs text-muted">Dates: ${fmtDate(h.checkIn)} to ${fmtDate(h.checkOut)} &middot; Deposit Due: <b>${peso(h.quoteSnapshot?.depositDue || 0)}</b></div>
              </div>
              <div style="text-align: right;">
                <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: var(--gold-ink);">${m}:${s}</div>
                <button class="btn btn-sm" onclick="openBookingModal('${h.typeId}', '${h.checkIn}', '${h.checkOut}', ${h.guests})" style="margin-top: 4px;">
                  Complete Payment &rarr;
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}

      <div style="display: flex; flex-direction: column; gap: 16px;" id="myResList">
        ${filtered.length ? filtered.map(r => {
          const nts = Data.nts(r);
          const total = Data.tot(r);
          const paid = Data.paidAmt(r);
          const bal = r.balanceDue != null ? r.balanceDue : Data.balOf(r);
          const isCancelled = r.st === 'Cancelled';
          const isNoShow = r.st === 'No-show';
          const isPast = r.st === 'Checked-out';
          const isConfirmed = r.st === 'Confirmed';

          // Status Badge Mapping
          let badgeClass = 'pill--info';
          if (r.st === 'Confirmed') badgeClass = 'pill--ok';
          else if (r.st === 'Checked-in') badgeClass = 'pill--info';
          else if (r.st === 'Checked-out') badgeClass = 'pill--muted';
          else if (r.st === 'Cancelled' || r.st === 'No-show') badgeClass = 'pill--bad';
          else if (r.st === 'Expired') badgeClass = 'pill--warn';

          // Check if feedback already given
          const fb = Data.getFeedback().find(f => f.resCode === r.c);

          return `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <b style="font-size: 17px;">${esc(r.t)}</b>
                    <span class="pill ${badgeClass}">
                      ${r.st}
                    </span>
                  </div>
                  <div class="text-sm text-muted" style="margin-top: 2px;">Code: <b>${r.c}</b> &middot; Room ${r.n || 'Assigned at Check-in'}</div>
                </div>
                <div style="text-align: right;">
                  <b style="font-size: 16px; color: var(--gold-ink);">${peso(total)}</b>
                  <div class="text-sm text-muted">${peso(paid)} settled &middot; ${bal > 0 ? `<b style="color:var(--bad);">${peso(bal)} due</b>` : '<span style="color:var(--ok);">Paid in full</span>'}</div>
                </div>
              </div>

              <div class="text-sm" style="color: var(--ink-2); margin-bottom: 14px;">
                Dates: <b>${fmtDate(r.i)}</b> &rarr; <b>${fmtDate(r.o)}</b> (${nts} nights &middot; ${r.gu} guests)
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 12px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  ${(isConfirmed && bal > 0) ? `
                    <button class="btn btn-sm" data-pay-bal-code="${r.c}">
                      Pay balance (${peso(bal)})
                    </button>
                  ` : ''}
                  ${isConfirmed ? `
                    <button class="btn-secondary btn-sm" data-modify-code="${r.c}">
                      Modify
                    </button>
                    <button class="btn-ghost btn-sm" data-cancel-code="${r.c}" style="color: var(--bad);">
                      Cancel
                    </button>
                  ` : ''}
                  <button class="btn-secondary btn-sm" data-voucher-code="${r.c}">
                    Download voucher
                  </button>
                  <button class="btn-secondary btn-sm" onclick="printTaxInvoice('${r.c}')">
                    <span class="ic" data-icon="print">[ICON: print]</span> Tax Folio
                  </button>
                  ${isPast && !fb ? `
                    <button class="btn btn-sm" data-feedback-code="${r.c}">
                      <span class="ic" data-icon="star-filled">[ICON: star-filled]</span> Leave Review
                    </button>
                  ` : ''}
                  ${fb ? `<span class="pill pill--ok text-sm">Review Submitted (${fb.ratingOverall}/5)</span>` : ''}
                </div>

                <a href="../rooms/rooms-deals.html" class="btn-ghost btn-sm">
                  Book Again &rarr;
                </a>
              </div>
            </div>
          `;
        }).join('') : `
          <div class="empty-state">
            <p class="empty-state-text">No reservations matching this filter.</p>
          </div>
        `}
      </div>
    `;

    // Filter clicks
    container.querySelectorAll('[data-rf]').forEach(btn => {
      btn.onclick = () => {
        filterRes = btn.dataset.rf;
        renderMyReservations();
      };
    });

    // Pay balance clicks
    container.querySelectorAll('[data-pay-bal-code]').forEach(btn => {
      btn.onclick = () => openPayBalanceModal(btn.dataset.payBalCode, renderMyReservations);
    });

    // Modify stay clicks
    container.querySelectorAll('[data-modify-code]').forEach(btn => {
      btn.onclick = () => openModifyStayModal(btn.dataset.modifyCode, renderMyReservations);
    });

    // Voucher download clicks
    container.querySelectorAll('[data-voucher-code]').forEach(btn => {
      btn.onclick = () => {
        if (typeof openVoucherModal === 'function') openVoucherModal(btn.dataset.voucherCode);
        else printTaxInvoice(btn.dataset.voucherCode);
      };
    });

    // Cancel reservation flow with exact refund formula
    container.querySelectorAll('[data-cancel-code]').forEach(btn => {
      btn.onclick = () => {
        const c = btn.dataset.cancelCode;
        const res = Data.findRes(c);
        if (!res) return;

        const paid = Data.paidAmt(res);
        const daysToArrival = dateDiff(today(), res.i);
        const freeCancel = daysToArrival >= (CONFIG.freeCancelDays || 3);
        const deductionPct = freeCancel ? 0 : (CONFIG.lateCancelFeePct || 30);
        const deduction = freeCancel ? 0 : (typeof Money !== 'undefined' ? Money.round2(paid * (deductionPct / 100)) : Math.round(paid * 0.3));
        const refundAmt = Math.max(0, typeof Money !== 'undefined' ? Money.round2(paid - deduction) : (paid - deduction));

        showModal(
          `Cancel Reservation ${res.c}`,
          `
          <p class="text-sm">Are you sure you wish to cancel this reservation for <b>${esc(res.t)}</b>?</p>
          <div class="card card-sm" style="background-color: var(--surface-2); margin: 12px 0; font-size: 13px;">
            <div><b>Arrival Date:</b> ${fmtDate(res.i)} (${daysToArrival} day${daysToArrival !== 1 ? 's' : ''} away)</div>
            <div><b>Total Paid:</b> ${peso(paid)}</div>
            <div><b>Policy Calculation:</b> Paid ${peso(paid)}, deduction (${deductionPct}%) ${peso(deduction)}, you will be refunded <b>${peso(refundAmt)}</b>.</div>
            <div style="border-top: 1px solid var(--line); margin-top: 8px; padding-top: 6px;">
              <b>Estimated Refund:</b> <span class="text-ok" style="font-size: 16px; font-weight: 700;">${peso(refundAmt)}</span>
            </div>
          </div>
          <div class="text-xs text-muted" style="margin-bottom: 10px;">
            ${freeCancel
              ? `Eligible for full refund under the ${CONFIG.freeCancelDays || 3}-day free cancellation policy.`
              : `Late cancellation (less than ${CONFIG.freeCancelDays || 3} days before arrival) deducts ${CONFIG.lateCancelFeePct || 30}% of all payments made.`
            }
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Keep Booking</button>
          <button class="btn-danger" id="btnConfirmCancel">Confirm Cancellation</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnConfirmCancel').onclick = () => {
                const cancelRes = typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.ReservationService
                  ? PUPSJ_Services.ReservationService.cancelReservation(res.c, 'Guest')
                  : Data.cancelReservation(res.c, 'Guest');

                closeModal();
                toast(`Reservation ${res.c} cancelled. ${peso(cancelRes.refundAmt || refundAmt)} refunded to original payment method.`, 'ok');
                renderMyReservations();
              };
            }
          }
        );
      };
    });

    // Leave review flow
    container.querySelectorAll('[data-feedback-code]').forEach(btn => {
      btn.onclick = () => {
        const c = btn.dataset.feedbackCode;
        const res = Data.findRes(c);
        if (!res) return;

        showModal(
          `Guest Review for Stay (${esc(res.t)})`,
          `
          <div class="field">
            <label for="fbOverall">Overall Rating</label>
            <select id="fbOverall">
              <option value="5" selected>5 Stars – Exceptional</option>
              <option value="4">4 Stars – Very Good</option>
              <option value="3">3 Stars – Average</option>
              <option value="2">2 Stars – Poor</option>
              <option value="1">1 Star – Unsatisfactory</option>
            </select>
          </div>
          <div class="field-row-2">
            <div class="field">
              <label for="fbClean">Cleanliness (1–5)</label>
              <input type="number" id="fbClean" min="1" max="5" value="5">
            </div>
            <div class="field">
              <label for="fbStaff">Staff Service (1–5)</label>
              <input type="number" id="fbStaff" min="1" max="5" value="5">
            </div>
          </div>
          <div class="field">
            <label for="fbComment">Your Review Comments *</label>
            <textarea id="fbComment" rows="3" placeholder="Tell us about the room comfort, dining, and hospitality…" required></textarea>
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitFeedback">Publish Review</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnSubmitFeedback').onclick = () => {
                const comment = modal.querySelector('#fbComment').value.trim();
                if (!comment) {
                  toast('Please provide a comment.');
                  return;
                }
                const overall = +modal.querySelector('#fbOverall').value;
                const clean = +modal.querySelector('#fbClean').value;
                const staff = +modal.querySelector('#fbStaff').value;

                Data.createFeedback({
                  resCode: res.c,
                  guestName: res.g,
                  roomType: res.t,
                  ratingOverall: overall,
                  ratingCleanliness: clean,
                  ratingStaff: staff,
                  ratingComfort: overall,
                  ratingDining: overall,
                  ratingValue: overall,
                  comment
                });

                closeModal();
                toast('Thank you for your review! Our management appreciates your feedback.');
                renderMyReservations();
              };
            }
          }
        );
      };
    });
  }

  // ─── 3. Tab: Loyalty & Rewards ───
  function renderLoyalty() {
    const container = $('tabLoyaltyRewards');
    if (!container) return;

    const nights = Data.getGuestNights(guestSession.name);
    const tier = Data.getGuestTier(nights);
    const tiers = CONFIG.loyalty.tiers;
    const rewards = CONFIG.loyalty.rewards;

    // Real loyalty points ledger
    const points = Data.getLoyaltyPoints ? Data.getLoyaltyPoints(guestSession.name) : 0;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; margin-bottom: 24px;" class="grid-2">
        <!-- Membership Status Card -->
        <div class="card" style="text-align: center;">
          <span class="site-section-tag">TIER MEMBERSHIP</span>
          <h2 style="font-size: 32px; margin: 4px 0;">${esc(tier.name)}</h2>
          <div class="text-sm text-muted" style="margin-bottom: 16px;">Based on ${nights} completed nights</div>

          <div style="background-color: var(--surface-2); padding: 14px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
            <div class="text-sm text-muted">Available Rewards Points</div>
            <div style="font-size: 32px; font-weight: 700; color: var(--gold-ink); margin-top: 4px;">${points}</div>
          </div>

          <button class="btn-secondary btn-sm btn-block" id="btnToggleTierPerks">
            View All Tier Benefits &darr;
          </button>
        </div>

        <!-- Collapsible Tier Levels -->
        <div class="card" id="tierPerksCard" style="display: none;">
          <h3 style="margin-bottom: 14px;">PUPSJ Loyalty Tier Program</h3>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${tiers.map(t => `
              <div style="border-bottom: 1px solid var(--line); padding-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <b style="color: ${t.name === tier.name ? 'var(--gold-ink)' : 'var(--ink)'}; font-size: 15px;">
                    ${esc(t.name)} Member ${t.name === tier.name ? '(Current Tier)' : ''}
                  </b>
                  <span class="text-sm text-muted">${t.minNights}+ Nights</span>
                </div>
                <div class="text-sm" style="color: var(--ink-2); margin-top: 4px;">
                  ${t.perks.map(p => `&bull; ${esc(p)}`).join(' &nbsp; ')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Available Redeemable Rewards -->
      <div class="card">
        <h3 style="margin-bottom: 6px;">Redeemable Stay &amp; Dining Rewards</h3>
        <p class="text-sm text-muted" style="margin-bottom: 18px;">Points are deducted upon claiming. A staff voucher request will be issued.</p>

        <div class="grid-2">
          ${rewards.map(r => `
            <div class="card card-sm" style="background-color: var(--surface-2); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <b>${esc(r.name)}</b>
                <div class="text-sm text-gold" style="font-weight: 600; margin-top: 2px;">${r.points} Points</div>
              </div>
              <button class="btn btn-sm" data-redeem-id="${r.id}" data-redeem-cost="${r.points}" data-redeem-name="${esc(r.name)}" ${points >= r.points ? '' : 'disabled'}>
                ${points >= r.points ? 'Redeem' : 'Need Points'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Tier perks toggle
    const toggleBtn = $('btnToggleTierPerks');
    const perksCard = $('tierPerksCard');
    if (toggleBtn && perksCard) {
      toggleBtn.onclick = () => {
        const isHidden = perksCard.style.display === 'none';
        perksCard.style.display = isHidden ? 'block' : 'none';
        toggleBtn.textContent = isHidden ? 'Hide Tier Benefits ↑' : 'View All Tier Benefits ↓';
      };
    }

    // Reward redemption
    container.querySelectorAll('[data-redeem-id]').forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.redeemName;
        const cost = +btn.dataset.redeemCost;
        const rwdId = btn.dataset.redeemId;

        showModal(
          `Redeem ${esc(name)}`,
          `
          <p class="text-sm">Are you sure you want to redeem <b>${esc(name)}</b> for <b>${cost} points</b>?</p>
          <p class="text-sm text-muted">Points will be deducted from your loyalty ledger and a staff voucher request will be notified to the front desk.</p>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnConfirmRedeem">Confirm Redemption</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnConfirmRedeem').onclick = () => {
                const rwdRes = Data.redeemLoyalty ? Data.redeemLoyalty(guestSession.name, rwdId) : { success: true };
                if (!rwdRes.success) {
                  toast(rwdRes.error || 'Unable to redeem reward', 'bad');
                  return;
                }
                closeModal();
                toast(`Voucher issued for ${name}! Deducted ${cost} points. Please present to front desk.`);
                renderLoyalty();
              };
            }
          }
        );
      };
    });
  }

  // ─── 4. Tab: Messages & Staff Inbox ───
  function renderMessages() {
    const container = $('tabMessages');
    if (!container) return;

    const threads = Data.getThreads().filter(t =>
      t.guestName.toLowerCase() === guestSession.name.toLowerCase() ||
      (t.contact && t.contact.toLowerCase() === (guestSession.email || '').toLowerCase())
    );

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;" class="grid-2">
        <!-- Thread List -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Conversations</h3>
            <button class="btn-secondary btn-sm" id="btnNewThread">+ New Message</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;" id="guestThreadList">
            ${threads.length ? threads.map((t, idx) => `
              <div class="card card-sm ${idx === 0 ? 'selected-thread' : ''}" style="cursor: pointer; background-color: var(--surface);" data-thread-id="${t.id}">
                <div style="display: flex; justify-content: space-between;">
                  <b>${esc(t.subject)}</b>
                  <span class="pill ${t.status === 'Open' ? 'pill--ok' : 'pill--muted'}" style="font-size: 10px;">${t.status}</span>
                </div>
                <div class="text-sm text-muted" style="margin-top: 4px;">Last update: ${esc(t.updated)}</div>
              </div>
            `).join('') : '<div class="text-sm text-muted">No messages yet. Send a inquiry to front desk.</div>'}
          </div>
        </div>

        <!-- Conversation View -->
        <div class="card" id="guestThreadView" style="display: flex; flex-direction: column; min-height: 400px;">
          ${threads.length ? renderThreadMessages(threads[0]) : `
            <div class="empty-state" style="margin: auto;">
              <p class="empty-state-text">Select or start a conversation with the front desk.</p>
            </div>
          `}
        </div>
      </div>
    `;

    function renderThreadMessages(thread) {
      return `
        <div class="card-header" style="margin-bottom: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 17px;">${esc(thread.subject)}</h3>
            <small class="text-muted">Thread: ${thread.id} &middot; Status: ${thread.status}</small>
          </div>
        </div>

        <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 10px 0;" id="threadMsgBox">
          ${(thread.messages || []).map(m => `
            <div style="max-width: 80%; padding: 8px 12px; border-radius: var(--r); font-size: 13px; ${m.role === 'guest' ? 'align-self: flex-end; background-color: var(--gold-tint); border: 1px solid var(--line);' : 'align-self: flex-start; background-color: var(--surface-2);'}">
              <b>${esc(m.sender)}</b> <span class="text-sm text-muted">(${esc(m.time)})</span>
              <div style="margin-top: 4px;">${esc(m.text)}</div>
            </div>
          `).join('')}
        </div>

        <form id="threadReplyForm" style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--line); padding-top: 12px;">
          <input type="text" id="threadReplyInput" placeholder="Reply to front desk…" required style="height: 38px;">
          <button type="submit" class="btn btn-sm">Send</button>
        </form>
      `;
    }

    // Attach reply handler
    function bindReply(thread) {
      const replyForm = $('threadReplyForm');
      if (replyForm) {
        replyForm.onsubmit = e => {
          e.preventDefault();
          const txt = $('threadReplyInput').value.trim();
          if (!txt) return;
          Data.replyThread(thread.id, guestSession.name, txt, 'guest');
          $('threadReplyInput').value = '';
          const updated = Data.getThreads().find(t => t.id === thread.id);
          $('guestThreadView').innerHTML = renderThreadMessages(updated);
          bindReply(updated);
        };
      }
    }

    if (threads.length) bindReply(threads[0]);

    // Thread selection
    container.querySelectorAll('[data-thread-id]').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.threadId;
        const thread = threads.find(t => t.id === id);
        if (thread) {
          $('guestThreadView').innerHTML = renderThreadMessages(thread);
          bindReply(thread);
        }
      };
    });

    // New thread
    const newBtn = $('btnNewThread');
    if (newBtn) {
      newBtn.onclick = () => {
        showModal(
          'Send Message to Front Desk',
          `
          <div class="field">
            <label for="newSubject">Subject *</label>
            <input type="text" id="newSubject" placeholder="e.g. Airport Transfer or Room Preference" required>
          </div>
          <div class="field">
            <label for="newMsgText">Message *</label>
            <textarea id="newMsgText" rows="3" placeholder="Describe your question or request…" required></textarea>
          </div>
          `,
          `
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" id="btnSubmitNewThread">Send Message</button>
          `,
          {
            onOpen(modal) {
              modal.querySelector('#btnSubmitNewThread').onclick = () => {
                const sub = modal.querySelector('#newSubject').value.trim();
                const txt = modal.querySelector('#newMsgText').value.trim();
                if (!sub || !txt) {
                  toast('Please fill in subject and message.');
                  return;
                }
                Data.createThread(sub, guestSession.name, txt, '', guestSession.email);
                closeModal();
                toast('Message sent to front desk.');
                renderMessages();
              };
            }
          }
        );
      };
    }
  }

  // ─── 5. Tab: Profile ───
  let isEditingProfile = false;

  function renderProfile() {
    const container = $('tabProfile');
    if (!container) return;

    const guestProfiles = store.get('guestProfiles', {});
    const emailKey = (guestSession.email || guestSession.phone || 'default').toLowerCase();
    const prof = guestProfiles[emailKey] || {
      name: guestSession.name,
      email: guestSession.email || '',
      phone: guestSession.phone || '',
      address: 'San Juan City, Metro Manila',
      bedPref: '1 King Size Bed',
      dietary: 'Standard menu',
      cardBrand: 'Visa',
      cardLast4: '8842'
    };

    container.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 0 auto;">
        <div class="card-header">
          <h3>Guest Profile &amp; Preferences</h3>
          <button class="btn-secondary btn-sm" id="btnToggleEditProfile">
            ${isEditingProfile ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        ${isEditingProfile ? `
          <form id="profileEditForm">
            <div class="field-row-2">
              <div class="field">
                <label for="profName">Full Name</label>
                <input type="text" id="profName" value="${esc(prof.name)}" required>
              </div>
              <div class="field">
                <label for="profPhone">Mobile Phone</label>
                <input type="tel" id="profPhone" value="${esc(prof.phone)}" required>
              </div>
            </div>

            <div class="field">
              <label for="profEmail">Email Address</label>
              <input type="email" id="profEmail" value="${esc(prof.email)}" required>
            </div>

            <div class="field">
              <label for="profAddress">Residential Address</label>
              <input type="text" id="profAddress" value="${esc(prof.address)}">
            </div>

            <div class="field-row-2">
              <div class="field">
                <label for="profBed">Bed Preference</label>
                <select id="profBed">
                  <option ${prof.bedPref === '1 King Size Bed' ? 'selected' : ''}>1 King Size Bed</option>
                  <option ${prof.bedPref === '2 Twin Beds' ? 'selected' : ''}>2 Twin Beds</option>
                  <option ${prof.bedPref === 'Quiet Corner Room' ? 'selected' : ''}>Quiet Corner Room</option>
                </select>
              </div>
              <div class="field">
                <label for="profDiet">Dietary Preferences</label>
                <input type="text" id="profDiet" value="${esc(prof.dietary)}">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
              <button type="button" class="btn-secondary" id="btnCancelEditProf">Cancel</button>
              <button type="submit" class="btn" id="btnSaveProfile">Save Profile Changes</button>
            </div>
          </form>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 14px; font-size: 14px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 10px;">
              <div>
                <span class="text-sm text-muted">Primary Guest Name:</span>
                <div style="font-weight: 600; margin-top: 2px;">${esc(prof.name)}</div>
              </div>
              <div>
                <span class="text-sm text-muted">Contact Mobile:</span>
                <div style="font-weight: 600; margin-top: 2px;">${esc(prof.phone || 'None on file')}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 10px;">
              <div>
                <span class="text-sm text-muted">Email Address:</span>
                <div style="font-weight: 600; margin-top: 2px;">${esc(prof.email || 'None on file')}</div>
              </div>
              <div>
                <span class="text-sm text-muted">Residential Address:</span>
                <div style="font-weight: 600; margin-top: 2px;">${esc(prof.address)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 10px;">
              <div>
                <span class="text-sm text-muted">Bed Preference:</span>
                <div style="margin-top: 2px;">${esc(prof.bedPref)}</div>
              </div>
              <div>
                <span class="text-sm text-muted">Dietary Preferences:</span>
                <div style="margin-top: 2px;">${esc(prof.dietary)}</div>
              </div>
            </div>

            <div>
              <span class="text-sm text-muted">Payment Method on File:</span>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span class="pill pill--muted">${esc(prof.cardBrand || 'Card')}</span>
                <span>Ending in &bull;&bull;&bull;&bull; ${esc(prof.cardLast4 || '8842')}</span>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    const toggleBtn = $('btnToggleEditProfile');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        isEditingProfile = !isEditingProfile;
        renderProfile();
      };
    }

    const cancelBtn = $('btnCancelEditProf');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        isEditingProfile = false;
        renderProfile();
      };
    }

    const form = $('profileEditForm');
    if (form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const newName = $('profName').value.trim();
        const newPhone = $('profPhone').value.trim();
        const newEmail = $('profEmail').value.trim();
        const newAddress = $('profAddress').value.trim();
        const newBed = $('profBed').value;
        const newDiet = $('profDiet').value.trim();

        if (!newName) {
          toast('Please enter your full name.', 'warn');
          return;
        }

        const oldEmail = guestSession.email || '';
        const emailChanged = oldEmail && newEmail && (oldEmail.toLowerCase() !== newEmail.toLowerCase());

        if (emailChanged) {
          const ok = typeof confirmDialog === 'function'
            ? await confirmDialog({
                title: 'Change Sign-In Email Address?',
                message: `Updating your email address to "${newEmail}" will update your account sign-in credentials. Are you sure you wish to continue?`,
                confirmLabel: 'Update Email & Profile',
                cancelLabel: 'Keep Current Email',
                intent: 'primary'
              })
            : confirm(`Updating your email address to "${newEmail}" will update your account sign-in credentials. Continue?`);
          if (!ok) return;
        }

        // 1. Update guestAccounts canonical store via Data.saveGuest
        if (typeof Data !== 'undefined' && Data.saveGuest) {
          Data.saveGuest({
            name: newName,
            phone: newPhone,
            email: newEmail,
            address: newAddress,
            preferences: `${newBed} | ${newDiet}`,
            notes: `Guest Portal profile self-update (${today()})`
          });
        }

        // 2. Also update GuestService if available
        if (typeof GuestService !== 'undefined' && GuestService.updateGuest) {
          GuestService.updateGuest(oldEmail || newEmail, {
            name: newName,
            email: newEmail,
            phone: newPhone
          });
        }

        // 3. Update guestProfiles local storage mapping
        prof.name = newName;
        prof.phone = newPhone;
        prof.email = newEmail;
        prof.address = newAddress;
        prof.bedPref = newBed;
        prof.dietary = newDiet;

        if (emailChanged) {
          delete guestProfiles[emailKey];
          guestProfiles[newEmail.toLowerCase()] = prof;
        } else {
          guestProfiles[emailKey] = prof;
        }
        store.set('guestProfiles', guestProfiles, true);

        // 4. Update active guest session
        guestSession.name = newName;
        guestSession.email = newEmail;
        guestSession.phone = newPhone;
        Data.setGuestSession(guestSession);

        isEditingProfile = false;
        toast('Profile updated successfully.', 'ok');
        renderProfile();
      };
    }
  }

  // Initial tab render
  switchTab(activeTabKey);
})();
