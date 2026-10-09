/* ==========================================================================
   PUPSJ Hotel & Restaurant — Reports & Analytics (reports.js)
   100% data-derived KPIs (ADR, RevPAR, Occupancy %, Room & Dining Revenue),
   SVG financial charts, date filters, working CSV export, and print-to-PDF.
   ========================================================================== */
'use strict';

(function () {
  let datePreset = 'all'; // 'all' | '30d' | '7d' | 'month'
  let fromDate = '';
  let toDate = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 10;

  function init() {
    setPresetRange('all');
    renderApp();
  }

  function setPresetRange(preset) {
    datePreset = preset;
    const td = today();

    if (preset === '7d') {
      fromDate = addDays(td, -7);
      toDate = td;
    } else if (preset === '30d') {
      fromDate = addDays(td, -30);
      toDate = td;
    } else if (preset === 'month') {
      const now = new Date();
      fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      toDate = td;
    } else {
      fromDate = '';
      toDate = '';
    }
  }

  function getFilteredData() {
    const reservations = Data.getReservations();
    const orders = Data.getOrders ? Data.getOrders() : [];
    const rooms = Data.getRooms();

    // Filter reservations by check-in / stay date
    const filteredRes = reservations.filter(r => {
      if (fromDate && r.o < fromDate) return false;
      if (toDate && r.i > toDate) return false;
      return true;
    });

    // Filter orders by date
    const filteredOrders = orders.filter(o => {
      const d = o.created ? o.created.slice(0, 10) : today();
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    return { filteredRes, filteredOrders, rooms };
  }

  function calculateKPIs(data) {
    const { filteredRes, filteredOrders, rooms } = data;

    const totalBookings = filteredRes.length;
    const validBookings = filteredRes.filter(r => r.st !== 'Cancelled');
    const cancelledCount = filteredRes.filter(r => r.st === 'Cancelled').length;
    const cancellationRate = totalBookings > 0 ? ((cancelledCount / totalBookings) * 100).toFixed(1) : '0.0';

    const totalGuests = validBookings.reduce((sum, r) => sum + (r.gu || 2), 0);

    // Calculate days in range
    let daysInRange = 30;
    if (fromDate && toDate) {
      daysInRange = Math.max(1, dateDiff(fromDate, toDate));
    } else {
      const allIn = Data.getReservations().map(r => r.i).filter(Boolean).sort();
      const earliest = allIn[0] || addDays(today(), -30);
      daysInRange = Math.max(1, dateDiff(earliest, today()) + 1);
    }

    let roomNightsSold = 0;
    let roomRevenue = 0;
    let incidentalsRevenue = 0;
    let refundsTotal = 0;

    validBookings.forEach(r => {
      // Pro-rate room nights within selected range for settled/active stays
      const isSettledOrActive = ['Confirmed', 'Checked-in', 'Checked-out'].includes(r.st) && (r.p === 'Paid' || r.p === 'Partial' || Data.paidAmt(r) > 0);
      if (isSettledOrActive) {
        const start = fromDate ? (r.i < fromDate ? fromDate : r.i) : r.i;
        const end = toDate ? (r.o > toDate ? toDate : r.o) : r.o;
        const stayNightsInRange = Math.max(0, dateDiff(start, end));
        roomNightsSold += stayNightsInRange;

        const nightlyRate = r.rt || (Data.nts(r) > 0 ? Math.round(Data.roomChg(r) / Data.nts(r)) : 3200);
        roomRevenue += nightlyRate * stayNightsInRange;
      }

      // Incidentals (non-dining folio charges)
      (r.x || []).forEach(x => {
        const xDate = x.d || r.i;
        if (fromDate && xDate < fromDate) return;
        if (toDate && xDate > toDate) return;
        if (x.amt > 0 && x.cat !== 'Dining') incidentalsRevenue += Number(x.amt);
      });

      // Refunds from payments
      (r.pay || []).forEach(p => {
        const isRefund = (p.k === 'Refund' || p.t === 'Refund');
        if (isRefund) {
          const pDate = p.d || today();
          if (fromDate && pDate < fromDate) return;
          if (toDate && pDate > toDate) return;
          refundsTotal += Number(p.a != null ? p.a : p.amt) || 0;
        }
      });
    });

    // Restaurant Direct Paid Revenue (exclude room charges to prevent double counting with folio)
    // Direct POS Paid Dining
    let diningDirectRevenue = 0;
    filteredOrders.forEach(o => {
      const isDirectPaid = (o.payStatus === 'Paid' || o.status === 'Paid') && (!o.linkedRes && !o.resCode && (!o.target || !o.target.includes('Room')));
      if (isDirectPaid) {
        const orderTotal = Number(o.subtotal) || (o.lines || []).reduce((sum, l) => sum + (l.qty * (l.unitPrice || l.price || 0)), 0);
        diningDirectRevenue += orderTotal;
      }
    });

    // In-room dining charges posted to guest folios (Defect 5.1.7 fix)
    let diningRoomRevenue = 0;
    validBookings.forEach(r => {
      (r.x || []).forEach(x => {
        const xDate = x.d || r.ci || r.i;
        if (fromDate && xDate < fromDate) return;
        if (toDate && xDate > toDate) return;
        if (x.amt > 0 && x.cat === 'Dining') diningRoomRevenue += Number(x.amt);
      });
    });

    const diningRevenue = diningDirectRevenue + diningRoomRevenue;
    const netOverallRevenue = Math.max(0, roomRevenue + diningRevenue + incidentalsRevenue - refundsTotal);

    // Total available room capacity nights
    const totalRoomCapacityNights = Math.max(1, rooms.length * daysInRange);
    const occupancyPct = Math.min(100, Math.max(0, (roomNightsSold / totalRoomCapacityNights) * 100)).toFixed(1);

    // ADR = Room Revenue / Room Nights Sold
    const adr = roomNightsSold > 0 ? Math.round(roomRevenue / roomNightsSold) : 0;

    // RevPAR = Room Revenue / Total Available Room Capacity Nights
    const revpar = Math.round(roomRevenue / totalRoomCapacityNights);

    return {
      totalBookings,
      validBookingsCount: validBookings.length,
      cancelledCount,
      cancellationRate,
      totalGuests,
      roomNights: roomNightsSold,
      roomRevenue,
      diningRevenue,
      incidentalsRevenue,
      refundsTotal,
      netOverallRevenue,
      occupancyPct,
      adr,
      revpar
    };
  }

  function renderApp() {
    const app = $('reportsApp');
    if (!app) return;

    const data = getFilteredData();
    const kpis = calculateKPIs(data);

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">FINANCE &amp; PERFORMANCE</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Business Performance &amp; Reports</h1>
        </div>
        <div style="display: flex; gap: 8px;" class="no-print">
          <button class="btn-secondary" id="btnExportReportsCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnPrintReportsPDF">
            <span class="ic" data-icon="print">[ICON: print]</span> Print / Save PDF
          </button>
        </div>
      </div>

      <!-- Date Range Controls -->
      <div class="card no-print" style="padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="text-sm text-secondary" style="margin-right: 6px;">Preset:</span>
            <button class="btn-secondary btn-sm ${datePreset === 'all' ? 'btn-active' : ''}" id="btnPreAll">All Time</button>
            <button class="btn-secondary btn-sm ${datePreset === 'month' ? 'btn-active' : ''}" id="btnPreMonth">This Month</button>
            <button class="btn-secondary btn-sm ${datePreset === '30d' ? 'btn-active' : ''}" id="btnPre30d">Last 30 Days</button>
            <button class="btn-secondary btn-sm ${datePreset === '7d' ? 'btn-active' : ''}" id="btnPre7d">Last 7 Days</button>
          </div>
          <div style="display: flex; gap: 8px; align-items: flex-end;">
            <div class="field" style="margin: 0;">
              <label>From Date</label>
              <input type="date" id="repFromDate" value="${fromDate}" style="height: 34px;">
            </div>
            <div class="field" style="margin: 0;">
              <label>To Date</label>
              <input type="date" id="repToDate" value="${toDate}" style="height: 34px;">
            </div>
            <button class="btn-secondary btn-sm" id="btnApplyCustomDates" style="height: 34px;">Apply</button>
          </div>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Net Revenue</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${peso(kpis.netOverallRevenue)}</div>
          <div class="text-xs text-muted" style="margin-top: 4px;">Rooms + F&amp;B + Extras</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Room Revenue</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${peso(kpis.roomRevenue)}</div>
          <div class="text-xs text-muted" style="margin-top: 4px;">${kpis.roomNights} room nights</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">F&amp;B Dining Revenue</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${peso(kpis.diningRevenue)}</div>
          <div class="text-xs text-muted" style="margin-top: 4px;">Restaurant + Room service</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Avg Daily Rate (ADR)</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ink); margin-top: 4px;">${peso(kpis.adr)}</div>
          <div class="text-xs text-muted" style="margin-top: 4px;">RevPAR: ${peso(kpis.revpar)}</div>
        </div>
      </div>

      <!-- Operational KPIs Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Estimated Occupancy</div>
          <div style="font-size: 24px; font-weight: 600;">${kpis.occupancyPct}%</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Bookings</div>
          <div style="font-size: 24px; font-weight: 600;">${kpis.totalBookings}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Guests Accommodated</div>
          <div style="font-size: 24px; font-weight: 600;">${kpis.totalGuests}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Cancellation Rate</div>
          <div style="font-size: 24px; font-weight: 600; color: ${kpis.cancellationRate > 15 ? 'var(--bad)' : 'inherit'};">${kpis.cancellationRate}%</div>
          <div class="text-xs text-muted" style="margin-top: 2px;">${kpis.cancelledCount} cancelled</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px;">
        <!-- Chart 1: Revenue by Category SVG -->
        <div class="card" style="padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px;">Revenue Contribution by Department</h3>
          ${renderRevenueBreakdownChart(kpis)}
        </div>

        <!-- Chart 2: Room Type Performance -->
        <div class="card" style="padding: 20px;">
          <h3 style="margin: 0 0 14px 0; font-size: 16px;">Top Room Types by Stays</h3>
          ${renderRoomTypePerformance(data.filteredRes)}
        </div>
      </div>

      <!-- Detailed Bookings Audit Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 14px 16px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; background: var(--surface-2);">
          <b>Bookings Ledger for Filtered Period (${data.filteredRes.length})</b>
          <input type="text" id="repTableSearch" placeholder="Search filtered records…" style="max-width: 220px; height: 32px; font-size: 12px;" class="no-print">
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Guest</th>
                <th>Room Type &amp; No.</th>
                <th>Stay Dates</th>
                <th>Nights</th>
                <th>Total Charges</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="repTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="repPagination" class="no-print">
        </div>
      </div>
    `;

    bindEvents(data);
    renderAuditTable(data.filteredRes);
  }

  function bindEvents(data) {
    $('btnPreAll').onclick = () => { setPresetRange('all'); renderApp(); };
    $('btnPreMonth').onclick = () => { setPresetRange('month'); renderApp(); };
    $('btnPre30d').onclick = () => { setPresetRange('30d'); renderApp(); };
    $('btnPre7d').onclick = () => { setPresetRange('7d'); renderApp(); };

    $('btnApplyCustomDates').onclick = () => {
      fromDate = $('repFromDate').value;
      toDate = $('repToDate').value;
      datePreset = 'custom';
      renderApp();
    };

    $('btnExportReportsCSV').onclick = () => {
      const cols = [
        { header: 'Reservation Code', key: 'c' },
        { header: 'Guest Name', key: 'g' },
        { header: 'Phone', key: 'ph' },
        { header: 'Room Type', key: 't' },
        { header: 'Room Number', key: 'n' },
        { header: 'Check In', key: 'i' },
        { header: 'Check Out', key: 'o' },
        { header: 'Nights', key: r => Data.nts(r) },
        { header: 'Total (PHP)', key: r => Data.tot(r) },
        { header: 'Paid (PHP)', key: r => Data.paidAmt(r) },
        { header: 'Status', key: 'st' }
      ];
      exportCSV(`PUPSJ_Performance_Report_${today()}.csv`, cols, data.filteredRes);
    };

    $('btnPrintReportsPDF').onclick = () => {
      window.print();
    };

    $('repTableSearch').oninput = (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      page = 1;
      renderAuditTable(data.filteredRes);
    };
  }

  function renderRevenueBreakdownChart(kpis) {
    const total = Math.max(1, kpis.roomRevenue + kpis.diningRevenue + kpis.incidentalsRevenue);
    const roomPct = Math.round((kpis.roomRevenue / total) * 100);
    const dinePct = Math.round((kpis.diningRevenue / total) * 100);
    const incPct = 100 - roomPct - dinePct;

    return `
      <div style="display: flex; flex-direction: column; gap: 14px; font-size: 13px;">
        <!-- Visual Segmented Bar -->
        <div style="height: 28px; width: 100%; display: flex; border-radius: var(--r); overflow: hidden; border: 1px solid var(--line);">
          <div style="width: ${roomPct}%; background: var(--gold); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600;" title="Room Revenue (${roomPct}%)">
            ${roomPct > 15 ? `${roomPct}%` : ''}
          </div>
          <div style="width: ${dinePct}%; background: var(--ok); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600;" title="Dining Revenue (${dinePct}%)">
            ${dinePct > 15 ? `${dinePct}%` : ''}
          </div>
          <div style="width: ${incPct}%; background: var(--info); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600;" title="Incidentals (${incPct}%)">
            ${incPct > 15 ? `${incPct}%` : ''}
          </div>
        </div>

        <!-- Legend / Values -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 6px;">
          <div style="border-left: 3px solid var(--gold); padding-left: 8px;">
            <div class="text-xs text-secondary">Rooms (${roomPct}%)</div>
            <div style="font-weight: 600;">${peso(kpis.roomRevenue)}</div>
          </div>
          <div style="border-left: 3px solid var(--ok); padding-left: 8px;">
            <div class="text-xs text-secondary">F&amp;B Dining (${dinePct}%)</div>
            <div style="font-weight: 600;">${peso(kpis.diningRevenue)}</div>
          </div>
          <div style="border-left: 3px solid var(--info); padding-left: 8px;">
            <div class="text-xs text-secondary">Incidentals (${incPct}%)</div>
            <div style="font-weight: 600;">${peso(kpis.incidentalsRevenue)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderRoomTypePerformance(reservations) {
    const typeMap = {};
    reservations.filter(r => r.st !== 'Cancelled').forEach(r => {
      typeMap[r.t] = (typeMap[r.t] || 0) + 1;
    });

    const entries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(1, ...entries.map(e => e[1]));

    if (entries.length === 0) {
      return `<p class="text-muted text-sm">No confirmed bookings in this date range.</p>`;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
        ${entries.map(([typeName, count]) => {
          const widthPct = Math.round((count / maxVal) * 100);
          return `
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span>${esc(typeName)}</span>
                <b>${count} stay(s)</b>
              </div>
              <div style="height: 8px; width: 100%; background: var(--surface-2); border-radius: 4px; overflow: hidden;">
                <div style="width: ${widthPct}%; height: 100%; background: var(--gold-ink); border-radius: 4px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderAuditTable(reservations) {
    const tbody = $('repTableBody');
    const pgnEl = $('repPagination');
    if (!tbody) return;

    let filtered = reservations;
    if (searchQuery) {
      filtered = filtered.filter(r => `${r.c} ${r.g} ${r.t} ${r.n}`.toLowerCase().includes(searchQuery));
    }

    const pgn = paginate(filtered, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No reservations found matching the filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(r => {
      const nts = Data.nts(r);
      const total = Data.tot(r);
      const paid = Data.paidAmt(r);
      const pillClass = r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Cancelled' ? 'pill--bad' : 'pill--warn';

      return `
        <tr>
          <td><b>${r.c}</b></td>
          <td><b>${esc(r.g)}</b></td>
          <td>${esc(r.t)} &middot; Room ${r.n}</td>
          <td>${fmtDate(r.i)} &rarr; ${fmtDate(r.o)}</td>
          <td>${nts}</td>
          <td>${peso(total)}</td>
          <td style="color: var(--ok); font-weight: 500;">${peso(paid)}</td>
          <td><span class="pill ${pillClass}">${r.st}</span></td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} records</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnRepPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnRepNext">Next</button>
      </div>
    `;

    const prev = $('btnRepPrev');
    if (prev) prev.onclick = () => { page--; renderAuditTable(reservations); };
    const next = $('btnRepNext');
    if (next) next.onclick = () => { page++; renderAuditTable(reservations); };
  }

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

