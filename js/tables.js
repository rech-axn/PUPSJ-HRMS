/* ==========================================================================
   PUPSJ Hotel & Restaurant — Tables & Floor Management (tables.js)
   Floor grid with live table status, table reservations lifecycle
   (Confirm, Seat, Complete, Cancel, No-show), best-fit seating,
   and dynamic derivation from active POS orders and bookings.
   ========================================================================== */
'use strict';

(function () {
  let activeTab = 'floor'; // 'floor' | 'reservations'
  let areaFilter = '';

  function init() {
    renderApp();
  }

  function getDynamicTableStatus(t, orders, tableRes) {
    const num = t.num != null ? t.num : t.id;
    // Check active dine-in orders
    const activeOrder = orders.find(o => 
      o.type === 'Dine-in' && 
      (Number(o.table) === Number(num) || Number(o.tableNo) === Number(num)) && 
      o.status !== 'Cancelled' && 
      !(o.status === 'Served' && (o.payStatus === 'Paid' || o.payStatus === 'Room folio'))
    );

    if (activeOrder) {
      return { status: 'Occupied', activeOrder };
    }

    // If manual status is Needs cleaning, preserve it until cleared
    if (t.st === 'Needs cleaning' || t.status === 'Needs cleaning') {
      return { status: 'Needs cleaning', activeOrder: null };
    }

    // Check table reservations today
    const nowMin = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(nowTime()) : 0;
    const activeRes = tableRes.find(r => {
      if (r.date !== today()) return false;
      if (Number(r.tableNum) !== Number(num) && Number(r.table) !== Number(num)) return false;
      if (r.status !== 'Confirmed' && r.status !== 'Seated') return false;
      const rMin = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(r.time) : 0;
      return Math.abs(nowMin - rMin) <= 90;
    });

    if (activeRes) {
      if (activeRes.status === 'Seated') {
        return { status: 'Occupied', activeOrder: null, activeRes };
      }
      return { status: 'Reserved', activeOrder: null, activeRes };
    }

    return { status: t.st || t.status || 'Free', activeOrder: null };
  }

  function renderApp() {
    const app = $('tablesApp');
    if (!app) return;

    const tables = Data.getTables();
    const tableRes = Data.getTableRes();
    const orders = Data.getOrders();

    const tableStatuses = tables.map(t => ({ table: t, ...getDynamicTableStatus(t, orders, tableRes) }));
    const freeCount = tableStatuses.filter(s => s.status === 'Free').length;
    const occupiedCount = tableStatuses.filter(s => s.status === 'Occupied').length;
    const needsCleaningCount = tableStatuses.filter(s => s.status === 'Needs cleaning').length;
    const pendingResCount = tableRes.filter(r => r.status === 'Pending').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">RESTAURANT &amp; BAR</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Table Seating &amp; Floor Management</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btnWalkInSeating">
            <span class="ic" data-icon="users">[ICON: users]</span> Walk-in Seating
          </button>
          <a class="btn" href="orders.html">
            <span class="ic" data-icon="tray">[ICON: tray]</span> Go to POS Orders
          </a>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Free Tables</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${freeCount} / ${tables.length}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Currently Occupied</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${occupiedCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Needs Cleaning</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${needsCleaningCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Pending Bookings</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${pendingResCount}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab-btn ${activeTab === 'floor' ? 'active' : ''}" id="tabBtnFloor">
          <span class="ic" data-icon="table">[ICON: table]</span> Restaurant Floor Plan Grid
        </button>
        <button class="tab-btn ${activeTab === 'reservations' ? 'active' : ''}" id="tabBtnTableRes">
          <span class="ic" data-icon="calendar">[ICON: calendar]</span> Table Reservations List (${tableRes.length})
        </button>
      </div>

      <!-- View 1: Floor Plan Grid -->
      <div id="viewFloor" style="${activeTab === 'floor' ? '' : 'display:none;'}">
        <div class="card" style="padding: 14px 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span class="text-sm text-secondary">Filter Area:</span>
              <button class="btn-secondary btn-sm ${areaFilter === '' ? 'btn-active' : ''}" data-area="">All Areas</button>
              <button class="btn-secondary btn-sm ${areaFilter === 'Main Dining' ? 'btn-active' : ''}" data-area="Main Dining">Main Dining</button>
              <button class="btn-secondary btn-sm ${areaFilter === 'Garden Terrace' ? 'btn-active' : ''}" data-area="Garden Terrace">Garden Terrace</button>
              <button class="btn-secondary btn-sm ${areaFilter === 'Private Room' ? 'btn-active' : ''}" data-area="Private Room">Private Room</button>
              <button class="btn-secondary btn-sm ${areaFilter === 'Bar Lounge' ? 'btn-active' : ''}" data-area="Bar Lounge">Bar Lounge</button>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;" id="floorGridContainer">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- View 2: Table Reservations List -->
      <div id="viewTableRes" style="${activeTab === 'reservations' ? '' : 'display:none;'}">
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Guest Name</th>
                  <th>Phone</th>
                  <th>Date &amp; Time</th>
                  <th>Party</th>
                  <th>Assigned Table</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="tblResBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    renderFloorGrid();
    renderTableResList();
  }

  function bindEvents() {
    $('tabBtnFloor').onclick = () => {
      activeTab = 'floor';
      $('tabBtnFloor').classList.add('active');
      $('tabBtnTableRes').classList.remove('active');
      $('viewFloor').style.display = '';
      $('viewTableRes').style.display = 'none';
      renderFloorGrid();
    };

    $('tabBtnTableRes').onclick = () => {
      activeTab = 'reservations';
      $('tabBtnTableRes').classList.add('active');
      $('tabBtnFloor').classList.remove('active');
      $('viewTableRes').style.display = '';
      $('viewFloor').style.display = 'none';
      renderTableResList();
    };

    document.querySelectorAll('[data-area]').forEach(btn => {
      btn.onclick = () => {
        areaFilter = btn.dataset.area;
        document.querySelectorAll('[data-area]').forEach(b => b.classList.toggle('btn-active', b === btn));
        renderFloorGrid();
      };
    });

    $('btnWalkInSeating').onclick = () => openWalkInSeatingModal();
  }

  function renderFloorGrid() {
    const container = $('floorGridContainer');
    if (!container) return;

    let tables = Data.getTables();
    const orders = Data.getOrders();
    const tableRes = Data.getTableRes();

    if (areaFilter) {
      tables = tables.filter(t => (t.area || '').toLowerCase().includes(areaFilter.toLowerCase()));
    }

    container.innerHTML = tables.map(t => {
      const num = t.num != null ? t.num : t.id;
      const { status: st, activeOrder, activeRes } = getDynamicTableStatus(t, orders, tableRes);

      let pillClass = 'pill--ok';
      let borderCol = 'var(--ok)';
      if (st === 'Occupied') { pillClass = 'pill--bad'; borderCol = 'var(--bad)'; }
      else if (st === 'Reserved') { pillClass = 'pill--info'; borderCol = 'var(--info)'; }
      else if (st === 'Needs cleaning') { pillClass = 'pill--warn'; borderCol = 'var(--warn)'; }

      return `
        <div class="card" style="padding: 16px; border-top: 4px solid ${borderCol};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <b style="font-size: 18px;">Table ${num}</b>
              <div class="text-xs text-secondary">${esc(t.area)}</div>
            </div>
            <span class="pill ${pillClass}">${st}</span>
          </div>

          <div style="margin: 8px 0; font-size: 13px;">
            <span class="text-secondary">Capacity:</span> <b>${t.seats} Guests</b>
          </div>

          ${activeOrder ? `
            <div style="background: rgba(0,0,0,0.03); padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 12px;">
              <div style="display:flex; justify-content:space-between;">
                <span>Order: <b>${activeOrder.code}</b></span>
                <span class="pill pill--muted" style="font-size:10px;">${activeOrder.status}</span>
              </div>
              <div style="margin-top: 4px; display:flex; justify-content:space-between; color: var(--gold-ink); font-weight:600;">
                <span>Total: ${peso(activeOrder.subtotal || 0)}</span>
                <a href="orders.html?code=${activeOrder.code}" style="color:var(--brand-ink); text-decoration:underline;">POS Bill &rarr;</a>
              </div>
            </div>
          ` : activeRes ? `
            <div style="background: rgba(0,0,0,0.03); padding: 8px; border-radius: 6px; margin: 8px 0; font-size: 12px;">
              <span>Reserved for: <b>${esc(activeRes.guestName || activeRes.guest)}</b> (${activeRes.time})</span>
            </div>
          ` : ''}

          <div style="display: flex; gap: 6px; border-top: 1px solid var(--line); padding-top: 10px; margin-top: 10px;">
            ${st === 'Free' ? `
              <button class="btn btn-sm btn-block" onclick="seatWalkInAtTable(${num})">Seat Party</button>
            ` : st === 'Occupied' ? `
              <button class="btn-secondary btn-sm btn-block" onclick="setTableStatus(${num}, 'Needs cleaning')">Vacate Table</button>
            ` : st === 'Needs cleaning' ? `
              <button class="btn btn-sm btn-block" style="background:var(--ok);color:#fff;" onclick="setTableStatus(${num}, 'Free')">Mark Clean</button>
            ` : `
              <button class="btn-secondary btn-sm btn-block" onclick="setTableStatus(${num}, 'Free')">Release</button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTableResList() {
    const tbody = $('tblResBody');
    if (!tbody) return;

    const list = Data.getTableRes();
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No table reservations on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => {
      const guestName = r.guestName || r.guest || 'Guest';
      const party = r.partySize != null ? r.partySize : (r.party || 2);
      const tableAssigned = r.tableNum != null ? r.tableNum : (r.table || null);

      let pillClass = 'pill--muted';
      if (r.status === 'Confirmed') pillClass = 'pill--info';
      else if (r.status === 'Seated') pillClass = 'pill--ok';
      else if (r.status === 'Pending') pillClass = 'pill--warn';
      else if (r.status === 'Cancelled' || r.status === 'No-show') pillClass = 'pill--bad';

      return `
        <tr>
          <td><b>${r.code}</b></td>
          <td><b>${esc(guestName)}</b></td>
          <td>${esc(r.phone || '&mdash;')}</td>
          <td>${fmtDate(r.date)} at <b>${esc(r.time)}</b></td>
          <td><b>${party} Guests</b></td>
          <td>${tableAssigned ? `Table ${tableAssigned}` : '<span class="text-muted text-xs">Unassigned</span>'}</td>
          <td><span class="pill ${pillClass}">${r.status}</span></td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              ${r.status === 'Pending' ? `
                <button class="btn-secondary btn-sm" onclick="updateTableResStatus('${r.code}', 'Confirmed')">Confirm</button>
                <button class="btn-ghost btn-sm" style="color:var(--bad);" onclick="updateTableResStatus('${r.code}', 'Cancelled')">Cancel</button>
              ` : ''}
              ${r.status === 'Confirmed' ? `
                <button class="btn btn-sm" onclick="openSeatResModal('${r.code}')">Seat at Table</button>
                <button class="btn-ghost btn-sm" style="color:var(--bad);" onclick="updateTableResStatus('${r.code}', 'No-show')">No-show</button>
                <button class="btn-ghost btn-sm" style="color:var(--bad);" onclick="updateTableResStatus('${r.code}', 'Cancelled')">Cancel</button>
              ` : ''}
              ${r.status === 'Seated' ? `
                <button class="btn-secondary btn-sm" onclick="completeTableReservation('${r.code}')">Complete &amp; Clear</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.setTableStatus = function (tableNum, newStatus) {
    const tables = Data.getTables();
    const t = tables.find(x => x.num === tableNum || x.id === tableNum);
    if (!t) return;

    t.st = newStatus;
    t.status = newStatus;
    Data.saveTables(tables);
    Data.audit('Table Status', 'table', String(tableNum), `Table ${tableNum} marked as ${newStatus}`);
    toast(`Table ${tableNum} updated to ${newStatus}`, 'ok');
    renderApp();
  };

  window.seatWalkInAtTable = function (tableNum) {
    setTableStatus(tableNum, 'Occupied');
  };

  window.updateTableResStatus = function (code, status) {
    const list = Data.getTableRes();
    const item = list.find(r => r.code === code);
    if (!item) return;

    item.status = status;
    Data.saveTableRes(list);

    // If cancelled or no-show, release table if assigned
    if ((status === 'Cancelled' || status === 'No-show') && (item.tableNum || item.table)) {
      const tNum = item.tableNum || item.table;
      const tables = Data.getTables();
      const t = tables.find(x => x.num === tNum || x.id === tNum);
      if (t && t.st === 'Reserved') {
        t.st = 'Free';
        t.status = 'Free';
        Data.saveTables(tables);
      }
    }

    Data.audit('Table Reservation', 'tableRes', code, `Reservation ${code} for ${item.guestName || item.guest} marked as ${status}`);
    toast(`Booking ${code} marked as ${status}`, 'ok');
    renderApp();
  };

  window.completeTableReservation = function (code) {
    const list = Data.getTableRes();
    const item = list.find(r => r.code === code);
    if (!item) return;

    item.status = 'Completed';
    Data.saveTableRes(list);

    const tNum = item.tableNum || item.table;
    if (tNum) {
      setTableStatus(tNum, 'Needs cleaning');
    }

    Data.audit('Table Reservation Completed', 'tableRes', code, `Completed dining for ${item.guestName || item.guest}`);
    toast(`Reservation ${code} completed. Table ${tNum || ''} marked for cleaning.`, 'ok');
    renderApp();
  };

  window.openSeatResModal = function (code) {
    const list = Data.getTableRes();
    const item = list.find(r => r.code === code);
    if (!item) return;

    const party = item.partySize != null ? item.partySize : (item.party || 2);
    const guestName = item.guestName || item.guest || 'Guest';
    const freeTables = Data.getTables().filter(t => (t.st || t.status) === 'Free');

    const bodyHtml = `
      <form id="seatResForm" style="font-size: 13px;">
        <p class="text-sm">Assign party of <b>${party} guests</b> (${esc(guestName)}) to an available table:</p>
        <div class="field">
          <label>Select Table *</label>
          <select id="seatTableSelect">
            ${freeTables.map(t => `
              <option value="${t.num}" ${t.seats >= party ? 'selected' : ''}>
                Table ${t.num} (${t.seats} seats &middot; ${t.area}) ${t.seats < party ? '(Warning: Smaller capacity)' : ''}
              </option>
            `).join('')}
            ${freeTables.length === 0 ? `<option value="">No free tables available right now</option>` : ''}
          </select>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnConfirmSeatRes" ${freeTables.length === 0 ? 'disabled' : ''}>Confirm &amp; Seat</button>
      </div>
    `;

    showModal(`Seat Guest &mdash; ${guestName}`, bodyHtml, footerHtml, { maxWidth: '440px' });

    $('btnConfirmSeatRes').onclick = () => {
      const tableNum = parseInt($('seatTableSelect').value, 10);
      if (!tableNum) return;

      item.table = tableNum;
      item.tableNum = tableNum;
      item.status = 'Seated';
      Data.saveTableRes(list);

      // Set table to Occupied
      const tables = Data.getTables();
      const t = tables.find(x => x.num === tableNum || x.id === tableNum);
      if (t) {
        t.st = 'Occupied';
        t.status = 'Occupied';
        Data.saveTables(tables);
      }

      Data.audit('Seat Reservation', 'tableRes', code, `Seated ${guestName} at Table ${tableNum}`);
      toast(`Party seated at Table ${tableNum}`, 'ok');
      closeModal();
      renderApp();
    };
  };

  function openWalkInSeatingModal() {
    const freeTables = Data.getTables().filter(t => (t.st || t.status) === 'Free');

    const bodyHtml = `
      <form id="walkInSeatingForm" style="font-size: 13px;">
        <div class="field">
          <label>Party / Guest Name</label>
          <input type="text" id="walkInGuestName" placeholder="e.g. Walk-in Guest (Table)">
        </div>
        <div class="field">
          <label>Number of Guests (Party Size)</label>
          <input type="number" id="walkInPartySize" min="1" max="12" value="2">
        </div>
        <div class="field">
          <label>Select Free Table *</label>
          <select id="walkInTableSelect">
            ${freeTables.map(t => `<option value="${t.num}">Table ${t.num} (${t.seats} seats &middot; ${t.area})</option>`).join('')}
            ${freeTables.length === 0 ? `<option value="">No free tables currently available</option>` : ''}
          </select>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnConfirmWalkInSeat" ${freeTables.length === 0 ? 'disabled' : ''}>Seat Walk-in Party</button>
      </div>
    `;

    showModal('Immediate Walk-in Seating', bodyHtml, footerHtml, { maxWidth: '440px' });

    $('btnConfirmWalkInSeat').onclick = () => {
      const tableNum = parseInt($('walkInTableSelect').value, 10);
      const name = ($('walkInGuestName').value || 'Walk-in Guest').trim();
      const party = parseInt($('walkInPartySize').value, 10) || 2;

      if (!tableNum) return;

      const tables = Data.getTables();
      const t = tables.find(x => x.num === tableNum || x.id === tableNum);
      if (t) {
        t.st = 'Occupied';
        t.status = 'Occupied';
        Data.saveTables(tables);
      }

      Data.audit('Walk-in Seating', 'table', String(tableNum), `Seated walk-in party of ${party} (${name}) at Table ${tableNum}`);
      toast(`Party seated at Table ${tableNum}`, 'ok');
      closeModal();
      renderApp();
    };
  }

  // Auto-refresh when Data dispatches change
  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  // Safe single initialization
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
