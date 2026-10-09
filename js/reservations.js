/* ==========================================================================
   PUPSJ Hotel & Restaurant — Reservations Management (reservations.js)
   Table view with search, filter, sort, pagination, CSV export, and
   calendar view (Month, Week, Agenda) with real month navigation.
   ========================================================================== */
'use strict';

(function () {
  const ST_OPTIONS = ['Confirmed', 'Pending', 'Checked-in', 'Checked-out', 'Cancelled'];
  let currentTab = 'table'; // 'table' | 'calendar'
  let calView = 'month';    // 'month' | 'week' | 'agenda'
  let curDate = new Date(); // Anchor date for calendar navigation
  let selectedCode = null;
  let page = 1;
  const pageSize = 10;
  let sortKey = 'created';
  let sortDir = -1; // -1 = desc, 1 = asc

  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const paramCode = urlParams.get('code');
  const paramNew = urlParams.get('new');
  const paramGuest = urlParams.get('guest');
  const paramStatus = urlParams.get('status');
  const paramPhone = urlParams.get('phone');

  function init() {
    if (paramStatus) statusFilter = paramStatus;
    renderApp();
    if (paramCode) {
      setTimeout(() => openReservationDetail(paramCode), 200);
    } else if (paramNew) {
      setTimeout(() => openNewStaffReservation({ guest: paramGuest || '', phone: paramPhone || '' }), 200);
    }
  }

  function renderApp() {
    const app = $('reservationsApp');
    if (!app) return;

    const reservations = Data.getReservations();
    const confirmedCount = reservations.filter(r => r.st === 'Confirmed').length;
    const pendingCount = reservations.filter(r => r.st === 'Pending').length;
    const checkedInCount = reservations.filter(r => r.st === 'Checked-in').length;
    const totalCount = reservations.length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">OPERATIONS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Reservation Management</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btnExportResCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnNewReservation">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Reservation
          </button>
        </div>
      </div>

      <!-- Stat Pillars -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Bookings</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${totalCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Confirmed Stays</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${confirmedCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Checked-in Guests</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${checkedInCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Pending Deposit</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${pendingCount}</div>
        </div>
      </div>

      <!-- View Selector Tabs -->
      <div class="tabs" style="margin-bottom: 16px;">
        <button class="tab-btn ${currentTab === 'table' ? 'active' : ''}" id="tabBtnTable">
          <span class="ic" data-icon="document">[ICON: document]</span> Reservation Ledger
        </button>
        <button class="tab-btn ${currentTab === 'calendar' ? 'active' : ''}" id="tabBtnCalendar">
          <span class="ic" data-icon="calendar">[ICON: calendar]</span> Visual Calendar
        </button>
      </div>

      <!-- View 1: Ledger Table -->
      <div id="viewTable" style="${currentTab === 'table' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
            <div class="field" style="margin: 0;">
              <label>Search</label>
              <input type="text" id="resSearchInput" placeholder="Guest name, code, phone, or room…">
            </div>
            <div class="field" style="margin: 0;">
              <label>Status</label>
              <select id="resStatusFilter">
                <option value="">All Statuses</option>
                ${ST_OPTIONS.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="margin: 0;">
              <label>From Date</label>
              <input type="date" id="resFromFilter">
            </div>
            <div class="field" style="margin: 0;">
              <label>To Date</label>
              <input type="date" id="resToFilter">
            </div>
            <div>
              <button class="btn-ghost" id="btnClearResFilters" style="height: 40px;">Reset</button>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="cursor: pointer;" data-sort="code">Code <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th style="cursor: pointer;" data-sort="guest">Guest Name <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th>Room Type &amp; No.</th>
                  <th style="cursor: pointer;" data-sort="dates">Stay Dates <span class="ic" data-icon="sort">[ICON: sort]</span></th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody id="resTableBody">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="resPagination">
            <!-- Pagination Controls -->
          </div>
        </div>
      </div>

      <!-- View 2: Calendar -->
      <div id="viewCalendar" style="${currentTab === 'calendar' ? '' : 'display:none;'}">
        <div class="card" style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h2 style="margin: 0; font-size: 20px;" id="calTitleDisplay">October 2026</h2>
              <div style="display: flex; gap: 4px;">
                <button class="btn-secondary btn-sm" id="btnCalPrev">&larr; Prev</button>
                <button class="btn-secondary btn-sm" id="btnCalToday">Today</button>
                <button class="btn-secondary btn-sm" id="btnCalNext">Next &rarr;</button>
              </div>
            </div>
            <div class="tabs" style="margin: 0;">
              <button class="tab-btn ${calView === 'month' ? 'active' : ''}" data-cal-view="month">Month</button>
              <button class="tab-btn ${calView === 'week' ? 'active' : ''}" data-cal-view="week">Week</button>
              <button class="tab-btn ${calView === 'agenda' ? 'active' : ''}" data-cal-view="agenda">Agenda</button>
            </div>
          </div>

          <div id="calContainer">
            <!-- Calendar grid rendered dynamically -->
          </div>
        </div>
      </div>
    `;

    bindHeaderEvents();
    renderTable();
    renderCalendar();
  }

  function bindHeaderEvents() {
    $('tabBtnTable').onclick = () => {
      currentTab = 'table';
      $('tabBtnTable').classList.add('active');
      $('tabBtnCalendar').classList.remove('active');
      $('viewTable').style.display = '';
      $('viewCalendar').style.display = 'none';
      renderTable();
    };

    $('tabBtnCalendar').onclick = () => {
      currentTab = 'calendar';
      $('tabBtnCalendar').classList.add('active');
      $('tabBtnTable').classList.remove('active');
      $('viewCalendar').style.display = '';
      $('viewTable').style.display = 'none';
      renderCalendar();
    };

    $('btnNewReservation').onclick = () => openNewStaffReservation();

    $('btnExportResCSV').onclick = () => {
      const filtered = getFilteredReservations();
      const cols = [
        { header: 'Reservation Code', key: 'c' },
        { header: 'Guest Name', key: 'g' },
        { header: 'Phone', key: 'ph' },
        { header: 'Room Type', key: 't' },
        { header: 'Room Number', key: 'n' },
        { header: 'Check In', key: 'i' },
        { header: 'Check Out', key: 'o' },
        { header: 'Guests', key: 'gu' },
        { header: 'Total (PHP)', key: r => Data.tot(r) },
        { header: 'Paid (PHP)', key: r => Data.paidAmt(r) },
        { header: 'Balance (PHP)', key: r => Data.balOf(r) },
        { header: 'Status', key: 'st' }
      ];
      exportCSV(`PUPSJ_Reservations_${today()}.csv`, cols, filtered);
    };

    // Filter Listeners
    ['resSearchInput', 'resStatusFilter', 'resFromFilter', 'resToFilter'].forEach(id => {
      const el = $(id);
      if (el) el.oninput = () => { page = 1; renderTable(); };
    });

    $('btnClearResFilters').onclick = () => {
      $('resSearchInput').value = '';
      $('resStatusFilter').value = '';
      $('resFromFilter').value = '';
      $('resToFilter').value = '';
      page = 1;
      renderTable();
    };

    // Calendar Navigation Listeners
    $('btnCalPrev').onclick = () => {
      if (calView === 'month') {
        curDate.setMonth(curDate.getMonth() - 1);
      } else if (calView === 'week') {
        curDate.setDate(curDate.getDate() - 7);
      } else {
        curDate.setMonth(curDate.getMonth() - 1);
      }
      renderCalendar();
    };

    $('btnCalNext').onclick = () => {
      if (calView === 'month') {
        curDate.setMonth(curDate.getMonth() + 1);
      } else if (calView === 'week') {
        curDate.setDate(curDate.getDate() + 7);
      } else {
        curDate.setMonth(curDate.getMonth() + 1);
      }
      renderCalendar();
    };

    $('btnCalToday').onclick = () => {
      curDate = new Date();
      renderCalendar();
    };

    document.querySelectorAll('[data-cal-view]').forEach(btn => {
      btn.onclick = () => {
        calView = btn.dataset.calView;
        document.querySelectorAll('[data-cal-view]').forEach(b => b.classList.toggle('active', b === btn));
        renderCalendar();
      };
    });

    // Sort column headers
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.onclick = () => {
        const key = th.dataset.sort;
        if (sortKey === key) {
          sortDir = -sortDir;
        } else {
          sortKey = key;
          sortDir = 1;
        }
        renderTable();
      };
    });
  }

  function getFilteredReservations() {
    const list = Data.getReservations();
    const q = ($('resSearchInput')?.value || '').toLowerCase().trim();
    const status = $('resStatusFilter')?.value || '';
    const from = $('resFromFilter')?.value || '';
    const to = $('resToFilter')?.value || '';

    return list.filter(r => {
      if (status && r.st !== status) return false;
      if (from && r.o < from) return false;
      if (to && r.i > to) return false;
      if (q) {
        const text = `${r.g} ${r.c} ${r.ph || ''} ${r.n || ''} ${r.t}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortKey] || '';
      let valB = b[sortKey] || '';
      if (sortKey === 'guest') { valA = a.g; valB = b.g; }
      if (sortKey === 'code') { valA = a.c; valB = b.c; }
      if (sortKey === 'dates') { valA = a.i; valB = b.i; }
      if (sortKey === 'created') { valA = a.created || a.i; valB = b.created || b.i; }

      if (valA < valB) return -sortDir;
      if (valA > valB) return sortDir;
      return 0;
    });
  }

  function renderTable() {
    const tbody = $('resTableBody');
    const pgnEl = $('resPagination');
    if (!tbody) return;

    const items = getFilteredReservations();
    const pgn = paginate(items, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 28px;">No reservations found matching the current search filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0 reservations</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(r => {
      const nts = Data.nts(r);
      const total = Data.tot(r);
      const bal = Data.balOf(r);
      const pillClass = r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : r.st === 'Cancelled' ? 'pill--bad' : 'pill--muted';

      return `
        <tr style="cursor: pointer;" onclick="openReservationDetail('${r.c}')">
          <td><b>${r.c}</b></td>
          <td>
            <div style="font-weight: 600;">${esc(r.g)}</div>
            <div class="text-xs text-muted">${esc(r.ph) || 'No phone'}</div>
          </td>
          <td>
            <div>${esc(r.t)}</div>
            <div class="text-xs text-secondary">Room ${r.n}</div>
          </td>
          <td>
            <div>${fmtDate(r.i)} &rarr; ${fmtDate(r.o)}</div>
            <div class="text-xs text-muted">${nts} night(s) &middot; ${r.gu} guest(s)</div>
          </td>
          <td><b>${peso(total)}</b></td>
          <td>
            <div>${r.p}</div>
            <div class="text-xs ${bal > 0 ? 'text-warn' : 'text-ok'}">${bal > 0 ? `Due: ${peso(bal)}` : 'Fully Paid'}</div>
          </td>
          <td><span class="pill ${pillClass}">${r.st}</span></td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button class="btn-secondary btn-sm" onclick="openReservationDetail('${r.c}')" title="View details">Details</button>
              <button class="btn-secondary btn-sm" onclick="openFolioModal('${r.c}', () => renderApp())" title="Folio &amp; Payments">Folio</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} reservations</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnPrevPage">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnNextPage">Next</button>
      </div>
    `;

    const prev = $('btnPrevPage');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnNextPage');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  /* Calendar Views */
  function renderCalendar() {
    const container = $('calContainer');
    const titleDisplay = $('calTitleDisplay');
    if (!container) return;

    const year = curDate.getFullYear();
    const month = curDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (titleDisplay) {
      if (calView === 'month') {
        titleDisplay.textContent = `${monthNames[month]} ${year}`;
      } else if (calView === 'week') {
        const start = getStartOfWeek(new Date(curDate));
        const end = addDays(formatISO(start), 6);
        titleDisplay.textContent = `Week: ${fmtDate(formatISO(start))} – ${fmtDate(end)}`;
      } else {
        titleDisplay.textContent = `Agenda: ${monthNames[month]} ${year}`;
      }
    }

    if (calView === 'month') {
      renderMonthCalendar(container, year, month);
    } else if (calView === 'week') {
      renderWeekCalendar(container, curDate);
    } else {
      renderAgendaCalendar(container, year, month);
    }
  }

  function getStartOfWeek(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  }

  function formatISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function renderMonthCalendar(container, year, month) {
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled');

    let html = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; font-size: 12px;">
        ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `
          <div style="font-weight: 600; text-align: center; padding: 6px; background: var(--surface-2); border-radius: var(--r);">${d}</div>
        `).join('')}
    `;

    for (let i = 0; i < firstDay; i++) {
      html += `<div style="min-height: 85px; background: var(--bg); border: 1px dashed var(--line); border-radius: var(--r); padding: 4px; opacity: 0.4;"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayRes = reservations.filter(r => dateStr >= r.i && dateStr < r.o);
      const isToday = dateStr === today();

      html += `
        <div style="min-height: 85px; background: var(--surface); border: 1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}; border-radius: var(--r); padding: 4px; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: ${isToday ? '700' : '500'}; color: ${isToday ? 'var(--gold-ink)' : 'inherit'};">${day}</span>
            ${dayRes.length > 0 ? `<span class="text-xs text-muted">${dayRes.length}</span>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px; overflow-y: auto; max-height: 70px;">
            ${dayRes.slice(0, 3).map(r => {
              const bg = r.st === 'Checked-in' ? 'var(--ok-tint)' : r.st === 'Confirmed' ? 'var(--info-tint)' : 'var(--warn-tint)';
              const col = r.st === 'Checked-in' ? 'var(--ok)' : r.st === 'Confirmed' ? 'var(--info)' : 'var(--warn)';
              return `
                <div style="background: ${bg}; color: ${col}; padding: 2px 4px; border-radius: 2px; font-size: 10px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                     onclick="openReservationDetail('${r.c}')" title="${esc(r.g)} (${r.t})">
                  ${esc(r.g.split(' ')[0])} (${r.n})
                </div>
              `;
            }).join('')}
            ${dayRes.length > 3 ? `<div class="text-xs text-muted">+${dayRes.length - 3} more</div>` : ''}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  function renderWeekCalendar(container, anchorDate) {
    const monday = getStartOfWeek(new Date(anchorDate));
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled');
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(formatISO(d));
    }

    let html = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; font-size: 13px;">
        ${days.map(d => {
          const dayName = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
          const isToday = d === today();
          const dayRes = reservations.filter(r => d >= r.i && d < r.o);

          return `
            <div style="background: var(--surface); border: 1px solid ${isToday ? 'var(--gold)' : 'var(--line)'}; border-radius: var(--r); padding: 8px; min-height: 280px; display: flex; flex-direction: column;">
              <div style="font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid var(--line); margin-bottom: 8px; text-align: center; color: ${isToday ? 'var(--gold-ink)' : 'inherit'};">
                ${dayName} ${isToday ? '(Today)' : ''}
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; overflow-y: auto;">
                ${dayRes.map(r => `
                  <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: var(--r); padding: 6px; font-size: 11px; cursor: pointer;"
                       onclick="openReservationDetail('${r.c}')">
                    <div style="font-weight: 600;">${esc(r.g)}</div>
                    <div class="text-secondary">Room ${r.n} &middot; ${esc(r.t)}</div>
                    <div class="pill ${r.st === 'Checked-in' ? 'pill--ok' : 'pill--info'}" style="font-size: 9px; padding: 1px 4px; margin-top: 4px;">${r.st}</div>
                  </div>
                `).join('')}
                ${dayRes.length === 0 ? `<div class="text-xs text-muted text-center" style="padding-top: 20px;">No stays</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    container.innerHTML = html;
  }

  function renderAgendaCalendar(container, year, month) {
    const reservations = Data.getReservations().filter(r => r.st !== 'Cancelled')
      .sort((a, b) => a.i.localeCompare(b.i));

    if (reservations.length === 0) {
      container.innerHTML = `<p class="text-muted text-center" style="padding: 24px;">No upcoming or active reservations on file.</p>`;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${reservations.map(r => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); cursor: pointer;"
               onclick="openReservationDetail('${r.c}')">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <b>${esc(r.g)}</b>
                <span class="text-xs text-muted">${r.c}</span>
                <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : 'pill--warn'}" style="font-size: 10px;">${r.st}</span>
              </div>
              <div class="text-sm text-secondary">${esc(r.t)} (Room ${r.n}) &middot; ${r.gu} guests</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600;">${fmtDate(r.i)} &rarr; ${fmtDate(r.o)}</div>
              <div class="text-xs text-muted">${Data.nts(r)} night(s) &middot; ${peso(Data.tot(r))}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* Reservation Detail Modal */
  window.openReservationDetail = function (code) {
    const r = Data.findRes(code);
    if (!r) {
      toast('Reservation not found', 'bad');
      return;
    }

    const nts = Data.nts(r);
    const total = Data.tot(r);
    const paid = Data.paidAmt(r);
    const bal = Data.balOf(r);
    const isClean = Data.isRoomClean ? Data.isRoomClean(r.n) : true;
    const canCheckIn = r.st === 'Confirmed' && isClean && (paid >= Data.depAmt(r));
    const canCheckOut = r.st === 'Checked-in';

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
          <div>
            <h2 style="margin: 0; font-size: 20px;">${esc(r.g)}</h2>
            <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
            ${r.ph ? `<div class="text-sm text-muted">Phone: ${esc(r.ph)}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : 'pill--bad'}">${r.st}</span>
            <div style="font-size: 12px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'}; font-weight: 600; margin-top: 4px;">
              ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled'}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line);">
          <div>
            <div class="text-xs text-secondary">Check-in Date:</div>
            <b>${fmtDate(r.i)} (2:00 PM)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Check-out Date:</div>
            <b>${fmtDate(r.o)} (12:00 PM)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Length of Stay:</div>
            <b>${nts} Night(s) &middot; ${r.gu} Guest(s)</b>
          </div>
          <div>
            <div class="text-xs text-secondary">Room Cleanliness:</div>
            <b>${isClean ? 'Clean &amp; Ready' : '<span style="color:var(--bad);">Dirty / Cleaning in progress</span>'}</b>
          </div>
        </div>

        ${r.note ? `
          <div style="background: var(--bg); border: 1px solid var(--line); padding: 10px; border-radius: var(--r); margin-bottom: 14px;">
            <span class="text-xs text-secondary">Guest Special Requests:</span>
            <div style="margin-top: 2px;">${esc(r.note)}</div>
          </div>
        ` : ''}

        ${r.promo ? `
          <div style="background: var(--ok-tint); color: var(--ok); padding: 6px 10px; border-radius: var(--r); margin-bottom: 14px; font-size: 12px;">
            Promo Applied: <b>${esc(r.promo)}</b>
          </div>
        ` : ''}

        <div style="border-top: 1px solid var(--line); padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>Room Accommodation Rate:</span>
            <span>${peso(r.rt || 3200)} / night &times; ${nts}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px;">
            <span>Total Folio Charges:</span>
            <b>${peso(total)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--ok);">
            <span>Payments Settled:</span>
            <b>&minus; ${peso(paid)}</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; border-top: 1px solid var(--line); padding-top: 6px; margin-top: 6px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
            <span>Outstanding Balance:</span>
            <span>${peso(bal)}</span>
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary btn-sm" id="btnDetailFolio">
            <span class="ic" data-icon="wallet">[ICON: wallet]</span> Folio &amp; Payments
          </button>
          <button class="btn-secondary btn-sm" id="btnDetailInvoice">
            <span class="ic" data-icon="print">[ICON: print]</span> Tax Invoice
          </button>
        </div>
        <div style="display: flex; gap: 6px;">
          ${r.st === 'Pending' ? `
            <button class="btn btn-sm" id="btnDetailConfirm">Confirm Booking</button>
          ` : ''}
          ${r.st === 'Confirmed' ? `
            <button class="btn btn-sm" id="btnDetailCheckIn" ${!canCheckIn ? 'title="Requires deposit payment and clean room"' : ''}>Check In</button>
          ` : ''}
          ${canCheckOut ? `
            <button class="btn btn-sm" id="btnDetailCheckOut">Check Out</button>
          ` : ''}
          ${r.st === 'Confirmed' || r.st === 'Pending' ? `
            <button class="btn-danger btn-sm" id="btnDetailCancel">Cancel</button>
          ` : ''}
          <button class="btn-secondary btn-sm" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    showModal(`Reservation &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '580px' });

    // Actions
    $('btnDetailFolio').onclick = () => {
      openFolioModal(r.c, () => renderApp());
    };

    $('btnDetailInvoice').onclick = () => {
      printTaxInvoice(r.c);
    };

    const btnConfirm = $('btnDetailConfirm');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        Data.updateReservation(r.c, { st: 'Confirmed' });
        Data.audit('Confirm Reservation', 'res', r.c, `Confirmed by staff for ${r.g}`);
        toast(`Reservation ${r.c} confirmed`, 'ok');
        closeModal();
        renderApp();
      };
    }

    const btnIn = $('btnDetailCheckIn');
    if (btnIn) {
      btnIn.onclick = () => {
        const resCheckIn = Data.checkIn(r.c);
        if (resCheckIn.success) {
          toast(`Guest ${r.g} checked into Room ${r.n}`, 'ok');
          closeModal();
          renderApp();
        } else {
          toast(resCheckIn.error, 'warn');
          if (resCheckIn.error && resCheckIn.error.includes('deposit')) {
            openFolioModal(r.c, () => renderApp());
          }
        }
      };
    }

    const btnOut = $('btnDetailCheckOut');
    if (btnOut) {
      btnOut.onclick = async () => {
        if (bal > 0) {
          const ok = await confirmDialog(`Guest has an outstanding balance of ${peso(bal)}. Proceed with check-out settlement?`, 'Outstanding Balance', { confirmText: 'Settle Balance' });
          if (!ok) {
            openFolioModal(r.c, () => renderApp());
            return;
          }
        }
        const resOut = Data.checkOut(r.c);
        if (resOut.success) {
          toast(`Guest ${r.g} checked out. Room ${r.n} marked Dirty for housekeeping.`, 'ok');
          closeModal();
          renderApp();
        } else {
          toast(resOut.error || 'Failed to check out.', 'bad');
        }
      };
    }

    const btnCancel = $('btnDetailCancel');
    if (btnCancel) {
      btnCancel.onclick = async () => {
        const ok = await confirmDialog(`Cancel reservation ${r.c} for ${r.g}?`, 'Cancel Reservation', { danger: true });
        if (ok) {
          const resCancel = Data.cancelReservation(r.c, 'Staff');
          if (resCancel.success) {
            toast(`Reservation ${r.c} cancelled. ${(resCancel.retainedFee || resCancel.fee || 0) > 0 ? 'Cancellation fee retained: ' + peso(resCancel.retainedFee || resCancel.fee) : 'Deposit refunded.'}`, 'ok');
            closeModal();
            renderApp();
          } else {
            toast(resCancel.error || 'Cancellation failed', 'bad');
          }
        }
      };
    }
  };

  /* Staff New Reservation Modal */
  function openNewStaffReservation(prefills = {}) {
    const types = Data.getTypes();
    let initialType = types[0];
    let ci = today();
    let co = addDays(ci, 2);

    const formHtml = `
      <form id="staffNewResForm" style="font-size: 13px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label>Booking Source *</label>
            <select id="newResSource">
              <option value="Staff-assisted">Staff-assisted (Advance)</option>
              <option value="Walk-in">Walk-in (Front Desk)</option>
            </select>
          </div>
          <div class="field">
            <label>Guest Full Name *</label>
            <input type="text" id="newResGuest" value="${esc(prefills.guest || '')}" required placeholder="e.g. Maria Santos">
          </div>
          <div class="field">
            <label>Contact Phone *</label>
            <input type="tel" id="newResPhone" value="${esc(prefills.phone || '')}" placeholder="0917-000-0000">
          </div>
          <div class="field">
            <label>Gov ID Type (Required for Walk-in)</label>
            <select id="newResIdType">
              <option value="Driver's License">Driver's License</option>
              <option value="Passport">Passport</option>
              <option value="UMID">UMID</option>
              <option value="National ID">National ID</option>
              <option value="Company ID">Company ID</option>
            </select>
          </div>
          <div class="field">
            <label>Gov ID Number</label>
            <input type="text" id="newResIdNumber" placeholder="e.g. N01-12-345678">
          </div>
            <input type="tel" id="newResPhone" value="${esc(prefills.phone || '')}" placeholder="0917-000-0000">
          </div>
          <div class="field">
            <label>Room Type *</label>
            <select id="newResType">
              ${types.map(t => `<option value="${esc(t.n)}">${esc(t.n)} &mdash; ${peso(t.r)}/night</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Room Assignment</label>
            <select id="newResRoom">
              <!-- Dynamically populated based on dates -->
            </select>
          </div>
          <div class="field">
            <label>Check-In Date *</label>
            <input type="date" id="newResCi" value="${ci}" required>
          </div>
          <div class="field">
            <label>Check-Out Date *</label>
            <input type="date" id="newResCo" value="${co}" required>
          </div>
          <div class="field">
            <label>Guests Count</label>
            <input type="number" id="newResGuests" min="1" max="6" value="2">
          </div>
          <div class="field">
            <label>Promo Code (Optional)</label>
            <div style="display: flex; gap: 4px;">
              <input type="text" id="newResPromo" placeholder="e.g. WELCOME10" style="text-transform: uppercase;">
              <button type="button" class="btn-secondary btn-sm" id="btnNewResApplyPromo">Apply</button>
            </div>
            <div id="newResPromoMsg" class="text-xs" style="margin-top: 2px;"></div>
          </div>
        </div>

        <div class="field">
          <label>Special Requests / Notes</label>
          <textarea id="newResNotes" rows="2" placeholder="Late arrival, high floor, quiet room…"></textarea>
        </div>

        <!-- Financial Breakdown -->
        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Rate per night:</span>
            <span id="newResRateDisplay">₱0</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Duration:</span>
            <span id="newResNightsDisplay">0 nights</span>
          </div>
          <div style="display: flex; justify-content: space-between;" id="newResDiscountRow">
            <span>Promo Discount:</span>
            <span id="newResDiscountDisplay" style="color: var(--ok);">&minus; ₱0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 4px;">
            <span>Net Total (inc. VAT):</span>
            <span id="newResTotalDisplay">₱0</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Initial Payment Collected</label>
            <select id="newResPaymentOption">
              <option value="none">No payment yet (Hold as Pending)</option>
              <option value="dep" selected>50% Deposit (Hold as Confirmed)</option>
              <option value="full">Full Payment (Hold as Confirmed)</option>
            </select>
          </div>
          <div class="field">
            <label>Payment Method</label>
            <select id="newResPaymentMethod">
              <option value="Cash">Cash at Front Desk</option>
              <option value="Credit Card">Credit Card</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
        <div class="text-xs text-muted">Simulated payment (no real charges). Generates official receipt.</div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnSubmitNewRes">Create Reservation</button>
      </div>
    `;

    showModal('New Front Desk Reservation', formHtml, footerHtml, { maxWidth: '620px' });

    let appliedPromo = null;

    const updateCalc = () => {
      const typeName = $('newResType').value;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      const dIn = $('newResCi').value;
      const dOut = $('newResCo').value;
      const nights = Math.max(1, dateDiff(dIn, dOut));

      // Free rooms
      const free = Data.freeRooms(typeName, dIn, dOut);
      const roomSelect = $('newResRoom');
      roomSelect.innerHTML = free.map(rm => `<option value="${rm}">${rm}</option>`).join('');
      if (free.length === 0) {
        roomSelect.innerHTML = `<option value="">No clean rooms available</option>`;
      }

      const baseTotal = nights * typeObj.r;
      let discount = 0;
      if (appliedPromo) {
        if (appliedPromo.type === 'percent') {
          discount = Math.round(baseTotal * (appliedPromo.value / 100));
        } else if (appliedPromo.type === 'fixed') {
          discount = Math.min(baseTotal, appliedPromo.value);
        }
      }
      const netTotal = Math.max(0, baseTotal - discount);

      $('newResRateDisplay').textContent = peso(typeObj.r);
      $('newResNightsDisplay').textContent = `${nights} night(s)`;
      $('newResDiscountDisplay').innerHTML = `&minus; ${peso(discount)}`;
      $('newResTotalDisplay').textContent = peso(netTotal);
    };

    $('newResType').onchange = updateCalc;
    $('newResCi').onchange = updateCalc;
    $('newResCo').onchange = updateCalc;

    $('btnNewResApplyPromo').onclick = () => {
      const code = ($('newResPromo').value || '').trim().toUpperCase();
      const typeName = $('newResType').value;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      const nights = Math.max(1, dateDiff($('newResCi').value, $('newResCo').value));
      const resVal = Data.validatePromo(code, { type: 'rooms', spend: nights * typeObj.r, nights, roomType: typeName });

      if (resVal.valid) {
        appliedPromo = resVal.promo;
        $('newResPromoMsg').textContent = `Valid promo: ${appliedPromo.title}`;
        $('newResPromoMsg').style.color = 'var(--ok)';
      } else {
        appliedPromo = null;
        $('newResPromoMsg').textContent = resVal.error || resVal.reason || 'Invalid promo';
        $('newResPromoMsg').style.color = 'var(--bad)';
      }
      updateCalc();
    };

    updateCalc();

    $('btnSubmitNewRes').onclick = () => {
      const g = ($('newResGuest').value || '').trim();
      if (!g) {
        toast('Please enter guest full name', 'warn');
        return;
      }
      const typeName = $('newResType').value;
      const roomNumVal = $('newResRoom').value;
      if (!roomNumVal) {
        toast('No available rooms for the selected dates', 'bad');
        return;
      }
      const roomNum = parseInt(roomNumVal, 10);
      const ciVal = $('newResCi').value;
      const coVal = $('newResCo').value;
      if (coVal <= ciVal) {
        toast('Check-out must be after check-in', 'warn');
        return;
      }

      const phone = ($('newResPhone').value || '').trim();
      const guests = parseInt($('newResGuests').value, 10) || 2;
      const notes = ($('newResNotes').value || '').trim();
      const payOption = $('newResPaymentOption').value;
      const payMethod = $('newResPaymentMethod').value;

      const typeObj = types.find(t => t.n === typeName) || types[0];
      const nights = dateDiff(ciVal, coVal);
      const baseTotal = nights * typeObj.r;
      let discount = 0;
      if (appliedPromo) {
        if (appliedPromo.type === 'percent') discount = Math.round(baseTotal * (appliedPromo.value / 100));
        else if (appliedPromo.type === 'fixed') discount = Math.min(baseTotal, appliedPromo.value);
        Data.incrementPromo(appliedPromo.code);
      }
      const netTotal = Math.max(0, baseTotal - discount);

      let initialPayAmt = 0;
      let initialStatus = 'Pending';
      if (payOption === 'dep') {
        initialPayAmt = Math.ceil(netTotal * (CONFIG.depositPct / 100));
        initialStatus = 'Confirmed';
      } else if (payOption === 'full') {
        initialPayAmt = netTotal;
        initialStatus = 'Confirmed';
      }

      const newRes = Data.createReservation({
        g,
        ph: phone,
        email: '',
        t: typeName,
        n: roomNum,
        rt: typeObj.r,
        i: ciVal,
        o: coVal,
        gu: guests,
        m: payMethod,
        st: initialStatus,
        note: notes,
        promo: appliedPromo ? appliedPromo.code : null
      });

      if (discount > 0) {
        Data.addCharge(newRes, `Promo discount: ${appliedPromo.code}`, -discount, 'Promotion');
      }

      if (initialPayAmt > 0) {
        Data.addPayment(newRes, initialPayAmt, payMethod, payOption === 'dep' ? 'Deposit' : 'Payment', 'Initial Front Desk Booking');
      }

      toast(`Reservation ${newRes.c} created successfully`, 'ok');
      closeModal();
      renderApp();
    };
  }

  // Auto-refresh when Data dispatches change
  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  // Single initialization on load
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