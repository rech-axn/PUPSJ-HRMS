/* ==========================================================================
   PUPSJ Hotel & Restaurant — Reservations Management (reservations.js)
   Table view with search, filter, sort, pagination, CSV export, and
   calendar view (Month, Week, Agenda) with real month navigation.
   ========================================================================== */
'use strict';

(function () {
  const ST_OPTIONS = ['Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled'];
  let currentTab = 'table'; // 'table' | 'calendar'
  let calView = 'month';    // 'month' | 'week' | 'agenda'
  let curDate = new Date(); // Anchor date for calendar navigation
  let selectedCode = null;
  let page = 1;
  const pageSize = 10;
  let sortKey = 'created';
  let sortDir = -1; // -1 = desc, 1 = asc

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const paramCode = urlParams.get('code');
  const paramNew = urlParams.get('new');
  const paramGuest = urlParams.get('guest');
  const paramStatus = urlParams.get('status');
  const paramPhone = urlParams.get('phone');

  function init() {
    if (paramStatus) statusFilter = paramStatus;
    renderApp();
    if (paramCode) {
      setTimeout(() => openReservationDetail(paramCode), 200);
    } else if (paramNew) {
      setTimeout(() => openNewStaffReservation({ guest: paramGuest || '', phone: paramPhone || '' }), 200);
    }
  }

  function renderApp() {
    const app = $('reservationsApp');
    if (!app) return;

    const reservations = Data.getReservations();
    const confirmedCount = reservations.filter(r => r.st === 'Confirmed').length;
    const pendingCount = reservations.filter(r => r.st === 'Pending').length;
    const checkedInCount = reservations.filter(r => r.st === 'Checked-in').length;
    const totalCount = reservations.length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">OPERATIONS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Reservation Management</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btnExportResCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnNewReservation">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Reservation
          </button>
        </div>
      </div>

      <!-- Stat Pillars -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Bookings</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${totalCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Confirmed Stays</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${confirmedCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Checked-in Guests</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${checkedInCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Pending Deposit</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${pendingCount}</div>
        </div>
      </div>

      <!-- View Selector Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab-btn ${currentTab === 'table' ? 'active' : ''}" id="tabBtnTable">
          <span class="ic" data-icon="document">[ICON: document]</span> Reservation Ledger
        </button>
        <button class="tab-btn ${currentTab === 'calendar' ? 'active' : ''}" id="tabBtnCalendar">
          <span class="ic" data-icon="calendar">[ICON: calendar]</span> Visual Calendar
        </button>
        <button class="tab-btn ${currentTab === 'holds' ? 'active' : ''}" id="tabBtnHolds">
          <span class="ic" data-icon="clock">[ICON: clock]</span> Awaiting Payment
        </button>
        <button class="tab-btn ${currentTab === 'payments' ? 'active' : ''}" id="tabBtnPayments">
          <span class="ic" data-icon="wallet">[ICON: wallet]</span> Online Payments Log
        </button>
      </div>

      <!-- View 1: Ledger Table -->
      <div id="viewTable" style="${currentTab === 'table' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
            <div class="field" style="margin: 0;">
              <label>Search</label>
              <input type="text" id="resSearchInput" placeholder="Guest name, code, phone, or room…">
            </div>
            <div class="field" style="margin: 0;">
              <label>Status</label>
              <select id="resStatusFilter">
                <option value="">All Statuses</option>
                ${ST_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="margin: 0;">
              <label>From Date</label>
              <input type="date" id="resFromFilter">
            </div>
            <div class="field" style="margin: 0;">
              <label>To Date</label>
              <input type="date" id="resToFilter">
            </div>
            <div>
              <button class="btn-ghost" id="btnClearResFilters" style="height: 40px;">Reset</button>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="cursor: pointer;" data-sort="code">Code <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th style="cursor: pointer;" data-sort="guest">Guest Name <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th>Room Type &amp; No.</th>
                  <th style="cursor: pointer;" data-sort="dates">Stay Dates <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th>Source</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="resTableBody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="resPagination">
            <!-- Pagination Controls -->
          </div>
        </div>
      </div>

      <!-- View 2: Calendar -->
      <div id="viewCalendar" style="${currentTab === 'calendar' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h2 style="margin: 0; font-size: 20px;" id="calTitleDisplay">October 2026</h2>
              <div style="display: flex; gap: 4px;">
                <button class="btn-secondary btn-sm" id="btnCalPrev">&larr; Prev</button>
                <button class="btn-secondary btn-sm" id="btnCalToday">Today</button>
                <button class="btn-secondary btn-sm" id="btnCalNext">Next &rarr;</button>
              </div>
            </div>
            <div class="tabs" style="margin: 0;">
              <button class="tab-btn ${calView === 'month' ? 'active' : ''}" data-cal-view="month">Month</button>
              <button class="tab-btn ${calView === 'week' ? 'active' : ''}" data-cal-view="week">Week</button>
              <button class="tab-btn ${calView === 'agenda' ? 'active' : ''}" data-cal-view="agenda">Agenda</button>
            </div>
          </div>

          <div id="calContainer">
            <!-- Calendar grid rendered dynamically -->
          </div>
        </div>
      </div>

      <!-- View 3: Awaiting Payment (Holds) -->
      <div id="viewHolds" style="${currentTab === 'holds' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 6px; font-size: 18px;">Rooms Held While Paying</h3>
          <p class="text-sm text-secondary" style="margin: 0;">
            Active inventory holds locking rooms while online guests complete card, e-wallet, or bank transfer checkout. Stale holds expire automatically.
          </p>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hold ID</th>
                  <th>Room Category</th>
                  <th>Stay Period</th>
                  <th>Guests</th>
                  <th>Deposit Due</th>
                  <th>Expires At / Countdown</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody id="holdsTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- View 4: Online Payments Log -->
      <div id="viewPayments" style="${currentTab === 'payments' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 6px; font-size: 18px;">Online Payments Log (Gateway Intention Ledger)</h3>
          <p class="text-sm text-secondary" style="margin: 0;">
            Read-only chronological audit trail of all online payment attempts across Credit/Debit Card, GCash, Maya, and Bank QR Ph.
          </p>
        </div>
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Intent ID</th>
                  <th>Hold ID</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Provider Ref / Details</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody id="paymentsTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    bindHeaderEvents();
    renderTable();
    renderCalendar();
    renderHolds();
    renderPaymentsLog();
  }

  function bindHeaderEvents() {
    const showTab = (tab) => {
      currentTab = tab;
      $('tabBtnTable')?.classList.toggle('active', tab === 'table');
      $('tabBtnCalendar')?.classList.toggle('active', tab === 'calendar');
      $('tabBtnHolds')?.classList.toggle('active', tab === 'holds');
      $('tabBtnPayments')?.classList.toggle('active', tab === 'payments');

      if ($('viewTable')) $('viewTable').style.display = tab === 'table' ? '' : 'none';
      if ($('viewCalendar')) $('viewCalendar').style.display = tab === 'calendar' ? '' : 'none';
      if ($('viewHolds')) $('viewHolds').style.display = tab === 'holds' ? '' : 'none';
      if ($('viewPayments')) $('viewPayments').style.display = tab === 'payments' ? '' : 'none';

      if (tab === 'table') renderTable();
      else if (tab === 'calendar') renderCalendar();
      else if (tab === 'holds') renderHolds();
      else if (tab === 'payments') renderPaymentsLog();
    };

    $('tabBtnTable').onclick = () => showTab('table');
    $('tabBtnCalendar').onclick = () => showTab('calendar');
    $('tabBtnHolds').onclick = () => showTab('holds');
    $('tabBtnPayments').onclick = () => showTab('payments');

    $('btnNewReservation').onclick = () => openNewStaffReservation();

    $('btnExportResCSV').onclick = () => {
      const filtered = getFilteredReservations();
      const cols = [
        { header: 'Reservation Code', key: 'c' },
        { header: 'Guest Name', key: 'g' },
        { header: 'Phone', key: 'ph' },
        { header: 'Room Type', key: 't' },
        { header: 'Room Number', key: 'n' },
        { header: 'Check In', key: 'i' },
        { header: 'Check Out', key: 'o' },
        { header: 'Guests', key: 'gu' },
        { header: 'Total (PHP)', key: r => Data.tot(r) },
        { header: 'Paid (PHP)', key: r => Data.paidAmt(r) },
        { header: 'Balance (PHP)', key: r => Data.balOf(r) },
        { header: 'Status', key: 'st' }
      ];
      exportCSV(`PUPSJ_Reservations_${today()}.csv`, cols, filtered);
    };

    // Filter Listeners
    ['resSearchInput', 'resStatusFilter', 'resFromFilter', 'resToFilter'].forEach(id => {
      const el = $(id);
      if (el) el.oninput = () => { page = 1; renderTable(); };
    });

    $('btnClearResFilters').onclick = () => {
      $('resSearchInput').value = '';
      $('resStatusFilter').value = '';
      $('resFromFilter').value = '';
      $('resToFilter').value = '';
      page = 1;
      renderTable();
    };

    // Calendar Navigation Listeners
    $('btnCalPrev').onclick = () => {
      if (calView === 'month') {
        curDate.setMonth(curDate.getMonth() - 1);
      } else if (calView === 'week') {
        curDate.setDate(curDate.getDate() - 7);
      } else {
        curDate.setMonth(curDate.getMonth() - 1);
      }
      renderCalendar();
    };

    $('btnCalNext').onclick = () => {
      if (calView === 'month') {
        curDate.setMonth(curDate.getMonth() + 1);
      } else if (calView === 'week') {
        curDate.setDate(curDate.getDate() + 7);
      } else {
        curDate.setMonth(curDate.getMonth() + 1);
      }
      renderCalendar();
    };

    $('btnCalToday').onclick = () => {
      curDate = new Date();
      renderCalendar();
    };

    document.querySelectorAll('[data-cal-view]').forEach(btn => {
      btn.onclick = () => {
        calView = btn.dataset.calView;
        document.querySelectorAll('[data-cal-view]').forEach(b => b.classList.toggle('active', b === btn));
        renderCalendar();
      };
    });

    // Sort column headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.onclick = () => {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortDir = -sortDir;
        } else {
          sortKey = key;
          sortDir = 1;
        }
        renderTable();
      };
    });
  }

  function getFilteredReservations() {
    const list = Data.getReservations();
    const q = ($('resSearchInput')?.value || '').toLowerCase().trim();
    const status = $('resStatusFilter')?.value || '';
    const from = $('resFromFilter')?.value || '';
    const to = $('resToFilter')?.value || '';

    return list.filter(r => {
      if (status && r.st !== status) return false;
      if (from && r.o < from) return false;
      if (to && r.i > to) return false;
      if (q) {
        const text = `${r.g} ${r.c} ${r.ph || ''} ${r.n || ''} ${r.t}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortKey] || '';
      let valB = b[sortKey] || '';
      if (sortKey === 'guest') { valA = a.g; valB = b.g; }
      if (sortKey === 'code') { valA = a.c; valB = b.c; }
      if (sortKey === 'dates') { valA = a.i; valB = b.i; }
      if (sortKey === 'created') { valA = a.created || a.i; valB = b.created || b.i; }

      if (valA < valB) return -sortDir;
      if (valA > valB) return sortDir;
      return 0;
    });
  }

  function renderTable() {
    const tbody = $('resTableBody');
    const pgnEl = $('resPagination');
    if (!tbody) return;

    const items = getFilteredReservations();
    const pgn = paginate(items, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 28px;">No reservations found matching the current search filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0 reservations</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(r => {
      const nts = Data.nts(r);
      const total = Data.tot(r);
      const bal = r.balanceDue != null ? r.balanceDue : Data.balOf(r);
      const paid = r.depositPaid != null ? r.depositPaid : Data.paidAmt(r);
      const pillClass = r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : r.st === 'Cancelled' ? 'pill--bad' : 'pill--muted';
      const isOnline = r.source === 'Online';

      return `
        <tr style="cursor: pointer;" onclick="openReservationDetail('${r.c}')">
          <td><b>${r.c}</b></td>
          <td>
            <div style="font-weight: 600;">${esc(r.g)}</div>
            <div class="text-xs text-muted">${esc(r.ph) || 'No phone'}</div>
          </td>
          <td>
            <div>${esc(r.t)}</div>
            <div class="text-xs text-secondary">Room ${r.n || 'TBD'}</div>
          </td>
          <td>
            <div>${fmtDate(r.i)} &rarr; ${fmtDate(r.o)}</div>
            <div class="text-xs text-muted">${nts} night(s) &middot; ${r.gu} guest(s)</div>
          </td>
          <td>
            <span class="pill ${isOnline ? 'pill--info' : 'pill--muted'}" style="font-size: 11px;">${esc(r.source || 'Front Desk')}</span>
          </td>
          <td><b>${peso(total)}</b></td>
          <td>
            <div>Paid ${peso(paid)} (${r.depositPct || CONFIG.depositPct}%)</div>
            <div class="text-xs ${bal > 0 ? 'text-warn' : 'text-ok'}">${bal > 0 ? `Balance ${peso(bal)}` : 'Balance ₱0'}</div>
          </td>
          <td>
            <span class="pill ${pillClass}">${r.st}</span>
            <div class="text-xs text-muted" style="margin-top: 2px;">
              ${isOnline ? 'System (payment)' : (r.confirmedBy ? 'By ' + esc(r.confirmedBy) : '')}
            </div>
          </td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button class="btn-secondary btn-sm" onclick="openReservationDetail('${r.c}')" title="View details">Details</button>
              <button class="btn-secondary btn-sm" onclick="openFolioModal('${r.c}', () => renderApp())" title="Folio &amp; Payments">Folio</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} reservations</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnPrevPage">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnNextPage">Next</button>
      </div>
    `;

    const prev = $('btnPrevPage');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnNextPage');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  /* View 3: Awaiting Payment (Holds) */
  function renderHolds() {
    const tbody = $('holdsTableBody');
    if (!tbody) return;

    const holds = store.get('bookingHolds', []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const staff = typeof Data !== 'undefined' && Data.getStaffSession ? Data.getStaffSession() : null;
    const isAdmin = staff && (staff.role === 'Admin' || staff.role === 'Administrator');

    if (!holds.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No active room inventory holds currently awaiting payment.</td></tr>`;
      return;
    }

    tbody.innerHTML = holds.map(h => {
      const expMs = new Date(h.expiresAt).getTime();
      const nowMs = Date.now();
      const isExpired = h.status === 'Expired' || nowMs >= expMs;
      const leftSec = Math.max(0, Math.floor((expMs - nowMs) / 1000));
      const m = String(Math.floor(leftSec / 60)).padStart(2, '0');
      const s = String(leftSec % 60).padStart(2, '0');

      return `
        <tr>
          <td><b>${h.holdId}</b></td>
          <td>${esc(h.typeId)}</td>
          <td>${fmtDate(h.checkIn)} &rarr; ${fmtDate(h.checkOut)}</td>
          <td>${h.guests} guest(s)</td>
          <td><b>${peso(h.quoteSnapshot?.depositDue || 0)}</b></td>
          <td>
            ${isExpired
              ? '<span class="text-muted">Expired</span>'
              : `<span style="font-family: monospace; font-weight: 700; color: ${leftSec < 120 ? 'var(--warn)' : 'var(--gold-ink)'};">${m}:${s} remaining</span>`
            }
          </td>
          <td>
            <span class="pill ${h.status === 'Paid' ? 'pill--ok' : h.status === 'Active' && !isExpired ? 'pill--info' : 'pill--warn'}">
              ${isExpired && h.status === 'Active' ? 'Expired' : h.status}
            </span>
          </td>
          <td style="text-align: right;">
            ${(isAdmin && h.status === 'Active' && !isExpired) ? `
              <button class="btn-ghost btn-sm" style="color: var(--bad);" onclick="releaseHoldAdmin('${h.holdId}')">
                Release Hold
              </button>
            ` : '<span class="text-xs text-muted">—</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  window.releaseHoldAdmin = function(holdId) {
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
      PUPSJ_Services.HoldService.releaseHold(holdId);
      toast(`Hold ${holdId} manually released by Administrator.`, 'ok');
      renderHolds();
    }
  };

  /* View 4: Online Payments Log */
  function renderPaymentsLog() {
    const tbody = $('paymentsTableBody');
    if (!tbody) return;

    const intents = store.get('paymentIntents', []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (!intents.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No online payment attempts recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = intents.map(pi => {
      let pillClass = 'pill--info';
      if (pi.status === 'Succeeded') pillClass = 'pill--ok';
      else if (pi.status === 'Failed' || pi.status === 'Cancelled') pillClass = 'pill--bad';
      else if (pi.status === 'AwaitingBank') pillClass = 'pill--warn';

      const details = pi.bankRef || (pi.cardBrand ? `${pi.cardBrand} •••• ${pi.cardLast4 || '4242'}` : (pi.bankName || pi.failureReason || 'Simulated'));

      return `
        <tr>
          <td><b style="font-family: monospace;">${pi.intentId}</b></td>
          <td><span class="text-xs text-secondary">${pi.holdId}</span></td>
          <td><b>${esc(pi.method)}</b></td>
          <td><b>${peso(pi.amount)}</b></td>
          <td><span class="text-xs">${esc(details)}</span></td>
          <td><span class="pill ${pillClass}">${pi.status}</span></td>
          <td><span class="text-xs text-muted">${new Date(pi.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></td>
        </tr>
      `;
    }).join('');
  }

  /* Calendar Views */
  function renderCalendar() {
    const container = $('calContainer');
    const titleDisplay = $('calTitleDisplay');
    if (!container) return;

    const year = curDate.getFullYear();
    const month = curDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (titleDisplay) {
      if (calView === 'month') {
        titleDisplay.textContent = `${monthNames[month]} ${year}`;
      } else if (calView === 'week') {
        const start = getStartOfWeek(new Date(curDate));
        const end = addDays(formatISO(start), 6);
        titleDisplay.textContent = `Week: ${fmtDate(formatISO(start))} – ${fmtDate(end)}`;
      } else {
        titleDisplay.textContent = `Agenda: ${monthNames[month]} ${year}`;
      }
    }

    if (calView === 'month') {
      renderMonthCalendar(container, year, month);
    } else if (calView === 'week') {
      renderWeekCalendar(container, curDate);
    } else {
      renderAgendaCalendar(container, year, month);
    }
  }

  function getStartOfWeek(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  }

  function formatISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function renderMonthCalendar(container, year, month) {
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled');

    let html = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; font-size: 12px;">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `
          <div style="font-weight: 600; text-align: center; padding: 6px; background: var(--surface-2); border-radius: var(--r);">${d}</div>
        `).join('')}
    `;

    for (let i = 0; i < firstDay; i++) {
      html += `<div style="min-height: 85px; background: var(--bg); border: 1px dashed var(--line); border-radius: var(--r); padding: 4px; opacity: 0.4;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRes = reservations.filter(r => dateStr >= r.i && dateStr < r.o);
      const isToday = dateStr === today();

      html += `
        <div style="min-height: 85px; background: var(--surface); border: 1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}; border-radius: var(--r); padding: 4px; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? 'var(--gold-ink)' : 'inherit'};">${day}</span>
            ${dayRes.length > 0 ? `<span class="text-xs text-muted">${dayRes.length}</span>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px; overflow-y: auto; max-height: 70px;">
            ${dayRes.slice(0, 3).map(r => {
              const bg = r.st === 'Checked-in' ? 'var(--ok-tint)' : r.st === 'Confirmed' ? 'var(--info-tint)' : 'var(--warn-tint)';
              const col = r.st === 'Checked-in' ? 'var(--ok)' : r.st === 'Confirmed' ? 'var(--info)' : 'var(--warn)';
              return `
                <div style="background: ${bg}; color: ${col}; padding: 2px 4px; border-radius: 2px; font-size: 10px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                     onclick="openReservationDetail('${r.c}')" title="${esc(r.g)} (${r.t})">
                  ${esc(r.g.split(' ')[0])} (${r.n})
                </div>
              `;
            }).join('')}
            ${dayRes.length > 3 ? `<div class="text-xs text-muted">+${dayRes.length - 3} more</div>` : ''}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function renderWeekCalendar(container, anchorDate) {
    const monday = getStartOfWeek(new Date(anchorDate));
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled');
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(formatISO(d));
    }

    let html = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; font-size: 13px;">
        ${days.map(d => {
          const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
          const isToday = d === today();
          const dayRes = reservations.filter(r => d >= r.i && d < r.o);

          return `
            <div style="background: var(--surface); border: 1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}; border-radius: var(--r); padding: 8px; min-height: 280px; display: flex; flex-direction: column;">
              <div style="font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--line); margin-bottom: 8px; text-align: center; color: ${isToday ? 'var(--gold-ink)' : 'inherit'};">
                ${dayName} ${isToday ? '(Today)' : ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; overflow-y: auto;">
                ${dayRes.map(r => `
                  <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r); padding: 6px; font-size: 11px; cursor: pointer;"
                       onclick="openReservationDetail('${r.c}')">
                    <div style="font-weight: 600;">${esc(r.g)}</div>
                    <div class="text-secondary">Room ${r.n} &middot; ${esc(r.t)}</div>
                    <div class="pill ${r.st === 'Checked-in' ? 'pill--ok' : 'pill--info'}" style="font-size: 9px; padding: 1px 4px; margin-top: 4px;">${r.st}</div>
                  </div>
                `).join('')}
                ${dayRes.length === 0 ? `<div class="text-xs text-muted text-center" style="padding-top: 20px;">No stays</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.innerHTML = html;
  }

  function renderAgendaCalendar(container, year, month) {
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled')
      .sort((a, b) => a.i.localeCompare(b.i));

    if (reservations.length === 0) {
      container.innerHTML = `<p class="text-muted text-center" style="padding: 24px;">No upcoming or active reservations on file.</p>`;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${reservations.map(r => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); cursor: pointer;"
               onclick="openReservationDetail('${r.c}')">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <b>${esc(r.g)}</b>
                <span class="text-xs text-muted">${r.c}</span>
                <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : 'pill--warn'}" style="font-size: 10px;">${r.st}</span>
              </div>
              <div class="text-sm text-secondary">${esc(r.t)} (Room ${r.n}) &middot; ${r.gu} guests</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600;">${fmtDate(r.i)} &rarr; ${fmtDate(r.o)}</div>
              <div class="text-xs text-muted">${Data.nts(r)} night(s) &middot; ${peso(Data.tot(r))}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* Reservation Detail Modal */
  window.openReservationDetail = function (code) {
    const r = Data.findRes(code);
    if (!r) {
      toast('Reservation not found', 'bad');
      return;
    }

    const nts = Data.nts(r);
    const total = Data.tot(r);
    const paid = Data.paidAmt(r);
    const bal = Data.balOf(r);
    const isClean = Data.isRoomClean ? Data.isRoomClean(r.n) : true;
    const canCheckIn = r.st === 'Confirmed' && isClean && (paid >= Data.depAmt(r));
    const canCheckOut = r.st === 'Checked-in';

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
          <div>
            <h2 style="margin: 0; font-size: 20px;">${esc(r.g)}</h2>
            <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
            ${r.ph ? `<div class="text-sm text-muted">Phone: ${esc(r.ph)}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : 'pill--bad'}">${r.st}</span>
            <div style="font-size: 12px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'}; font-weight: 600; margin-top: 4px;">
              ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled'}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line);">
          <div>
            <div class="text-xs text-secondary">Check-in Date:</div>
            <b>${fmtDate(r.i)} (2:00 PM)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Check-out Date:</div>
            <b>${fmtDate(r.o)} (12:00 PM)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Length of Stay:</div>
            <b>${nts} Night(s) &middot; ${r.gu} Guest(s)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Room Cleanliness:</div>
            <b>${isClean ? 'Clean &amp; Ready' : '<span style="color:var(--bad);">Dirty / Cleaning in progress</span>'}</b>
          </div>
        </div>

        ${r.note ? `
          <div style="background: var(--bg); border: 1px solid var(--line); padding: 10px; border-radius: var(--r); margin-bottom: 14px;">
            <span class="text-xs text-secondary">Guest Special Requests:</span>
            <div style="margin-top: 2px;">${esc(r.note)}</div>
          </div>
        ` : ''}

        ${r.promo ? `
          <div style="background: var(--ok-tint); color: var(--ok); padding: 6px 10px; border-radius: var(--r); margin-bottom: 14px; font-size: 12px;">
            Promo Applied: <b>${esc(r.promo)}</b>
          </div>
        ` : ''}

        <div style="border-top: 1px solid var(--line); padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>Room Accommodation Rate:</span>
            <span>${peso(r.rt || 3200)} / night &times; ${nts}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>Total Folio Charges:</span>
            <b>${peso(total)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--ok);">
            <span>Payments Settled:</span>
            <b>&minus; ${peso(paid)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; border-top: 1px solid var(--line); padding-top: 6px; margin-top: 6px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
            <span>Outstanding Balance:</span>
            <span>${peso(bal)}</span>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary btn-sm" id="btnDetailFolio">
            <span class="ic" data-icon="wallet">[ICON: wallet]</span> Folio &amp; Payments
          </button>
          <button class="btn-secondary btn-sm" id="btnDetailInvoice">
            <span class="ic" data-icon="print">[ICON: print]</span> Tax Invoice
          </button>
        </div>
        <div style="display: flex; gap: 6px;">
          ${r.st === 'Pending' ? `
            <button class="btn btn-sm" id="btnDetailConfirm">Confirm Booking</button>
          ` : ''}
          ${r.st === 'Confirmed' ? `
            <button class="btn btn-sm" id="btnDetailCheckIn" ${!canCheckIn ? 'title="Requires deposit payment and clean room"' : ''}>Check In</button>
          ` : ''}
          ${canCheckOut ? `
            <button class="btn btn-sm" id="btnDetailCheckOut">Check Out</button>
          ` : ''}
          ${r.st === 'Confirmed' || r.st === 'Pending' ? `
            <button class="btn-danger btn-sm" id="btnDetailCancel">Cancel</button>
          ` : ''}
          <button class="btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    showModal(`Reservation &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '580px' });

    // Actions
    $('btnDetailFolio').onclick = () => {
      openFolioModal(r.c, () => renderApp());
    };

    $('btnDetailInvoice').onclick = () => {
      printTaxInvoice(r.c);
    };

    const btnConfirm = $('btnDetailConfirm');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        Data.updateReservation(r.c, { st: 'Confirmed' });
        Data.audit('Confirm Reservation', 'res', r.c, `Confirmed by staff for ${r.g}`);
        toast(`Reservation ${r.c} confirmed`, 'ok');
        closeModal();
        renderApp();
      };
    }

    const btnIn = $('btnDetailCheckIn');
    if (btnIn) {
      btnIn.onclick = () => {
        const resCheckIn = Data.checkIn(r.c);
        if (resCheckIn.success) {
          toast(`Guest ${r.g} checked into Room ${r.n}`, 'ok');
          closeModal();
          renderApp();
        } else {
          toast(resCheckIn.error, 'warn');
          if (resCheckIn.error && resCheckIn.error.includes('deposit')) {
            openFolioModal(r.c, () => renderApp());
          }
        }
      };
    }

    const btnOut = $('btnDetailCheckOut');
    if (btnOut) {
      btnOut.onclick = async () => {
        if (bal > 0) {
          const ok = await confirmDialog(`Guest has an outstanding balance of ${peso(bal)}. Proceed with check-out settlement?`, 'Outstanding Balance', { confirmText: 'Settle Balance' });
          if (!ok) {
            openFolioModal(r.c, () => renderApp());
            return;
          }
        }
        const resOut = Data.checkOut(r.c);
        if (resOut.success) {
          toast(`Guest ${r.g} checked out. Room ${r.n} marked Dirty for housekeeping.`, 'ok');
          closeModal();
          renderApp();
        } else {
          toast(resOut.error || 'Failed to check out.', 'bad');
        }
      };
    }

    const btnCancel = $('btnDetailCancel');
    if (btnCancel) {
      btnCancel.onclick = async () => {
        const ok = await confirmDialog(`Cancel reservation ${r.c} for ${r.g}?`, 'Cancel Reservation', { danger: true });
        if (ok) {
          const resCancel = Data.cancelReservation(r.c, 'Staff');
          if (resCancel.success) {
            toast(`Reservation ${r.c} cancelled. ${(resCancel.retainedFee || resCancel.fee || 0) > 0 ? 'Cancellation fee retained: ' + peso(resCancel.retainedFee || resCancel.fee) : 'Deposit refunded.'}`, 'ok');
            closeModal();
            renderApp();
          } else {
            toast(resCancel.error || 'Cancellation failed', 'bad');
          }
        }
      };
    }
  };

  /* Staff New Reservation Modal */
  function openNewStaffReservation(prefills = {}) {
    const types = Data.getTypes();
    let initialType = types[0];
    let ci = today();
    let co = addDays(ci, 2);

    const formHtml = `
      <form id="staffNewResForm" onsubmit="return false;">
        <div class="modal-form-grid">

          <!-- 1. Guest Identification Card -->
          <div class="modal-card">
            <div class="modal-card-head">
              <span class="modal-card-title">
                <span class="ic" data-icon="clipboard"></span> 1. Guest Identification
              </span>
              <span id="newResSourceBadge" class="modal-card-badge">Advance Staff Booking</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div class="field" style="margin-bottom: 0;">
                <label for="newResSource">Booking Source *</label>
                <select id="newResSource">
                  <option value="Staff-assisted">Staff-assisted (Advance)</option>
                  <option value="Walk-in">Walk-in (Front Desk)</option>
                </select>
                <span class="field-hint">Select booking channel or direct walk-in</span>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResGuest">Guest Full Name *</label>
                <input type="text" id="newResGuest" value="${esc(prefills.guest || '')}" required placeholder="e.g. Maria Santos">
                <span class="field-hint">Primary registered guest</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div class="field" style="margin-bottom: 0;">
                <label for="newResPhone">Contact Phone *</label>
                <input type="tel" id="newResPhone" value="${esc(prefills.phone || '')}" placeholder="0917-000-0000" required>
                <span class="field-hint">PH mobile number</span>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResIdType" id="lblNewResIdType">Gov ID Type</label>
                <select id="newResIdType">
                  <option value="">Select ID Type...</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="Passport">Passport</option>
                  <option value="UMID">UMID</option>
                  <option value="National ID">National ID</option>
                  <option value="Company ID">Company ID</option>
                </select>
                <span class="field-hint" id="hintNewResIdType">Optional for advance</span>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResIdNumber" id="lblNewResIdNumber">Gov ID Number</label>
                <input type="text" id="newResIdNumber" placeholder="e.g. N01-12-345678">
                <span class="field-hint" id="hintNewResIdNumber">Official ID number</span>
              </div>
            </div>

            <div id="newResWalkinNotice" style="display: none; margin-top: 10px; padding: 8px 12px; background: var(--warn-tint); border: 1px solid #E6CE94; border-radius: var(--r); font-size: 12px; color: var(--warn);">
              <strong>Front Desk Policy:</strong> Valid government ID verification is mandatory for immediate walk-in reservations.
            </div>
          </div>

          <!-- 2. Stay Schedule & Room Assignment Card -->
          <div class="modal-card">
            <div class="modal-card-head">
              <span class="modal-card-title">
                <span class="ic" data-icon="bed"></span> 2. Stay Schedule & Room Assignment
              </span>
              <span id="newResNightsBadge" class="modal-card-badge">2 Nights Stay</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div class="field" style="margin-bottom: 0;">
                <label for="newResCi">Check-In Date *</label>
                <input type="date" id="newResCi" value="${ci}" min="${today()}" required>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResCo">Check-Out Date *</label>
                <input type="date" id="newResCo" value="${co}" min="${addDays(ci, 1)}" required>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResGuests">Guests Count *</label>
                <input type="number" id="newResGuests" min="1" max="6" value="2" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px;">
              <div class="field" style="margin-bottom: 0;">
                <label for="newResType">Room Category *</label>
                <select id="newResType">
                  ${types.map(t => `<option value="${esc(t.n)}">${esc(t.n)} &mdash; ${peso(t.r)}/night (Max ${t.g} guests)</option>`).join('')}
                </select>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <label for="newResRoom">Assigned Room *</label>
                <select id="newResRoom">
                  <!-- Dynamically populated based on dates -->
                </select>
                <span class="field-hint" id="newResRoomAvailabilityHint">Checking inventory...</span>
              </div>
            </div>
          </div>

          <!-- 3. Notes & Promo Code Row -->
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px;">
            <div class="modal-card" style="margin-bottom: 0;">
              <div class="modal-card-head">
                <span class="modal-card-title">Special Requests / Notes</span>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <textarea id="newResNotes" rows="2" placeholder="Late arrival, high floor, quiet room, extra pillows…" style="font-size: 13px;"></textarea>
              </div>
            </div>

            <div class="modal-card" style="margin-bottom: 0;">
              <div class="modal-card-head">
                <span class="modal-card-title">Promotional Code</span>
              </div>
              <div class="field" style="margin-bottom: 0;">
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="newResPromo" placeholder="e.g. WELCOME10" style="text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">
                  <button type="button" class="btn-secondary btn-sm" id="btnNewResApplyPromo">Apply</button>
                </div>
                <div id="newResPromoMsg" class="text-xs" style="margin-top: 4px; min-height: 16px;"></div>
              </div>
            </div>
          </div>

          <!-- 4. Folio Estimate & Payment Settlement -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- Folio Estimate Receipt Card -->
            <div class="folio-receipt-card">
              <div class="modal-card-head" style="margin-bottom: 8px; border-bottom: 1px solid #DDD1BC;">
                <span class="modal-card-title" style="color: var(--ink);">Folio Estimate</span>
                <span class="text-xs text-muted">Inclusive of 12% VAT</span>
              </div>
              <div class="folio-receipt-row">
                <span>Room Rate:</span>
                <span class="val" id="newResRateDisplay">₱0 / night</span>
              </div>
              <div class="folio-receipt-row">
                <span>Stay Length:</span>
                <span class="val" id="newResNightsDisplay">0 nights</span>
              </div>
              <div class="folio-receipt-row" id="newResDiscountRow">
                <span>Promo Discount:</span>
                <span class="val" id="newResDiscountDisplay" style="color: var(--ok);">&minus; ₱0</span>
              </div>
              <div class="folio-receipt-total">
                <span class="lbl">Net Total:</span>
                <span class="amt" id="newResTotalDisplay">₱0</span>
              </div>
            </div>

            <!-- Payment Settlement Card -->
            <div class="modal-card" style="margin-bottom: 0;">
              <div class="modal-card-head">
                <span class="modal-card-title">Payment Settlement</span>
              </div>
              <div class="field" style="margin-bottom: 8px;">
                <label for="newResPaymentOption">Payment Collection</label>
                <select id="newResPaymentOption">
                  <option value="dep" selected>50% Deposit (Hold as Confirmed)</option>
                  <option value="full">Full Payment (Hold as Confirmed)</option>
                  <option value="none">No payment yet (Hold as Pending)</option>
                </select>
              </div>
              <div class="field" style="margin-bottom: 6px;">
                <label for="newResPaymentMethod">Payment Method</label>
                <select id="newResPaymentMethod">
                  <option value="Cash">Cash at Front Desk</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div class="text-xs text-muted" style="margin-top: 4px; line-height: 1.4;">
                Simulated transaction. Generates official receipt and opens active folio.
              </div>
            </div>
          </div>

        </div>
      </form>
    `;

    const footerHtml = `
      <div class="modal-footer-info">
        <span class="status-dot status-dot--ok" id="newResFooterDot"></span>
        <span id="newResFooterStatusText" style="font-weight: 600;">Status: Confirmed Reservation</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitNewRes">Create Reservation</button>
      </div>
    `;

    showModal('New Front Desk Reservation', formHtml, footerHtml, {
      maxWidth: '760px',
      subtitle: 'Direct walk-in or advance reservation with real-time room assignment & folio billing'
    });

    let appliedPromo = null;

    const updateCalc = () => {
      const typeName = $('newResType').value;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      const dIn = $('newResCi').value;
      const dOut = $('newResCo').value;
      const nights = Math.max(1, dateDiff(dIn, dOut));

      // Update stay badge
      const nightsBadge = $('newResNightsBadge');
      if (nightsBadge) {
        nightsBadge.textContent = `${nights} Night${nights > 1 ? 's' : ''} Stay`;
      }

      // Free rooms
      const free = Data.freeRooms(typeName, dIn, dOut);
      const roomSelect = $('newResRoom');
      const hintEl = $('newResRoomAvailabilityHint');

      if (free.length > 0) {
        roomSelect.innerHTML = free.map(rm => `<option value="${rm}">Room ${rm} (Clean & Vacant)</option>`).join('');
        if (hintEl) {
          hintEl.textContent = `${free.length} clean room(s) available for these dates`;
          hintEl.style.color = 'var(--ok)';
        }
      } else {
        roomSelect.innerHTML = `<option value="">No clean rooms available</option>`;
        if (hintEl) {
          hintEl.textContent = `No vacant clean rooms available for these dates`;
          hintEl.style.color = 'var(--bad)';
        }
      }

      const baseTotal = nights * typeObj.r;
      let discount = 0;
      if (appliedPromo) {
        if (appliedPromo.type === 'percent') {
          discount = Math.round(baseTotal * (appliedPromo.value / 100));
        } else if (appliedPromo.type === 'fixed') {
          discount = Math.min(baseTotal, appliedPromo.value);
        }
      }
      const netTotal = Math.max(0, baseTotal - discount);

      $('newResRateDisplay').textContent = `${peso(typeObj.r)} / night`;
      $('newResNightsDisplay').textContent = `${nights} night${nights > 1 ? 's' : ''}`;
      $('newResDiscountDisplay').innerHTML = discount > 0 ? `&minus; ${peso(discount)}` : peso(0);
      $('newResTotalDisplay').textContent = peso(netTotal);

      // Update footer status pill
      const payOption = $('newResPaymentOption').value;
      const dotEl = $('newResFooterDot');
      const statusTextEl = $('newResFooterStatusText');
      if (dotEl && statusTextEl) {
        if (payOption === 'none') {
          dotEl.className = 'status-dot status-dot--warn';
          statusTextEl.textContent = 'Status: Pending (Unpaid Hold)';
        } else if (payOption === 'dep') {
          dotEl.className = 'status-dot status-dot--ok';
          statusTextEl.textContent = 'Status: Confirmed (50% Deposit)';
        } else {
          dotEl.className = 'status-dot status-dot--ok';
          statusTextEl.textContent = 'Status: Confirmed (Fully Paid)';
        }
      }
    };

    // Date synchronization
    $('newResCi').onchange = () => {
      const ciVal = $('newResCi').value;
      const nextDay = addDays(ciVal, 1);
      $('newResCo').min = nextDay;
      if ($('newResCo').value <= ciVal) {
        $('newResCo').value = nextDay;
      }
      updateCalc();
    };

    $('newResCo').onchange = () => {
      const ciVal = $('newResCi').value;
      if ($('newResCo').value <= ciVal) {
        $('newResCo').value = addDays(ciVal, 1);
      }
      updateCalc();
    };

    $('newResType').onchange = updateCalc;
    $('newResPaymentOption').onchange = updateCalc;

    // Booking source switch logic
    $('newResSource').onchange = () => {
      const isWalkin = $('newResSource').value === 'Walk-in';
      const badge = $('newResSourceBadge');
      const notice = $('newResWalkinNotice');
      const lblType = $('lblNewResIdType');
      const lblNum = $('lblNewResIdNumber');
      const hintType = $('hintNewResIdType');
      const hintNum = $('hintNewResIdNumber');

      if (isWalkin) {
        if (badge) {
          badge.textContent = 'Walk-in (Front Desk)';
          badge.className = 'modal-card-badge badge-walkin';
        }
        if (notice) notice.style.display = 'block';
        if (lblType) lblType.innerHTML = 'Gov ID Type <span style="color:var(--bad)">*</span>';
        if (lblNum) lblNum.innerHTML = 'Gov ID Number <span style="color:var(--bad)">*</span>';
        if (hintType) {
          hintType.textContent = 'Required for walk-in';
          hintType.style.color = 'var(--warn)';
        }
        if (hintNum) {
          hintNum.textContent = 'Required for walk-in';
          hintNum.style.color = 'var(--warn)';
        }
      } else {
        if (badge) {
          badge.textContent = 'Advance Staff Booking';
          badge.className = 'modal-card-badge';
        }
        if (notice) notice.style.display = 'none';
        if (lblType) lblType.textContent = 'Gov ID Type';
        if (lblNum) lblNum.textContent = 'Gov ID Number';
        if (hintType) {
          hintType.textContent = 'Optional for advance';
          hintType.style.color = '';
        }
        if (hintNum) {
          hintNum.textContent = 'Official ID number';
          hintNum.style.color = '';
        }
      }
    };

    $('btnNewResApplyPromo').onclick = () => {
      const code = ($('newResPromo').value || '').trim().toUpperCase();
      const typeName = $('newResType').value;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      const nights = Math.max(1, dateDiff($('newResCi').value, $('newResCo').value));
      const resVal = Data.validatePromo(code, { type: 'rooms', spend: nights * typeObj.r, nights, roomType: typeName });

      if (resVal.valid) {
        appliedPromo = resVal.promo;
        $('newResPromoMsg').textContent = `✓ Valid promo: ${appliedPromo.title}`;
        $('newResPromoMsg').style.color = 'var(--ok)';
      } else {
        appliedPromo = null;
        $('newResPromoMsg').textContent = resVal.error || resVal.reason || 'Invalid promo code';
        $('newResPromoMsg').style.color = 'var(--bad)';
      }
      updateCalc();
    };

    updateCalc();

    $('btnSubmitNewRes').onclick = () => {
      const g = ($('newResGuest').value || '').trim();
      if (!g) {
        toast('Please enter guest full name', 'warn');
        $('newResGuest').focus();
        return;
      }
      const phone = ($('newResPhone').value || '').trim();
      if (!phone) {
        toast('Please enter contact mobile number', 'warn');
        $('newResPhone').focus();
        return;
      }

      const source = $('newResSource').value;
      const idType = ($('newResIdType').value || '').trim();
      const idNumber = ($('newResIdNumber').value || '').trim();

      if (source === 'Walk-in') {
        if (!idType) {
          toast('Government ID Type is required for Walk-in guest registration', 'warn');
          $('newResIdType').focus();
          return;
        }
        if (!idNumber) {
          toast('Government ID Number is required for Walk-in guest registration', 'warn');
          $('newResIdNumber').focus();
          return;
        }
      }

      const typeName = $('newResType').value;
      const roomNumVal = $('newResRoom').value;
      if (!roomNumVal) {
        toast('No available rooms for the selected category and dates', 'bad');
        return;
      }
      const roomNum = parseInt(roomNumVal, 10);
      const ciVal = $('newResCi').value;
      const coVal = $('newResCo').value;
      if (coVal <= ciVal) {
        toast('Check-out date must be after check-in date', 'warn');
        return;
      }

      const guests = parseInt($('newResGuests').value, 10) || 1;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      if (typeObj && guests > typeObj.g) {
        toast(`Party size (${guests} guests) exceeds max capacity for ${typeName} (max ${typeObj.g} guests)`, 'warn');
        return;
      }

      const notes = ($('newResNotes').value || '').trim();
      const payOption = $('newResPaymentOption').value;
      const payMethod = $('newResPaymentMethod').value;

      const nights = dateDiff(ciVal, coVal);
      const baseTotal = nights * typeObj.r;
      let discount = 0;
      if (appliedPromo) {
        if (appliedPromo.type === 'percent') discount = Math.round(baseTotal * (appliedPromo.value / 100));
        else if (appliedPromo.type === 'fixed') discount = Math.min(baseTotal, appliedPromo.value);
        Data.incrementPromo(appliedPromo.code);
      }
      const netTotal = Math.max(0, baseTotal - discount);

      let initialPayAmt = 0;
      let initialStatus = 'Pending';
      if (payOption === 'dep') {
        initialPayAmt = Math.ceil(netTotal * (CONFIG.depositPct / 100));
        initialStatus = 'Confirmed';
      } else if (payOption === 'full') {
        initialPayAmt = netTotal;
        initialStatus = 'Confirmed';
      }

      try {
        const newRes = Data.createReservation({
          source,
          createdBy: null,
          idType: idType || '',
          idNumber: idNumber || '',
          g,
          ph: phone,
          email: '',
          t: typeName,
          n: roomNum,
          rt: typeObj.r,
          i: ciVal,
          o: coVal,
          gu: guests,
          m: payMethod,
          st: initialStatus,
          note: notes,
          promo: appliedPromo ? appliedPromo.code : null
        });

        if (discount > 0) {
          Data.addCharge(newRes, `Promo discount: ${appliedPromo.code}`, -discount, 'Promotion');
        }

        if (initialPayAmt > 0) {
          Data.addPayment(newRes, initialPayAmt, payMethod, payOption === 'dep' ? 'Deposit' : 'Payment', 'Initial Front Desk Booking');
        }

        toast(`Reservation ${newRes.c} created successfully (${initialStatus})`, 'ok');
        closeModal();
        renderApp();
      } catch (err) {
        toast(err.message || 'Error creating reservation', 'bad');
      }
    };
  }

  // Auto-refresh when Data dispatches change
  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  // Single initialization on load
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