/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff Dashboard (dashboard.js)
   100% data-driven metrics, dynamic SVG revenue chart from real payment dates,
   real month calendar with navigation, pending queues, and audit activity feed.
   ========================================================================== */
'use strict';

(function () {
  const root = $('dashboardApp');
  if (!root) return;

  const T = today();

  // Calendar State
  const now = new Date();
  let calYear = now.getFullYear();
  let calMonth = now.getMonth(); // 0-indexed

  // Revenue Range State
  let revRange = 'weekly';

  function renderDashboard() {
    const res = Data.getReservations();
    const rooms = Data.getRooms();
    const orders = Data.getOrders();
    const auditLog = Data.getAuditLog();
    const threads = Data.getThreads();
    const inq = Data.getInquiries();
    const maint = Data.getMaintenance();
    const hk = Data.getHK();

    // 1. KPI Calculations (Derived Live)
    const arrToday = res.filter(r => r.i === T && (r.st === 'Confirmed' || r.st === 'Pending'));
    const depToday = res.filter(r => r.o === T && r.st === 'Checked-in');
    const inHouse = res.filter(r => r.st === 'Checked-in');

    const totalRooms = rooms.length;

    // Derived dynamic room counts via Data.roomStatus(rm.n)
    let occupiedCount = 0;
    let reservedToday = 0;
    let maintCount = 0;
    let cleaningCount = 0;
    let availableCount = 0;

    rooms.forEach(rm => {
      const st = (Data.roomStatus(rm.n) || {}).s;
      if (st === 'Occupied') occupiedCount++;
      else if (st === 'Reserved') reservedToday++;
      else if (st === 'Maintenance') maintCount++;
      else if (st === 'Cleaning') cleaningCount++;
      else availableCount++;
    });

    // Restaurant sales today (direct POS and room-billed today)
    const restSalesToday = orders
      .filter(o => (o.created || '').startsWith(T) && o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (o.subtotal || 0), 0);

    // Pending queues counts
    const unpaidDeposits = res.filter(r => r.st === 'Pending' && r.p === 'Unpaid').length;
    const unreadMessages = threads.filter(t => (t.unreadStaff || 0) > 0 && t.status === 'Open').length;
    const newInquiries = inq.filter(i => i.status === 'New').length;
    const urgentCleaning = Object.values(hk).filter(h => h.s !== 'Clean' && h.p === 'Urgent').length;
    const urgentMaint = maint.filter(m => m.status === 'Open' && m.priority === 'Urgent').length;

    root.innerHTML = `
      <!-- Operations Quick Actions Toolbar -->
      <div class="card" style="padding: 14px 18px; margin-bottom: 24px; background: var(--surface); border: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="ic" data-icon="dashboard" style="color: var(--gold-ink); font-size: 20px;">[ICON: dashboard]</span>
          <div>
            <div style="font-weight: 600; font-size: 14px;">Front Desk &amp; Operations Quick Actions</div>
            <div class="text-xs text-muted">Direct administrative actions across all hotel &amp; restaurant modules</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="reservations.html?new=1" class="btn btn-sm">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Reservation
          </a>
          <a href="orders.html" class="btn btn-sm">
            <span class="ic" data-icon="tray">[ICON: tray]</span> New POS Order
          </a>
          <a href="guests.html" class="btn-secondary btn-sm">
            <span class="ic" data-icon="users">[ICON: users]</span> Register Guest
          </a>
          <a href="tables.html" class="btn-secondary btn-sm">
            <span class="ic" data-icon="table">[ICON: table]</span> Table Seating
          </a>
          <a href="housekeeping.html" class="btn-secondary btn-sm">
            <span class="ic" data-icon="broom">[ICON: broom]</span> Housekeeping
          </a>
          <a href="maintenance.html" class="btn-secondary btn-sm">
            <span class="ic" data-icon="wrench">[ICON: wrench]</span> Maintenance
          </a>
        </div>
      </div>

      <!-- Top Operational KPI Cards -->
      <div class="stats-grid">
        <div class="stat-card kpi-card">
          <div class="stat-card-label">Arrivals Today</div>
          <div class="stat-card-num">${arrToday.length}</div>
          <div class="stat-card-sub">${arrToday.filter(r => r.p === 'Paid').length} paid in full</div>
        </div>
        <div class="stat-card kpi-card">
          <div class="stat-card-label">Departures Today</div>
          <div class="stat-card-num">${depToday.length}</div>
          <div class="stat-card-sub">Expected check-outs by 12 PM</div>
        </div>
        <div class="stat-card kpi-card">
          <div class="stat-card-label">In-House Guests</div>
          <div class="stat-card-num">${occupiedCount}</div>
          <div class="stat-card-sub">${totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0}% room occupancy</div>
        </div>
        <div class="stat-card kpi-card">
          <div class="stat-card-label">Dining Sales Today</div>
          <div class="stat-card-num">${peso(restSalesToday)}</div>
          <div class="stat-card-sub">${orders.filter(o => (o.created || '').startsWith(T)).length} orders processed</div>
        </div>
      </div>

      <!-- Actionable Pending Items Alert Banner -->
      ${(unpaidDeposits + unreadMessages + newInquiries + urgentCleaning + urgentMaint > 0) ? `
        <div class="banner banner--warn" style="margin-bottom: 24px;">
          <span class="ic" data-icon="alert">[ICON: alert]</span>
          <div style="flex: 1;">
            <b>Attention Required:</b> &nbsp;
            ${unpaidDeposits ? `<a href="reservations.html?status=Pending" style="margin-right: 12px;">${unpaidDeposits} Unpaid Deposit${unpaidDeposits > 1 ? 's' : ''}</a>` : ''}
            ${unreadMessages ? `<a href="messages.html" style="margin-right: 12px;">${unreadMessages} Unread Message${unreadMessages > 1 ? 's' : ''}</a>` : ''}
            ${newInquiries ? `<a href="inquiries.html" style="margin-right: 12px;">${newInquiries} New Inquir${newInquiries > 1 ? 'ies' : 'y'}</a>` : ''}
            ${urgentCleaning ? `<a href="housekeeping.html" style="margin-right: 12px;">${urgentCleaning} Urgent Room Cleanings</a>` : ''}
            ${urgentMaint ? `<a href="maintenance.html">${urgentMaint} Urgent Maintenance</a>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Main Dashboard Grid (2 Columns, responsive collapse) -->
      <div class="grid-split-dashboard" style="margin-bottom: 24px;">
        <!-- Left: Revenue Overview & Inventory Status -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Revenue Chart Card -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin: 0;">Revenue Performance</h3>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn-secondary btn-sm ${revRange === 'weekly' ? 'active' : ''}" id="btnRevWeekly">Weekly</button>
                <button type="button" class="btn-secondary btn-sm ${revRange === 'monthly' ? 'active' : ''}" id="btnRevMonthly">Monthly</button>
              </div>
            </div>
            <div id="revenueChartContainer" style="height: 220px;">
              <!-- Dynamic SVG Chart -->
            </div>
          </div>

          <!-- Room Status Distribution Bar -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin: 0;">Room Occupancy &amp; Inventory Status</h3>
              <span class="text-sm text-muted">${totalRooms} Total Rooms</span>
            </div>

            <!-- Segmented Progress Bar -->
            <div style="height: 14px; display: flex; border-radius: var(--r); overflow: hidden; background: var(--surface-2); margin-bottom: 14px; border: 1px solid var(--line);">
              <div style="width: ${totalRooms ? (occupiedCount / totalRooms) * 100 : 0}%; background-color: var(--ok);" title="Occupied: ${occupiedCount}"></div>
              <div style="width: ${totalRooms ? (reservedToday / totalRooms) * 100 : 0}%; background-color: var(--gold);" title="Reserved: ${reservedToday}"></div>
              <div style="width: ${totalRooms ? (cleaningCount / totalRooms) * 100 : 0}%; background-color: var(--warn);" title="Cleaning: ${cleaningCount}"></div>
              <div style="width: ${totalRooms ? (maintCount / totalRooms) * 100 : 0}%; background-color: var(--bad);" title="Maintenance: ${maintCount}"></div>
              <div style="width: ${totalRooms ? (availableCount / totalRooms) * 100 : 0}%; background-color: var(--line);" title="Available: ${availableCount}"></div>
            </div>

            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px;">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--ok);"></span>
                Occupied: <b>${occupiedCount}</b>
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--gold);"></span>
                Reserved: <b>${reservedToday}</b>
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--warn);"></span>
                Cleaning: <b>${cleaningCount}</b>
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--bad);"></span>
                Maintenance: <b>${maintCount}</b>
              </span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: var(--line);"></span>
                Available: <b>${availableCount}</b>
              </span>
            </div>
          </div>
        </div>

        <!-- Right: Real Dynamic Month Calendar & Upcoming Check-ins -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Real Dynamic Month Calendar -->
          <div class="card">
            <div class="card-header">
              <h3 id="calHeaderTitle" style="margin: 0;"></h3>
              <div style="display: flex; gap: 4px;">
                <button type="button" class="btn-secondary btn-sm" id="btnCalPrev" aria-label="Previous month">&lsaquo;</button>
                <button type="button" class="btn-secondary btn-sm" id="btnCalNext" aria-label="Next month">&rsaquo;</button>
              </div>
            </div>
            <div id="dashboardMonthCal"></div>
          </div>

          <!-- Upcoming Check-ins -->
          <div class="card">
            <div class="card-header">
              <h3 style="margin: 0;">Upcoming Check-ins</h3>
              <a href="reservations.html?new=1" class="btn-secondary btn-sm">+ New</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${arrToday.length ? arrToday.slice(0, 4).map(r => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line);">
                  <div>
                    <b>${esc(r.g)}</b>
                    <div class="text-sm text-muted">${esc(r.t)} &middot; Room ${r.n}</div>
                  </div>
                  <div style="text-align: right;">
                    <span class="pill ${r.p === 'Paid' ? 'pill--ok' : 'pill--warn'}">${r.p}</span>
                    <div class="text-sm text-muted" style="margin-top: 2px;">${fmtShortDate(r.i)}</div>
                  </div>
                </div>
              `).join('') : '<div class="text-sm text-muted">No check-ins scheduled for today.</div>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Tables: Recent Bookings & Audit Activity -->
      <div class="grid-split-dashboard">
        <!-- Recent Bookings Table -->
        <div class="card">
          <div class="card-header">
            <h3 style="margin: 0;">Recent Bookings</h3>
            <a href="reservations.html" class="btn-secondary btn-sm">View All &rarr;</a>
          </div>
          <div class="table-wrap" style="border: 0;">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Guest Name</th>
                  <th>Room Category</th>
                  <th>Stay Dates</th>
                  <th style="text-align: right;">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${res.slice(0, 5).map(r => `
                  <tr>
                    <td><a href="reservations.html?code=${esc(r.c)}"><b>${esc(r.c)}</b></a></td>
                    <td>${esc(r.g)}</td>
                    <td>${esc(r.t)}</td>
                    <td>${fmtShortDate(r.i)} – ${fmtShortDate(r.o)}</td>
                    <td style="text-align: right;">${peso(Data.tot(r))}</td>
                    <td><span class="pill ${r.st === 'Confirmed' ? 'pill--ok' : r.st === 'Pending' ? 'pill--warn' : r.st === 'Checked-in' ? 'pill--info' : 'pill--muted'}">${esc(r.st)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Recent Audit Log Feed -->
        <div class="card">
          <div class="card-header">
            <h3 style="margin: 0;">Recent Activity</h3>
            <a href="audit.html" class="btn-secondary btn-sm">Audit Log &rarr;</a>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${auditLog.slice(0, 5).map(a => `
              <div style="border-bottom: 1px solid var(--line); padding-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px;">
                  <b>${esc(a.user || 'System')}</b>
                  <span class="text-muted text-sm">${esc((a.time || '').split(' ')[1] || a.time || '')}</span>
                </div>
                <div class="text-sm" style="color: var(--ink); margin-top: 2px;">
                  ${esc(a.action || '')} &middot; <span class="text-muted">${esc(a.details || '')}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Attach Event Handlers
    const btnW = $('btnRevWeekly');
    const btnM = $('btnRevMonthly');
    if (btnW && btnM) {
      btnW.onclick = () => { revRange = 'weekly'; renderChart(); };
      btnM.onclick = () => { revRange = 'monthly'; renderChart(); };
    }

    const btnPrev = $('btnCalPrev');
    const btnNext = $('btnCalNext');
    if (btnPrev && btnNext) {
      btnPrev.onclick = () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
      };
      btnNext.onclick = () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
      };
    }

    renderChart();
    renderCalendar();
  }

  // ─── Dynamic SVG Revenue Chart from REAL Transactions ───
  function renderChart() {
    const container = $('revenueChartContainer');
    if (!container) return;

    const res = Data.getReservations();
    const payments = res.flatMap(r => r.pay || []);
    const orders = Data.getOrders();

    let labels = [];
    let values = [];

    if (revRange === 'weekly') {
      // Last 7 days ending today
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const dayLabel = `${dayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
        days.push({ iso, label: dayLabel });
      }

      labels = days.map(d => d.label);
      values = days.map(d => {
        // Folio transactions on date
        const folioRev = payments
          .filter(p => (p.d || '').startsWith(d.iso))
          .reduce((sum, p) => sum + (p.k === 'Refund' || p.t === 'Refund' ? -(p.a != null ? p.a : p.amt || 0) : (p.a != null ? p.a : p.amt || 0)), 0);

        // POS settled orders on date (avoid double counting room charges which post to folio)
        const posRev = orders
          .filter(o => (o.created || '').startsWith(d.iso) && o.payStatus === 'Paid' && o.target !== 'Room' && o.paymentKind !== 'Room folio')
          .reduce((sum, o) => sum + (o.subtotal || 0), 0);

        return Math.max(0, folioRev + posRev);
      });
    } else {
      // Last 6 months ending current month
      const months = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const isoMonth = `${yyyy}-${mm}`;
        months.push({ iso: isoMonth, label: `${monthNames[d.getMonth()]} ${String(yyyy).slice(2)}` });
      }

      labels = months.map(m => m.label);
      values = months.map(m => {
        const folioRev = payments
          .filter(p => (p.d || '').startsWith(m.iso))
          .reduce((sum, p) => sum + (p.k === 'Refund' || p.t === 'Refund' ? -(p.a != null ? p.a : p.amt || 0) : (p.a != null ? p.a : p.amt || 0)), 0);

        const posRev = orders
          .filter(o => (o.created || '').startsWith(m.iso) && o.payStatus === 'Paid' && o.target !== 'Room' && o.paymentKind !== 'Room folio')
          .reduce((sum, o) => sum + (o.subtotal || 0), 0);

        return Math.max(0, folioRev + posRev);
      });
    }

    const W = 520;
    const H = 200;
    const padL = 60;
    const padR = 20;
    const padT = 20;
    const padB = 30;

    const maxVal = Math.max(...values, 5000) * 1.15;
    const xStep = (W - padL - padR) / (labels.length - 1);

    const points = values.map((val, i) => {
      const x = padL + i * xStep;
      const y = H - padB - (val / maxVal) * (H - padT - padB);
      return [x, y];
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');

    const gridLines = [0, 0.33, 0.66, 1].map(pct => {
      const v = Math.round(maxVal * pct);
      const y = H - padB - pct * (H - padT - padB);
      return `
        <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1" />
        <text x="${padL - 8}" y="${y + 4}" font-size="10" fill="var(--ink-3)" text-anchor="end">${peso(v)}</text>
      `;
    }).join('');

    const xLabels = labels.map((lbl, i) => {
      const x = padL + i * xStep;
      return `<text x="${x}" y="${H - 10}" font-size="10" fill="var(--ink-2)" text-anchor="middle">${esc(lbl)}</text>`;
    }).join('');

    const circles = points.map((p, i) => `
      <circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--surface)" stroke="var(--gold)" stroke-width="2">
        <title>${esc(labels[i])}: ${peso(values[i])}</title>
      </circle>
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="overflow: visible;">
        ${gridLines}
        <path d="${pathD}" fill="none" stroke="var(--gold)" stroke-width="2.5" />
        ${circles}
        ${xLabels}
      </svg>
    `;
  }

  // ─── Real Dynamic Month Calendar ───
  function renderCalendar() {
    const titleEl = $('calHeaderTitle');
    const calEl = $('dashboardMonthCal');
    if (!calEl) return;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (titleEl) titleEl.textContent = `${monthNames[calMonth]} ${calYear}`;

    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const res = Data.getReservations();
    const currentMonthIso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

    let calGridHtml = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 11px;">
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Su</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Mo</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Tu</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">We</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Th</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Fr</div>
        <div style="font-weight: 600; color: var(--ink-3); padding: 4px;">Sa</div>
    `;

    // Empty cells before 1st day
    for (let i = 0; i < firstDayIndex; i++) {
      calGridHtml += `<div style="padding: 6px; color: var(--ink-3); opacity: 0.3;">&middot;</div>`;
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateIso = `${currentMonthIso}-${String(day).padStart(2, '0')}`;
      const isToday = dateIso === T;

      // Check reservations active on this date
      const activeRes = res.filter(r => r.st !== 'Cancelled' && r.i <= dateIso && r.o > dateIso);
      const count = activeRes.length;

      let cellBg = isToday ? 'var(--gold-tint)' : 'var(--surface-2)';
      let border = isToday ? '1px solid var(--gold)' : '1px solid var(--line)';

      calGridHtml += `
        <div style="padding: 6px 2px; border-radius: var(--r); background-color: ${cellBg}; border: ${border}; min-height: 38px; display: flex; flex-direction: column; justify-content: space-between;">
          <span style="font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? 'var(--gold-ink)' : 'var(--ink)'}; font-size: 11px;">${day}</span>
          ${count > 0 ? `<span style="font-size: 9px; font-weight: 600; color: var(--ok); line-height: 1;">${count} stay${count > 1 ? 's' : ''}</span>` : ''}
        </div>
      `;
    }

    calGridHtml += `</div>`;
    calEl.innerHTML = calGridHtml;
  }

  // Reactive auto-refresh on data change
  window.addEventListener('pupsj:data-change', () => {
    renderDashboard();
  });

  // Safe single initialization
  let initialized = false;
  function safeInit() {
    if (initialized) return;
    initialized = true;
    renderDashboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();

