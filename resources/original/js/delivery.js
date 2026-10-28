/* ==========================================================================
   PUPSJ Hotel & Restaurant — In-Room Dining & Delivery Board (delivery.js)
   Kanban delivery tracking for In-Room dining & takeaway:
   Ready for Runner -> Out for Delivery -> Delivered / Served
   Runner assignment, elapsed delivery timers, and live dispatching.
   ========================================================================== */
'use strict';

(function () {
  let typeFilter = 'all'; // 'all' | 'In-room' | 'Takeaway'
  let timerInterval = null;

  function init() {
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace('orders.html');
      return;
    }
    renderApp();
  }

  function getDeliveryOrders() {
    const orders = Data.getOrders();
    return orders.filter(o => {
      // We track in-room orders and takeaway orders that are ready, out, or served
      if (!['In-room', 'Takeaway'].includes(o.type)) return false;
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      return ['Ready', 'Out for delivery', 'Delivered', 'Served'].includes(o.status);
    });
  }

  function renderApp() {
    const app = $('deliveryApp');
    if (!app) return;

    const orders = getDeliveryOrders();
    const readyOrders = orders.filter(o => o.status === 'Ready');
    const outOrders = orders.filter(o => o.status === 'Out for delivery');
    const deliveredOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Served').slice(0, 15);

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">RESTAURANT &amp; ROOM SERVICE</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">In-Room Dining &amp; Delivery Board</h1>
          <p class="text-sm" style="color: var(--ink-2); margin-top: 4px;">
            Live dispatch board for guest room delivery runners and takeaway collections.
          </p>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="tabs" style="margin: 0;">
            <button class="tab-btn ${typeFilter === 'all' ? 'active' : ''}" data-type="all">All Orders</button>
            <button class="tab-btn ${typeFilter === 'In-room' ? 'active' : ''}" data-type="In-room">In-Room Dining</button>
            <button class="tab-btn ${typeFilter === 'Takeaway' ? 'active' : ''}" data-type="Takeaway">Takeaway Pickup</button>
          </div>
          <button class="btn-secondary" id="btnRefreshDelivery" style="height: 38px;">
            <span class="ic" data-icon="refresh">[ICON: refresh]</span> Refresh
          </button>
        </div>
      </div>

      <!-- Delivery 3-Column Board -->
      <div class="grid-3" style="gap: 20px; align-items: flex-start;">
        <!-- Column 1: Ready for Runner -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 520px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--warn);">
            <div style="font-weight: 700; font-size: 16px;">READY FOR DISPATCH</div>
            <span class="pill pill--warn">${readyOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;" id="colReady">
            ${readyOrders.map(o => renderReadyCard(o)).join('')}
            ${readyOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 48px 0;">No orders awaiting runner dispatch</div>` : ''}
          </div>
        </div>

        <!-- Column 2: Out for Delivery -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 520px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--gold);">
            <div style="font-weight: 700; font-size: 16px;">OUT FOR DELIVERY</div>
            <span class="pill pill--gold">${outOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;" id="colOut">
            ${outOrders.map(o => renderOutCard(o)).join('')}
            ${outOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 48px 0;">No active dispatches en route</div>` : ''}
          </div>
        </div>

        <!-- Column 3: Delivered Today -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 520px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--ok);">
            <div style="font-weight: 700; font-size: 16px;">DELIVERED / COMPLETED</div>
            <span class="pill pill--ok">${deliveredOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px;" id="colDelivered">
            ${deliveredOrders.map(o => renderDeliveredCard(o)).join('')}
            ${deliveredOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 48px 0;">No completed deliveries recorded yet</div>` : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderReadyCard(o) {
    const dest = o.target || (o.type === 'In-room' ? `Room ${o.room}` : 'Takeaway');
    return `
      <div class="card" style="padding: 16px; border-top: 4px solid var(--warn); box-shadow: var(--shadow);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <b style="font-size: 16px;">${o.code}</b>
            <div style="font-size: 14px; font-weight: 700; color: var(--gold-ink);">${esc(dest)}</div>
          </div>
          <span class="pill pill--warn" style="font-size: 11px;">Kitchen Ready</span>
        </div>

        <div style="margin: 10px 0; border-top: 1px dashed var(--line); border-bottom: 1px dashed var(--line); padding: 8px 0; font-size: 13px;">
          ${(o.lines || []).map(l => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>${l.qty}&times; ${esc(l.name)}</span>
            </div>
          `).join('')}
        </div>

        ${o.notes ? `
          <div style="font-size: 12px; color: var(--bad); background: var(--bg); padding: 6px 8px; border-radius: var(--r); margin-bottom: 10px;">
            <b>Instructions:</b> ${esc(o.notes)}
          </div>
        ` : ''}

        <div style="font-size: 12px; color: var(--ink-2); margin-bottom: 12px;">
          Total: <b>${peso(o.subtotal)}</b> &bull; Billing: <b>${esc(o.payStatus || 'Unpaid')}</b>
        </div>

        <button type="button" class="btn btn-block" onclick="window.dispatchOrder('${o.code}')" style="height: 40px; font-weight: 600;">
          Dispatch Delivery &rarr;
        </button>
      </div>
    `;
  }

  function renderOutCard(o) {
    const dest = o.target || (o.type === 'In-room' ? `Room ${o.room}` : 'Takeaway');
    return `
      <div class="card" style="padding: 16px; border-top: 4px solid var(--gold); box-shadow: var(--shadow);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <b style="font-size: 16px;">${o.code}</b>
            <div style="font-size: 14px; font-weight: 700; color: var(--gold-ink);">${esc(dest)}</div>
          </div>
          <span class="pill pill--gold" style="font-size: 11px;">En Route</span>
        </div>

        <div style="background: var(--gold-soft); padding: 8px 10px; border-radius: var(--r); margin: 8px 0; font-size: 12px; color: var(--gold-ink);">
          <div>Runner: <b>${esc(o.runner || 'Front Desk Runner')}</b></div>
          <div style="font-size: 11px; margin-top: 2px;">Dispatched: ${esc(o.dispatchedAt || 'Just now')}</div>
        </div>

        <div style="margin: 10px 0; font-size: 13px;">
          ${(o.lines || []).map(l => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>${l.qty}&times; ${esc(l.name)}</span>
            </div>
          `).join('')}
        </div>

        <button type="button" class="btn btn-block" onclick="window.confirmDelivered('${o.code}')" style="height: 40px; font-weight: 600; background: var(--ok); border-color: var(--ok); color: #fff;">
          ✓ Confirm Delivered
        </button>
      </div>
    `;
  }

  function renderDeliveredCard(o) {
    const dest = o.target || (o.type === 'In-room' ? `Room ${o.room}` : 'Takeaway');
    return `
      <div class="card" style="padding: 14px; border-top: 4px solid var(--ok); opacity: 0.9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <b>${o.code}</b>
          <span class="pill pill--ok" style="font-size: 11px;">Delivered</span>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: var(--ink);">${esc(dest)}</div>
        <div style="font-size: 12px; color: var(--ink-3); margin-top: 2px;">
          Runner: ${esc(o.runner || 'Assigned Runner')} &bull; ${peso(o.subtotal)}
        </div>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('[data-type]').forEach(btn => {
      btn.onclick = () => {
        typeFilter = btn.dataset.type;
        document.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('active', b === btn));
        renderApp();
      };
    });

    $('btnRefreshDelivery').onclick = () => renderApp();
  }

  function updateTimers() {
    // Keep board updated
  }

  // ─── Dispatch Action ───
  window.dispatchOrder = async function (code) {
    const staff = Data.getStaff();
    const runnerOptions = staff.filter(s => ['Front Desk', 'Management', 'Housekeeping'].includes(s.department));

    const runnerOptionsHtml = runnerOptions.map(r => `
      <option value="${esc(r.name)}">${esc(r.name)} (${esc(r.department)})</option>
    `).join('');

    const modalBody = `
      <div style="padding: 10px 0;">
        <p class="text-sm text-secondary" style="margin-bottom: 16px;">
          Assign a service runner to dispatch order <b>${code}</b> to destination.
        </p>
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="runnerSelect">Select Delivery Runner:</label>
          <select id="runnerSelect" class="input">
            ${runnerOptionsHtml}
            <option value="Guest Services Runner">Guest Services Runner (Default)</option>
          </select>
        </div>
      </div>
    `;

    showModal({
      title: `Dispatch Order ${code}`,
      content: modalBody,
      confirmText: 'Dispatch Order',
      onConfirm: () => {
        const sel = $('runnerSelect');
        const runnerName = (sel && sel.value) || 'Guest Services Runner';

        const orders = Data.getOrders();
        const o = orders.find(x => x.code === code);
        if (o) {
          o.status = 'Out for delivery';
          o.runner = runnerName;
          o.dispatchedAt = nowTime();
          o.updated = `${today()} ${nowTime()}`;
          Data.saveOrders(orders);
          Data.audit('Order Dispatched', 'Order', code, `Dispatched by runner ${runnerName}`);
          toast(`Order ${code} dispatched with runner ${runnerName}.`, 'ok');
          renderApp();
        }
      }
    });
  };

  // ─── Confirm Delivered Action ───
  window.confirmDelivered = async function (code) {
    const ok = await confirmDialog(`Confirm that order ${code} has been delivered and served to the guest?`, 'Confirm Delivery');
    if (!ok) return;

    const orders = Data.getOrders();
    const o = orders.find(x => x.code === code);
    if (o) {
      o.status = 'Served'; // Canonical terminal state for orders
      o.deliveredAt = nowTime();
      o.updated = `${today()} ${nowTime()}`;
      Data.saveOrders(orders);
      Data.audit('Order Delivered', 'Order', code, `Order marked delivered and served to ${o.target}`);
      toast(`Order ${code} confirmed delivered to ${o.target}.`, 'ok');
      renderApp();
    }
  };

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
