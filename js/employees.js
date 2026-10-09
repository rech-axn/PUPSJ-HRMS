/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff & Administrator Accounts (employees.js)
   Single unified staff store, email-based authentication, real RBAC roles,
   account lifecycle, self-protection rules, and demo security notice.
   ========================================================================== */
'use strict';

(function () {
  const ROLES = ['Manager', 'Front Desk', 'Housekeeping', 'Maintenance', 'Kitchen', 'Security'];
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('employeesApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function renderApp() {
    const app = $('employeesApp');
    if (!app) return;

    const staffList = Data.getStaff();
    const session = Data.getStaffSession();
    const activeCount = staffList.filter(s => s.active).length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">SECURITY &amp; ACCESS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Staff &amp; Operational Accounts</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn" id="btnAddStaff">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Create Staff Account
          </button>
        </div>
      </div>

      <!-- Security Notice Banner -->
      <div class="card" style="padding: 14px 18px; margin-bottom: 20px; border-left: 4px solid var(--gold); background: var(--surface-2);">
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <span class="ic" data-icon="shield" style="font-size: 18px; color: var(--gold-ink); margin-top: 2px;">[ICON: shield]</span>
          <div style="font-size: 13px;">
            <b>Educational Demo Security Notice:</b>
            <div style="color: var(--ink-2); margin-top: 2px;">
              Credentials in this academic system are stored in client-side localStorage to enable full offline browser execution.
              Email addresses serve as unique login IDs for Role-Based Access Control (RBAC).
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Pillars -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Staff Accounts</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${staffList.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Active Access</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${activeCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Current Active Session</div>
          <div style="font-size: 18px; font-weight: 600; margin-top: 6px;">${esc(session?.name || 'Staff User')}</div>
          <div class="text-xs text-muted">Role: <b>${esc(session?.role || 'Manager')}</b></div>
        </div>
      </div>

      <!-- Staff Accounts Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Login Email</th>
                <th>Assigned Role</th>
                <th>Shift</th>
                <th>Contact Phone</th>
                <th>Account Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${staffList.map(s => {
                const isSelf = session && (session.email === s.email || session.id === s.id);
                const isOnlyActive = s.active && activeCount <= 1;

                return `
                  <tr>
                    <td>
                      <b>${esc(s.name)}</b>
                      ${isSelf ? '<span class="pill pill--info" style="font-size: 10px; margin-left: 6px;">Current User</span>' : ''}
                    </td>
                    <td><code>${esc(s.email)}</code></td>
                    <td><span class="pill pill--muted">${esc(s.role)}</span></td>
                    <td><span class="text-xs text-muted">${esc(s.shift || 'Day')}</span></td>
                    <td>${esc(s.phone || '—')}</td>
                    <td>
                      <span class="pill ${s.active ? 'pill--ok' : 'pill--bad'}">
                        ${s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; justify-content: flex-end; gap: 4px;">
                        <button type="button" class="btn-secondary btn-sm" onclick="openEditStaffModal(${s.id})">Edit</button>
                        ${!isSelf ? `
                          <button type="button" class="btn-secondary btn-sm" onclick="toggleStaffActive(${s.id})" ${isOnlyActive ? 'disabled title="Cannot deactivate the only active account"' : ''}>
                            ${s.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deleteStaffAccount(${s.id})" ${isOnlyActive ? 'disabled' : ''}>
                            Delete
                          </button>
                        ` : `
                          <span class="text-xs text-muted" style="align-self: center; padding: 0 4px;">Active Self</span>
                        `}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const btn = $('btnAddStaff');
    if (btn) btn.onclick = () => openAddStaffModal();
  }

  function openAddStaffModal() {
    const bodyHtml = `
      <form id="addStaffForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label for="newStaffName">Full Staff Name *</label>
          <input type="text" id="newStaffName" required placeholder="e.g. Elena Reyes">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newStaffEmail">Login Email Address *</label>
            <input type="email" id="newStaffEmail" required placeholder="e.g. elena@pupsj.edu.ph">
          </div>
          <div class="field">
            <label for="newStaffRole">Assigned Role (RBAC) *</label>
            <select id="newStaffRole">
              ${ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newStaffShift">Work Shift</label>
            <select id="newStaffShift">
              <option value="Morning">Morning (06:00 - 14:00)</option>
              <option value="Day" selected>Day (08:00 - 17:00)</option>
              <option value="Evening">Evening (14:00 - 22:00)</option>
              <option value="Night">Night (22:00 - 06:00)</option>
            </select>
          </div>
          <div class="field">
            <label for="newStaffPhone">Contact Phone</label>
            <input type="text" id="newStaffPhone" placeholder="+63 917 123 4567">
          </div>
        </div>
        <div class="field">
          <label for="newStaffPassword">Account Password *</label>
          <input type="password" id="newStaffPassword" required placeholder="Minimum 6 characters">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAddStaff">Create Account</button>
      </div>
    `;

    showModal('Create Staff Account', bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitAddStaff').onclick = () => {
      const name = ($('newStaffName').value || '').trim();
      const email = ($('newStaffEmail').value || '').trim().toLowerCase();
      const role = $('newStaffRole').value;
      const shift = $('newStaffShift').value;
      const phone = ($('newStaffPhone').value || '').trim();
      const password = $('newStaffPassword').value;

      if (!name) { toast('Please enter staff name', 'warn'); return; }
      if (!email || !email.includes('@')) { toast('Please enter a valid login email address', 'warn'); return; }
      if (!password || password.length < 6) { toast('Password must be at least 6 characters', 'warn'); return; }

      const staffList = Data.getStaff();
      if (staffList.some(s => s.email.toLowerCase() === email)) {
        toast(`An account with email "${email}" already exists!`, 'bad');
        return;
      }

      const nextId = Math.max(1, ...staffList.map(s => s.id || 0)) + 1;
      staffList.push({
        id: nextId,
        name,
        email,
        username: email.split('@')[0],
        role,
        shift,
        phone,
        password,
        active: true,
        created: today()
      });

      Data.saveStaff(staffList);
      Data.audit('Create Staff', 'staff', email, `Created operational account for ${name} (${role})`);
      toast(`Staff account for ${name} created successfully`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  window.openEditStaffModal = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === id);
    if (!item) return;

    const bodyHtml = `
      <form id="editStaffForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label for="editStaffName">Full Name *</label>
          <input type="text" id="editStaffName" value="${esc(item.name)}" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Login Email</label>
            <input type="text" value="${esc(item.email)}" readonly>
          </div>
          <div class="field">
            <label for="editStaffRole">Assigned Role (RBAC) *</label>
            <select id="editStaffRole">
              ${ROLES.map(r => `<option value="${r}" ${item.role === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editStaffShift">Work Shift</label>
            <select id="editStaffShift">
              <option value="Morning" ${item.shift === 'Morning' ? 'selected' : ''}>Morning (06:00 - 14:00)</option>
              <option value="Day" ${item.shift === 'Day' || !item.shift ? 'selected' : ''}>Day (08:00 - 17:00)</option>
              <option value="Evening" ${item.shift === 'Evening' ? 'selected' : ''}>Evening (14:00 - 22:00)</option>
              <option value="Night" ${item.shift === 'Night' ? 'selected' : ''}>Night (22:00 - 06:00)</option>
            </select>
          </div>
          <div class="field">
            <label for="editStaffPhone">Contact Phone</label>
            <input type="text" id="editStaffPhone" value="${esc(item.phone || '')}">
          </div>
        </div>
        <div class="field">
          <label for="editStaffPassword">Reset Password (Leave blank to keep existing)</label>
          <input type="password" id="editStaffPassword" placeholder="Enter new password if changing">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitEditStaff">Save Changes</button>
      </div>
    `;

    showModal(`Edit Staff &mdash; ${esc(item.name)}`, bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitEditStaff').onclick = () => {
      const name = ($('editStaffName').value || '').trim();
      const role = $('editStaffRole').value;
      const shift = $('editStaffShift').value;
      const phone = ($('editStaffPhone').value || '').trim();
      const newPwd = $('editStaffPassword').value;

      if (!name) { toast('Please enter staff name', 'warn'); return; }

      item.name = name;
      item.role = role;
      item.shift = shift;
      item.phone = phone;

      if (newPwd) {
        if (newPwd.length < 6) {
          toast('New password must be at least 6 characters', 'warn');
          return;
        }
        item.password = newPwd;
      }

      Data.saveStaff(staffList);
      Data.audit('Edit Staff', 'staff', item.email, `Updated staff profile for ${name} (${role})`);
      toast(`Account for ${name} updated`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  window.toggleStaffActive = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === id);
    if (!item) return;

    const activeCount = staffList.filter(s => s.active).length;
    if (item.active && activeCount <= 1) {
      toast('Cannot deactivate the last active staff account', 'bad');
      return;
    }

    item.active = !item.active;
    Data.saveStaff(staffList);
    Data.audit('Toggle Staff Status', 'staff', item.email, `${item.active ? 'Activated' : 'Deactivated'} account for ${item.name}`);
    toast(`Account for ${item.name} is now ${item.active ? 'Active' : 'Inactive'}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  window.deleteStaffAccount = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === id);
    if (!item) return;

    const activeCount = staffList.filter(s => s.active).length;
    if (item.active && activeCount <= 1) {
      toast('Cannot delete the last active staff account', 'bad');
      return;
    }

    if (confirm(`Are you sure you want to delete staff account "${item.name}" (${item.email})?`)) {
      const idx = staffList.indexOf(item);
      if (idx !== -1) staffList.splice(idx, 1);
      Data.saveStaff(staffList);
      Data.audit('Delete Staff', 'staff', item.email, `Deleted staff account for ${item.name}`);
      toast(`Staff account for ${item.name} deleted`, 'ok');
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
