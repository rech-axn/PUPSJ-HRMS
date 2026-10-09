/* ==========================================================================
   PUPSJ Hotel & Restaurant — Inquiries Queue (inquiries.js)
   Public contact inquiry management, mailto email integration,
   staff assignment, resolution tracking, dual schema compatibility, and CSV export.
   ========================================================================== */
'use strict';

(function () {
  let statusFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 12;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('inquiriesApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getFilteredInquiries() {
    const list = Data.getInquiries();
    return list.filter(i => {
      const id = i.ref || i.id || '';
      const notes = i.staffNotes || i.notes || '';
      const assigned = i.assignedTo || i.assigned || '';

      if (statusFilter && i.status !== statusFilter) return false;
      if (searchQuery) {
        const text = `${id} ${i.name || ''} ${i.email || ''} ${i.phone || ''} ${i.type || ''} ${i.message || ''} ${notes} ${assigned}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    }).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  }

  function renderApp() {
    const app = $('inquiriesApp');
    if (!app) return;

    const allInquiries = Data.getInquiries();
    const newCount = allInquiries.filter(i => i.status === 'New').length;
    const progressCount = allInquiries.filter(i => i.status === 'In progress').length;
    const resolvedCount = allInquiries.filter(i => i.status === 'Resolved').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">GUEST RELATIONS &amp; INBOX</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Public Contact Inquiries</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" id="btnExportInquiriesCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">New Unhandled Inquiries</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${newCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">In Progress / Follow-up</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${progressCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Resolved Inquiries</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${resolvedCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Submissions</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${allInquiries.length}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="inqSearchInput">Search Inquiries</label>
            <input type="text" id="inqSearchInput" placeholder="Name, email, message…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="inqStatusFilter">Status Filter</label>
            <select id="inqStatusFilter">
              <option value="">All Statuses</option>
              <option value="New" ${statusFilter === 'New' ? 'selected' : ''}>New Only</option>
              <option value="In progress" ${statusFilter === 'In progress' ? 'selected' : ''}>In Progress Only</option>
              <option value="Resolved" ${statusFilter === 'Resolved' ? 'selected' : ''}>Resolved Only</option>
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetInqFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Inquiries Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Sender Name</th>
                <th>Contact Details</th>
                <th>Topic / Subject</th>
                <th>Message Snippet</th>
                <th>Date Received</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="inquiriesTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="inquiriesPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('inqSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('inqStatusFilter').onchange = (e) => { statusFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetInqFilters').onclick = () => {
      searchQuery = '';
      statusFilter = '';
      $('inqSearchInput').value = '';
      $('inqStatusFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnExportInquiriesCSV').onclick = () => {
      const items = getFilteredInquiries();
      const cols = [
        { header: 'Reference #', key: i => i.ref || i.id },
        { header: 'Sender Name', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Phone', key: 'phone' },
        { header: 'Topic', key: 'type' },
        { header: 'Message', key: 'message' },
        { header: 'Status', key: 'status' },
        { header: 'Date', key: 'created' },
        { header: 'Assigned Staff', key: i => i.assignedTo || i.assigned || 'Unassigned' },
        { header: 'Staff Notes', key: i => i.staffNotes || i.notes || '' }
      ];
      exportCSV(`PUPSJ_Contact_Inquiries_${today()}.csv`, cols, items);
    };
  }

  function renderTable() {
    const tbody = $('inquiriesTableBody');
    const pgnEl = $('inquiriesPagination');
    if (!tbody) return;

    const list = getFilteredInquiries();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No inquiries found matching current filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(i => {
      const id = i.ref || i.id;
      let pillClass = 'pill--bad';
      if (i.status === 'In progress') pillClass = 'pill--warn';
      else if (i.status === 'Resolved') pillClass = 'pill--ok';

      return `
        <tr>
          <td><b>${esc(id)}</b></td>
          <td><b>${esc(i.name)}</b></td>
          <td>
            <div>${esc(i.email || '—')}</div>
            <div class="text-xs text-muted">${esc(i.phone || '')}</div>
          </td>
          <td><span class="pill pill--muted" style="font-size: 11px;">${esc(i.type || 'General')}</span></td>
          <td>
            <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px;">
              ${esc(i.message)}
            </div>
          </td>
          <td><span class="text-xs text-muted">${fmtDate(i.created ? i.created.slice(0, 10) : today())}</span></td>
          <td><span class="pill ${pillClass}">${esc(i.status)}</span></td>
          <td style="text-align: right;">
            <button type="button" class="btn-secondary btn-sm" onclick="openInquiryModal('${esc(id)}')">View &amp; Reply</button>
          </td>
        </tr>
      `;
    }).join('');

    const startIdx = pgn.startIndex != null ? pgn.startIndex : (pgn.startIdx != null ? pgn.startIdx : 0);
    const endIdx = pgn.endIndex != null ? pgn.endIndex : (pgn.endIdx != null ? pgn.endIdx : 0);
    const totalItems = pgn.total != null ? pgn.total : (pgn.totalItems != null ? pgn.totalItems : 0);

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${totalItems > 0 ? startIdx + 1 : 0}&ndash;${endIdx} of ${totalItems} inquiries</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnInqPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages || 1}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= (pgn.totalPages || 1) ? 'disabled' : ''} id="btnInqNext">Next</button>
      </div>
    `;

    const prev = $('btnInqPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnInqNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  window.openInquiryModal = function (refId) {
    const list = Data.getInquiries();
    const item = list.find(i => (i.ref || i.id) === refId);
    if (!item) return;

    const id = item.ref || item.id;
    const staffList = Data.getStaff();
    const currentAssigned = item.assignedTo || item.assigned || '';
    const currentNotes = item.staffNotes || item.notes || '';

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 18px;">${esc(item.name)}</h3>
            <div class="text-xs text-secondary" style="margin-top: 2px;">
              Email: <b>${esc(item.email || 'None')}</b> &middot; Phone: <b>${esc(item.phone || 'None')}</b>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="pill ${item.status === 'Resolved' ? 'pill--ok' : item.status === 'In progress' ? 'pill--warn' : 'pill--bad'}">
              ${esc(item.status)}
            </span>
            <div class="text-xs text-muted" style="margin-top: 4px;">Ref: ${esc(id)}</div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <span class="text-xs text-secondary" style="font-weight: 600;">Inquiry Topic:</span>
          <div style="font-weight: 600; font-size: 14px; margin-top: 2px;">${esc(item.type || 'General Inquiry')}</div>
        </div>

        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 14px;">
          <span class="text-xs text-secondary" style="font-weight: 600;">Message Content:</span>
          <div style="margin-top: 4px; line-height: 1.5; white-space: pre-wrap;">${esc(item.message)}</div>
        </div>

        <!-- Management Fields -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label for="inqModalStatus">Update Status</label>
            <select id="inqModalStatus">
              <option value="New" ${item.status === 'New' ? 'selected' : ''}>New</option>
              <option value="In progress" ${item.status === 'In progress' ? 'selected' : ''}>In progress</option>
              <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
          <div class="field">
            <label for="inqModalStaff">Assigned Staff Member</label>
            <select id="inqModalStaff">
              <option value="">Unassigned</option>
              ${staffList.map(s => `<option value="${esc(s.name)}" ${currentAssigned === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label for="inqModalNotes">Internal Staff Notes</label>
          <textarea id="inqModalNotes" rows="2" placeholder="Record internal follow-up notes…">${esc(currentNotes)}</textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div>
          ${item.email ? `
            <a class="btn-secondary btn-sm" href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent('RE: ' + (item.type || 'Inquiry') + ' - PUPSJ Hotel & Restaurant')}&body=${encodeURIComponent('\n\n--- Original Inquiry (' + id + ') ---\n' + item.message)}" target="_blank">
              <span class="ic" data-icon="mail">[ICON: mail]</span> Reply via Email (mailto:)
            </a>
          ` : '<span class="text-xs text-muted">No email address on file</span>'}
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn" id="btnSaveInqModal">Save</button>
        </div>
      </div>
    `;

    showModal(`Inquiry &mdash; ${esc(id)}`, bodyHtml, footerHtml, { maxWidth: '540px' });

    $('btnSaveInqModal').onclick = () => {
      item.status = $('inqModalStatus').value;
      const assigned = $('inqModalStaff').value;
      item.assignedTo = assigned;
      item.assigned = assigned;
      const notes = ($('inqModalNotes').value || '').trim();
      item.staffNotes = notes;
      item.notes = notes;

      Data.saveInquiries(list);
      Data.audit('Update Inquiry', 'inquiry', id, `Updated inquiry ${id} status to ${item.status}`);
      toast(`Inquiry ${id} updated`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
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
