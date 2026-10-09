/* ==========================================================================
   PUPSJ Hotel & Restaurant — System Audit Log (audit.js)
   Immutable operational activity log, actor accountability,
   filtering by staff/action/date, CSV exports, dual recordType/type support, and demo reset.
   ========================================================================== */
'use strict';

(function () {
  let staffFilter = '';
  let actionFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 15;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('auditApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getRecordType(l) {
    return l.recordType || l.type || '';
  }

  function getRecordId(l) {
    return l.recordId != null ? String(l.recordId) : (l.id != null ? String(l.id) : '');
  }

  function getFilteredLogs() {
    const list = Data.getAuditLog();
    return list.filter(l => {
      const recType = getRecordType(l);
      const recId = getRecordId(l);

      if (staffFilter && l.user !== staffFilter) return false;
      if (actionFilter && l.action !== actionFilter) return false;
      if (searchQuery) {
        const text = `${l.user} ${l.action} ${recType} ${recId} ${l.details || ''}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    }).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  }

  function renderApp() {
    const app = $('auditApp');
    if (!app) return;

    const allLogs = Data.getAuditLog();
    const staffMembers = Array.from(new Set(allLogs.map(l => l.user).filter(Boolean)));
    const actionTypes = Array.from(new Set(allLogs.map(l => l.action).filter(Boolean)));

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">COMPLIANCE &amp; ACCOUNTABILITY</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">System Audit &amp; Activity Log</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" id="btnResetDemoData" style="color: var(--bad); border-color: var(--bad);">
            <span class="ic" data-icon="refresh">[ICON: refresh]</span> Reset Demo Data
          </button>
          <button type="button" class="btn-secondary" id="btnExportAuditCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Logged Events</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${allLogs.length}</div>
          <div class="text-xs text-muted">Capped at 500 entries</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Active Actors</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${staffMembers.length}</div>
          <div class="text-xs text-muted">Staff and Guest self-service</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Action Categories</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${actionTypes.length}</div>
          <div class="text-xs text-muted">Complete operation trace</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="auditSearchInput">Search Audit Log</label>
            <input type="text" id="auditSearchInput" placeholder="User, action, or record…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="auditStaffFilter">Staff Member / Actor</label>
            <select id="auditStaffFilter">
              <option value="">All Actors</option>
              ${staffMembers.map(s => `<option value="${esc(s)}" ${staffFilter === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 170px;">
            <label for="auditActionFilter">Action Type</label>
            <select id="auditActionFilter">
              <option value="">All Actions</option>
              ${actionTypes.map(a => `<option value="${esc(a)}" ${actionFilter === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetAuditFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Audit Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Staff / Actor</th>
                <th>Action</th>
                <th>Entity / Target</th>
                <th>Operational Details</th>
              </tr>
            </thead>
            <tbody id="auditTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="auditPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('auditSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('auditStaffFilter').onchange = (e) => { staffFilter = e.target.value; page = 1; renderTable(); };
    $('auditActionFilter').onchange = (e) => { actionFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetAuditFilters').onclick = () => {
      searchQuery = '';
      staffFilter = '';
      actionFilter = '';
      $('auditSearchInput').value = '';
      $('auditStaffFilter').value = '';
      $('auditActionFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnExportAuditCSV').onclick = () => {
      const items = getFilteredLogs();
      const cols = [
        { header: 'Timestamp', key: 'time' },
        { header: 'Actor', key: 'user' },
        { header: 'Action', key: 'action' },
        { header: 'Entity Type', key: l => getRecordType(l) },
        { header: 'Record ID', key: l => getRecordId(l) },
        { header: 'Details', key: 'details' }
      ];
      exportCSV(`PUPSJ_Audit_Log_${today()}.csv`, cols, items);
    };

    $('btnResetDemoData').onclick = () => {
      if (confirm('Are you sure you want to reset all hotel and restaurant demo data to fresh initial relative dates? All operational changes will be restored to clean defaults.')) {
        Data.resetDemoData();
        toast('System data reset successfully! Reloading…', 'ok');
        setTimeout(() => window.location.reload(), 600);
      }
    };
  }

  function renderTable() {
    const tbody = $('auditTableBody');
    const pgnEl = $('auditPagination');
    if (!tbody) return;

    const list = getFilteredLogs();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">No audit log records found matching the filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(l => {
      const recType = getRecordType(l);
      const recId = getRecordId(l);

      return `
        <tr>
          <td><span class="text-xs text-muted">${esc(l.time)}</span></td>
          <td><b>${esc(l.user || 'System')}</b></td>
          <td><span class="pill pill--info" style="font-size: 11px;">${esc(l.action)}</span></td>
          <td><code>${esc(recType)}${recId ? ': ' + esc(recId) : ''}</code></td>
          <td style="font-size: 13px;">${esc(l.details || '—')}</td>
        </tr>
      `;
    }).join('');

    const startIdx = pgn.startIndex != null ? pgn.startIndex : (pgn.startIdx != null ? pgn.startIdx : 0);
    const endIdx = pgn.endIndex != null ? pgn.endIndex : (pgn.endIdx != null ? pgn.endIdx : 0);
    const totalItems = pgn.total != null ? pgn.total : (pgn.totalItems != null ? pgn.totalItems : 0);

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${totalItems > 0 ? startIdx + 1 : 0}&ndash;${endIdx} of ${totalItems} entries</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnAuditPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages || 1}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= (pgn.totalPages || 1) ? 'disabled' : ''} id="btnAuditNext">Next</button>
      </div>
    `;

    const prev = $('btnAuditPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnAuditNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

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
