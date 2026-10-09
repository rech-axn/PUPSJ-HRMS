/* ==========================================================================
   PUPSJ Hotel & Restaurant — Menu & Dining Logic (menu.js)
   Category filtering, menu card rendering from Data store, and
   auth-gated table reservation with 90-minute slot assignment, intent resume,
   and staff walk-in seating support.
   ========================================================================== */
'use strict';

(function () {
  const T = today();

  // 1. Populate Operating Hours from CONFIG
  if ($('hoursBreakfast')) $('hoursBreakfast').textContent = CONFIG.hours.breakfast;
  if ($('hoursLunch')) $('hoursLunch').textContent = CONFIG.hours.lunch;
  if ($('hoursDinner')) $('hoursDinner').textContent = CONFIG.hours.dinner;

  // 2. Menu Category Filtering
  let activeCategory = 'All';
  const categoryTabs = $$('#menuCategoryTabs .tab-btn');
  const menuGrid = $('menuItemsGrid');

  categoryTabs.forEach(btn => {
    btn.onclick = () => {
      categoryTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      renderMenu();
    };
  });

  function renderMenu() {
    if (!menuGrid) return;
    const items = Data.getMenu().filter(item => {
      if (!item.available) return false;
      if (activeCategory === 'All') return true;
      return item.category === activeCategory;
    });

    if (!items.length) {
      menuGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p class="empty-state-text">No dishes currently available in this category.</p>
        </div>
      `;
      return;
    }

    menuGrid.innerHTML = items.map(item => `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <b style="font-size: 16px; color: var(--ink);">${esc(item.name)}</b>
            <span style="font-weight: 600; color: var(--gold-ink); font-size: 15px;">${peso(item.price)}</span>
          </div>
          <p class="text-sm" style="color: var(--ink-2); line-height: 1.5; margin: 6px 0 10px;">${esc(item.desc || item.description || '')}</p>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 10px; margin-top: 8px;">
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            ${(item.tags || []).map(t => `<span class="pill pill--muted" style="font-size: 10px;">${esc(t)}</span>`).join('')}
          </div>
          <span class="text-sm" style="color: var(--ink-3); font-size: 11px;">${esc(item.station)}</span>
        </div>
      </div>
    `).join('');
  }

  // 3. Table Reservation Form with Auth Gating & Intent Resume
  const form = $('tableReservationForm');
  const dateInput = $('trDate');
  const promoInput = $('trPromo');
  const guestNameInput = $('trGuestName');
  const phoneInput = $('trPhone');
  const timeInput = $('trTime');
  const partyInput = $('trParty');
  const notesInput = $('trNotes');

  if (dateInput) {
    dateInput.min = T;
    dateInput.value = T;
  }

  // Auto-fill from guest session if signed in
  const staffSession = Data.getStaffSession();
  const guestSession = Data.getGuestSession();

  if (guestSession) {
    if (guestNameInput && !guestNameInput.value) guestNameInput.value = guestSession.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = guestSession.phone || '';
  }

  // Check URL parameter for pre-filled promo code
  const urlParams = new URLSearchParams(window.location.search);
  const paramPromo = urlParams.get('promo');
  if (paramPromo && promoInput) {
    promoInput.value = paramPromo;
  }

  // Restore pending table intent if returning from auth gate
  if (guestSession && typeof getPendingIntent === 'function') {
    const savedIntent = getPendingIntent();
    if (savedIntent && savedIntent.type === 'table') {
      if (dateInput && savedIntent.date) dateInput.value = savedIntent.date;
      if (timeInput && savedIntent.time) timeInput.value = savedIntent.time;
      if (partyInput && savedIntent.partySize) partyInput.value = savedIntent.partySize;
      if (promoInput && savedIntent.promo) promoInput.value = savedIntent.promo;
      if (notesInput && savedIntent.notes) notesInput.value = savedIntent.notes;
      if (typeof clearPendingIntent === 'function') clearPendingIntent();
      toast('Resumed your pending dining table reservation. Click Reserve Table to confirm.', 'ok');
    }
  }

  if (form) {
    form.onsubmit = e => {
      e.preventDefault();

      const curStaff = Data.getStaffSession();
      const curGuest = Data.getGuestSession();

      const name = (guestNameInput ? guestNameInput.value.trim() : '');
      const phone = (phoneInput ? phoneInput.value.trim() : '');
      const date = dateInput ? dateInput.value : T;
      const time = timeInput ? timeInput.value : '18:00';
      const party = partyInput ? (+partyInput.value || 2) : 2;
      const promoRaw = promoInput ? promoInput.value.trim().toUpperCase() : '';
      const notes = notesInput ? notesInput.value.trim() : '';

      // Check Authentication Gate for Public Visitors
      if (!curStaff && !curGuest) {
        if (typeof showAuthGateModal === 'function') {
          showAuthGateModal({
            type: 'table',
            date,
            time,
            partySize: party,
            promo: promoRaw,
            notes
          });
        } else {
          if (typeof savePendingIntent === 'function') {
            savePendingIntent({
              type: 'table',
              date,
              time,
              partySize: party,
              promo: promoRaw,
              notes,
              returnUrl: window.location.pathname + window.location.search
            });
          }
          location.href = '../auth/guest-login.html?tab=register&next=' + encodeURIComponent(window.location.pathname + window.location.search);
        }
        return;
      }

      if (!name || !phone) {
        toast('Please enter your full name and contact mobile number.', 'warn');
        return;
      }

      if (typeof isValidPhMobile === 'function' && !isValidPhMobile(phone)) {
        toast('Please provide a valid Philippine mobile number (e.g. +63 917 123 4567 or 09171234567).', 'warn');
        return;
      }

      // Past date / time validation
      if (date < T) {
        toast('Please select today or a future date for your table reservation.', 'warn');
        return;
      }
      if (date === T) {
        const now = new Date();
        const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (time <= curTime) {
          toast('Please select a future dining time for today.', 'warn');
          return;
        }
      }

      // Validate promo code
      let appliedPromo = null;
      if (promoRaw) {
        const estimatedSpend = Math.max(party * 750, 1200);
        const val = Data.validatePromo(promoRaw, { scope: 'restaurant', spend: estimatedSpend });
        if (!val.valid) {
          toast(`Invalid promo code: ${val.error}`, 'bad');
          return;
        }

        let discountText = '';
        if (val.promo.type === 'percent') {
          discountText = `${val.promo.value}% dining discount`;
        } else if (val.promo.type === 'fixed') {
          discountText = `${peso(val.promo.value)} dining discount`;
        } else {
          discountText = val.promo.title || 'Dining Promo';
        }

        appliedPromo = {
          code: val.promo.code,
          type: val.promo.type,
          value: val.promo.value,
          title: val.promo.title || val.promo.code,
          discountText
        };
      }

      try {
        const res = Data.createTableRes({
          guestName: name,
          phone,
          date,
          time,
          partySize: party,
          notes,
          promo: appliedPromo,
          source: curStaff ? 'Walk-in' : 'Online'
        });

        window.dispatchEvent(new CustomEvent('pupsj:data-change'));

        showModal(
          'Table Reservation Confirmed',
          `
          <div style="text-align: center; padding: 12px 0;">
            <span class="pill pill--ok" style="font-size: 13px; padding: 4px 12px;">Reservation ${res.status}</span>
            <h2 style="margin: 12px 0 4px; font-size: 32px; font-family: 'Cormorant Garamond', serif;">${res.code}</h2>
            <p class="text-sm">Thank you, <b>${esc(name)}</b>. Your table reservation has been secured.</p>

            <div class="card card-sm" style="margin: 16px 0; text-align: left; background-color: var(--surface-2); border: 1px solid var(--line); font-size: 13px;">
              <div><b>Date &amp; Time:</b> ${fmtDate(date)} at ${esc(time)}</div>
              <div><b>Party Size:</b> ${party} guests &middot; <b>Assigned:</b> Table ${res.tableNum || 'TBD'}</div>
              <div><b>Contact:</b> ${esc(phone)}</div>
              ${appliedPromo ? `<div style="margin-top: 6px;"><b>Promo Applied:</b> <span class="pill pill--ok">${esc(appliedPromo.code)}</span> <span class="text-sm text-secondary">(${esc(appliedPromo.discountText)})</span></div>` : ''}
              ${notes ? `<div style="margin-top: 4px;"><b>Special Notes:</b> ${esc(notes)}</div>` : ''}
            </div>

            <p class="text-sm text-muted">A confirmation notice has been registered. Present reference code <b>${res.code}</b> upon arrival at restaurant reception.</p>
          </div>
          `,
          `<button class="btn btn-block" onclick="closeModal()">Done</button>`,
          { maxWidth: '480px' }
        );

        form.reset();
        if (dateInput) dateInput.value = T;
        if (curGuest) {
          if (guestNameInput) guestNameInput.value = curGuest.name || '';
          if (phoneInput) phoneInput.value = curGuest.phone || '';
        }
      } catch (err) {
        toast(err.message || 'Failed to complete table reservation', 'bad');
      }
    };
  }

  window.addEventListener('pupsj:data-change', renderMenu);

  // Initial render
  renderMenu();
})();
