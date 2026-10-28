/* ==========================================================================
   PUPSJ Hotel & Restaurant — Personnel Directory & Superadmin Account (employees.js)
   Two-role architecture: Personnel Directory for operations task assignment
   (no passwords), plus My Account for Superadmin profile & credential management
   with salted SHA-256 hashing and password strength rules.
   ========================================================================== */
'use strict';

(function () {
  const DEPARTMENTS = ['Front Desk', 'Housekeeping', 'Maintenance', 'Kitchen', 'Food & Beverage', 'Security', 'Management'];
  const SHIFTS = ['Morning (6:00 AM – 2:00 PM)', 'Day (8:00 AM – 5:00 PM)', 'Afternoon (2:00 PM – 10:00 PM)', 'Night (10:00 PM – 6:00 AM)'];
  
  let activeTab = 'directory';
  let deptFilter = '';
  let searchQuery = '';
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('employeesApp');
    if (!app) return;
    initialized = true;

    // Deep link tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['directory', 'account'].includes(tabParam)) {
      activeTab = tabParam;
    }

    renderApp();

    window.addEventListener('pupsj:data-change', e => {
      if (e.detail && (e.detail.entity === 'staff' || e.detail.entity === 'personnel')) {
        renderApp();
      }
    });
  }

  function getTasksForStaff(staffId, staffName) {
    const hkTasks = (Data.getHk ? Data.getHk() : []).filter(r => r.a === Number(staffId) || r.assignedName === staffName);
    const mxTasks = Data.getMaintenance().filter(m => m.assignedTo === staffName && (m.status || m.st) !== 'Resolved');
    return {
      hk: hkTasks,
      mx: mxTasks,
      total: hkTasks.length + mxTasks.length
    };
  }

  function renderApp() {
    const app = $('employeesApp');
    if (!app) return;

    const staffList = Data.getStaff();
    const activeCount = staffList.filter(s => s.active).length;
    const session = Data.getStaffSession() || { name: 'Superadmin', email: 'admin@pupsj.edu.ph', role: 'superadmin' };

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">PERSONNEL &amp; CREDENTIALS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Personnel Directory &amp; Admin Account</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          ${activeTab === 'directory' ? `
            <button type="button" class="btn" id="btnAddPersonnel">
              <span class="ic" data-icon="plus">[ICON: plus]</span> Add Personnel Record
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs" style="margin-bottom: 24px;">
        <button type="button" class="tab-btn ${activeTab === 'directory' ? 'active' : ''}" onclick="switchEmpTab('directory')">
          <span class="ic" data-icon="users">[ICON: users]</span> Personnel Directory
        </button>
        <button type="button" class="tab-btn ${activeTab === 'account' ? 'active' : ''}" onclick="switchEmpTab('account')">
          <span class="ic" data-icon="shield">[ICON: shield]</span> My Superadmin Account
        </button>
      </div>

      <div id="empTabContent">
        ${activeTab === 'directory' ? renderDirectoryTab(staffList, activeCount, session) : renderAccountTab(session)}
      </div>
    `;

    bindEvents();
  }

  window.switchEmpTab = function (tab) {
    activeTab = tab;
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
    renderApp();
  };

  // ─────────────────────────────────────────────────────────────
  // TAB 1: PERSONNEL DIRECTORY
  // ─────────────────────────────────────────────────────────────
  function renderDirectoryTab(staffList, activeCount, session) {
    const filtered = staffList.filter(s => {
      if (deptFilter && (s.role !== deptFilter && s.department !== deptFilter)) return false;
      if (searchQuery) {
        const text = `${s.name} ${s.role || ''} ${s.department || ''} ${s.phone || ''} ${s.shift || ''}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });

    return `
      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Personnel</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${staffList.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">On Active Duty</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${activeCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Operational Departments</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${DEPARTMENTS.length}</div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 240px; flex: 1;">
            <label for="personnelSearch">Search Personnel</label>
            <input type="text" id="personnelSearch" placeholder="Name, phone, or department…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 200px;">
            <label for="personnelDeptFilter">Department</label>
            <select id="personnelDeptFilter">
              <option value="">All Departments</option>
              ${DEPARTMENTS.map(d => `<option value="${d}" ${deptFilter === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Personnel Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Personnel Name</th>
                <th>Department / Role</th>
                <th>Duty Shift</th>
                <th>Contact Phone</th>
                <th>Active Tasks</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const tasks = getTasksForStaff(s.id, s.name);
                const dept = s.department || s.role || 'Front Desk';

                return `
                  <tr>
                    <td><b>${esc(s.name)}</b></td>
                    <td><span class="pill pill--muted">${esc(dept)}</span></td>
                    <td><span class="text-xs text-muted">${esc(s.shift || 'Day Shift')}</span></td>
                    <td>${esc(s.phone || '—')}</td>
                    <td>
                      ${tasks.total > 0 ? `
                        <button type="button" class="btn-ghost btn-sm" style="font-size: 11px; padding: 2px 8px; color: var(--gold-ink);" onclick="viewStaffTasks(${s.id})">
                          ${tasks.total} Task(s) &rarr;
                        </button>
                      ` : `
                        <span class="text-xs text-muted">None</span>
                      `}
                    </td>
                    <td>
                      <span class="pill ${s.active ? 'pill--ok' : 'pill--bad'}">
                        ${s.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: flex; justify-content: flex-end; gap: 4px;">
                        <button type="button" class="btn-secondary btn-sm" onclick="openEditPersonnelModal(${s.id})">Edit</button>
                        <button type="button" class="btn-secondary btn-sm" onclick="togglePersonnelActive(${s.id})">
                          ${s.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deletePersonnelRecord(${s.id})">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center text-muted" style="padding: 32px;">No personnel records found matching filters.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 2: MY SUPERADMIN ACCOUNT
  // ─────────────────────────────────────────────────────────────
  function renderAccountTab(session) {
    const adminAccounts = store.get('adminAccounts', []);
    const admin = adminAccounts.find(a => a.email.toLowerCase() === (session.email || '').toLowerCase()) || {
      name: session.name || 'Superadmin',
      email: session.email || 'admin@pupsj.edu.ph',
      role: 'superadmin'
    };

    return `
      <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px; align-items: flex-start; max-width: 1000px;">
        <!-- Left: Profile Info -->
        <div class="card" style="padding: 24px;">
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">Superadmin Profile</h2>
          <p class="text-sm text-secondary" style="margin-bottom: 20px;">
            The Superadmin account possesses full administrative authority over all PMS and POS operations.
          </p>

          <form id="adminProfileForm" onsubmit="return false;">
            <div class="field" style="margin-bottom: 16px;">
              <label for="adminProfileName">Administrator Display Name *</label>
              <input type="text" id="adminProfileName" value="${esc(admin.name)}" required>
            </div>
            <div class="field" style="margin-bottom: 16px;">
              <label for="adminProfileEmail">Login Email Address *</label>
              <input type="email" id="adminProfileEmail" value="${esc(admin.email)}" required>
            </div>
            <div class="field" style="margin-bottom: 24px;">
              <label>System Role</label>
              <input type="text" value="Superadmin (Full Access)" disabled style="background: var(--surface-2);">
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="button" class="btn" id="btnSaveAdminProfile">
                <span class="ic" data-icon="check">[ICON: check]</span> Save Profile Details
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Change Password with Strength Meter -->
        <div class="card" style="padding: 24px;">
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">Security &amp; Password</h2>
          <p class="text-sm text-secondary" style="margin-bottom: 20px;">
            Protected by multi-round pure-JS salted SHA-256 password hashing.
          </p>

          <form id="changePasswordForm" onsubmit="return false;">
            <div class="field" style="margin-bottom: 14px;">
              <label for="adminCurrentPass">Current Password *</label>
              <input type="password" id="adminCurrentPass" required placeholder="Enter existing password">
            </div>

            <div class="field" style="margin-bottom: 14px;">
              <label for="adminNewPass">New Secure Password *</label>
              <input type="password" id="adminNewPass" required placeholder="At least 8 characters">
              <!-- Password Strength Bar -->
              <div style="height: 4px; background: var(--border); border-radius: 2px; margin-top: 6px; overflow: hidden;">
                <div id="passStrengthBar" style="height: 100%; width: 0%; transition: all 0.3s ease; background: var(--bad);"></div>
              </div>
              <div id="passStrengthText" class="text-xs text-muted" style="margin-top: 4px;">Strength: Enter password</div>
            </div>

            <div class="field" style="margin-bottom: 24px;">
              <label for="adminConfirmPass">Confirm New Password *</label>
              <input type="password" id="adminConfirmPass" required placeholder="Re-type new password">
            </div>

            <div style="display: flex; justify-content: flex-end;">
              <button type="button" class="btn" id="btnChangePassword">
                <span class="ic" data-icon="shield">[ICON: shield]</span> Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT BINDINGS
  // ─────────────────────────────────────────────────────────────
  function bindEvents() {
    // Add Personnel
    const btnAdd = $('btnAddPersonnel');
    if (btnAdd) btnAdd.onclick = openAddPersonnelModal;

    // Filters
    const searchInp = $('personnelSearch');
    if (searchInp) {
      searchInp.oninput = () => {
        searchQuery = searchInp.value.toLowerCase().trim();
        renderApp();
      };
    }

    const deptSel = $('personnelDeptFilter');
    if (deptSel) {
      deptSel.onchange = () => {
        deptFilter = deptSel.value;
        renderApp();
      };
    }

    // Save Admin Profile
    const btnProf = $('btnSaveAdminProfile');
    if (btnProf) {
      btnProf.onclick = () => {
        const name = $('adminProfileName').value.trim();
        const email = $('adminProfileEmail').value.trim().toLowerCase();
        if (!name || !email) {
          toast('Name and email are required.', 'bad');
          return;
        }

        const adminAccounts = store.get('adminAccounts', [
          { adminId: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', salt: 'a1f8c49e2b704d5a', passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d', role: 'superadmin' }
        ]);

        const session = Data.getStaffSession();
        const curEmail = (session?.email || 'admin@pupsj.edu.ph').toLowerCase();
        const target = adminAccounts.find(a => a.email.toLowerCase() === curEmail) || adminAccounts[0];
        
        target.name = name;
        target.email = email;
        store.set('adminAccounts', adminAccounts);

        if (session) {
          session.name = name;
          session.email = email;
          Data.setStaffSession(session);
        }

        Data.audit('Update Superadmin Profile', 'Admin', email, `Updated display name to ${name}`);
        toast('Superadmin profile updated successfully!', 'ok');
        renderApp();
      };
    }

    // Change Password Logic & Strength Meter
    const newPassInp = $('adminNewPass');
    if (newPassInp) {
      newPassInp.oninput = () => {
        const val = newPassInp.value;
        const bar = $('passStrengthBar');
        const txt = $('passStrengthText');
        if (!bar || !txt) return;

        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        if (val.length === 0) {
          bar.style.width = '0%';
          txt.textContent = 'Strength: Enter password';
          txt.style.color = 'var(--muted)';
        } else if (score <= 2) {
          bar.style.width = '30%';
          bar.style.background = 'var(--bad)';
          txt.textContent = 'Strength: Weak (Needs 8+ chars, numbers & uppercase)';
          txt.style.color = 'var(--bad)';
        } else if (score <= 4) {
          bar.style.width = '70%';
          bar.style.background = 'var(--warn)';
          txt.textContent = 'Strength: Moderate (Add special characters)';
          txt.style.color = 'var(--warn)';
        } else {
          bar.style.width = '100%';
          bar.style.background = 'var(--ok)';
          txt.textContent = 'Strength: Strong';
          txt.style.color = 'var(--ok)';
        }
      };
    }

    const btnChangePass = $('btnChangePassword');
    if (btnChangePass) {
      btnChangePass.onclick = () => {
        const currentPass = $('adminCurrentPass').value;
        const newPass = $('adminNewPass').value;
        const confirmPass = $('adminConfirmPass').value;

        if (!currentPass || !newPass || !confirmPass) {
          toast('Please complete all password fields.', 'bad');
          return;
        }

        if (newPass !== confirmPass) {
          toast('New passwords do not match.', 'bad');
          return;
        }

        if (newPass.length < 8) {
          toast('Password must be at least 8 characters long.', 'bad');
          return;
        }

        const session = Data.getStaffSession();
        const curEmail = (session?.email || 'admin@pupsj.edu.ph').toLowerCase();
        const adminAccounts = store.get('adminAccounts', [
          { adminId: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', salt: 'a1f8c49e2b704d5a', passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d', role: 'superadmin' }
        ]);
        const admin = adminAccounts.find(a => a.email.toLowerCase() === curEmail) || adminAccounts[0];

        // Verify current password
        const Crypto = window.PUPSJ_Crypto;
        const isValid = Crypto && admin.salt && admin.passwordHash
          ? Crypto.verifyPassword(currentPass, admin.salt, admin.passwordHash)
          : (currentPass === 'admin123' || currentPass === 'Admin@12345');

        if (!isValid) {
          toast('Incorrect current password.', 'bad');
          return;
        }

        // Hash new password
        const newSalt = Crypto.generateSalt();
        const newHash = Crypto.hashPassword(newPass, newSalt);

        admin.salt = newSalt;
        admin.passwordHash = newHash;
        store.set('adminAccounts', adminAccounts);

        Data.audit('Change Password', 'Admin', admin.email, 'Updated superadmin password with new salt & hash');
        toast('Password updated successfully!', 'ok');

        $('adminCurrentPass').value = '';
        $('adminNewPass').value = '';
        $('adminConfirmPass').value = '';
        const bar = $('passStrengthBar');
        const txt = $('passStrengthText');
        if (bar) bar.style.width = '0%';
        if (txt) txt.textContent = 'Strength: Enter password';
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MODALS & CRUD
  // ─────────────────────────────────────────────────────────────
  function openAddPersonnelModal() {
    const bodyHtml = `
      <form id="addPersonnelForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field" style="margin-bottom: 12px;">
          <label for="newStaffName">Full Personnel Name *</label>
          <input type="text" id="newStaffName" required placeholder="e.g. Elena Reyes">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label for="newStaffDept">Assigned Department *</label>
            <select id="newStaffDept">
              ${DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="newStaffShift">Work Shift *</label>
            <select id="newStaffShift">
              ${SHIFTS.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label for="newStaffPhone">Contact Phone Number *</label>
          <input type="text" id="newStaffPhone" required placeholder="e.g. +63 917 123 4567">
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn" id="btnSubmitAddPersonnel">Save Personnel</button>
    `;

    showModal('Add Personnel Record', bodyHtml, footerHtml, {
      onOpen: modalEl => {
        const btnSubmit = modalEl.querySelector('#btnSubmitAddPersonnel');
        if (btnSubmit) {
          btnSubmit.onclick = () => {
            const name = modalEl.querySelector('#newStaffName').value.trim();
            const dept = modalEl.querySelector('#newStaffDept').value;
            const shift = modalEl.querySelector('#newStaffShift').value;
            const phone = modalEl.querySelector('#newStaffPhone').value.trim();

            if (!name || !phone) {
              toast('Name and phone number are required.', 'bad');
              return;
            }

            const staffList = Data.getStaff();
            const newId = staffList.length ? Math.max(...staffList.map(s => s.id || 0)) + 1 : 1;
            staffList.push({
              id: newId,
              name,
              department: dept,
              role: dept,
              shift,
              phone,
              active: true
            });

            Data.saveStaff(staffList);
            Data.audit('Create Personnel', 'Staff', String(newId), `Added ${name} to ${dept}`);
            closeModal();
            toast(`Personnel record for ${name} created.`, 'ok');
            renderApp();
          };
        }
      }
    });
  }

  window.openEditPersonnelModal = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === Number(id));
    if (!item) return;

    const bodyHtml = `
      <form id="editPersonnelForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field" style="margin-bottom: 12px;">
          <label for="editStaffName">Full Personnel Name *</label>
          <input type="text" id="editStaffName" value="${esc(item.name)}" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label for="editStaffDept">Department *</label>
            <select id="editStaffDept">
              ${DEPARTMENTS.map(d => `<option value="${d}" ${(item.department || item.role) === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="editStaffShift">Work Shift *</label>
            <select id="editStaffShift">
              ${SHIFTS.map(s => `<option value="${s}" ${item.shift === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label for="editStaffPhone">Contact Phone Number *</label>
          <input type="text" id="editStaffPhone" value="${esc(item.phone || '')}" required>
        </div>
      </form>
    `;

    const footerHtml = `
      <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn" id="btnSubmitEditPersonnel">Update Record</button>
    `;

    showModal(`Edit Personnel: ${item.name}`, bodyHtml, footerHtml, {
      onOpen: modalEl => {
        const btnSubmit = modalEl.querySelector('#btnSubmitEditPersonnel');
        if (btnSubmit) {
          btnSubmit.onclick = () => {
            item.name = modalEl.querySelector('#editStaffName').value.trim();
            item.department = modalEl.querySelector('#editStaffDept').value;
            item.role = item.department;
            item.shift = modalEl.querySelector('#editStaffShift').value;
            item.phone = modalEl.querySelector('#editStaffPhone').value.trim();

            Data.saveStaff(staffList);
            Data.audit('Update Personnel', 'Staff', String(id), `Updated details for ${item.name}`);
            closeModal();
            toast('Personnel details updated.', 'ok');
            renderApp();
          };
        }
      }
    });
  };

  window.togglePersonnelActive = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === Number(id));
    if (!item) return;

    item.active = !item.active;
    Data.saveStaff(staffList);
    Data.audit('Toggle Personnel Active', 'Staff', String(id), `Status: ${item.active ? 'Active' : 'Inactive'}`);
    toast(`${item.name} is now ${item.active ? 'Active' : 'Inactive'}.`, 'info');
    renderApp();
  };

  window.deletePersonnelRecord = async function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === Number(id));
    if (!item) return;

    const tasks = getTasksForStaff(id, item.name);
    if (tasks.total > 0) {
      toast(`Cannot delete ${item.name}: ${tasks.total} active task(s) currently assigned. Please reassign tasks first.`, 'bad');
      return;
    }

    const ok = await confirmDialog(
      `Are you sure you want to remove ${esc(item.name)} from the personnel directory?`,
      'Delete Personnel Record',
      { danger: true }
    );
    if (!ok) return;

    const idx = staffList.indexOf(item);
    if (idx !== -1) staffList.splice(idx, 1);
    Data.saveStaff(staffList);
    Data.audit('Delete Personnel', 'Staff', String(id), `Deleted personnel record ${item.name}`);
    toast(`Personnel record for ${item.name} deleted.`, 'ok');
    renderApp();
  };

  window.viewStaffTasks = function (id) {
    const staffList = Data.getStaff();
    const item = staffList.find(s => s.id === Number(id));
    if (!item) return;

    const tasks = getTasksForStaff(id, item.name);

    const bodyHtml = `
      <div style="font-size: 13px;">
        <h4 style="margin: 0 0 10px 0;">Assigned Housekeeping Rooms (${tasks.hk.length})</h4>
        ${tasks.hk.length > 0 ? `
          <div class="table-wrap" style="margin-bottom: 16px;">
            <table>
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Cleaning Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.hk.map(r => `
                  <tr>
                    <td><b>Room ${r.n}</b></td>
                    <td><span class="pill pill--warn">${esc(r.s || r.st)}</span></td>
                    <td>${esc(r.p || 'Standard')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-xs text-muted" style="margin-bottom: 16px;">No active housekeeping rooms assigned.</p>'}

        <h4 style="margin: 0 0 10px 0;">Assigned Maintenance Work Orders (${tasks.mx.length})</h4>
        ${tasks.mx.length > 0 ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Room</th>
                  <th>Title</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.mx.map(m => `
                  <tr>
                    <td><code>${esc(m.id)}</code></td>
                    <td>Room ${m.room}</td>
                    <td>${esc(m.title)}</td>
                    <td><span class="pill ${m.priority === 'Urgent' ? 'pill--bad' : 'pill--warn'}">${esc(m.priority)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-xs text-muted">No active maintenance work orders assigned.</p>'}
      </div>
    `;

    showModal(`Active Work Assignments: ${item.name}`, bodyHtml, '', { maxWidth: '580px' });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
