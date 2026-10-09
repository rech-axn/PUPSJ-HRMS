/* ==========================================================================
   PUPSJ Hotel & Restaurant — Maintenance & Facilities (maintenance.js)
   Work orders, out-of-service room toggling, staff assignment,
   issue resolution lifecycle, canonical schema sync, and CSV export.
   ========================================================================== */
'use strict';

(function () {
  let statusFilter = '';
  let priorityFilter = '';
  let oosFilter = '';
  let searchQuery = '';
  let page = 1;

  function findConflictingReservations(roomNum) {
    const allRes = Data.getReservations();
    const todayStr = today();
    return allRes.filter(r => {
      const rRoom = Number(r.rm != null ? r.rm : r.n);
      if (rRoom !== Number(roomNum)) return false;
      const rStatus = r.st || r.s;
      if (rStatus === 'Checked-in') return true;
      if (rStatus === 'Confirmed') {
        const co = r.co || r.o || todayStr;
        if (co >= todayStr) return true;
      }
      return false;
    });
  }

  function openRelocationAssistantModal(roomNum, conflicts, onResolved) {
    const types = Data.getTypes();
    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="background: rgba(192, 57, 43, 0.08); border-left: 4px solid var(--bad); padding: 12px; margin-bottom: 14px; border-radius: 4px;">
          <b style="color: var(--bad); font-size: 14px;">Maintenance Conflict Alert</b>
          <p style="margin: 4px 0 0 0;">
            Room <b>${roomNum}</b> has <b>${conflicts.length} active or upcoming reservation(s)</b> that will be affected by flagging this room Out of Service.
          </p>
        </div>

        <p class="text-sm">Please relocate each affected guest to an available alternative room:</p>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          ${conflicts.map(r => {
            const freeSameType = Data.freeRooms(r.t, r.ci || r.i, r.co || r.o, r.c);
            return `
              <div class="card" style="padding: 10px 12px; background: var(--surface);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <b>${esc(r.g)}</b> (${r.c})
                    <div class="text-xs text-secondary">${esc(r.t)} &middot; ${fmtDate(r.ci || r.i)} to ${fmtDate(r.co || r.o)} &middot; Status: ${r.st || r.s}</div>
                  </div>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 6px; align-items: center;">
                  <select id="relocateSelect_${r.c}" style="font-size: 12px; height: 30px; flex: 1;">
                    ${freeSameType.map(rm => `<option value="${rm.n}">Room ${rm.n} (${rm.t})</option>`).join('')}
                    ${freeSameType.length === 0 ? '<option value="">No free rooms of same type</option>' : ''}
                  </select>
                  <button type="button" class="btn btn-sm" onclick="relocateBooking('${r.c}', '${roomNum}')" ${freeSameType.length === 0 ? 'disabled' : ''}>
                    Relocate
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="border-top: 1px solid var(--line); padding-top: 12px;">
          <div class="text-xs text-secondary" style="margin-bottom: 6px;">Or authorize Superadmin emergency Out-of-Service override:</div>
          <div class="field" style="margin-bottom: 8px;">
            <input type="text" id="oosOverrideReason" placeholder="Mandatory override justification...">
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel Action</button>
        <button type="button" class="btn-danger btn-sm" id="btnConfirmOosOverride">Confirm Override</button>
      </div>
    `;

    showModal(`Room ${roomNum} &mdash; Relocation Required`, bodyHtml, footerHtml, { maxWidth: '500px' });

    window.relocateBooking = function(resCode, originalRoom) {
      const select = $('relocateSelect_' + resCode);
      if (!select || !select.value) {
        toast('No destination room selected', 'warn');
        return;
      }
      const newRoom = parseInt(select.value, 10);
      Data.updateReservation(resCode, { n: newRoom, rm: newRoom });
      Data.audit('Guest Relocated', 'Reservation', resCode, `Relocated from Room ${originalRoom} to Room ${newRoom} due to maintenance OOS`);
      toast(`Reservation ${resCode} relocated to Room ${newRoom}`, 'ok');
      closeModal();
      // Recheck if other conflicts remain
      const remaining = findConflictingReservations(originalRoom);
      if (remaining.length > 0) {
        openRelocationAssistantModal(originalRoom, remaining, onResolved);
      } else {
        toast('All conflicts resolved!', 'ok');
        if (onResolved) onResolved();
      }
    };

    $('btnConfirmOosOverride').onclick = () => {
      const reason = ($('oosOverrideReason').value || '').trim();
      if (!reason) {
        toast('Please enter a mandatory override justification', 'warn');
        return;
      }
      Data.audit('Emergency OOS Override', 'Room', String(roomNum), `Flagged Room ${roomNum} OOS despite ${conflicts.length} conflicting stays. Reason: ${reason}`);
      toast('Superadmin override recorded in audit log', 'warn');
      closeModal();
      if (onResolved) onResolved();
    };
  }

  const pageSize = 12;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('maintenanceApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getStaffList() {
    return Data.getStaff().filter(s => s.active);
  }

  function renderApp() {
    const app = $('maintenanceApp');
    if (!app) return;

    const list = Data.getMaintenance();
    const openCount = list.filter(m => (m.status || m.st) === 'Open').length;
    const progressCount = list.filter(m => (m.status || m.st) === 'In progress').length;
    const oosCount = list.filter(m => (m.outOfService ?? m.oos) && (m.status || m.st) !== 'Resolved').length;
    const totalCount = list.length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">OPERATIONS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Maintenance &amp; Engineering</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" id="btnExportMxCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button type="button" class="btn" id="btnNewMxOrder">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Work Order
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Work Orders</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${totalCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Open Orders</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${openCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">In Progress</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${progressCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Rooms Out of Service</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${oosCount}</div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="mxSearchInput">Search Work Orders</label>
            <input type="text" id="mxSearchInput" placeholder="Room, issue, or ticket #…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 150px;">
            <label for="mxStatusFilter">Status</label>
            <select id="mxStatusFilter">
              <option value="">All Statuses</option>
              <option value="Open" ${statusFilter === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In progress" ${statusFilter === 'In progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${statusFilter === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 140px;">
            <label for="mxPriorityFilter">Priority</label>
            <select id="mxPriorityFilter">
              <option value="">All Priorities</option>
              <option value="Urgent" ${priorityFilter === 'Urgent' ? 'selected' : ''}>Urgent</option>
              <option value="High" ${priorityFilter === 'High' ? 'selected' : ''}>High</option>
              <option value="Medium" ${priorityFilter === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Low" ${priorityFilter === 'Low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="mxOosFilter">Out of Service</label>
            <select id="mxOosFilter">
              <option value="">All</option>
              <option value="yes" ${oosFilter === 'yes' ? 'selected' : ''}>Out of Service Only</option>
              <option value="no" ${oosFilter === 'no' ? 'selected' : ''}>In Service Only</option>
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetMxFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Room</th>
                <th>Issue Description</th>
                <th>Priority</th>
                <th>Out of Service</th>
                <th>Assigned Staff</th>
                <th>Date Logged</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="mxTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="mxPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('mxSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('mxStatusFilter').onchange = (e) => { statusFilter = e.target.value; page = 1; renderTable(); };
    $('mxPriorityFilter').onchange = (e) => { priorityFilter = e.target.value; page = 1; renderTable(); };
    $('mxOosFilter').onchange = (e) => { oosFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetMxFilters').onclick = () => {
      searchQuery = '';
      statusFilter = '';
      priorityFilter = '';
      oosFilter = '';
      $('mxSearchInput').value = '';
      $('mxStatusFilter').value = '';
      $('mxPriorityFilter').value = '';
      $('mxOosFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnExportMxCSV').onclick = () => {
      const items = getFilteredList();
      const cols = [
        { header: 'Ticket #', key: 'id' },
        { header: 'Room Number', key: 'room' },
        { header: 'Issue Title', key: 'issue' },
        { header: 'Priority', key: m => m.priority || m.pri || 'Medium' },
        { header: 'Status', key: m => m.status || m.st || 'Open' },
        { header: 'Out of Service', key: m => (m.outOfService ?? m.oos) ? 'Yes' : 'No' },
        { header: 'Assigned Staff', key: m => m.assignedTo || m.assigned || 'Unassigned' },
        { header: 'Created Date', key: 'created' },
        { header: 'Resolved Date', key: m => m.resolved || 'Unresolved' },
        { header: 'Notes', key: m => m.notes || '' }
      ];
      exportCSV(`PUPSJ_Maintenance_${today()}.csv`, cols, items);
    };

    $('btnNewMxOrder').onclick = () => openNewOrderModal();
  }

  function getFilteredList() {
    const list = Data.getMaintenance();
    return list.filter(m => {
      const st = m.status || m.st || 'Open';
      const pri = m.priority || m.pri || 'Medium';
      const oos = !!(m.outOfService ?? m.oos);
      const assigned = m.assignedTo || m.assigned || '';

      if (statusFilter && st !== statusFilter) return false;
      if (priorityFilter && pri !== priorityFilter) return false;
      if (oosFilter === 'yes' && !oos) return false;
      if (oosFilter === 'no' && oos) return false;
      if (searchQuery) {
        const text = `${m.id} Room ${m.room} ${m.issue} ${assigned} ${m.notes || ''}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const tbody = $('mxTableBody');
    const pgnEl = $('mxPagination');
    if (!tbody) return;

    const list = getFilteredList();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 24px;">No maintenance work orders found matching the filter criteria.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(m => {
      const st = m.status || m.st || 'Open';
      const pri = m.priority || m.pri || 'Medium';
      const oos = !!(m.outOfService ?? m.oos);
      const assigned = m.assignedTo || m.assigned || '';

      const isResolved = st === 'Resolved';
      const isInProgress = st === 'In progress';
      const priClass = pri === 'Urgent' ? 'pill--bad' : pri === 'High' ? 'pill--warn' : 'pill--muted';

      return `
        <tr>
          <td><b>${esc(m.id)}</b></td>
          <td><b>Room ${m.room}</b></td>
          <td>
            <div style="font-weight: 600;">${esc(m.issue)}</div>
            ${m.notes ? `<div class="text-xs text-muted">${esc(m.notes)}</div>` : ''}
            ${(!isResolved && m.created && dateDiff(m.created, today()) >= (pri === 'Urgent' ? 0 : pri === 'High' ? 1 : 2)) ? `<span class="pill pill--bad" style="font-size: 10px; margin-top: 2px;">OVERDUE SLA</span>` : ''}
          </td>
          <td><span class="pill ${priClass}">${esc(pri)}</span></td>
          <td>
            ${oos ? `<span class="pill pill--bad">Out of Service</span>` : `<span class="pill pill--ok">In Service</span>`}
          </td>
          <td>${esc(assigned) || '<span class="text-muted text-xs">Unassigned</span>'}</td>
          <td>
            <div>${fmtDate(m.created)}</div>
            ${isResolved && m.resolved ? `<div class="text-xs text-ok">Resolved: ${fmtDate(m.resolved)}</div>` : ''}
          </td>
          <td>
            <span class="pill ${isResolved ? 'pill--ok' : isInProgress ? 'pill--warn' : 'pill--bad'}">
              ${esc(st)}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              ${!isResolved ? `
                <button type="button" class="btn-secondary btn-sm" onclick="advanceOrderStatus('${esc(m.id)}')">
                  ${isInProgress ? 'Resolve' : 'Start'}
                </button>
              ` : `
                <button type="button" class="btn-secondary btn-sm" onclick="reopenOrder('${esc(m.id)}')">Reopen</button>
              `}
              <button type="button" class="btn-secondary btn-sm" onclick="openEditOrderModal('${esc(m.id)}')">Edit</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const startIdx = pgn.startIndex != null ? pgn.startIndex : (pgn.startIdx != null ? pgn.startIdx : 0);
    const endIdx = pgn.endIndex != null ? pgn.endIndex : (pgn.endIdx != null ? pgn.endIdx : 0);
    const totalItems = pgn.total != null ? pgn.total : (pgn.totalItems != null ? pgn.totalItems : 0);

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${totalItems > 0 ? startIdx + 1 : 0}&ndash;${endIdx} of ${totalItems} orders</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnMxPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages || 1}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= (pgn.totalPages || 1) ? 'disabled' : ''} id="btnMxNext">Next</button>
      </div>
    `;

    const prev = $('btnMxPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnMxNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  /* Actions exposed on window */
  window.advanceOrderStatus = function (id) {
    const list = Data.getMaintenance();
    const item = list.find(m => m.id === id);
    if (!item) return;

    const currentSt = item.status || item.st || 'Open';

    if (currentSt === 'Open') {
      item.status = 'In progress';
      item.st = 'In progress';
      Data.saveMaintenance(list);
      Data.audit('Maintenance Order', 'mReq', id, `Work order ${id} for Room ${item.room} moved to In Progress`);
      toast(`Work order ${id} is now in progress`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    } else if (currentSt === 'In progress') {
      item.status = 'Resolved';
      item.st = 'Resolved';
      item.resolved = today();

      // If room was Out of Service, restore it to turnover pool (requires housekeeping inspection)
      if (item.outOfService ?? item.oos) {
        Data.setRoomHK(item.room, { s: 'Dirty', p: item.priority === 'Urgent' ? 'Urgent' : 'High' });
      }

      Data.saveMaintenance(list);
      Data.audit('Maintenance Resolved', 'mReq', id, `Work order ${id} resolved for Room ${item.room}. Room sent to housekeeping turnover.`);
      toast(`Work order ${id} marked as Resolved!`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    }
  };

  window.reopenOrder = function (id) {
    const list = Data.getMaintenance();
    const item = list.find(m => m.id === id);
    if (!item) return;

    item.status = 'Open';
    item.st = 'Open';
    item.resolved = null;
    Data.saveMaintenance(list);
    Data.audit('Reopen Maintenance', 'mReq', id, `Work order ${id} reopened for Room ${item.room}`);
    toast(`Work order ${id} reopened`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  function openNewOrderModal() {
    const rooms = Data.getRooms();
    const staff = getStaffList();

    const bodyHtml = `
      <form id="newMxForm" style="font-size: 13px;" onsubmit="return false;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label for="newMxRoom">Room Number *</label>
            <select id="newMxRoom" required>
              ${rooms.map(r => `<option value="${r.n}">Room ${r.n} (${esc(r.t)})</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="newMxPriority">Priority Level *</label>
            <select id="newMxPriority" required>
              <option value="Low">Low (Cosmetic, non-urgent)</option>
              <option value="Medium" selected>Medium (Standard maintenance)</option>
              <option value="High">High (Impairs guest comfort)</option>
              <option value="Urgent">Urgent (Safety / leak / lockout)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="newMxIssue">Issue Title / Description *</label>
          <input type="text" id="newMxIssue" required placeholder="e.g. Air conditioning cooling failure, bathroom faucet drip…">
        </div>

        <div class="field">
          <label for="newMxStaff">Assigned Maintenance Staff</label>
          <select id="newMxStaff">
            <option value="">Unassigned</option>
            ${staff.map(s => `<option value="${esc(s.name)}">${esc(s.name)} (${esc(s.role)})</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="newMxNotes">Additional Notes / Technicians Instructions</label>
          <textarea id="newMxNotes" rows="2" placeholder="Parts required, time reported, special access instructions…"></textarea>
        </div>

        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; margin: 0;">
            <input type="checkbox" id="newMxOos" style="width: 18px; height: 18px;">
            <span>Mark room as Out of Service (Blocks availability from bookings)</span>
          </label>
          <div class="text-xs text-muted" style="margin-top: 4px;">
            Warning: Will exclude room from public availability until resolved.
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitNewMx">Create Order</button>
      </div>
    `;

    showModal('Log Maintenance Work Order', bodyHtml, footerHtml, { maxWidth: '540px' });

    $('btnSubmitNewMx').onclick = () => {
      const roomNum = parseInt($('newMxRoom').value, 10);
      const issue = ($('newMxIssue').value || '').trim();
      const pri = $('newMxPriority').value;
      const assigned = $('newMxStaff').value;
      const notes = ($('newMxNotes').value || '').trim();
      const oos = $('newMxOos').checked;

      if (!issue) {
        toast('Please enter the issue title', 'warn');
        return;
      }

      function commitNewWorkOrder() {
        const list = Data.getMaintenance();
        const id = Data.nextId('MNT-');

        list.unshift({
          id,
          room: roomNum,
          issue,
          priority: pri,
          pri: pri,
          outOfService: oos,
          oos: oos,
          assignedTo: assigned,
          assigned: assigned,
          notes,
          created: today(),
          status: 'Open',
          st: 'Open',
          resolved: null
        });

        Data.saveMaintenance(list);
        Data.audit('Create Maintenance', 'mReq', id, `Work order ${id} logged for Room ${roomNum}: ${issue} (OOS: ${oos ? 'Yes' : 'No'})`);
        toast(`Work order ${id} created successfully`, 'ok');
        closeModal();
        window.dispatchEvent(new CustomEvent('pupsj:data-change'));
        renderApp();
      }

      // Check upcoming reservations if Out of Service requested
      if (oos) {
        const conflicts = findConflictingReservations(roomNum);
        if (conflicts.length > 0) {
          openRelocationAssistantModal(roomNum, conflicts, () => {
            commitNewWorkOrder();
          });
          return;
        }
      }

      commitNewWorkOrder();
      return;

      const list = Data.getMaintenance();
      const id = Data.nextId('MNT-');

      list.unshift({
        id,
        room: roomNum,
        issue,
        priority: pri,
        pri: pri,
        outOfService: oos,
        oos: oos,
        assignedTo: assigned,
        assigned: assigned,
        notes,
        created: today(),
        status: 'Open',
        st: 'Open',
        resolved: null
      });

      Data.saveMaintenance(list);
      Data.audit('Create Maintenance', 'mReq', id, `Work order ${id} logged for Room ${roomNum}: ${issue} (OOS: ${oos ? 'Yes' : 'No'})`);

      toast(`Work order ${id} logged for Room ${roomNum}`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  window.openEditOrderModal = function (id) {
    const list = Data.getMaintenance();
    const item = list.find(m => m.id === id);
    if (!item) return;

    const staff = getStaffList();
    const pri = item.priority || item.pri || 'Medium';
    const st = item.status || item.st || 'Open';
    const assigned = item.assignedTo || item.assigned || '';
    const oos = !!(item.outOfService ?? item.oos);

    const bodyHtml = `
      <form id="editMxForm" style="font-size: 13px;" onsubmit="return false;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label>Room Number</label>
            <input type="text" value="Room ${item.room}" readonly>
          </div>
          <div class="field">
            <label for="editMxPriority">Priority Level</label>
            <select id="editMxPriority">
              <option value="Low" ${pri === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${pri === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="High" ${pri === 'High' ? 'selected' : ''}>High</option>
              <option value="Urgent" ${pri === 'Urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="editMxIssue">Issue Description</label>
          <input type="text" id="editMxIssue" value="${esc(item.issue)}" required>
        </div>

        <div class="field">
          <label for="editMxStaff">Assigned Staff</label>
          <select id="editMxStaff">
            <option value="">Unassigned</option>
            ${staff.map(s => `<option value="${esc(s.name)}" ${assigned === s.name ? 'selected' : ''}>${esc(s.name)} (${esc(s.role)})</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="editMxNotes">Notes</label>
          <textarea id="editMxNotes" rows="2">${esc(item.notes || '')}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editMxStatus">Work Order Status</label>
            <select id="editMxStatus">
              <option value="Open" ${st === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In progress" ${st === 'In progress' ? 'selected' : ''}>In progress</option>
              <option value="Resolved" ${st === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
          <div class="field">
            <label for="editMxOos">Out of Service</label>
            <select id="editMxOos">
              <option value="no" ${!oos ? 'selected' : ''}>In Service</option>
              <option value="yes" ${oos ? 'selected' : ''}>Out of Service</option>
            </select>
          </div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <button type="button" class="btn-danger btn-sm" id="btnDeleteMxOrder">Delete</button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn" id="btnSaveMxEdit">Save Changes</button>
        </div>
      </div>
    `;

    showModal(`Edit Work Order &mdash; ${esc(item.id)}`, bodyHtml, footerHtml, { maxWidth: '520px' });

    $('btnSaveMxEdit').onclick = () => {
      const issueVal = ($('editMxIssue').value || '').trim();
      const newPri = $('editMxPriority').value;
      const newAssigned = $('editMxStaff').value;
      const notesVal = ($('editMxNotes').value || '').trim();
      const oldSt = item.status || item.st;
      const newSt = $('editMxStatus').value;
      const newOos = $('editMxOos').value === 'yes';

      function commitEdit() {
        item.issue = issueVal;
        item.priority = newPri;
        item.pri = newPri;
        item.assignedTo = newAssigned;
        item.assigned = newAssigned;
        item.notes = notesVal;
        item.status = newSt;
        item.st = newSt;
        item.outOfService = newOos;
        item.oos = newOos;

        if (newSt === 'Resolved' && oldSt !== 'Resolved') {
          item.resolved = today();
          if (newOos) {
            Data.setRoomHK(item.room, { s: 'Dirty', p: item.priority === 'Urgent' ? 'Urgent' : 'High' });
          }
        }

        Data.saveMaintenance(list);
        Data.audit('Edit Maintenance', 'mReq', item.id, `Updated work order ${item.id} for Room ${item.room}`);
        toast(`Work order ${item.id} updated`, 'ok');
        closeModal();
        window.dispatchEvent(new CustomEvent('pupsj:data-change'));
        renderApp();
      }

      if (newOos && !(item.outOfService ?? item.oos)) {
        const conflicts = findConflictingReservations(item.room);
        if (conflicts.length > 0) {
          openRelocationAssistantModal(item.room, conflicts, () => {
            commitEdit();
          });
          return;
        }
      }

      commitEdit();
    };

    $('btnDeleteMxOrder').onclick = () => {
      if (confirm(`Delete maintenance order ${item.id}?`)) {
        const idx = list.indexOf(item);
        if (idx !== -1) list.splice(idx, 1);
        Data.saveMaintenance(list);
        Data.audit('Delete Maintenance', 'mReq', item.id, `Deleted work order ${item.id}`);
        toast(`Work order ${item.id} deleted`, 'ok');
        closeModal();
        window.dispatchEvent(new CustomEvent('pupsj:data-change'));
        renderApp();
      }
    };
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
