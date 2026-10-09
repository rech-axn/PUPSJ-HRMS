/* ==========================================================================
   PUPSJ Hotel & Restaurant — Restaurant Orders & POS (orders.js)
   POS order creation, item customization, interactive kitchen routing,
   bill settlement (Cash, Card, GCash, Room Folio), voiding, chit printing,
   and comprehensive administrative management.
   ========================================================================== */
'use strict';

(function () {
  let activeTab = 'all'; // 'all' | 'kitchen' | 'unpaid' | 'settled' | 'cancelled'
  let typeFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 10;

  function init() {
    renderApp();
  }

  function renderApp() {
    const app = $('ordersApp');
    if (!app) return;

    const orders = Data.getOrders();
    const activeKitchen = orders.filter(o => ['New', 'Preparing', 'Ready'].includes(o.status));
    const awaitingPayment = orders.filter(o => o.status === 'Served' && o.payStatus !== 'Paid' && o.payStatus !== 'Room folio');
    const settledOrders = orders.filter(o => o.payStatus === 'Paid' || o.payStatus === 'Room folio' || o.status === 'Paid' || o.status === 'Charged to room');
    const todaySales = settledOrders
      .filter(o => (o.created || '').slice(0, 10) === today())
      .reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">RESTAURANT &amp; BAR</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Food &amp; Beverage Orders &amp; POS</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a class="btn-secondary" href="kitchen.html">
            <span class="ic" data-icon="kitchen">[ICON: kitchen]</span> Kitchen Display (KDS)
          </a>
          <button type="button" class="btn-secondary" id="btnExportOrdersCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button type="button" class="btn" id="btnCreatePosOrder">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New POS Order
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Active in Kitchen</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${activeKitchen.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Awaiting Settlement</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${awaitingPayment.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Settled Today</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${settledOrders.filter(o => (o.created || '').slice(0, 10) === today()).length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Today's POS Sales</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${peso(todaySales)}</div>
        </div>
      </div>

      <!-- Quick Status Filter Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button type="button" class="tab-btn ${activeTab === 'all' ? 'active' : ''}" data-tab="all">
          All Orders (${orders.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === 'kitchen' ? 'active' : ''}" data-tab="kitchen">
          <span class="ic" data-icon="kitchen">[ICON: kitchen]</span> Active Kitchen (${activeKitchen.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === 'unpaid' ? 'active' : ''}" data-tab="unpaid">
          <span class="ic" data-icon="wallet">[ICON: wallet]</span> Awaiting Payment (${awaitingPayment.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === 'settled' ? 'active' : ''}" data-tab="settled">
          <span class="ic" data-icon="receipt">[ICON: receipt]</span> Settled (${settledOrders.length})
        </button>
        <button type="button" class="tab-btn ${activeTab === 'cancelled' ? 'active' : ''}" data-tab="cancelled">
          Cancelled / Void
        </button>
      </div>

      <!-- Controls & Search -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 240px; flex: 1;">
            <label>Search Order</label>
            <input type="text" id="orderSearchInput" placeholder="Order #, table, room, dish name…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label>Dining Type</label>
            <select id="orderTypeFilter">
              <option value="">All Types</option>
              <option value="Dine-in" ${typeFilter === 'Dine-in' ? 'selected' : ''}>Dine-in Table</option>
              <option value="In-room" ${typeFilter === 'In-room' ? 'selected' : ''}>In-room Dining</option>
              <option value="Takeaway" ${typeFilter === 'Takeaway' ? 'selected' : ''}>Walk-in Takeaway</option>
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetOrderFilters" style="height: 40px;">Reset Filters</button>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Type &amp; Destination</th>
                <th>Dishes Ordered</th>
                <th>Total Bill</th>
                <th>Time Placed</th>
                <th>Status &amp; Billing</th>
                <th style="text-align: right;">Administrative Actions</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="ordersPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('orderSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('orderTypeFilter').onchange = (e) => { typeFilter = e.target.value; page = 1; renderTable(); };

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
        page = 1;
        renderTable();
      };
    });

    $('btnResetOrderFilters').onclick = () => {
      searchQuery = '';
      typeFilter = '';
      activeTab = 'all';
      $('orderSearchInput').value = '';
      $('orderTypeFilter').value = '';
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
      page = 1;
      renderTable();
    };

    $('btnCreatePosOrder').onclick = () => openNewPosOrderModal();
    $('btnExportOrdersCSV').onclick = () => exportOrders();
  }

  function getFilteredOrders() {
    const orders = Data.getOrders();
    return orders.filter(o => {
      if (typeFilter && o.type !== typeFilter) return false;

      // Tab filtering
      if (activeTab === 'kitchen') {
        if (!['New', 'Preparing', 'Ready'].includes(o.status)) return false;
      } else if (activeTab === 'unpaid') {
        if (o.status !== 'Served' || o.payStatus === 'Paid' || o.payStatus === 'Room folio' || o.status === 'Cancelled') return false;
      } else if (activeTab === 'settled') {
        if (o.payStatus !== 'Paid' && o.payStatus !== 'Room folio' && o.status !== 'Paid' && o.status !== 'Charged to room') return false;
      } else if (activeTab === 'cancelled') {
        if (o.status !== 'Cancelled') return false;
      }

      if (searchQuery) {
        const dishNames = (o.lines || []).map(l => l.name).join(' ');
        const searchTarget = `${o.code} ${o.target || ''} ${o.type} ${dishNames} ${o.room || ''} ${o.table || ''} ${o.notes || ''}`.toLowerCase();
        if (!searchTarget.includes(searchQuery)) return false;
      }

      return true;
    });
  }

  function renderTable() {
    const tbody = $('ordersTableBody');
    const pgnEl = $('ordersPagination');
    if (!tbody) return;

    const list = getFilteredOrders();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 32px;">No dining orders found matching criteria.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(o => {
      const isSettled = (o.payStatus === 'Paid' || o.payStatus === 'Room folio' || o.status === 'Paid' || o.status === 'Charged to room');
      const isCancelled = o.status === 'Cancelled';
      const orderTotal = o.subtotal != null ? o.subtotal : (o.lines || []).reduce((sum, l) => sum + (l.qty * (l.unitPrice || l.price || 0)), 0);
      const dest = o.target || (o.type === 'Dine-in' ? (o.table ? `Table ${o.table}` : 'Dine-in Table') : o.type === 'In-room' ? (o.room ? `Room ${o.room}` : 'In-room') : 'Takeaway Counter');

      let statusPill = 'pill--muted';
      if (o.status === 'New') statusPill = 'pill--bad';
      else if (o.status === 'Preparing') statusPill = 'pill--warn';
      else if (o.status === 'Ready') statusPill = 'pill--info';
      else if (o.status === 'Served') statusPill = isSettled ? 'pill--ok' : 'pill--info';
      else if (isCancelled) statusPill = 'pill--bad';

      let payPill = 'pill--warn';
      if (isSettled) payPill = 'pill--ok';
      else if (isCancelled) payPill = 'pill--bad';

      return `
        <tr>
          <td><b>${o.code}</b></td>
          <td>
            <div style="font-weight: 600;">${esc(dest)}</div>
            <div class="text-xs text-secondary">${o.type}</div>
          </td>
          <td>
            <div style="font-size: 13px;">
              ${(o.lines || []).map(l => `<span>${l.qty}&times; ${esc(l.name)}</span>`).join(', ')}
            </div>
            ${o.notes ? `<div class="text-xs text-muted">Notes: ${esc(o.notes)}</div>` : ''}
          </td>
          <td><b>${peso(orderTotal)}</b></td>
          <td><span class="text-xs text-muted">${fmtDate(o.created ? o.created.slice(0, 10) : today())}</span></td>
          <td>
            <span class="pill ${statusPill}">${esc(o.status)}</span>
            <div style="margin-top: 4px;">
              <span class="pill ${payPill}" style="font-size: 10px;">${esc(o.payStatus || 'Unpaid')}</span>
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px; flex-wrap: wrap;">
              ${!isCancelled && o.status === 'New' ? `
                <button type="button" class="btn-secondary btn-sm" onclick="advanceOrderStatus('${o.code}', 'Preparing')">Start Cooking</button>
              ` : ''}
              ${!isCancelled && o.status === 'Preparing' ? `
                <button type="button" class="btn-secondary btn-sm" onclick="advanceOrderStatus('${o.code}', 'Ready')">Mark Ready</button>
              ` : ''}
              ${!isCancelled && o.status === 'Ready' ? `
                <button type="button" class="btn-secondary btn-sm" onclick="advanceOrderStatus('${o.code}', 'Served')">Mark Served</button>
              ` : ''}
              ${!isSettled && !isCancelled ? `
                <button type="button" class="btn btn-sm" onclick="openBillSettlementModal('${o.code}')">Bill / Settle</button>
                <button type="button" class="btn-secondary btn-sm" onclick="openAddItemsModal('${o.code}')">+ Items</button>
                <button type="button" class="btn-ghost btn-sm" style="color:var(--bad);" onclick="promptCancelOrder('${o.code}')">Void</button>
              ` : ''}
              <button type="button" class="btn-secondary btn-sm" onclick="printOrderChit('${o.code}')">Receipt / Chit</button>
              <button type="button" class="btn-secondary btn-sm" onclick="openOrderDetailModal('${o.code}')">View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} orders</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnOrdersPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnOrdersNext">Next</button>
      </div>
    `;

    const prev = $('btnOrdersPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnOrdersNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  // ─── Direct Status Advancement ───
  window.advanceOrderStatus = function (orderCode, newStatus) {
    Data.updateOrderStatus(orderCode, newStatus);
    toast(`Order ${orderCode} updated to ${newStatus}`, 'ok');
    renderApp();
  };

  // ─── Void / Cancel Order ───
  window.promptCancelOrder = function (orderCode) {
    showModal(
      `Void / Cancel Order — ${orderCode}`,
      `
      <div style="font-size: 13px;">
        <p>Are you sure you want to cancel and void order <b>${orderCode}</b>?</p>
        <div class="field" style="margin-top: 12px;">
          <label>Reason for Voiding *</label>
          <select id="voidOrderReason" required>
            <option value="Customer request">Customer changed mind / request</option>
            <option value="Duplicate entry">Duplicate POS entry</option>
            <option value="Item unavailable">Item out of stock / 86'd</option>
            <option value="Kitchen spill / incident">Kitchen preparation incident</option>
            <option value="Managerial override">Managerial discretion</option>
          </select>
        </div>
      </div>
      `,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Back</button>
        <button type="button" class="btn" style="background:var(--bad);" onclick="confirmCancelOrder('${orderCode}')">Confirm Void</button>
      </div>
      `,
      { maxWidth: '420px' }
    );
  };

  window.confirmCancelOrder = function (orderCode) {
    const reason = $('voidOrderReason')?.value || 'Voided by staff';
    Data.cancelOrder(orderCode, reason);
    closeModal();
    toast(`Order ${orderCode} has been voided.`, 'warn');
    renderApp();
  };

  // ─── Add Items to Active Order ───
  window.openAddItemsModal = function (orderCode) {
    const order = Data.getOrders().find(o => o.code === orderCode);
    if (!order) return;
    const menu = Data.getMenu().filter(m => m.available);

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="padding-bottom: 8px; border-bottom: 1px solid var(--line); margin-bottom: 12px;">
          <b>Add Dishes / Beverages to Order ${order.code}</b>
          <div class="text-xs text-secondary">${order.type} &middot; Current Subtotal: ${peso(order.subtotal)}</div>
        </div>

        <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r); padding: 8px; background: var(--surface);">
          ${menu.map(m => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line);">
              <div style="flex: 1; padding-right: 10px;">
                <b>${esc(m.name)}</b>
                <div class="text-xs text-muted">${peso(m.price)} &middot; ${m.category}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="text-xs text-secondary">Qty:</span>
                <input type="number" min="0" max="10" value="0" class="add-item-qty" data-id="${m.id}" data-name="${esc(m.name)}" data-price="${m.price}" style="width: 55px; height: 30px; font-size: 12px; text-align: center;">
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    showModal(
      `Add Items — ${order.code}`,
      bodyHtml,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAddItems">Add Selected to Order</button>
      </div>
      `,
      { maxWidth: '480px' }
    );

    $('btnSubmitAddItems').onclick = () => {
      const itemsToAdd = [];
      document.querySelectorAll('.add-item-qty').forEach(inp => {
        const qty = parseInt(inp.value, 10) || 0;
        if (qty > 0) {
          itemsToAdd.push({
            id: inp.dataset.id,
            name: inp.dataset.name,
            qty,
            unitPrice: parseFloat(inp.dataset.price) || 0,
            price: parseFloat(inp.dataset.price) || 0
          });
        }
      });

      if (itemsToAdd.length === 0) {
        toast('Please specify quantity for at least one item.', 'warn');
        return;
      }

      Data.addItemsToOrder(order.code, itemsToAdd);
      closeModal();
      toast(`Added ${itemsToAdd.length} item(s) to order ${order.code}`, 'ok');
      renderApp();
    };
  };

  // ─── Print Official Receipt / Kitchen Chit ───
  window.printOrderChit = function (orderCode) {
    const order = Data.getOrders().find(o => o.code === orderCode);
    if (!order) return;

    const total = Number(order.subtotal || 0);
    const netBase = Math.round((total / 1.22) * 100) / 100;
    const vat = Math.round((netBase * 0.12) * 100) / 100;
    const sc = Math.round((total - netBase - vat) * 100) / 100;
    const dest = order.target || (order.type === 'Dine-in' ? `Table ${order.table}` : order.type === 'In-room' ? `Room ${order.room}` : 'Takeaway');
    const staffUser = Data.getStaffSession();

    const chitHtml = `
      <div class="receipt-print-area" style="font-family: 'Plus Jakarta Sans', monospace; font-size: 12px; color: #111; max-width: 360px; margin: 0 auto; padding: 12px; background: #fff; border: 1px dashed #ccc;">
        <div style="text-align: center; border-bottom: 1px dashed #444; padding-bottom: 10px; margin-bottom: 10px;">
          <h2 style="margin: 0; font-size: 16px; font-family: 'Cormorant Garamond', serif; text-transform: uppercase;">PUPSJ Hotel &amp; Restaurant</h2>
          <div style="font-size: 11px; color: #444;">223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City</div>
          <div style="font-size: 10px; color: #666; margin-top: 4px;">VAT REG TIN: 000-123-456-000 | PERMIT: SP-2026-PUPSJ</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>ORDER CHIT / RECEIPT:</span>
          <b>${order.code}</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>DESTINATION:</span>
          <b>${esc(dest)} (${order.type})</b>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>DATE &amp; TIME:</span>
          <span>${order.created || today()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #444; padding-bottom: 6px; margin-bottom: 8px;">
          <span>SERVER / CASHIER:</span>
          <span>${esc(staffUser ? staffUser.name : 'Ruben Herwitz')}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <thead>
            <tr style="border-bottom: 1px solid #ddd; text-align: left; font-size: 11px;">
              <th style="padding: 4px 0;">Item</th>
              <th style="padding: 4px 0; text-align: center;">Qty</th>
              <th style="padding: 4px 0; text-align: right;">Price</th>
              <th style="padding: 4px 0; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(order.lines || []).map(l => `
              <tr>
                <td style="padding: 4px 0;">${esc(l.name)}</td>
                <td style="padding: 4px 0; text-align: center;">${l.qty}</td>
                <td style="padding: 4px 0; text-align: right;">${peso(l.unitPrice || l.price || 0)}</td>
                <td style="padding: 4px 0; text-align: right;">${peso(l.qty * (l.unitPrice || l.price || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border-top: 1px dashed #444; padding-top: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Net Taxable Sales:</span>
            <span>${peso(netBase)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>VAT (12%):</span>
            <span>${peso(vat)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Service Charge (10%):</span>
            <span>${peso(sc)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin-top: 4px; border-top: 1px solid #111; padding-top: 4px;">
            <span>TOTAL AMOUNT DUE:</span>
            <span>${peso(total)}</span>
          </div>
        </div>

        <div style="font-size: 11px; margin-top: 6px; border-top: 1px dashed #ddd; padding-top: 4px;">
          <div><b>Payment Status:</b> ${esc(order.payStatus || 'Unpaid')}</div>
          ${order.paymentKind ? `<div><b>Payment Reference:</b> ${esc(order.paymentKind)}</div>` : ''}
          ${order.notes ? `<div><b>Special Notes:</b> ${esc(order.notes)}</div>` : ''}
        </div>

        <div style="text-align: center; margin-top: 12px; font-size: 10px; color: #555;">
          Thank you for dining with PUPSJ Hotel &amp; Restaurant!<br>
          <i>This document serves as an Official POS Sales Chit.</i>
        </div>
      </div>
    `;

    showModal(
      `POS Chit &mdash; ${order.code}`,
      chitHtml,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
        <button type="button" class="btn" onclick="window.print()">
          <span class="ic" data-icon="print">[ICON: print]</span> Print Official Chit
        </button>
      </div>
      `,
      { maxWidth: '440px' }
    );
  };

  // ─── New POS Order Modal ───
  function openNewPosOrderModal() {
    const menu = Data.getMenu().filter(m => m.available);
    const tables = Data.getTables();
    const inHouseRes = Data.getReservations().filter(r => r.st === 'Checked-in');

    const bodyHtml = `
      <form id="posOrderForm" style="font-size: 13px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label>Dining Type *</label>
            <select id="posOrderType">
              <option value="Dine-in">Dine-in Table</option>
              <option value="In-room">In-room Dining</option>
              <option value="Takeaway">Walk-in Takeaway</option>
            </select>
          </div>
          <div class="field" id="wrapPosDest">
            <label id="lblPosDest">Table Number</label>
            <select id="posOrderDest">
              ${tables.map(t => `<option value="${t.num}">Table ${t.num} (${t.seats} seats) &ndash; ${t.st || t.status}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label>Select Menu Items</label>
          <div style="max-height: 220px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r); padding: 8px; background: var(--surface);">
            ${menu.map(m => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line);">
                <div style="flex: 1; padding-right: 10px;">
                  <b>${esc(m.name)}</b>
                  <div class="text-xs text-muted">${peso(m.price)} &middot; ${m.category}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="text-xs text-secondary">Qty:</span>
                  <input type="number" min="0" max="20" value="0" class="pos-item-qty" data-id="${m.id}" data-name="${esc(m.name)}" data-price="${m.price}" style="width: 55px; height: 30px; font-size: 12px; text-align: center;">
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="field">
          <label>Special Kitchen Instructions / Notes</label>
          <input type="text" id="posOrderNotes" placeholder="e.g. Less salt, dressing on the side, rush…">
        </div>

        <div style="background: var(--surface-2); padding: 10px 14px; border-radius: var(--r); border: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">Estimated Bill (inc. VAT &amp; Service Charge):</span>
          <span style="font-size: 18px; font-weight: 700; color: var(--gold-ink);" id="posOrderTotalDisplay">₱0</span>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitPosOrder">Send to Kitchen</button>
      </div>
    `;

    showModal('New Restaurant POS Order', bodyHtml, footerHtml, { maxWidth: '560px' });

    // Handle Type switch
    $('posOrderType').onchange = (e) => {
      const type = e.target.value;
      const wrap = $('wrapPosDest');
      const lbl = $('lblPosDest');
      const sel = $('posOrderDest');

      if (type === 'Dine-in') {
        wrap.style.display = '';
        lbl.textContent = 'Table Number';
        sel.innerHTML = tables.map(t => `<option value="${t.num}">Table ${t.num} (${t.seats} seats) &ndash; ${t.st || t.status}</option>`).join('');
      } else if (type === 'In-room') {
        wrap.style.display = '';
        lbl.textContent = 'In-House Guest Room';
        if (inHouseRes.length === 0) {
          sel.innerHTML = `<option value="">No guests currently checked-in</option>`;
        } else {
          sel.innerHTML = inHouseRes.map(r => `<option value="${r.n}" data-res="${r.c}">Room ${r.n} &ndash; ${esc(r.g)} (${r.c})</option>`).join('');
        }
      } else {
        wrap.style.display = 'none';
      }
    };

    // Calculate dynamic total
    const updateOrderTotal = () => {
      let total = 0;
      document.querySelectorAll('.pos-item-qty').forEach(inp => {
        const qty = parseInt(inp.value, 10) || 0;
        const price = parseFloat(inp.dataset.price) || 0;
        total += qty * price;
      });
      $('posOrderTotalDisplay').textContent = peso(total);
    };

    document.querySelectorAll('.pos-item-qty').forEach(inp => {
      inp.oninput = updateOrderTotal;
    });

    $('btnSubmitPosOrder').onclick = () => {
      const type = $('posOrderType').value;
      const notes = $('posOrderNotes').value.trim();

      const lines = [];
      let total = 0;
      document.querySelectorAll('.pos-item-qty').forEach(inp => {
        const qty = parseInt(inp.value, 10) || 0;
        if (qty > 0) {
          const unitPrice = parseFloat(inp.dataset.price) || 0;
          lines.push({
            id: inp.dataset.id,
            name: inp.dataset.name,
            qty,
            unitPrice,
            price: unitPrice
          });
          total += qty * unitPrice;
        }
      });

      if (lines.length === 0) {
        toast('Please select at least 1 menu item to order.', 'warn');
        return;
      }

      let target = 'Counter';
      let table = null;
      let room = null;
      let linkedRes = null;

      if (type === 'Dine-in') {
        table = parseInt($('posOrderDest').value, 10) || 1;
        target = `Table ${table}`;
      } else if (type === 'In-room') {
        const sel = $('posOrderDest');
        room = parseInt(sel.value, 10) || null;
        if (!room) {
          toast('Please select an active in-house guest room.', 'warn');
          return;
        }
        target = `Room ${room}`;
        const selectedOpt = sel.options[sel.selectedIndex];
        linkedRes = selectedOpt ? selectedOpt.dataset.res : null;
      } else {
        target = 'Takeaway Counter';
      }

      const newOrder = Data.createOrder({
        type,
        target,
        table,
        room,
        resCode: linkedRes,
        linkedRes,
        lines,
        subtotal: total,
        notes,
        status: 'New',
        payStatus: 'Unpaid'
      });

      toast(`Order ${newOrder.code} created and sent to kitchen`, 'ok');
      closeModal();
      renderApp();
    };
  }

  // ─── Bill Settlement Modal ───
  window.openBillSettlementModal = function (orderCode) {
    const orders = Data.getOrders();
    const order = orders.find(o => o.code === orderCode);
    if (!order) return;

    const total = order.subtotal != null ? order.subtotal : (order.lines || []).reduce((sum, l) => sum + (l.qty * (l.unitPrice || l.price || 0)), 0);
    const inHouseRes = Data.getReservations().filter(r => r.st === 'Checked-in');
    const defaultRes = inHouseRes.find(r => r.n === order.room || r.c === order.linkedRes || r.c === order.resCode);
    const dest = order.target || (order.type === 'Dine-in' ? `Table ${order.table}` : order.type === 'In-room' ? `Room ${order.room}` : 'Takeaway');

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px solid var(--line); margin-bottom: 12px;">
          <div>
            <b>Order ${order.code}</b>
            <div class="text-xs text-secondary">${order.type} &middot; ${dest}</div>
          </div>
          <div style="font-size: 18px; font-weight: 700; color: var(--gold-ink);">${peso(total)}</div>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-weight: 600; font-size: 12px; margin-bottom: 6px; display: block;">Settlement Method</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button type="button" class="btn btn-sm" id="btnMethodDirectPay" style="height: 38px;">
              Pay Now (POS Terminal)
            </button>
            <button type="button" class="btn-secondary btn-sm" id="btnMethodChargeRoom" style="height: 38px;">
              Charge to Room Folio
            </button>
          </div>
        </div>

        <!-- Section A: Direct Pay Form -->
        <div id="wrapDirectPay" style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line);">
          <div class="field">
            <label>Payment Method *</label>
            <select id="directPayMethod">
              <option value="Cash">Cash (Cash Tendered Calculator)</option>
              <option value="Credit Card">Credit Card (Swipe / Chip)</option>
              <option value="Debit Card">Debit Card</option>
              <option value="GCash">GCash / Maya (E-Wallet)</option>
            </select>
          </div>

          <div id="wrapCashCalc" style="margin-top: 10px;">
            <div class="field">
              <label>Cash Tendered (PHP)</label>
              <input type="number" id="cashTenderedInput" placeholder="e.g. 1000" min="${total}" step="50">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line); font-weight: 600;">
              <span>Change Due:</span>
              <span id="cashChangeDisplay" style="color: var(--ok); font-size: 16px;">₱0</span>
            </div>
          </div>

          <div id="wrapCardRef" style="display: none; margin-top: 10px;">
            <div class="field">
              <label>Approval Code / Reference #</label>
              <input type="text" id="directPayRef" placeholder="e.g. AUTH-98213 / GCASH-0021">
            </div>
          </div>

          <button type="button" class="btn btn-block" style="margin-top: 12px;" id="btnConfirmDirectPay">
            Confirm Payment &amp; Issue Receipt &rarr;
          </button>
        </div>

        <!-- Section B: Charge to Room Folio -->
        <div id="wrapRoomCharge" style="display: none; background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line);">
          <div class="field">
            <label>Select In-House Room Guest *</label>
            <select id="roomChargeRes">
              ${inHouseRes.length === 0 ? `<option value="">No checked-in guests currently</option>` : ''}
              ${inHouseRes.map(r => `
                <option value="${r.c}" ${defaultRes && defaultRes.c === r.c ? 'selected' : ''}>
                  Room ${r.n} &ndash; ${esc(r.g)} (${r.c})
                </option>
              `).join('')}
            </select>
          </div>

          <p class="text-xs text-muted" style="margin-bottom: 12px;">
            This order of <b>${peso(total)}</b> will be added as a dining incidental charge to the guest's master hotel folio. Settle upon hotel checkout.
          </p>

          <button type="button" class="btn btn-block" id="btnConfirmRoomCharge" ${inHouseRes.length === 0 ? 'disabled' : ''}>
            Post to Guest Room Folio &rarr;
          </button>
        </div>
      </div>
    `;

    showModal(`Settle Bill &mdash; ${order.code}`, bodyHtml, '<button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>', { maxWidth: '440px' });

    // Method tab toggle
    $('btnMethodDirectPay').onclick = () => {
      $('btnMethodDirectPay').className = 'btn btn-sm';
      $('btnMethodChargeRoom').className = 'btn-secondary btn-sm';
      $('wrapDirectPay').style.display = '';
      $('wrapRoomCharge').style.display = 'none';
    };

    $('btnMethodChargeRoom').onclick = () => {
      $('btnMethodDirectPay').className = 'btn-secondary btn-sm';
      $('btnMethodChargeRoom').className = 'btn btn-sm';
      $('wrapDirectPay').style.display = 'none';
      $('wrapRoomCharge').style.display = '';
    };

    // Cash calculator logic
    const directMethodSel = $('directPayMethod');
    directMethodSel.onchange = () => {
      const isCash = directMethodSel.value === 'Cash';
      $('wrapCashCalc').style.display = isCash ? '' : 'none';
      $('wrapCardRef').style.display = isCash ? 'none' : '';
    };

    const cashInput = $('cashTenderedInput');
    cashInput.oninput = () => {
      const tendered = parseFloat(cashInput.value) || 0;
      const change = Math.max(0, tendered - total);
      $('cashChangeDisplay').textContent = peso(change);
    };

    $('btnConfirmDirectPay').onclick = () => {
      const method = $('directPayMethod').value;
      const settleRes = Data.billOrder(order.code, {
        method,
        amount: total,
        ref: $('directPayRef')?.value || 'Direct POS Settlement'
      });
      const orNo = settleRes.orNum || settleRes.or || String(settleRes);
      toast(`Order settled! Receipt issued: ${orNo}`, 'ok');
      closeModal();
      printOrderChit(order.code);
      renderApp();
    };

    $('btnConfirmRoomCharge').onclick = () => {
      const resCode = $('roomChargeRes').value;
      if (!resCode) {
        toast('Please select an active in-house reservation', 'warn');
        return;
      }

      Data.addCharge(resCode, `Restaurant: ${order.code}`, total, 'Dining');
      order.status = 'Served';
      order.payStatus = 'Room folio';
      order.linkedRes = resCode;
      order.resCode = resCode;
      order.paymentKind = `Charged to ${resCode}`;
      order.payment = {
        method: 'Room Charge',
        amount: total,
        ref: resCode,
        or: 'FOLIO-CHG'
      };
      const allOrders = Data.getOrders();
      const oIdx = allOrders.findIndex(o => o.code === order.code);
      if (oIdx !== -1) {
        allOrders[oIdx] = order;
        Data.saveOrders(allOrders);
      }

      toast(`Order ${order.code} charged to room folio ${resCode}`, 'ok');
      closeModal();
      renderApp();
    };
  };

  // ─── Order Detail Modal ───
  window.openOrderDetailModal = function (orderCode) {
    const orders = Data.getOrders();
    const order = orders.find(o => o.code === orderCode);
    if (!order) return;

    const total = order.subtotal != null ? order.subtotal : (order.lines || []).reduce((sum, l) => sum + (l.qty * (l.unitPrice || l.price || 0)), 0);
    const dest = order.target || (order.type === 'Dine-in' ? `Table ${order.table}` : order.type === 'In-room' ? `Room ${order.room}` : 'Takeaway');

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 12px;">
          <div>
            <b>${order.code}</b> &middot; ${order.type}
            <div class="text-xs text-secondary">${dest}</div>
          </div>
          <div>
            <span class="pill ${order.payStatus === 'Paid' || order.payStatus === 'Room folio' ? 'pill--ok' : 'pill--info'}">${order.status}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--line); text-align: left;">
              <th style="padding: 4px 8px;">Dish</th>
              <th style="padding: 4px 8px; text-align: center;">Qty</th>
              <th style="padding: 4px 8px; text-align: right;">Unit Price</th>
              <th style="padding: 4px 8px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(order.lines || []).map(l => `
              <tr>
                <td style="padding: 4px 8px;">${esc(l.name)}</td>
                <td style="padding: 4px 8px; text-align: center;">${l.qty}</td>
                <td style="padding: 4px 8px; text-align: right;">${peso(l.unitPrice || l.price || 0)}</td>
                <td style="padding: 4px 8px; text-align: right;">${peso(l.qty * (l.unitPrice || l.price || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--line); padding-top: 8px;">
          <span>Total Bill (inc. VAT &amp; Service Charge):</span>
          <span>${peso(total)}</span>
        </div>
      </div>
    `;

    showModal(`Order Details &mdash; ${order.code}`, bodyHtml, '<button type="button" class="btn-secondary" onclick="closeModal()">Close</button>', { maxWidth: '440px' });
  };

  // ─── Export CSV ───
  function exportOrders() {
    const orders = getFilteredOrders();
    const cols = [
      { header: 'Order Code', key: 'code' },
      { header: 'Type', key: 'type' },
      { header: 'Destination', key: 'target' },
      { header: 'Total (PHP)', key: r => r.subtotal || 0 },
      { header: 'Kitchen Status', key: 'status' },
      { header: 'Billing Status', key: 'payStatus' },
      { header: 'Payment Ref', key: 'paymentKind' },
      { header: 'Date Created', key: 'created' }
    ];
    exportCSV(`PUPSJ_Orders_${today()}.csv`, cols, orders);
  }

  // Auto-refresh on data change
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
