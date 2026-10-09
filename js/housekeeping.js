/* ==========================================================================
   PUPSJ Hotel & Restaurant — Housekeeping Operations (housekeeping.js)
   Room cleanliness status, cleaning priority, staff assignment,
   room turnover matrix, CSV export, and guest housekeeping requests queue.
   ========================================================================== */
'use strict';

(function () {
  let activeTab = 'rooms'; // 'rooms' | 'requests'
  const PRI_ORDER = ['Urgent', 'High', 'Medium', 'Low'];
  let page = 1;
  const pageSize = 12;
  let reqPage = 1;
  const reqPageSize = 10;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    try {
      renderApp();
    } catch (err) {
      console.error('Housekeeping initialization error:', err);
      const app = $('housekeepingApp');
      if (app) {
        app.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center; margin: 40px auto; max-width: 500px;">
            <div style="font-size: 36px; margin-bottom: 12px; color: var(--bad);"><span class="ic" data-icon="alert">[ICON: alert]</span></div>
            <h2 style="margin: 0 0 8px 0;">Housekeeping View Notice</h2>
            <p class="text-secondary" style="margin: 0 0 16px 0; font-size: 14px;">An issue occurred while loading turnover data: ${esc(err.message)}</p>
            <button class="btn" onclick="location.reload()">Refresh Page</button>
          </div>
        `;
      }
    }
  }

  function getHkStaff() {
    const allStaff = Data.getStaff();
    const hkStaff = allStaff.filter(s => s.active && (s.role === 'Housekeeping' || s.role === 'Manager'));
    return hkStaff.length ? hkStaff : allStaff.filter(s => s.active);
  }

  function getHousekeepingData() {
    const rooms = Data.getRooms();
    const reservations = Data.getReservations();
    const hkStore = Data.getHk();
    const td = today();

    return rooms.map(rm => {
      const roomNum = Number(rm.n);
      const hkRecord = hkStore.find(h => Number(h.n) === roomNum) || {
        n: roomNum,
        s: rm.st === 'Dirty' ? 'Dirty' : 'Clean',
        a: 0,
        p: '',
        assignedName: ''
      };

      // Determine active occupancy
      const occupiedRes = reservations.find(r => Number(r.rm != null ? r.rm : r.n) === roomNum && (r.st === 'Checked-in' || r.s === 'Checked-in'));
      const isOccupied = !!occupiedRes;
      const isMx = rm.st === 'Maintenance' || (typeof Data.isRoomUnderMaintenance === 'function' && Data.isRoomUnderMaintenance(roomNum));

      // Next arrival (upcoming confirmed or pending reservation)
      const nextRes = reservations
        .filter(r => Number(r.rm != null ? r.rm : r.n) === roomNum && (r.st === 'Confirmed' || r.st === 'Pending' || r.s === 'Confirmed' || r.s === 'Pending') && (r.co || r.o) > td)
        .sort((a, b) => (a.i || '').localeCompare(b.i || ''))[0];

      // Auto priority derivation based on next arrival
      let autoPri = 'Low';
      if (nextRes) {
        const diff = dateDiff(td, nextRes.ci || nextRes.i);
        if (diff <= 0) autoPri = 'Urgent';
        else if (diff === 1) autoPri = 'High';
        else if (diff <= 3) autoPri = 'Medium';
      }

      const isDirty = hkRecord.s === 'Dirty' || hkRecord.s === 'In progress' || rm.st === 'Dirty';
      const effectivePri = isDirty ? (hkRecord.p || autoPri) : 'Low';

      return {
        roomNum,
        type: rm.t,
        cleanStatus: hkRecord.s || (rm.st === 'Dirty' ? 'Dirty' : 'Clean'),
        isOccupied,
        isMx,
        occupiedRes,
        nextRes,
        autoPri,
        priority: effectivePri,
        assignedStaffId: Number(hkRecord.a || 0),
        assignedStaffName: hkRecord.assignedName || ''
      };
    });
  }

  function renderApp() {
    const app = $('housekeepingApp');
    if (!app) return;

    const data = getHousekeepingData();
    const dirtyCount = data.filter(d => !d.isOccupied && !d.isMx && (d.cleanStatus === 'Dirty' || d.cleanStatus === 'In progress')).length;
    const urgentCount = data.filter(d => (d.priority === 'Urgent' || d.priority === 'High') && d.cleanStatus !== 'Clean' && !d.isOccupied).length;
    const cleanCount = data.filter(d => !d.isOccupied && !d.isMx && d.cleanStatus === 'Clean').length;
    const occupiedCount = data.filter(d => d.isOccupied).length;

    const requests = Data.getHkRequests();
    const pendingReqCount = requests.filter(r => (r.status || r.st) !== 'Done').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">OPERATIONS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Housekeeping &amp; Room Turnover</h1>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-secondary" id="btnExportHkCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnNewHkReq">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Add Guest Request
          </button>
        </div>
      </div>

      <!-- Stat Pillars -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Vacant Needs Cleaning</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${dirtyCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Urgent / High Priority</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${urgentCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Vacant Clean &amp; Ready</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${cleanCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">In-House Occupied</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${occupiedCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Open Guest Requests</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${pendingReqCount}</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab-btn ${activeTab === 'rooms' ? 'active' : ''}" id="tabBtnRooms">
          <span class="ic" data-icon="broom">[ICON: broom]</span> Room Turnover Matrix (${data.length})
        </button>
        <button class="tab-btn ${activeTab === 'requests' ? 'active' : ''}" id="tabBtnRequests">
          <span class="ic" data-icon="clipboard">[ICON: clipboard]</span> Guest Requests Queue (${pendingReqCount})
        </button>
      </div>

      <!-- View 1: Room Turnover Matrix -->
      <div id="viewRooms" style="${activeTab === 'rooms' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
            <div class="field" style="margin: 0; min-width: 170px;">
              <label>Search Room / Guest</label>
              <input type="text" id="hkSearchInput" placeholder="Room # or guest name…" style="height: 38px;">
            </div>
            <div class="field" style="margin: 0; min-width: 160px;">
              <label>Room Condition</label>
              <select id="hkConditionFilter" style="height: 38px;">
                <option value="">All Conditions</option>
                <option value="Dirty">Vacant &middot; Dirty</option>
                <option value="In progress">Vacant &middot; Cleaning</option>
                <option value="Clean">Vacant &middot; Clean</option>
                <option value="Occupied">Occupied (In-house)</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <div class="field" style="margin: 0; min-width: 140px;">
              <label>Cleaning Priority</label>
              <select id="hkPriorityFilter" style="height: 38px;">
                <option value="">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="field" style="margin: 0; min-width: 170px;">
              <label>Room Category</label>
              <select id="hkTypeFilter" style="height: 38px;">
                <option value="">All Room Types</option>
                ${Data.getTypes().map(t => `<option value="${esc(t.n)}">${esc(t.n)}</option>`).join('')}
              </select>
            </div>
            <div>
              <button class="btn-ghost" id="btnResetHkFilters" style="height: 38px;">Reset</button>
            </div>
            <div style="margin-left: auto;">
              <button class="btn-secondary" id="btnAssignAllUnassigned" style="height: 38px;">
                <span class="ic" data-icon="users">[ICON: users]</span> Assign All Unassigned
              </button>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 80px;">Room</th>
                  <th>Category</th>
                  <th>Housekeeping Status</th>
                  <th>Guest / Next Arrival</th>
                  <th>Turnover Priority</th>
                  <th>Front Desk State</th>
                  <th>Assigned Staff</th>
                  <th style="text-align: right; width: 140px;">Action</th>
                </tr>
              </thead>
              <tbody id="hkTableBody">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="hkPagination">
          </div>
        </div>
      </div>

      <!-- View 2: Guest Requests Queue -->
      <div id="viewRequests" style="${activeTab === 'requests' ? '' : 'display:none;'}">
        <div class="card" style="padding: 0; overflow: hidden;">
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--line); background: var(--surface-2); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <b>Active Guest In-Room Requests</b>
              <div class="text-xs text-secondary" style="margin-top: 2px;">Synchronized live from Guest Portal requests</div>
            </div>
            <button class="btn btn-sm" id="btnReqTableNew">
              <span class="ic" data-icon="plus">[ICON: plus]</span> New Request
            </button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width: 90px;">Room</th>
                  <th>Guest</th>
                  <th>Requested Item</th>
                  <th>Instructions / Notes</th>
                  <th>Time Logged</th>
                  <th>Status</th>
                  <th>Assigned Housekeeper</th>
                  <th style="text-align: right; width: 140px;">Action</th>
                </tr>
              </thead>
              <tbody id="hkRequestsBody">
                <!-- Requests table -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
    renderRequests();
  }

  function bindEvents() {
    const tabRooms = $('tabBtnRooms');
    const tabReqs = $('tabBtnRequests');

    if (tabRooms) {
      tabRooms.onclick = () => {
        activeTab = 'rooms';
        tabRooms.classList.add('active');
        if (tabReqs) tabReqs.classList.remove('active');
        $('viewRooms').style.display = '';
        $('viewRequests').style.display = 'none';
        renderTable();
      };
    }

    if (tabReqs) {
      tabReqs.onclick = () => {
        activeTab = 'requests';
        tabReqs.classList.add('active');
        if (tabRooms) tabRooms.classList.remove('active');
        $('viewRequests').style.display = '';
        $('viewRooms').style.display = 'none';
        renderRequests();
      };
    }

    const searchInp = $('hkSearchInput');
    if (searchInp) {
      searchInp.oninput = () => { page = 1; renderTable(); };
    }

    const condFilter = $('hkConditionFilter');
    if (condFilter) condFilter.onchange = () => { page = 1; renderTable(); };

    const priFilter = $('hkPriorityFilter');
    if (priFilter) priFilter.onchange = () => { page = 1; renderTable(); };

    const typeFilter = $('hkTypeFilter');
    if (typeFilter) typeFilter.onchange = () => { page = 1; renderTable(); };

    const btnReset = $('btnResetHkFilters');
    if (btnReset) {
      btnReset.onclick = () => {
        if ($('hkSearchInput')) $('hkSearchInput').value = '';
        if ($('hkConditionFilter')) $('hkConditionFilter').value = '';
        if ($('hkPriorityFilter')) $('hkPriorityFilter').value = '';
        if ($('hkTypeFilter')) $('hkTypeFilter').value = '';
        page = 1;
        renderTable();
      };
    }

    const btnNewReq = $('btnNewHkReq');
    if (btnNewReq) btnNewReq.onclick = () => openNewRequestModal();
    const btnReqTableNew = $('btnReqTableNew');
    if (btnReqTableNew) btnReqTableNew.onclick = () => openNewRequestModal();

    const btnExport = $('btnExportHkCSV');
    if (btnExport) {
      btnExport.onclick = () => {
        const data = getHousekeepingData();
        const cols = [
          { header: 'Room Number', key: 'roomNum' },
          { header: 'Room Type', key: 'type' },
          { header: 'Cleanliness Status', key: 'cleanStatus' },
          { header: 'Priority', key: 'priority' },
          { header: 'Occupancy', key: d => d.isOccupied ? `Occupied by ${d.occupiedRes ? d.occupiedRes.g : 'Guest'}` : (d.isMx ? 'Maintenance' : 'Vacant') },
          { header: 'Next Arrival', key: d => d.nextRes ? `${d.nextRes.g} (${d.nextRes.i})` : 'None' },
          { header: 'Assigned Staff', key: d => d.assignedStaffName || 'Unassigned' }
        ];
        exportCSV(`PUPSJ_Housekeeping_Turnover_${today()}.csv`, cols, data);
      };
    }
  }

  function getFilteredRows() {
    const data = getHousekeepingData();
    const q = ($('hkSearchInput')?.value || '').trim().toLowerCase();
    const cond = $('hkConditionFilter')?.value || '';
    const pri = $('hkPriorityFilter')?.value || '';
    const type = $('hkTypeFilter')?.value || '';

    return data.filter(d => {
      if (type && d.type !== type) return false;
      if (pri && d.priority !== pri) return false;
      if (cond) {
        if (cond === 'Occupied' && !d.isOccupied) return false;
        if (cond === 'Maintenance' && !d.isMx) return false;
        if (cond === 'Clean' && (d.isOccupied || d.isMx || d.cleanStatus !== 'Clean')) return false;
        if (cond === 'Dirty' && (d.isOccupied || d.isMx || d.cleanStatus !== 'Dirty')) return false;
        if (cond === 'In progress' && (d.isOccupied || d.isMx || d.cleanStatus !== 'In progress')) return false;
      }
      if (q) {
        const matchRoom = String(d.roomNum).includes(q);
        const matchType = (d.type || '').toLowerCase().includes(q);
        const matchOcc = d.occupiedRes && (d.occupiedRes.g || '').toLowerCase().includes(q);
        const matchNext = d.nextRes && (d.nextRes.g || '').toLowerCase().includes(q);
        if (!matchRoom && !matchType && !matchOcc && !matchNext) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort Dirty with Urgent/High first, then room number
      const aDirty = a.cleanStatus === 'Dirty' || a.cleanStatus === 'In progress';
      const bDirty = b.cleanStatus === 'Dirty' || b.cleanStatus === 'In progress';
      if (aDirty && !bDirty) return -1;
      if (!aDirty && bDirty) return 1;
      if (aDirty && bDirty) {
        const aPri = PRI_ORDER.indexOf(a.priority);
        const bPri = PRI_ORDER.indexOf(b.priority);
        if (aPri !== bPri) return aPri - bPri;
      }
      return a.roomNum - b.roomNum;
    });
  }

  function renderTable() {
    const tbody = $('hkTableBody');
    const pgnEl = $('hkPagination');
    if (!tbody) return;

    const staffList = getHkStaff();
    const filtered = getFilteredRows();
    const pgn = paginate(filtered, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 28px;">No rooms match the current search or filters.</td></tr>`;
      if (pgnEl) pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(r => {
      let condPill = 'pill--ok';
      let condLabel = 'Vacant &middot; Clean';
      if (r.isOccupied) { condPill = 'pill--info'; condLabel = 'Occupied'; }
      else if (r.isMx) { condPill = 'pill--bad'; condLabel = 'Maintenance'; }
      else if (r.cleanStatus === 'Dirty') { condPill = 'pill--bad'; condLabel = 'Vacant &middot; Dirty'; }
      else if (r.cleanStatus === 'In progress') { condPill = 'pill--warn'; condLabel = 'Vacant &middot; Cleaning'; }

      // Guest / arrival info
      let whoInfo = '<span class="text-muted text-xs">No upcoming arrivals</span>';
      if (r.isOccupied && r.occupiedRes) {
        whoInfo = `<b>${esc(r.occupiedRes.g)}</b><div class="text-xs text-muted">Checks out: ${fmtDate(r.occupiedRes.o)}</div>`;
      } else if (r.nextRes) {
        const isToday = r.nextRes.i <= today();
        whoInfo = `<a href="reservations.html?code=${r.nextRes.c}"><b>${esc(r.nextRes.g)}</b></a><div class="text-xs ${isToday ? 'text-warn' : 'text-muted'}" style="${isToday ? 'font-weight:600;' : ''}">${isToday ? 'Arriving Today' : `Arrives: ${fmtDate(r.nextRes.i)}`}</div>`;
      }

      // Priority pill
      const priClass = r.priority === 'Urgent' ? 'pill--bad' : r.priority === 'High' ? 'pill--warn' : 'pill--muted';

      // Action button
      let actionBtn = '<span class="text-muted text-xs">&mdash;</span>';
      if (!r.isOccupied && !r.isMx) {
        if (r.cleanStatus === 'Dirty') {
          actionBtn = `<button class="btn btn-sm" onclick="setRoomCleanStatus(${r.roomNum}, 'In progress')">Start Cleaning</button>`;
        } else if (r.cleanStatus === 'In progress') {
          actionBtn = `<button class="btn btn-sm" style="background:var(--ok);color:#fff;" onclick="setRoomCleanStatus(${r.roomNum}, 'Clean')">Mark Clean</button>`;
        } else {
          actionBtn = `<button class="btn-secondary btn-sm" onclick="setRoomCleanStatus(${r.roomNum}, 'Dirty')">Mark Dirty</button>`;
        }
      }

      return `
        <tr>
          <td><span class="room-pill">${r.roomNum}</span></td>
          <td><b>${esc(r.type)}</b></td>
          <td><span class="pill ${condPill}">${condLabel}</span></td>
          <td>${whoInfo}</td>
          <td>
            ${r.cleanStatus !== 'Clean' && !r.isOccupied ? `
              <span class="pill ${priClass}">${r.priority}</span>
              <div style="margin-top: 4px;">
                <select style="font-size: 11px; height: 26px; padding: 2px 4px;" onchange="overridePriority(${r.roomNum}, this.value)">
                  <option value="">Auto (${r.autoPri || 'Normal'})</option>
                  ${PRI_ORDER.map(p => `<option value="${p}" ${r.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
            ` : '<span class="text-muted text-xs">&mdash;</span>'}
          </td>
          <td>
            ${r.isOccupied ? '<span class="pill pill--info">Occupied</span>' :
              r.isMx ? '<span class="pill pill--bad">Out of Service</span>' :
              r.cleanStatus === 'Clean' ? '<span class="pill pill--ok">Available</span>' :
              '<span class="pill pill--bad">Blocked (Dirty)</span>'}
          </td>
          <td>
            ${r.isOccupied || r.isMx ? '<span class="text-muted text-xs">&mdash;</span>' : `
              <select style="font-size: 12px; height: 28px; padding: 2px 6px;" onchange="assignStaff(${r.roomNum}, this.value)">
                <option value="0">Unassigned</option>
                ${staffList.map(s => `<option value="${s.id}" ${r.assignedStaffId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
              </select>
            `}
          </td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    if (pgnEl) {
      pgnEl.innerHTML = `
        <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} rooms</span>
        <div style="display: flex; gap: 4px;">
          <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnHkPrev">Previous</button>
          <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
          <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnHkNext">Next</button>
        </div>
      `;

      const prev = $('btnHkPrev');
      if (prev) prev.onclick = () => { page--; renderTable(); };
      const next = $('btnHkNext');
      if (next) next.onclick = () => { page++; renderTable(); };
    }
  }

  function renderRequests() {
    const tbody = $('hkRequestsBody');
    if (!tbody) return;

    const requests = Data.getHkRequests();
    const staffList = getHkStaff();

    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 28px;">No guest housekeeping requests on file.</td></tr>`;
      return;
    }

    tbody.innerHTML = requests.map(req => {
      const status = req.status || req.st || 'Pending';
      const isDone = status === 'Done';
      const isInProgress = status === 'In progress';
      const assigned = req.assignedTo || req.assigned || '';

      return `
        <tr>
          <td><span class="room-pill">Room ${req.room}</span></td>
          <td><b>${esc(req.guestName || 'In-Room Guest')}</b></td>
          <td><b>${esc(req.item)}</b></td>
          <td>${esc(req.notes || '&mdash;')}</td>
          <td><span class="text-xs text-muted">${fmtDate(req.created)}</span></td>
          <td>
            <span class="pill ${isDone ? 'pill--ok' : isInProgress ? 'pill--warn' : 'pill--bad'}">
              ${status}
            </span>
          </td>
          <td>
            <select style="font-size: 12px; height: 28px;" onchange="assignReqStaff('${req.id}', this.value)">
              <option value="">Unassigned</option>
              ${staffList.map(s => `<option value="${esc(s.name)}" ${assigned === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
            </select>
          </td>
          <td style="text-align: right;">
            ${!isDone ? `
              <button class="btn-secondary btn-sm" onclick="updateReqStatus('${req.id}', '${isInProgress ? 'Done' : 'In progress'}')">
                ${isInProgress ? 'Mark Done' : 'Start'}
              </button>
            ` : '<span class="text-ok text-xs" style="font-weight:600;">&#10003; Done</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  /* Global window methods for inline action bindings */
  window.setRoomCleanStatus = function (roomNum, newStatus) {
    const hkStore = Data.getHk();
    let record = hkStore.find(h => Number(h.n) === Number(roomNum));
    if (!record) {
      record = { n: Number(roomNum), s: newStatus, a: 0, p: '', assignedName: '' };
      hkStore.push(record);
    } else {
      record.s = newStatus;
      if (newStatus === 'Clean') record.p = ''; // Reset manual priority
    }
    Data.saveHk(hkStore);

    Data.audit('Housekeeping Status', 'room', String(roomNum), `Room ${roomNum} marked as ${newStatus}`);
    toast(`Room ${roomNum} status updated to ${newStatus}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  window.overridePriority = function (roomNum, priValue) {
    const hkStore = Data.getHk();
    let record = hkStore.find(h => Number(h.n) === Number(roomNum));
    if (!record) {
      record = { n: Number(roomNum), s: 'Dirty', a: 0, p: priValue, assignedName: '' };
      hkStore.push(record);
    } else {
      record.p = priValue;
    }
    Data.saveHk(hkStore);
    toast(`Room ${roomNum} priority set to ${priValue || 'Auto'}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderTable();
  };

  window.assignStaff = function (roomNum, staffId) {
    const hkStore = Data.getHk();
    const staffList = getHkStaff();
    const staffObj = staffList.find(s => s.id === Number(staffId));
    const staffName = staffObj ? staffObj.name : '';

    let record = hkStore.find(h => Number(h.n) === Number(roomNum));
    if (!record) {
      record = { n: Number(roomNum), s: 'Dirty', a: Number(staffId), p: '', assignedName: staffName };
      hkStore.push(record);
    } else {
      record.a = Number(staffId);
      record.assignedName = staffName;
    }
    Data.saveHk(hkStore);
    toast(Number(staffId) > 0 ? `Assigned to ${staffName}` : 'Housekeeper assignment cleared', 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
  };

  window.assignReqStaff = function (reqId, staffName) {
    const list = Data.getHkRequests();
    const req = list.find(r => r.id === reqId);
    if (req) {
      req.assigned = staffName;
      req.assignedTo = staffName;
      Data.saveHkRequests(list);
      toast(`Request assigned to ${staffName}`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  };

  window.updateReqStatus = function (reqId, newStatus) {
    const list = Data.getHkRequests();
    const req = list.find(r => r.id === reqId);
    if (req) {
      req.st = newStatus;
      req.status = newStatus;
      Data.saveHkRequests(list);
      Data.audit('Housekeeping Request', 'hkReq', reqId, `Request for Room ${req.room} marked as ${newStatus}`);
      toast(`Request marked as ${newStatus}`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    }
  };

  window.openNewRequestModal = function () {
    const rooms = Data.getRooms();
    const reservations = Data.getReservations();

    const bodyHtml = `
      <form id="newHkReqForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label>Select Room *</label>
          <select id="newHkReqRoom" required>
            ${rooms.map(r => {
              const occ = reservations.find(res => Number(res.n) === Number(r.n) && res.st === 'Checked-in');
              const occText = occ ? ` · Occupied by ${esc(occ.g)}` : '';
              return `<option value="${r.n}">Room ${r.n} (${esc(r.t)})${occText}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="field">
          <label>Guest Name</label>
          <input type="text" id="newHkReqGuest" placeholder="Guest name (optional)">
        </div>
        <div class="field">
          <label>Request Type / Item *</label>
          <select id="newHkReqItem" required>
            <option value="Extra Fresh Towels">Extra Fresh Towels</option>
            <option value="Pillow &amp; Linen Change">Pillow &amp; Linen Change</option>
            <option value="Room Makeup &amp; Trash Collection">Room Makeup &amp; Trash Collection</option>
            <option value="Bottled Water &amp; Toiletries">Bottled Water &amp; Toiletries</option>
            <option value="Iron &amp; Ironing Board">Iron &amp; Ironing Board</option>
            <option value="Extra Slipper &amp; Bathrobe">Extra Slipper &amp; Bathrobe</option>
            <option value="Room Deodorizer / Fresh Air">Room Deodorizer / Fresh Air</option>
            <option value="Other Service">Other Service</option>
          </select>
        </div>
        <div class="field">
          <label>Specific Instructions / Notes</label>
          <textarea id="newHkReqNotes" rows="2" placeholder="e.g. 2 extra bath towels urgently requested by guest"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnSubmitHkReq">Save Request</button>
      </div>
    `;

    showModal('New Housekeeping Request', bodyHtml, footerHtml, { maxWidth: '480px' });

    // Auto populate guest name on room select
    const roomSelect = $('newHkReqRoom');
    const guestInput = $('newHkReqGuest');
    const updateGuestDefault = () => {
      const selectedRoom = Number(roomSelect.value);
      const occ = reservations.find(r => Number(r.n) === selectedRoom && r.st === 'Checked-in');
      if (occ && !guestInput.value) {
        guestInput.value = occ.g;
      }
    };
    if (roomSelect) {
      roomSelect.onchange = updateGuestDefault;
      updateGuestDefault();
    }

    const btnSubmit = $('btnSubmitHkReq');
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const room = parseInt($('newHkReqRoom').value, 10);
        const item = $('newHkReqItem').value;
        const guestName = ($('newHkReqGuest').value || `Room ${room}`).trim();
        const notes = ($('newHkReqNotes').value || '').trim();

        // Check if there is an active reservation
        const occ = reservations.find(r => Number(r.n) === room && r.st === 'Checked-in');
        const resCode = occ ? occ.c : '';

        Data.createHkRequest(room, guestName, item, notes, resCode);
        toast(`Housekeeping request logged for Room ${room}`, 'ok');
        closeModal();
        renderApp();
      };
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
