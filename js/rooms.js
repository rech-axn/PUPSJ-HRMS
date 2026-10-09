/* ==========================================================================
   PUPSJ Hotel & Restaurant — Room Inventory Management (rooms.js)
   Room inventory table, dynamic derived status, add/edit/delete room,
   canonical maintenance synchronization, and links to types and promos.
   ========================================================================== */
'use strict';

(function () {
  let statusFilter = '';
  let typeFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 12;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('roomsApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getRoomsWithStatus() {
    const rooms = Data.getRooms();
    const reservations = Data.getReservations();
    const td = today();

    return rooms.map(rm => {
      const num = Number(rm.n);
      const activeRes = reservations.find(r => Number(r.n) === num && r.st === 'Checked-in');
      const upcomingRes = reservations.find(r => Number(r.n) === num && (r.st === 'Confirmed' || r.st === 'Pending') && r.o > td && r.i <= td);

      const statusObj = Data.roomStatus(num) || { s: 'Available' };
      const currentStatus = statusObj.s; // 'Available', 'Occupied', 'Reserved', 'Cleaning' (Dirty), 'Maintenance'

      return {
        roomNum: num,
        type: rm.t,
        status: currentStatus,
        activeRes,
        upcomingRes
      };
    }).sort((a, b) => a.roomNum - b.roomNum);
  }

  function renderApp() {
    const app = $('roomsApp');
    if (!app) return;

    const rooms = getRoomsWithStatus();
    const availableCount = rooms.filter(r => r.status === 'Available').length;
    const occupiedCount = rooms.filter(r => r.status === 'Occupied' || r.status === 'Reserved').length;
    const dirtyCount = rooms.filter(r => r.status === 'Cleaning' || r.status === 'Dirty').length;
    const mxCount = rooms.filter(r => r.status === 'Maintenance').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">SETTINGS &amp; INVENTORY</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Physical Room Inventory</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a class="btn-secondary" href="roomtypes.html">
            <span class="ic" data-icon="clipboard">[ICON: clipboard]</span> Room Types
          </a>
          <a class="btn-secondary" href="promotions.html">
            <span class="ic" data-icon="tag">[ICON: tag]</span> Promotions
          </a>
          <button type="button" class="btn" id="btnAddRoom">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Add Room
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Inventory</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${rooms.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Ready &amp; Available</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${availableCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Occupied / Reserved</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${occupiedCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Cleaning / Turnover</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${dirtyCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Out of Service</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${mxCount}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="roomSearchInput">Search Inventory</label>
            <input type="text" id="roomSearchInput" placeholder="Room number or category…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="roomStatusFilter">Status</label>
            <select id="roomStatusFilter">
              <option value="">All Statuses</option>
              <option value="Available" ${statusFilter === 'Available' ? 'selected' : ''}>Available (Clean)</option>
              <option value="Occupied" ${statusFilter === 'Occupied' ? 'selected' : ''}>Occupied</option>
              <option value="Cleaning" ${statusFilter === 'Cleaning' ? 'selected' : ''}>Cleaning / Turnover</option>
              <option value="Maintenance" ${statusFilter === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 180px;">
            <label for="roomTypeFilter">Room Category</label>
            <select id="roomTypeFilter">
              <option value="">All Categories</option>
              ${Data.getTypes().map(t => `<option value="${esc(t.n)}" ${typeFilter === t.n ? 'selected' : ''}>${esc(t.n)}</option>`).join('')}
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetRoomFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Room #</th>
                <th>Category</th>
                <th style="text-align: right;">Nightly Rate</th>
                <th>Current Status</th>
                <th>Active Occupant / Next Stay</th>
                <th style="text-align: right;">Inventory Actions</th>
              </tr>
            </thead>
            <tbody id="roomsTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="roomsPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('roomSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('roomStatusFilter').onchange = (e) => { statusFilter = e.target.value; page = 1; renderTable(); };
    $('roomTypeFilter').onchange = (e) => { typeFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetRoomFilters').onclick = () => {
      searchQuery = '';
      statusFilter = '';
      typeFilter = '';
      $('roomSearchInput').value = '';
      $('roomStatusFilter').value = '';
      $('roomTypeFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnAddRoom').onclick = () => openAddRoomModal();
  }

  function getFilteredRooms() {
    const rooms = getRoomsWithStatus();
    return rooms.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (searchQuery) {
        const text = `${r.roomNum} ${r.type}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const tbody = $('roomsTableBody');
    const pgnEl = $('roomsPagination');
    if (!tbody) return;

    const types = Data.getTypes();
    const rateMap = {};
    types.forEach(t => { rateMap[t.n] = t.r; });

    const list = getFilteredRooms();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">No rooms found matching the search filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(r => {
      let pillClass = 'pill--ok';
      if (r.status === 'Occupied') pillClass = 'pill--info';
      else if (r.status === 'Cleaning' || r.status === 'Dirty') pillClass = 'pill--warn';
      else if (r.status === 'Maintenance') pillClass = 'pill--bad';

      let occupancyText = '<span class="text-muted text-xs">Vacant &middot; No active stay</span>';
      if (r.activeRes) {
        occupancyText = `<b>${esc(r.activeRes.g)}</b><div class="text-xs text-muted">Checked-in &middot; <a href="reservations.html?code=${esc(r.activeRes.c)}">${esc(r.activeRes.c)}</a></div>`;
      } else if (r.upcomingRes) {
        occupancyText = `<b>${esc(r.upcomingRes.g)}</b><div class="text-xs text-muted">Arrives: ${fmtDate(r.upcomingRes.i)} &middot; <a href="reservations.html?code=${esc(r.upcomingRes.c)}">${esc(r.upcomingRes.c)}</a></div>`;
      }

      return `
        <tr>
          <td><b style="font-size: 15px;">Room ${r.roomNum}</b></td>
          <td>${esc(r.type)}</td>
          <td style="text-align: right;">${peso(rateMap[r.type] || 3200)}</td>
          <td><span class="pill ${pillClass}">${esc(r.status)}</span></td>
          <td>${occupancyText}</td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              ${r.status === 'Available' ? `
                <a class="btn btn-sm" href="reservations.html?new=1&room=${r.roomNum}" title="Book this room">Book</a>
              ` : ''}
              <button type="button" class="btn-secondary btn-sm" onclick="openEditRoomModal(${r.roomNum})">Edit</button>
              <button type="button" class="btn-secondary btn-sm" onclick="toggleRoomMaintenance(${r.roomNum})">
                ${r.status === 'Maintenance' ? 'Restore' : 'Out of Service'}
              </button>
              <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deleteRoom(${r.roomNum})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const startIdx = pgn.startIndex != null ? pgn.startIndex : (pgn.startIdx != null ? pgn.startIdx : 0);
    const endIdx = pgn.endIndex != null ? pgn.endIndex : (pgn.endIdx != null ? pgn.endIdx : 0);
    const totalItems = pgn.total != null ? pgn.total : (pgn.totalItems != null ? pgn.totalItems : 0);

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${totalItems > 0 ? startIdx + 1 : 0}&ndash;${endIdx} of ${totalItems} rooms</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnRoomsPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages || 1}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= (pgn.totalPages || 1) ? 'disabled' : ''} id="btnRoomsNext">Next</button>
      </div>
    `;

    const prev = $('btnRoomsPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnRoomsNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  function openAddRoomModal() {
    const types = Data.getTypes();
    const rooms = Data.getRooms();

    const bodyHtml = `
      <form id="addRoomForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label for="newRoomNum">Room Number *</label>
          <input type="number" id="newRoomNum" min="100" max="999" required placeholder="e.g. 105, 204, 301">
        </div>
        <div class="field">
          <label for="newRoomType">Room Category / Type *</label>
          <select id="newRoomType" required>
            ${types.map(t => `<option value="${esc(t.n)}">${esc(t.n)} &mdash; ${peso(t.r)}/night</option>`).join('')}
          </select>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAddRoom">Add to Inventory</button>
      </div>
    `;

    showModal('Add Room to Inventory', bodyHtml, footerHtml, { maxWidth: '420px' });

    $('btnSubmitAddRoom').onclick = () => {
      const num = parseInt($('newRoomNum').value, 10);
      const type = $('newRoomType').value;

      if (!num || isNaN(num)) {
        toast('Please enter a valid room number', 'warn');
        return;
      }

      if (rooms.some(r => Number(r.n) === num)) {
        toast(`Room ${num} already exists in inventory!`, 'bad');
        return;
      }

      rooms.push({ n: num, t: type });
      Data.saveRooms(rooms);
      Data.setRoomHK(num, { s: 'Clean', p: '', a: 0 });
      Data.audit('Add Room', 'room', String(num), `Added Room ${num} (${type}) to inventory`);
      toast(`Room ${num} added successfully`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  window.openEditRoomModal = function (num) {
    const rooms = Data.getRooms();
    const rm = rooms.find(r => Number(r.n) === Number(num));
    if (!rm) return;

    // Check if room has active reservations
    const reservations = Data.getReservations();
    const hasActiveRes = reservations.some(r => Number(r.n) === Number(num) && (r.st === 'Checked-in' || (r.st === 'Confirmed' && r.o >= today())));
    if (hasActiveRes) {
      toast(`Room ${num} cannot be edited while it has active or upcoming reservations`, 'warn');
      return;
    }

    const types = Data.getTypes();
    const bodyHtml = `
      <form id="editRoomForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label>Room Number</label>
          <input type="number" value="${rm.n}" readonly>
        </div>
        <div class="field">
          <label for="editRoomType">Room Category / Type *</label>
          <select id="editRoomType" required>
            ${types.map(t => `<option value="${esc(t.n)}" ${t.n === rm.t ? 'selected' : ''}>${esc(t.n)} &mdash; ${peso(t.r)}/night</option>`).join('')}
          </select>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitEditRoom">Save Changes</button>
      </div>
    `;

    showModal(`Edit Room ${rm.n}`, bodyHtml, footerHtml, { maxWidth: '420px' });

    $('btnSubmitEditRoom').onclick = () => {
      rm.t = $('editRoomType').value;
      Data.saveRooms(rooms);
      Data.audit('Edit Room', 'room', String(num), `Updated Room ${num} type to ${rm.t}`);
      toast(`Room ${num} updated`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  window.toggleRoomMaintenance = function (num) {
    const isMaint = Data.isRoomUnderMaintenance(num);

    if (isMaint) {
      // Resolve maintenance tickets for this room
      const maint = Data.getMaintenance();
      const openTickets = maint.filter(m => m.room === Number(num) && m.status !== 'Resolved');
      openTickets.forEach(t => {
        t.status = 'Resolved';
        t.st = 'Resolved';
        t.resolved = today();
      });
      Data.saveMaintenance(maint);
      Data.setRoomHK(num, { s: 'Dirty', p: 'Standard' });
      Data.audit('Restore Room', 'room', String(num), `Room ${num} restored from Maintenance. Marked Dirty for turnover.`);
      toast(`Room ${num} restored from maintenance (sent to Housekeeping turnover)`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    } else {
      // Check upcoming reservations today
      const reservations = Data.getReservations();
      const activeRes = reservations.find(r => Number(r.n) === Number(num) && (r.st === 'Checked-in' || (r.st === 'Confirmed' && r.o >= today() && r.i <= today())));
      if (activeRes) {
        toast(`Cannot place Room ${num} out of service: Active reservation exists (${activeRes.c} for ${activeRes.g})`, 'bad');
        return;
      }

      // Create an out-of-service maintenance work order
      const maint = Data.getMaintenance();
      const id = Data.nextId('MNT-');
      maint.unshift({
        id,
        room: Number(num),
        issue: 'Scheduled Room Maintenance / Out of Service',
        priority: 'Medium',
        pri: 'Medium',
        outOfService: true,
        oos: true,
        assignedTo: 'Engineering',
        assigned: 'Engineering',
        notes: 'Placed out of service via Room Inventory panel',
        created: today(),
        status: 'Open',
        st: 'Open',
        resolved: null
      });
      Data.saveMaintenance(maint);
      Data.audit('Out of Service', 'room', String(num), `Room ${num} marked Out of Service (Work order ${id})`);
      toast(`Room ${num} is now Out of Service`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    }
  };

  window.deleteRoom = function (num) {
    const reservations = Data.getReservations();
    const hasActiveRes = reservations.some(r => Number(r.n) === Number(num) && (r.st === 'Checked-in' || (r.st === 'Confirmed' && r.o >= today())));
    if (hasActiveRes) {
      toast(`Room ${num} cannot be deleted because it has active or upcoming reservations`, 'bad');
      return;
    }

    if (confirm(`Are you sure you want to delete Room ${num} from inventory?`)) {
      let rooms = Data.getRooms();
      rooms = rooms.filter(r => Number(r.n) !== Number(num));
      Data.saveRooms(rooms);
      Data.audit('Delete Room', 'room', String(num), `Deleted Room ${num} from inventory`);
      toast(`Room ${num} deleted from inventory`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    }
  };

  // Safe single initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('pupsj:data-change', () => {
    if (initialized) renderApp();
  });
})();
