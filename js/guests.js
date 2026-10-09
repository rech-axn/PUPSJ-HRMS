/* ==========================================================================
   PUPSJ Hotel & Restaurant — Guests Management & CRM (guests.js)
   Profiles, Cards, and Table views. Guest lifecycle, full administrative CRUD
   (Register Guest, Edit Profile, Adjust Loyalty Points, Delete Profile),
   Stay History, Dining Orders cross-reference, Walk-in check-in, and CSV export.
   ========================================================================== */
'use strict';

(function () {
  let viewMode = 'profiles'; // 'profiles' | 'cards' | 'table'
  let detailTab = 'stays'; // 'stays' | 'dining' | 'notes'
  let selectedGuestName = null;
  let page = 1;
  const pageSize = 12;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('guestsApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getCombinedGuests() {
    const reservations = Data.getReservations();
    const guestAccounts = Data.getGuestAccounts();
    const rawProfiles = Data.getGuestProfiles ? Data.getGuestProfiles() : {};
    const guestProfiles = Array.isArray(rawProfiles) ? rawProfiles : Object.values(rawProfiles || {});
    const feedbackList = Data.getFeedback ? Data.getFeedback() : [];
    const ordersList = Data.getOrders ? Data.getOrders() : [];

    const guestMap = {};

    // 1. Incorporate registered accounts
    guestAccounts.forEach(acc => {
      const name = acc.name || 'Registered Guest';
      guestMap[name] = {
        name,
        email: acc.email || '',
        phone: acc.phone || '',
        notes: acc.notes || '',
        preferences: acc.preferences || '',
        stays: [],
        orders: [],
        feedback: []
      };
    });

    // 2. Incorporate explicit guest profiles
    guestProfiles.forEach(p => {
      if (!p) return;
      const name = p.name || p.n;
      if (!name) return;
      if (!guestMap[name]) {
        guestMap[name] = {
          name,
          email: p.email || '',
          phone: p.phone || p.ph || '',
          notes: p.notes || '',
          preferences: p.preferences || '',
          stays: [],
          orders: [],
          feedback: []
        };
      } else {
        if ((p.phone || p.ph) && !guestMap[name].phone) guestMap[name].phone = p.phone || p.ph;
        if (p.email && !guestMap[name].email) guestMap[name].email = p.email;
        if (p.notes && !guestMap[name].notes) guestMap[name].notes = p.notes;
      }
    });

    // 3. Incorporate reservations
    reservations.forEach(r => {
      if (!r || !r.g) return;
      if (!guestMap[r.g]) {
        guestMap[r.g] = {
          name: r.g,
          email: r.email || '',
          phone: r.ph || '',
          notes: r.note || '',
          preferences: '',
          stays: [],
          orders: [],
          feedback: []
        };
      } else {
        if (r.ph && !guestMap[r.g].phone) guestMap[r.g].phone = r.ph;
        if (r.email && !guestMap[r.g].email) guestMap[r.g].email = r.email;
      }
      guestMap[r.g].stays.push(r);
    });

    // 4. Incorporate dining orders linked to guest stays or rooms
    ordersList.forEach(ord => {
      let matchedGuest = null;
      if (ord.resCode) {
        const res = reservations.find(r => r.c === ord.resCode);
        if (res && res.g && guestMap[res.g]) matchedGuest = guestMap[res.g];
      }
      if (!matchedGuest && ord.room) {
        const res = reservations.find(r => r.n === ord.room && r.st === 'Checked-in');
        if (res && res.g && guestMap[res.g]) matchedGuest = guestMap[res.g];
      }
      if (matchedGuest) {
        matchedGuest.orders.push(ord);
      }
    });

    // 5. Incorporate feedback
    feedbackList.forEach(fb => {
      const gName = fb.guestName || fb.guest;
      if (gName && guestMap[gName]) {
        guestMap[gName].feedback.push(fb);
      }
    });

    // Calculate aggregated metrics for each guest
    return Object.values(guestMap).map(g => {
      const validStays = g.stays.filter(r => r.st !== 'Cancelled');
      const checkedOutStays = g.stays.filter(r => r.st === 'Checked-out');
      const inHouseStay = g.stays.find(r => r.st === 'Checked-in');
      const upcomingStay = g.stays.filter(r => r.st === 'Confirmed' && r.i >= today())
        .sort((a, b) => a.i.localeCompare(b.i))[0];

      const nights = validStays.reduce((sum, r) => sum + Data.nts(r), 0);
      const paid = g.stays.reduce((sum, r) => sum + Data.paidAmt(r), 0);
      const balance = g.stays.reduce((sum, r) => sum + Data.balOf(r), 0);

      let status = 'Registered';
      if (inHouseStay) status = 'In-house';
      else if (upcomingStay) status = 'Upcoming';
      else if (checkedOutStays.length > 0) status = 'Past';

      // Tier calculation using canonical Data.getGuestTier
      const tierObj = Data.getGuestTier ? Data.getGuestTier(nights) : null;
      const tier = (tierObj && tierObj.name) ? tierObj.name : (typeof tierObj === 'string' ? tierObj : (
        nights >= (CONFIG.loyalty?.platinumNights || 20) ? 'Platinum' :
        nights >= (CONFIG.loyalty?.goldNights || 10) ? 'Gold' :
        nights >= (CONFIG.loyalty?.silverNights || 5) ? 'Silver' : 'Member'
      ));

      const loyaltyPoints = Data.getLoyaltyPoints ? Data.getLoyaltyPoints(g.name) : 0;

      return {
        name: g.name,
        email: g.email,
        phone: g.phone,
        notes: g.notes || '',
        preferences: g.preferences || '',
        staysCount: validStays.length,
        nights,
        totalPaid: paid,
        totalBalance: balance,
        status,
        tier,
        loyaltyPoints,
        stays: g.stays.sort((a, b) => (b.i || '').localeCompare(a.i || '')),
        orders: g.orders.sort((a, b) => (b.created || '').localeCompare(a.created || '')),
        feedbackCount: g.feedback.length,
        avgRating: g.feedback.length > 0 ? (g.feedback.reduce((acc, f) => acc + (f.ratingOverall || f.rating || 5), 0) / g.feedback.length).toFixed(1) : null
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderApp() {
    const app = $('guestsApp');
    if (!app) return;

    const allGuests = getCombinedGuests();
    const inHouseCount = allGuests.filter(g => g.status === 'In-house').length;
    const upcomingCount = allGuests.filter(g => g.status === 'Upcoming').length;
    const repeatCount = allGuests.filter(g => g.staysCount > 1).length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">OPERATIONS</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Guest Directory &amp; CRM</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn" id="btnRegisterNewGuest">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Register New Guest
          </button>
          <button type="button" class="btn-secondary" id="btnWalkInCheckIn">
            <span class="ic" data-icon="key">[ICON: key]</span> Walk-in Check-in
          </button>
          <button type="button" class="btn-secondary" id="btnExportGuestsCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
        </div>
      </div>

      <!-- Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Guest Profiles</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${allGuests.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Currently In-House</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${inHouseCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Upcoming Arrivals</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${upcomingCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Repeat Visitors</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${repeatCount}</div>
        </div>
      </div>

      <!-- Controls & Views Bar -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; flex: 1;">
            <input type="text" id="guestSearchInput" placeholder="Search by guest name or phone…" style="max-width: 260px;">
            <select id="guestStatusFilter" style="max-width: 180px;">
              <option value="">All Statuses</option>
              <option value="In-house">In-house</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Past">Past</option>
              <option value="Registered">Registered (No stays)</option>
            </select>
            <select id="guestTierFilter" style="max-width: 160px;">
              <option value="">All Tiers</option>
              <option value="Member">Member</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>
          <div class="tabs" style="margin: 0;">
            <button type="button" class="tab-btn ${viewMode === 'profiles' ? 'active' : ''}" data-view="profiles">Profiles</button>
            <button type="button" class="tab-btn ${viewMode === 'cards' ? 'active' : ''}" data-view="cards">Cards</button>
            <button type="button" class="tab-btn ${viewMode === 'table' ? 'active' : ''}" data-view="table">Table</button>
          </div>
        </div>
      </div>

      <!-- Content Container -->
      <div id="guestsContentArea">
        <!-- Rendered based on viewMode -->
      </div>
    `;

    bindAppEvents();
    renderView();
  }

  function bindAppEvents() {
    $('guestSearchInput').oninput = () => { page = 1; renderView(); };
    $('guestStatusFilter').onchange = () => { page = 1; renderView(); };
    $('guestTierFilter').onchange = () => { page = 1; renderView(); };

    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => {
        viewMode = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === btn));
        renderView();
      };
    });

    $('btnExportGuestsCSV').onclick = () => {
      const guests = getFilteredGuests();
      const cols = [
        { header: 'Guest Name', key: 'name' },
        { header: 'Phone', key: 'phone' },
        { header: 'Email', key: 'email' },
        { header: 'Status', key: 'status' },
        { header: 'Loyalty Tier', key: 'tier' },
        { header: 'Loyalty Points', key: 'loyaltyPoints' },
        { header: 'Stays Count', key: 'staysCount' },
        { header: 'Total Nights', key: 'nights' },
        { header: 'Total Paid (PHP)', key: 'totalPaid' },
        { header: 'Current Balance (PHP)', key: 'totalBalance' },
        { header: 'Internal Notes', key: 'notes' }
      ];
      exportCSV(`PUPSJ_Guests_${today()}.csv`, cols, guests);
    };

    $('btnRegisterNewGuest').onclick = () => openNewGuestModal();
    $('btnWalkInCheckIn').onclick = () => openWalkInModal();
  }

  function getFilteredGuests() {
    const list = getCombinedGuests();
    const q = ($('guestSearchInput')?.value || '').toLowerCase().trim();
    const st = $('guestStatusFilter')?.value || '';
    const tier = $('guestTierFilter')?.value || '';

    return list.filter(g => {
      if (st && g.status !== st) return false;
      if (tier && g.tier !== tier) return false;
      if (q) {
        const text = `${g.name} ${g.phone} ${g.email} ${g.notes} ${g.preferences}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }

  function renderView() {
    const container = $('guestsContentArea');
    if (!container) return;

    const guests = getFilteredGuests();

    if (viewMode === 'profiles') {
      renderProfilesView(container, guests);
    } else if (viewMode === 'cards') {
      renderCardsView(container, guests);
    } else {
      renderTableView(container, guests);
    }

    // Attach event delegation for safe guest name handling
    container.onclick = (e) => {
      const target = e.target.closest('[data-guest-action]');
      if (!target) return;
      const action = target.dataset.guestAction;
      const guestName = target.dataset.guest;
      if (action === 'select' || action === 'profile' || action === 'history') {
        selectedGuestName = guestName;
        viewMode = 'profiles';
        document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === 'profiles'));
        renderView();
      }
    };
  }

  /* 1. Split Profiles View */
  function renderProfilesView(container, guests) {
    if (guests.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 32px; text-align: center; color: var(--ink-3);">No guest profiles found matching your search.</div>`;
      return;
    }

    if (!selectedGuestName || !guests.some(g => g.name === selectedGuestName)) {
      selectedGuestName = guests[0].name;
    }
    const currentGuest = guests.find(g => g.name === selectedGuestName) || guests[0];

    container.innerHTML = `
      <div class="grid-split-340" style="align-items: start;">
        <!-- Left: Guest List -->
        <div class="card" style="padding: 0; max-height: 640px; overflow-y: auto;">
          <div style="padding: 12px 16px; border-bottom: 1px solid var(--line); font-weight: 600; font-size: 13px; color: var(--ink-2); background: var(--surface-2); display: flex; justify-content: space-between; align-items: center;">
            <span>Guest Directory (${guests.length})</span>
            <button type="button" class="btn-ghost btn-sm" onclick="openNewGuestModal()" style="padding: 2px 6px;">+ New</button>
          </div>
          <div style="display: flex; flex-direction: column;">
            ${guests.map(g => {
              const isSel = g.name === selectedGuestName;
              return `
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--line); cursor: pointer; background: ${isSel ? 'var(--gold-tint)' : 'var(--surface)'}; display: flex; justify-content: space-between; align-items: center;"
                     data-guest-action="select" data-guest="${esc(g.name)}">
                  <div>
                    <div style="font-weight: 600; font-size: 14px;">${esc(g.name)}</div>
                    <div class="text-xs text-muted">${esc(g.phone) || 'No phone'} &middot; ${g.staysCount} stay(s)</div>
                  </div>
                  <span class="pill ${g.status === 'In-house' ? 'pill--ok' : g.status === 'Upcoming' ? 'pill--info' : 'pill--muted'}" style="font-size: 11px;">
                    ${esc(g.status)}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Selected Profile Details -->
        <div class="card" style="padding: 24px;" id="guestDetailPane">
          ${renderGuestDetailHtml(currentGuest)}
        </div>
      </div>
    `;

    bindDetailPaneEvents(currentGuest);
  }

  function renderGuestDetailHtml(g) {
    return `
      <div>
        <!-- Profile Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid var(--line); margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 26px; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink);">${esc(g.name)}</h2>
            <div class="text-sm text-secondary" style="margin-top: 4px;">
              Phone: <b>${esc(g.phone) || 'Not provided'}</b> &middot; Email: <b>${esc(g.email) || 'Not provided'}</b>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="pill ${g.status === 'In-house' ? 'pill--ok' : g.status === 'Upcoming' ? 'pill--info' : 'pill--muted'}">${esc(g.status)}</span>
            <div style="margin-top: 6px;">
              <span class="pill pill--ok" style="font-size: 11px;">Tier: ${esc(g.tier)} (${g.loyaltyPoints} pts)</span>
            </div>
          </div>
        </div>

        <!-- Administrative Action Buttons -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line);">
          <button type="button" class="btn-secondary btn-sm" onclick="openEditGuestModal('${esc(g.name)}')">
            <span class="ic" data-icon="edit">[ICON: edit]</span> Edit Profile
          </button>
          <button type="button" class="btn-secondary btn-sm" onclick="openAdjustLoyaltyModal('${esc(g.name)}')">
            <span class="ic" data-icon="gift">[ICON: gift]</span> Adjust Points
          </button>
          <a class="btn btn-sm" href="../management/reservations.html?new=1&guest=${encodeURIComponent(g.name)}&phone=${encodeURIComponent(g.phone)}">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Book Stay
          </a>
          <a class="btn-secondary btn-sm" href="../management/orders.html">
            <span class="ic" data-icon="tray">[ICON: tray]</span> In-Room POS
          </a>
          <a class="btn-secondary btn-sm" href="../management/messages.html?new=1&guest=${encodeURIComponent(g.name)}">
            <span class="ic" data-icon="message">[ICON: message]</span> Message
          </a>
          <button type="button" class="btn-ghost btn-sm" style="color:var(--bad);" onclick="confirmDeleteGuest('${esc(g.name)}')">
            Archive Profile
          </button>
        </div>

        <!-- Metric Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: var(--surface-2); padding: 14px; border-radius: var(--r); margin-bottom: 20px; border: 1px solid var(--line); text-align: center;">
          <div>
            <div class="text-xs text-secondary">Total Stays</div>
            <div style="font-size: 18px; font-weight: 600;">${g.staysCount}</div>
          </div>
          <div>
            <div class="text-xs text-secondary">Nights Stayed</div>
            <div style="font-size: 18px; font-weight: 600;">${g.nights}</div>
          </div>
          <div>
            <div class="text-xs text-secondary">Total Spend</div>
            <div style="font-size: 18px; font-weight: 600; color: var(--gold-ink);">${peso(g.totalPaid)}</div>
          </div>
          <div>
            <div class="text-xs text-secondary">Balance Due</div>
            <div style="font-size: 18px; font-weight: 600; color: ${g.totalBalance > 0 ? 'var(--bad)' : 'var(--ok)'};">
              ${peso(g.totalBalance)}
            </div>
          </div>
        </div>

        <!-- Detail Sub-tabs -->
        <div class="tabs" style="margin-bottom: 12px;">
          <button type="button" class="tab-btn ${detailTab === 'stays' ? 'active' : ''}" data-detail-tab="stays">
            Stay History (${g.stays.length})
          </button>
          <button type="button" class="tab-btn ${detailTab === 'dining' ? 'active' : ''}" data-detail-tab="dining">
            Dining Orders (${g.orders.length})
          </button>
          <button type="button" class="tab-btn ${detailTab === 'notes' ? 'active' : ''}" data-detail-tab="notes">
            VIP Notes &amp; Dossier
          </button>
        </div>

        <!-- Sub-tab 1: Stays History -->
        <div id="paneStays" style="${detailTab === 'stays' ? '' : 'display:none;'}">
          <div class="table-wrap" style="max-height: 260px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Room Type &amp; No.</th>
                  <th>Stay Dates</th>
                  <th style="text-align: right;">Total</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${g.stays.map(s => `
                  <tr>
                    <td><b>${esc(s.c)}</b></td>
                    <td>${esc(s.t)} (Room ${s.n})</td>
                    <td>${fmtDate(s.i)} &rarr; ${fmtDate(s.o)}</td>
                    <td style="text-align: right;">${peso(Data.tot(s))}</td>
                    <td>
                      <span class="pill ${s.st === 'Checked-in' ? 'pill--ok' : s.st === 'Confirmed' ? 'pill--info' : 'pill--muted'}">
                        ${esc(s.st)}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button type="button" class="btn-secondary btn-sm" onclick="window.openReservationDetail ? window.openReservationDetail('${esc(s.c)}') : toast('Details modal unavailable', 'warn')">Details</button>
                      <button type="button" class="btn-secondary btn-sm" onclick="window.openFolioModal ? window.openFolioModal('${esc(s.c)}') : toast('Folio unavailable', 'warn')">Folio</button>
                    </td>
                  </tr>
                `).join('')}
                ${g.stays.length === 0 ? `
                  <tr><td colspan="6" class="text-center text-muted" style="padding: 16px;">No reservations recorded yet for this profile.</td></tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sub-tab 2: Dining Orders -->
        <div id="paneDining" style="${detailTab === 'dining' ? '' : 'display:none;'}">
          <div class="table-wrap" style="max-height: 260px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type / Destination</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Kitchen Status</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                ${g.orders.map(o => `
                  <tr>
                    <td><b>${esc(o.code)}</b></td>
                    <td>${esc(o.type)} &middot; ${esc(o.target || '')}</td>
                    <td><b>${peso(o.subtotal || 0)}</b></td>
                    <td>${fmtDate((o.created || '').slice(0, 10))}</td>
                    <td><span class="pill pill--info">${esc(o.status)}</span></td>
                    <td><span class="pill ${o.payStatus === 'Paid' || o.payStatus === 'Room folio' ? 'pill--ok' : 'pill--warn'}">${esc(o.payStatus || 'Unpaid')}</span></td>
                  </tr>
                `).join('')}
                ${g.orders.length === 0 ? `
                  <tr><td colspan="6" class="text-center text-muted" style="padding: 16px;">No restaurant orders recorded for this guest yet.</td></tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sub-tab 3: VIP Notes & Dossier -->
        <div id="paneNotes" style="${detailTab === 'notes' ? '' : 'display:none;'}">
          <div style="background: var(--surface-2); padding: 16px; border-radius: var(--r); border: 1px solid var(--line);">
            <div style="margin-bottom: 12px;">
              <b>Internal Staff VIP &amp; Service Notes:</b>
              <p class="text-sm" style="color: var(--ink-2); margin-top: 4px; line-height: 1.5;">
                ${esc(g.notes) || '<i>No specific staff notes on file. Use Edit Profile to record preferences.</i>'}
              </p>
            </div>
            <div>
              <b>Guest Preferences (Room / Dining / Dietary):</b>
              <p class="text-sm" style="color: var(--ink-2); margin-top: 4px; line-height: 1.5;">
                ${esc(g.preferences) || '<i>Standard preferences.</i>'}
              </p>
            </div>
            <div style="margin-top: 14px; text-align: right;">
              <button type="button" class="btn-secondary btn-sm" onclick="openEditGuestModal('${esc(g.name)}')">
                <span class="ic" data-icon="edit">[ICON: edit]</span> Update Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindDetailPaneEvents(g) {
    document.querySelectorAll('[data-detail-tab]').forEach(btn => {
      btn.onclick = () => {
        detailTab = btn.dataset.detailTab;
        document.querySelectorAll('[data-detail-tab]').forEach(b => b.classList.toggle('active', b === btn));
        $('paneStays').style.display = detailTab === 'stays' ? '' : 'none';
        $('paneDining').style.display = detailTab === 'dining' ? '' : 'none';
        $('paneNotes').style.display = detailTab === 'notes' ? '' : 'none';
      };
    });
  }

  /* 2. Cards View */
  function renderCardsView(container, guests) {
    if (guests.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 32px; text-align: center; color: var(--ink-3);">No guest profiles found matching your search.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${guests.map(g => `
          <div class="card" style="padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <h3 style="margin: 0; font-size: 16px;">${esc(g.name)}</h3>
                  <div class="text-xs text-muted">${esc(g.phone) || 'No phone'}</div>
                </div>
                <span class="pill ${g.status === 'In-house' ? 'pill--ok' : g.status === 'Upcoming' ? 'pill--info' : 'pill--muted'}" style="font-size: 10px;">
                  ${esc(g.status)}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: var(--surface-2); padding: 8px 12px; border-radius: var(--r); margin: 12px 0; font-size: 12px;">
                <div>
                  <span class="text-secondary">Stays:</span> <b>${g.staysCount}</b>
                </div>
                <div>
                  <span class="text-secondary">Nights:</span> <b>${g.nights}</b>
                </div>
                <div>
                  <span class="text-secondary">Total Spend:</span> <b>${peso(g.totalPaid)}</b>
                </div>
                <div>
                  <span class="text-secondary">Tier:</span> <b>${esc(g.tier)}</b>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 10px;">
              <button type="button" class="btn-secondary btn-sm" style="flex: 1;" data-guest-action="profile" data-guest="${esc(g.name)}">Profile</button>
              <a class="btn btn-sm" style="flex: 1; text-align: center;" href="../management/reservations.html?new=1&guest=${encodeURIComponent(g.name)}&phone=${encodeURIComponent(g.phone)}">Book</a>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* 3. Table View */
  function renderTableView(container, guests) {
    if (guests.length === 0) {
      container.innerHTML = `<div class="card" style="padding: 32px; text-align: center; color: var(--ink-3);">No guest profiles found matching your search.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Contact Phone</th>
                <th>Status</th>
                <th>Tier</th>
                <th>Stays</th>
                <th>Nights</th>
                <th style="text-align: right;">Total Spend</th>
                <th style="text-align: right;">Balance</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${guests.map(g => `
                <tr>
                  <td><b>${esc(g.name)}</b></td>
                  <td>${esc(g.phone) || '&mdash;'}</td>
                  <td><span class="pill ${g.status === 'In-house' ? 'pill--ok' : g.status === 'Upcoming' ? 'pill--info' : 'pill--muted'}">${esc(g.status)}</span></td>
                  <td>${esc(g.tier)}</td>
                  <td>${g.staysCount}</td>
                  <td>${g.nights}</td>
                  <td style="text-align: right;">${peso(g.totalPaid)}</td>
                  <td style="text-align: right; color: ${g.totalBalance > 0 ? 'var(--bad)' : 'inherit'}; font-weight: ${g.totalBalance > 0 ? '600' : 'normal'};">
                    ${peso(g.totalBalance)}
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="btn-secondary btn-sm" data-guest-action="history" data-guest="${esc(g.name)}">Profile</button>
                    <a class="btn btn-sm" href="../management/reservations.html?new=1&guest=${encodeURIComponent(g.name)}&phone=${encodeURIComponent(g.phone)}">Book</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── Modal 1: Register New Guest Profile ───
  window.openNewGuestModal = function () {
    const bodyHtml = `
      <form id="newGuestForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field-row-2">
          <div class="field">
            <label for="ngName">Full Name *</label>
            <input type="text" id="ngName" placeholder="e.g. Maria Santos" required autocomplete="name">
          </div>
          <div class="field">
            <label for="ngPhone">Phone Number *</label>
            <input type="tel" id="ngPhone" placeholder="+63 917 000 0000" required autocomplete="tel">
          </div>
        </div>

        <div class="field-row-2">
          <div class="field">
            <label for="ngEmail">Email Address</label>
            <input type="email" id="ngEmail" placeholder="maria@example.com" autocomplete="email">
          </div>
          <div class="field">
            <label for="ngTier">Initial Loyalty Tier</label>
            <select id="ngTier">
              <option value="Member">Member (0–4 nights)</option>
              <option value="Silver">Silver (5–9 nights)</option>
              <option value="Gold">Gold (10–19 nights)</option>
              <option value="Platinum">Platinum (20+ nights)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="ngPoints">Welcome Loyalty Points Bonus</label>
          <input type="number" id="ngPoints" value="200" min="0" step="50">
        </div>

        <div class="field">
          <label for="ngNotes">VIP Notes &amp; Service Preferences</label>
          <textarea id="ngNotes" rows="2" placeholder="Corporate VIP, high-floor room preferred, quiet room…"></textarea>
        </div>

        <div class="field">
          <label for="ngPreferences">Dietary &amp; Dining Preferences</label>
          <input type="text" id="ngPreferences" placeholder="e.g. Vegetarian, shellfish allergy, early breakfast">
        </div>
      </form>
    `;

    showModal(
      'Register New Guest Profile',
      bodyHtml,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitNewGuest">Save Guest Profile</button>
      </div>
      `,
      { maxWidth: '520px' }
    );

    $('btnSubmitNewGuest').onclick = () => {
      const name = ($('ngName').value || '').trim();
      const phone = ($('ngPhone').value || '').trim();
      const email = ($('ngEmail').value || '').trim();
      const initialPoints = parseInt($('ngPoints').value, 10) || 0;
      const notes = ($('ngNotes').value || '').trim();
      const preferences = ($('ngPreferences').value || '').trim();

      if (!name) { toast('Please enter the guest full name.', 'warn'); return; }
      if (!phone) { toast('Please enter a contact phone number.', 'warn'); return; }

      const res = Data.createGuestProfile({
        name,
        phone,
        email,
        initialPoints,
        notes,
        preferences
      });

      if (res.success) {
        toast(`Guest profile for ${name} registered successfully!`, 'ok');
        closeModal();
        selectedGuestName = name;
        viewMode = 'profiles';
        window.dispatchEvent(new CustomEvent('pupsj:data-change'));
        renderApp();
      } else {
        toast(res.error || 'Failed to register guest.', 'bad');
      }
    };
  };

  // ─── Modal 2: Edit Guest Profile ───
  window.openEditGuestModal = function (guestName) {
    const guests = getCombinedGuests();
    const guest = guests.find(g => g.name === guestName);
    if (!guest) return;

    const bodyHtml = `
      <form id="editGuestForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field-row-2">
          <div class="field">
            <label for="egName">Full Name *</label>
            <input type="text" id="egName" value="${esc(guest.name)}" required>
          </div>
          <div class="field">
            <label for="egPhone">Phone Number *</label>
            <input type="tel" id="egPhone" value="${esc(guest.phone)}" required>
          </div>
        </div>

        <div class="field">
          <label for="egEmail">Email Address</label>
          <input type="email" id="egEmail" value="${esc(guest.email)}">
        </div>

        <div class="field">
          <label for="egNotes">VIP &amp; Staff Notes</label>
          <textarea id="egNotes" rows="2">${esc(guest.notes || '')}</textarea>
        </div>

        <div class="field">
          <label for="egPreferences">Dietary &amp; Stay Preferences</label>
          <input type="text" id="egPreferences" value="${esc(guest.preferences || '')}">
        </div>
      </form>
    `;

    showModal(
      `Edit Profile &mdash; ${guest.name}`,
      bodyHtml,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitEditGuest">Update Profile</button>
      </div>
      `,
      { maxWidth: '500px' }
    );

    $('btnSubmitEditGuest').onclick = () => {
      const newName = ($('egName').value || '').trim();
      const phone = ($('egPhone').value || '').trim();
      const email = ($('egEmail').value || '').trim();
      const notes = ($('egNotes').value || '').trim();
      const preferences = ($('egPreferences').value || '').trim();

      if (!newName || !phone) {
        toast('Name and phone are required.', 'warn');
        return;
      }

      Data.updateGuestProfile(guest.name, {
        name: newName,
        phone,
        email,
        notes,
        preferences
      });

      toast(`Profile for ${newName} updated successfully.`, 'ok');
      closeModal();
      selectedGuestName = newName;
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  // ─── Modal 3: Adjust Loyalty Points ───
  window.openAdjustLoyaltyModal = function (guestName) {
    const guests = getCombinedGuests();
    const guest = guests.find(g => g.name === guestName);
    if (!guest) return;

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 14px;">
          <div><b>Guest:</b> ${esc(guest.name)}</div>
          <div><b>Current Tier:</b> ${esc(guest.tier)}</div>
          <div><b>Current Points:</b> <b style="color:var(--gold-ink); font-size:16px;">${guest.loyaltyPoints} pts</b></div>
        </div>

        <div class="field">
          <label for="adjPoints">Points to Credit / Debit (+ or -) *</label>
          <input type="number" id="adjPoints" placeholder="e.g. 150 or -50" required step="10">
        </div>

        <div class="field">
          <label for="adjReason">Adjustment Reason *</label>
          <select id="adjReason">
            <option value="Managerial VIP Courtesy">Managerial VIP Courtesy</option>
            <option value="Service Recovery Compensation">Service Recovery Compensation</option>
            <option value="Promotional Loyalty Bonus">Promotional Loyalty Bonus</option>
            <option value="Manual Account Correction">Manual Account Correction</option>
          </select>
        </div>
      </div>
    `;

    showModal(
      `Adjust Loyalty Points &mdash; ${guest.name}`,
      bodyHtml,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAdjustLoyalty">Apply Points Adjustment</button>
      </div>
      `,
      { maxWidth: '440px' }
    );

    $('btnSubmitAdjustLoyalty').onclick = () => {
      const delta = parseInt($('adjPoints').value, 10);
      if (isNaN(delta) || delta === 0) {
        toast('Please specify a non-zero points adjustment value.', 'warn');
        return;
      }
      const reason = $('adjReason').value;

      Data.addLoyaltyPoints(guest.name, delta, reason);
      toast(`Adjusted ${delta > 0 ? '+' : ''}${delta} loyalty points for ${guest.name}`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  // ─── Modal 4: Delete / Archive Guest Profile ───
  window.confirmDeleteGuest = function (guestName) {
    showModal(
      `Archive Profile &mdash; ${guestName}`,
      `
      <div style="font-size: 13px;">
        <p>Are you sure you want to remove <b>${esc(guestName)}</b> from the registered guest directory?</p>
        <p class="text-xs text-muted">Past financial records, receipts, and stay histories will remain safely preserved in the audit archives.</p>
      </div>
      `,
      `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" style="background:var(--bad);" onclick="executeDeleteGuest('${esc(guestName)}')">Archive Profile</button>
      </div>
      `,
      { maxWidth: '420px' }
    );
  };

  window.executeDeleteGuest = function (guestName) {
    Data.deleteGuestProfile(guestName);
    toast(`Guest profile for ${guestName} has been archived.`, 'ok');
    closeModal();
    selectedGuestName = null;
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  /* Walk-in Check-in Modal */
  function openWalkInModal() {
    const types = Data.getTypes();
    const ci = today();
    const co = addDays(ci, 1);

    const bodyHtml = `
      <form id="walkInForm" style="font-size: 13px;" onsubmit="return false;">
        <p class="text-sm text-secondary" style="margin-top: 0;">Record an immediate walk-in arrival with instant room key issuance and check-in.</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="field">
            <label for="walkInName">Guest Full Name *</label>
            <input type="text" id="walkInName" required placeholder="e.g. Juan Dela Cruz">
          </div>
          <div class="field">
            <label for="walkInPhone">Phone Number *</label>
            <input type="tel" id="walkInPhone" required placeholder="0917-000-0000">
          </div>
          <div class="field">
            <label for="walkInType">Room Category *</label>
            <select id="walkInType">
              ${types.map(t => `<option value="${esc(t.n)}">${esc(t.n)} &mdash; ${peso(t.r)}/night</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="walkInRoom">Clean Room Assignment *</label>
            <select id="walkInRoom">
              <!-- Free clean rooms injected -->
            </select>
          </div>
          <div class="field">
            <label for="walkInCi">Check-in Date</label>
            <input type="date" id="walkInCi" value="${ci}" readonly>
          </div>
          <div class="field">
            <label for="walkInCo">Check-out Date *</label>
            <input type="date" id="walkInCo" value="${co}" min="${co}">
          </div>
          <div class="field">
            <label for="walkInGuests">Number of Guests</label>
            <input type="number" id="walkInGuests" min="1" max="6" value="2">
          </div>
          <div class="field">
            <label for="walkInMethod">Payment Method *</label>
            <select id="walkInMethod">
              <option value="Cash">Cash at Front Desk</option>
              <option value="Credit Card">Credit Card</option>
              <option value="GCash">GCash</option>
              <option value="Maya">Maya</option>
            </select>
          </div>
        </div>

        <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Rate per Night:</span>
            <span id="walkInRateDisplay">₱0</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Nights:</span>
            <span id="walkInNightsDisplay">1 night</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 4px;">
            <span>Total Room Charge (inc. VAT):</span>
            <span id="walkInTotalDisplay">₱0</span>
          </div>
        </div>

        <div class="field">
          <label for="walkInPaymentAmt">Immediate Payment Amount (₱) *</label>
          <input type="number" id="walkInPaymentAmt" min="0" required placeholder="Amount paid at desk">
          <div class="text-xs text-muted">Walk-ins require at least 50% deposit before room key issuance.</div>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitWalkIn">Confirm &amp; Check-in</button>
      </div>
    `;

    showModal('Instant Walk-in Guest Check-in', bodyHtml, footerHtml, { maxWidth: '580px' });

    const updateRooms = () => {
      const typeName = $('walkInType').value;
      const typeObj = types.find(t => t.n === typeName) || types[0];
      const dIn = $('walkInCi').value;
      const dOut = $('walkInCo').value;
      const nights = Math.max(1, dateDiff(dIn, dOut));

      const free = Data.freeRooms(typeName, dIn, dOut);
      const roomSelect = $('walkInRoom');
      roomSelect.innerHTML = free.map(rm => `<option value="${rm}">Room ${rm}</option>`).join('');
      if (free.length === 0) {
        roomSelect.innerHTML = `<option value="">No clean rooms available</option>`;
      }

      const total = nights * typeObj.r;
      $('walkInRateDisplay').textContent = peso(typeObj.r);
      $('walkInNightsDisplay').textContent = `${nights} night(s)`;
      $('walkInTotalDisplay').textContent = peso(total);
      $('walkInPaymentAmt').value = total;
    };

    $('walkInType').onchange = updateRooms;
    $('walkInCo').onchange = updateRooms;
    updateRooms();

    $('btnSubmitWalkIn').onclick = () => {
      const name = ($('walkInName').value || '').trim();
      const phone = ($('walkInPhone').value || '').trim();
      const roomNum = parseInt($('walkInRoom').value, 10);
      const typeName = $('walkInType').value;
      const dIn = $('walkInCi').value;
      const dOut = $('walkInCo').value;
      const guests = parseInt($('walkInGuests').value, 10) || 2;
      const method = $('walkInMethod').value;
      const payAmt = parseFloat($('walkInPaymentAmt').value) || 0;

      if (!name) { toast('Enter guest name', 'warn'); return; }
      if (!phone) { toast('Enter contact phone', 'warn'); return; }
      if (!roomNum || isNaN(roomNum)) { toast('No clean room available for immediate check-in', 'bad'); return; }
      if (dOut <= dIn) { toast('Check-out must be after check-in', 'warn'); return; }

      const typeObj = types.find(t => t.n === typeName) || types[0];
      const nights = dateDiff(dIn, dOut);
      const total = nights * typeObj.r;
      const minDep = Math.ceil(total * (CONFIG.depositPct / 100));

      if (payAmt < minDep) {
        toast(`Walk-ins require at least deposit of ${peso(minDep)}`, 'warn');
        return;
      }

      const code = Data.nextId('HTL-');
      const orNo = Data.nextOR();

      const newRes = {
        c: code,
        g: name,
        ph: phone,
        t: typeName,
        n: Number(roomNum),
        rt: typeObj.r,
        i: dIn,
        o: dOut,
        gu: guests,
        m: method,
        p: payAmt >= total ? 'Paid' : 'Partial',
        st: 'Checked-in',
        note: 'Walk-in guest registered at front desk',
        walkIn: true,
        created: today(),
        pay: [{
          id: orNo,
          or: orNo,
          d: `${today()} ${nowTime()}`,
          a: payAmt,
          amt: payAmt,
          m: method,
          k: 'Deposit',
          ref: 'Walk-in Desk Settlement'
        }],
        x: []
      };

      const resList = Data.getReservations();
      resList.unshift(newRes);
      Data.saveReservations(resList);

      Data.audit('Walk-in Check-in', 'res', code, `Walk-in guest ${name} checked into Room ${roomNum}. Paid: ${peso(payAmt)}.`);
      toast(`Walk-in guest ${name} checked into Room ${roomNum}`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  // Safe window exposures for backwards compatibility
  window.viewGuestProfile = function (name) {
    selectedGuestName = name;
    viewMode = 'profiles';
    renderApp();
  };
  window.renderGuestsView = function () {
    renderView();
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