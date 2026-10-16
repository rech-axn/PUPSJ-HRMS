/* ==========================================================================
   PUPSJ Hotel & Restaurant — Approvals & Overrides Inbox (approvals.js)
   Superadmin management inbox for sensitive operations requiring authorization:
   - Check-out with unsettled balance
   - Fee waivers & policy overrides
   - Refunds above approval threshold
   - Room status overrides
   ========================================================================== */
'use strict';

(function () {
  let statusFilter = 'all'; // 'all' | 'Pending' | 'Approved' | 'Rejected'
  let searchQuery = '';

  function init() {
    renderApp();
  }

  function getFilteredRequests() {
    let list = PUPSJ_Services.ApprovalService.getRequests();

    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.reason && r.reason.toLowerCase().includes(q)) ||
        (r.requestedBy && r.requestedBy.toLowerCase().includes(q)) ||
        (r.refId && r.refId.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q))
      );
    }

    return list;
  }

  function renderApp() {
    const app = $('approvalsApp');
    if (!app) return;

    const all = PUPSJ_Services.ApprovalService.getRequests();
    const pendingCount = all.filter(r => r.status === 'Pending').length;
    const approvedCount = all.filter(r => r.status === 'Approved').length;
    const rejectedCount = all.filter(r => r.status === 'Rejected').length;

    const filtered = getFilteredRequests();

    app.innerHTML = `
      <div class="page-head" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="site-section-tag">SUPERADMIN CONTROLS</span>
            <h1 style="font-size: 28px; margin: 4px 0 0 0;">Management Approvals &amp; Overrides</h1>
            <p class="text-sm" style="color: var(--ink-2); margin-top: 4px;">
              Executive authorization queue for departures with balance, rate waivers, and high-value adjustments.
            </p>
          </div>
          <button type="button" class="btn" id="btnNewApprovalRequest">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Request
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid-4" style="gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 11px; text-transform: uppercase; color: var(--ink-3);">Pending Review</div>
          <div class="kpi-value" style="font-size: 26px; font-weight: 700; color: ${pendingCount > 0 ? 'var(--bad)' : 'var(--ink)'};">
            ${pendingCount}
          </div>
          <div class="text-xs text-secondary">${pendingCount > 0 ? 'Requires executive action' : 'All requests resolved'}</div>
        </div>

        <div class="card kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 11px; text-transform: uppercase; color: var(--ink-3);">Approved Overrides</div>
          <div class="kpi-value" style="font-size: 26px; font-weight: 700; color: var(--ok);">${approvedCount}</div>
          <div class="text-xs text-secondary">Authorized exceptions</div>
        </div>

        <div class="card kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 11px; text-transform: uppercase; color: var(--ink-3);">Rejected</div>
          <div class="kpi-value" style="font-size: 26px; font-weight: 700; color: var(--ink-3);">${rejectedCount}</div>
          <div class="text-xs text-secondary">Declined by manager</div>
        </div>

        <div class="card kpi-card" style="padding: 16px;">
          <div class="kpi-label" style="font-size: 11px; text-transform: uppercase; color: var(--ink-3);">Total Recorded</div>
          <div class="kpi-value" style="font-size: 26px; font-weight: 700;">${all.length}</div>
          <div class="text-xs text-secondary">Audit logged events</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 14px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div class="tabs" style="margin: 0;">
          <button class="tab-btn ${statusFilter === 'all' ? 'active' : ''}" data-status="all">All (${all.length})</button>
          <button class="tab-btn ${statusFilter === 'Pending' ? 'active' : ''}" data-status="Pending">
            Pending (${pendingCount})
          </button>
          <button class="tab-btn ${statusFilter === 'Approved' ? 'active' : ''}" data-status="Approved">Approved (${approvedCount})</button>
          <button class="tab-btn ${statusFilter === 'Rejected' ? 'active' : ''}" data-status="Rejected">Rejected (${rejectedCount})</button>
        </div>

        <div style="display: flex; gap: 8px;">
          <input type="text" id="approvalSearch" class="input" placeholder="Search approvals..." value="${esc(searchQuery)}" style="width: 240px; height: 36px;">
        </div>
      </div>

      <!-- Requests Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Category &amp; Title</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Requested By</th>
                <th>Status</th>
                <th style="text-align: right;">Decision</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(r => renderRequestRow(r)).join('')}
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center text-muted" style="padding: 48px;">
                    No approval requests found matching the current criteria.
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderRequestRow(r) {
    const isPending = r.status === 'Pending';
    const pillClass = r.status === 'Approved' ? 'pill--ok' : r.status === 'Rejected' ? 'pill--bad' : 'pill--warn';

    return `
      <tr>
        <td><b>${r.id}</b></td>
        <td>
          <div style="font-weight: 600;">${esc(r.title)}</div>
          <div class="text-xs text-secondary" style="margin-top: 2px;">${esc(r.reason)}</div>
        </td>
        <td><b>${r.amount > 0 ? peso(r.amount) : '—'}</b></td>
        <td>
          ${r.refId ? `<span class="pill pill--muted" style="font-size: 11px;">${esc(r.refType)}: ${esc(r.refId)}</span>` : '—'}
        </td>
        <td>
          <div style="font-size: 13px;">${esc(r.requestedBy)}</div>
          <div class="text-xs text-muted">${esc(r.requestedAt)}</div>
        </td>
        <td>
          <span class="pill ${pillClass}">${esc(r.status)}</span>
        </td>
        <td style="text-align: right;">
          ${isPending ? `
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" class="btn btn-sm" onclick="window.approveRequestModal('${r.id}')" style="background: var(--ok); border-color: var(--ok); color: #fff;">
                Approve
              </button>
              <button type="button" class="btn-secondary btn-sm" onclick="window.rejectRequestModal('${r.id}')" style="color: var(--bad); border-color: var(--bad);">
                Reject
              </button>
            </div>
          ` : `
            <div class="text-xs text-muted">
              By ${esc(r.reviewedBy || 'Manager')}
              ${r.notes ? `<div style="font-style: italic;">"${esc(r.notes)}"</div>` : ''}
            </div>
          `}
        </td>
      </tr>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('[data-status]').forEach(btn => {
      btn.onclick = () => {
        statusFilter = btn.dataset.status;
        renderApp();
      };
    });

    const searchInput = $('approvalSearch');
    if (searchInput) {
      searchInput.oninput = () => {
        searchQuery = searchInput.value;
        renderApp();
      };
    }

    const newBtn = $('btnNewApprovalRequest');
    if (newBtn) {
      newBtn.onclick = () => openCreateRequestModal();
    }
  }

  window.approveRequestModal = function (id) {
    const list = PUPSJ_Services.ApprovalService.getRequests();
    const req = list.find(r => r.id === id);
    if (!req) return;

    showModal({
      title: `Approve Override: ${req.id}`,
      content: `
        <div style="padding: 10px 0;">
          <p class="text-sm text-secondary" style="margin-bottom: 12px;">
            You are authorizing <b>${esc(req.title)}</b> (${peso(req.amount)}). This decision will be stamped in the immutable system audit trail.
          </p>
          <div class="form-group">
            <label for="approvalNotesInput">Approval Notes / Authorization Reason:</label>
            <textarea id="approvalNotesInput" class="input" rows="3" placeholder="e.g. Authorized per corporate billing credit policy or guest exception."></textarea>
          </div>
        </div>
      `,
      confirmText: 'Confirm Approval',
      onConfirm: () => {
        const notes = ($('approvalNotesInput')?.value || '').trim() || 'Approved by Administrator';
        PUPSJ_Services.ApprovalService.approveRequest(id, 'Superadmin', notes);
        toast(`Request ${id} approved successfully.`, 'ok');
        renderApp();
      }
    });
  };

  window.rejectRequestModal = function (id) {
    const list = PUPSJ_Services.ApprovalService.getRequests();
    const req = list.find(r => r.id === id);
    if (!req) return;

    showModal({
      title: `Reject Override: ${req.id}`,
      content: `
        <div style="padding: 10px 0;">
          <p class="text-sm text-secondary" style="margin-bottom: 12px;">
            Declining <b>${esc(req.title)}</b>. Please provide a mandatory reason for declining this request.
          </p>
          <div class="form-group">
            <label for="rejectionReasonInput">Rejection Reason (Mandatory):</label>
            <textarea id="rejectionReasonInput" class="input" rows="3" placeholder="e.g. Guest folio must be settled prior to departure; corporate voucher expired."></textarea>
          </div>
        </div>
      `,
      confirmText: 'Decline Request',
      onConfirm: () => {
        const reason = ($('rejectionReasonInput')?.value || '').trim();
        if (!reason) {
          toast('Please specify a rejection reason.', 'warn');
          return false;
        }
        PUPSJ_Services.ApprovalService.rejectRequest(id, 'Superadmin', reason);
        toast(`Request ${id} declined.`, 'info');
        renderApp();
      }
    });
  };

  function openCreateRequestModal() {
    showModal({
      title: 'Submit New Manager Approval Request',
      content: `
        <div style="padding: 10px 0;">
          <div class="form-group" style="margin-bottom: 12px;">
            <label for="reqTypeSelect">Override Type:</label>
            <select id="reqTypeSelect" class="input">
              <option value="CHECKOUT_WITH_BALANCE">Checkout with Unsettled Balance</option>
              <option value="FEE_WAIVER">Cancellation / Late Fee Waiver</option>
              <option value="SPECIAL_DISCOUNT">Discretionary Room / Dining Discount</option>
              <option value="LARGE_REFUND">Refund Exceeding Cashier Limit</option>
              <option value="ROOM_OVERRIDE">Out of Service Room Assignment Override</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 12px;">
            <label for="reqTitleInput">Request Title:</label>
            <input type="text" id="reqTitleInput" class="input" placeholder="e.g. Waive 1st night fee for booking HTL-2041">
          </div>

          <div class="grid-2" style="gap: 12px; margin-bottom: 12px;">
            <div class="form-group">
              <label for="reqAmountInput">Amount (₱):</label>
              <input type="number" id="reqAmountInput" class="input" value="0" min="0">
            </div>
            <div class="form-group">
              <label for="reqRefIdInput">Reference Code (e.g. HTL-2041):</label>
              <input type="text" id="reqRefIdInput" class="input" placeholder="HTL-xxxx / ORD-xxxx">
            </div>
          </div>

          <div class="form-group">
            <label for="reqReasonInput">Justification &amp; Notes:</label>
            <textarea id="reqReasonInput" class="input" rows="3" placeholder="Provide background justification for this exception..."></textarea>
          </div>
        </div>
      `,
      confirmText: 'Submit Request',
      onConfirm: () => {
        const type = $('reqTypeSelect')?.value || 'MANAGER_OVERRIDE';
        const title = ($('reqTitleInput')?.value || '').trim();
        const amount = Number($('reqAmountInput')?.value || 0);
        const refId = ($('reqRefIdInput')?.value || '').trim();
        const reason = ($('reqReasonInput')?.value || '').trim();

        if (!title || !reason) {
          toast('Title and justification reason are required.', 'warn');
          return false;
        }

        PUPSJ_Services.ApprovalService.createRequest({
          type,
          title,
          amount,
          refId,
          refType: refId.startsWith('HTL') ? 'Reservation' : refId.startsWith('ORD') ? 'Order' : 'General',
          reason
        });

        toast('Approval request submitted for Superadmin review.', 'ok');
        renderApp();
      }
    });
  }

  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

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
