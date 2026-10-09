/* ==========================================================================
   PUPSJ Hotel & Restaurant — Kitchen Display System (kitchen.js)
   Column board (New, Preparing, Ready), 30s elapsed order age timers,
   station filtering (Kitchen / Bar), and large touch targets.
   ========================================================================== */
'use strict';

(function () {
  let stationFilter = 'all'; // 'all' | 'Kitchen' | 'Bar'
  let timerInterval = null;

  function init() {
    renderApp();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      updateOrderTimers();
    }, 30000);
  }

  function getActiveKitchenOrders() {
    const orders = Data.getOrders();
    const menu = Data.getMenu();
    const menuMap = {};
    menu.forEach(m => { menuMap[m.id] = m.station || 'Kitchen'; });

    return orders.filter(o => {
      if (!['New', 'Preparing', 'Ready'].includes(o.status)) return false;
      if (stationFilter !== 'all') {
        const hasStationDish = (o.lines || []).some(l => (menuMap[l.id] || 'Kitchen') === stationFilter);
        if (!hasStationDish) return false;
      }
      return true;
    });
  }

  function getOrderAgeMinutes(createdStr) {
    if (!createdStr) return 0;
    let createdDate;
    if (createdStr.includes('T')) {
      createdDate = new Date(createdStr);
    } else {
      const parts = createdStr.split(' ');
      const datePart = parts[0] || today();
      const timePart = parts[1] || '12:00';
      const formattedTime = timePart.length === 5 ? `${timePart}:00` : timePart;
      createdDate = new Date(`${datePart}T${formattedTime}`);
    }
    if (isNaN(createdDate.getTime())) return 1;
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - createdDate.getTime());
    return Math.max(1, Math.round(diffMs / 60000));
  }

  function renderApp() {
    const app = $('kitchenApp');
    if (!app) return;

    const orders = getActiveKitchenOrders();
    const newOrders = orders.filter(o => o.status === 'New');
    const prepOrders = orders.filter(o => o.status === 'Preparing');
    const readyOrders = orders.filter(o => o.status === 'Ready');

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">RESTAURANT &amp; BAR</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Kitchen Display System (KDS)</h1>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="tabs" style="margin: 0;">
            <button class="tab-btn ${stationFilter === 'all' ? 'active' : ''}" data-station="all">All Stations</button>
            <button class="tab-btn ${stationFilter === 'Kitchen' ? 'active' : ''}" data-station="Kitchen">Hot/Cold Kitchen</button>
            <button class="tab-btn ${stationFilter === 'Bar' ? 'active' : ''}" data-station="Bar">Beverage Bar</button>
          </div>
          <button class="btn-secondary" id="btnRefreshKds" style="height: 38px;">
            <span class="ic" data-icon="refresh">[ICON: refresh]</span> Refresh
          </button>
        </div>
      </div>

      <!-- KDS Column Board -->
      <div class="kitchen-board-grid">
        <!-- Column 1: New Orders -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 480px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--bad);">
            <div style="font-weight: 700; font-size: 16px;">NEW ORDERS</div>
            <span class="pill pill--bad">${newOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;" id="colNew">
            ${newOrders.map(o => renderOrderTicket(o, 'Start Preparing', 'Preparing', 'var(--bad-tint)', 'var(--bad)')).join('')}
            ${newOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 40px 0;">No incoming new tickets</div>` : ''}
          </div>
        </div>

        <!-- Column 2: In Preparation -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 480px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--warn);">
            <div style="font-weight: 700; font-size: 16px;">IN PREPARATION</div>
            <span class="pill pill--warn">${prepOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;" id="colPrep">
            ${prepOrders.map(o => renderOrderTicket(o, 'Mark Ready', 'Ready', 'var(--warn-tint)', 'var(--warn)')).join('')}
            ${prepOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 40px 0;">No tickets currently on station</div>` : ''}
          </div>
        </div>

        <!-- Column 3: Ready for Pickup / Delivery -->
        <div class="card" style="padding: 16px; background: var(--surface-2); min-height: 480px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid var(--ok);">
            <div style="font-weight: 700; font-size: 16px;">READY FOR RUNNER</div>
            <span class="pill pill--ok">${readyOrders.length}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;" id="colReady">
            ${readyOrders.map(o => renderOrderTicket(o, 'Mark Served', 'Served', 'var(--ok-tint)', 'var(--ok)')).join('')}
            ${readyOrders.length === 0 ? `<div class="text-muted text-center text-sm" style="padding: 40px 0;">No orders awaiting runner pickup</div>` : ''}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderOrderTicket(o, btnText, nextStatus, tintBg, borderCol) {
    const ageMins = getOrderAgeMinutes(o.created);
    const dest = o.target || (o.type === 'Dine-in' ? `Table ${o.table}` : o.type === 'In-room' ? `Room ${o.room}` : 'Takeaway');

    return `
      <div class="card" style="padding: 16px; border-top: 4px solid ${borderCol}; box-shadow: var(--shadow); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <b style="font-size: 16px;">${o.code}</b>
              <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink);">${esc(dest)}</div>
            </div>
            <span class="pill pill--muted" style="font-size: 11px;" data-ticket-time="${o.created || ''}">
              ${ageMins}m ago
            </span>
          </div>

          <div style="margin: 12px 0; border-top: 1px dashed var(--line); border-bottom: 1px dashed var(--line); padding: 8px 0; display: flex; flex-direction: column; gap: 6px;">
            ${(o.lines || []).map(l => `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                <span style="font-weight: 600;">${l.qty}&times; ${esc(l.name)}</span>
              </div>
            `).join('')}
          </div>

          ${o.notes ? `
            <div style="background: var(--bg); padding: 6px 10px; border-radius: var(--r); border: 1px solid var(--line); font-size: 12px; margin-bottom: 12px; color: var(--bad);">
              <b>Note:</b> ${esc(o.notes)}
            </div>
          ` : ''}
        </div>

        <button class="btn btn-block" style="height: 44px; font-size: 14px; font-weight: 600;" onclick="advanceKitchenTicket('${o.code}', '${nextStatus}')">
          ${btnText} &rarr;
        </button>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll('[data-station]').forEach(btn => {
      btn.onclick = () => {
        stationFilter = btn.dataset.station;
        document.querySelectorAll('[data-station]').forEach(b => b.classList.toggle('active', b === btn));
        renderApp();
      };
    });

    $('btnRefreshKds').onclick = () => renderApp();
  }

  function updateOrderTimers() {
    renderApp();
  }

  window.advanceKitchenTicket = function (orderCode, nextStatus) {
    const orders = Data.getOrders();
    const order = orders.find(o => o.code === orderCode);
    if (!order) return;

    order.status = nextStatus;
    order.updated = `${today()} ${nowTime()}`;
    Data.saveOrders(orders);
    Data.audit('Kitchen Order Status', 'order', orderCode, `Order ${orderCode} moved to ${nextStatus}`);
    toast(`Order ${orderCode} updated to ${nextStatus}`, 'ok');
    renderApp();
  };

  // Auto-refresh when Data dispatches change
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
