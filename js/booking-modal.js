/* ==========================================================================
   PUPSJ Hotel & Restaurant — Booking Modal & Folio System (booking-modal.js)
   Universal reservation flow, non-destructive form re-calculation, folio
   ledger, BIR tax invoices, and reservation detail modal.
   ========================================================================== */
'use strict';

// ─── 0. Universal Authentication Gate Modal ───
function showAuthGateModal({ type = 'room', roomType = 'Standard', ci = '', co = '', guests = 2, promo = '', notes = '', tableNum = 0, date = '', time = '', partySize = 2 } = {}) {
  const currentPath = window.location.pathname + window.location.search;
  
  if (typeof savePendingIntent === 'function') {
    savePendingIntent({
      type,
      roomType,
      ci: ci || today(),
      co: co || addDays(ci || today(), 1),
      guests,
      promo,
      notes,
      tableNum,
      date: date || today(),
      time: time || '18:00',
      partySize,
      returnUrl: currentPath
    });
  }

  let summaryDetails = '';
  if (type === 'room') {
    const types = typeof Data !== 'undefined' && Data.getTypes ? Data.getTypes() : [];
    const typeObj = types.find(t => t.n === roomType) || { r: 3200, n: roomType };
    const checkIn = ci || today();
    const checkOut = co || addDays(checkIn, 1);
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(checkIn, checkOut) : 1);
    const pricing = typeof calculateStayPricing === 'function'
      ? calculateStayPricing({ baseRate: typeObj.r, nights, promo: (typeof Data !== 'undefined' && Data.findPromo) ? Data.findPromo(promo) : null })
      : { netTotal: typeObj.r * nights, depDue: Math.ceil(typeObj.r * nights * 0.5) };

    summaryDetails = `
      <div class="card card-sm" style="margin: 16px 0; background: var(--surface-2); text-align: left; font-size: 13px; border: 1px solid var(--line);">
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 6px;">Your Selected Accommodation:</div>
        <div><b>Room Category:</b> ${esc(roomType)}</div>
        <div><b>Stay Period:</b> ${typeof fmtDate === 'function' ? fmtDate(checkIn) : checkIn} – ${typeof fmtDate === 'function' ? fmtDate(checkOut) : checkOut} (${nights} night${nights > 1 ? 's' : ''})</div>
        <div><b>Registered Guests:</b> ${guests} guest${guests > 1 ? 's' : ''}</div>
        <div><b>Accommodation Total:</b> ${typeof peso === 'function' ? peso(pricing.netTotal) : '₱' + pricing.netTotal}</div>
        <div style="color: var(--ink-3); font-size: 12px; margin-top: 4px;">50% Guarantee Deposit Due on confirmation: ${typeof peso === 'function' ? peso(pricing.depDue) : '₱' + pricing.depDue}</div>
        ${promo ? `<div style="color: var(--ok); margin-top: 4px;"><b>Promotion Voucher:</b> ${esc(promo)}</div>` : ''}
      </div>
    `;
  } else if (type === 'table') {
    summaryDetails = `
      <div class="card card-sm" style="margin: 16px 0; background: var(--surface-2); text-align: left; font-size: 13px; border: 1px solid var(--line);">
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 6px;">Your Selected Dining Reservation:</div>
        <div><b>Date &amp; Time:</b> ${typeof fmtDate === 'function' ? fmtDate(date || today()) : (date || today())} at ${esc(time || '18:00')}</div>
        <div><b>Party Size:</b> ${partySize} guest${partySize > 1 ? 's' : ''}</div>
        ${promo ? `<div style="color: var(--ok); margin-top: 4px;"><b>Promotion Voucher:</b> ${esc(promo)}</div>` : ''}
      </div>
    `;
  }

  const isManagement = window.location.pathname.includes('/management/');
  const isGuest = window.location.pathname.includes('/guest/');
  const isRooms = window.location.pathname.includes('/rooms/');
  const isMain = window.location.pathname.includes('/main/');
  const isRoot = !isManagement && !isGuest && !isRooms && !isMain;
  
  let loginBase = '../auth/guest-login.html';
  if (isRoot) loginBase = 'pages/auth/guest-login.html';
  else if (isManagement || isGuest || isRooms || isMain) loginBase = '../auth/guest-login.html';

  const returnParam = encodeURIComponent(currentPath);

  const gateHtml = `
    <div style="text-align: center; padding: 6px 0;">
      <div style="font-size: 38px; margin-bottom: 8px;">🔐</div>
      <h3 style="font-size: 22px; margin: 0 0 8px; font-family: 'Cormorant Garamond', serif;">Guest Account Required</h3>
      <p class="text-secondary" style="font-size: 14px; margin: 0 auto; max-width: 440px;">
        Sign in or create a guest account to complete your reservation. Your choices are safely preserved and will automatically resume.
      </p>

      ${summaryDetails}

      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
        <a href="${loginBase}?tab=register&next=${returnParam}" class="btn" style="text-align: center; text-decoration: none;">
          Create Guest Account &amp; Complete Reservation &rarr;
        </a>
        <a href="${loginBase}?tab=signin&next=${returnParam}" class="btn-secondary" style="text-align: center; text-decoration: none;">
          Already have an account? Sign In
        </a>
      </div>
      <div style="margin-top: 14px;">
        <button type="button" class="btn-ghost" style="font-size: 13px;" onclick="closeModal()">Cancel &amp; Continue Browsing</button>
      </div>
    </div>
  `;

  showModal('Sign In or Register', gateHtml, '', { maxWidth: '480px' });
}

// ─── 1. Public / Front Desk Interactive Booking Modal ───
function openBookingModal(initialType, checkInDate, checkOutDate, guestCount = 2, initialPromo = '', onComplete = null) {
  const staffSession = Data.getStaffSession();
  const guestSession = Data.getGuestSession();

  const types = Data.getTypes();
  let selectedType = types.find(t => t.n === (initialType ? initialType.n || initialType : '')) || types[0];

  let ci = checkInDate || today();
  let co = checkOutDate || addDays(ci, 1);
  if (co <= ci) co = addDays(ci, 1);
  let guests = Math.max(1, Number(guestCount || 2));
  let activePromo = null;

  // Unauthenticated visitors hitting commit get the friendly Gate
  if (!staffSession && !guestSession) {
    showAuthGateModal({
      type: 'room',
      roomType: selectedType.n,
      ci,
      co,
      guests,
      promo: initialPromo
    });
    return;
  }

  const isStaffWalkIn = !!staffSession;

  // Calculates financial breakdown and availability without wiping inputs
  const computeState = () => {
    const nights = Math.max(1, dateDiff(ci, co));
    const pricing = calculateStayPricing({
      baseRate: selectedType.r,
      nights,
      promo: activePromo
    });

    const availableRooms = Data.freeRooms(selectedType.n, ci, co);
    const hasCapacity = guests <= selectedType.g;
    const canBook = availableRooms.length > 0 && hasCapacity;

    return {
      nights,
      baseTotal: pricing.baseTotal,
      discount: pricing.discount,
      netTotal: pricing.netTotal,
      depDue: pricing.depDue,
      balDue: pricing.balDue,
      taxes: pricing.taxes,
      availableRooms,
      hasCapacity,
      canBook
    };
  };

  const initial = computeState();

  const bodyHtml = `
    <div style="font-size: 14px;">
      ${isStaffWalkIn ? `
        <div class="banner banner--info" style="margin-bottom: 12px; font-size: 13px; background-color: var(--surface-2); padding: 10px 14px; border-radius: var(--r); border: 1px solid var(--line);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span><b>Staff Desk Mode:</b> Signed in as <b>${esc(staffSession.name)}</b> (${esc(staffSession.role)}). Creating Walk-in / Staff-assisted Booking.</span>
            <a href="../management/reservations.html" class="text-xs" style="color: var(--gold-ink); font-weight: 600; text-decoration: underline;">Open Reservations Module &rarr;</a>
          </div>
        </div>
      ` : ''}

      <!-- Room Summary Card -->
      <div id="bmSummaryBox" style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;">
          <b id="bmTypeNameDisplay" style="font-size: 16px; color: var(--ink);">${esc(selectedType.n)}</b>
          <span id="bmRateDisplay" style="font-size: 15px; font-weight: 600; color: var(--gold-ink);">${peso(selectedType.r)} / night</span>
        </div>
        <div id="bmStayInfo" class="text-sm text-secondary" style="margin-top: 4px;">
          ${fmtDate(ci)} – ${fmtDate(co)} &middot; ${initial.nights} night${initial.nights > 1 ? 's' : ''} &middot; Max ${selectedType.g} guests
        </div>
        <div id="bmAvailabilityBadge" style="margin-top: 6px;">
          ${!initial.hasCapacity
            ? `<span class="pill pill--bad">Exceeds capacity (Max ${selectedType.g} guests)</span>`
            : initial.availableRooms.length
              ? `<span class="pill pill--ok">${initial.availableRooms.length} room${initial.availableRooms.length > 1 ? 's' : ''} available</span>`
              : `<span class="pill pill--bad">Fully booked for selected dates</span>`
          }
        </div>
      </div>

      <form id="bookingModalForm">
        <!-- Room & Stay Settings -->
        <div class="field-row-3">
          <div class="field">
            <label for="bmType">Room Category</label>
            <select id="bmType">
              ${types.map(t => `<option value="${esc(t.n)}" ${t.n === selectedType.n ? 'selected' : ''}>${esc(t.n)} (${peso(t.r)}/nt)</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="bmCi">Check-in Date *</label>
            <input type="date" id="bmCi" value="${ci}" min="${today()}" required>
          </div>
          <div class="field">
            <label for="bmCo">Check-out Date *</label>
            <input type="date" id="bmCo" value="${co}" min="${addDays(ci, 1)}" required>
          </div>
        </div>

        <!-- Guest Details -->
        <div class="field-row-2">
          <div class="field">
            <label for="bmGuestName">Primary Guest Full Name *</label>
            <input type="text" id="bmGuestName" value="${esc(guestSession ? guestSession.name : '')}" placeholder="e.g. Maria Santos" required autocomplete="name">
          </div>
          <div class="field">
            <label for="bmGuests">Party Size (Guests) *</label>
            <input type="number" id="bmGuests" min="1" max="${selectedType.g}" value="${guests}" required>
          </div>
        </div>

        <div class="field-row-2">
          <div class="field">
            <label for="bmPhone">Philippine Mobile Number *</label>
            <input type="tel" id="bmPhone" value="${esc(guestSession ? guestSession.phone : '')}" placeholder="+63 917 000 0000" required autocomplete="tel">
          </div>
          <div class="field">
            <label for="bmEmail">Email Address ${isStaffWalkIn ? '(Optional for Walk-in)' : '*'}</label>
            <input type="email" id="bmEmail" value="${esc(guestSession ? guestSession.email : '')}" placeholder="guest@example.com" ${isStaffWalkIn ? '' : 'required'} autocomplete="email" ${guestSession ? 'readonly style="background: var(--surface-2);"' : ''}>
          </div>
        </div>

        ${isStaffWalkIn ? `
          <!-- Staff Walk-in Verification Details (Required per Terms) -->
          <div class="field-row-2" style="background: var(--surface-2); padding: 10px 12px; border-radius: var(--r); margin-bottom: 12px; border: 1px solid var(--line);">
            <div class="field" style="margin: 0;">
              <label for="bmIdType">Government Photo ID Type *</label>
              <select id="bmIdType" required>
                <option value="Driver's License">Driver's License (LTO)</option>
                <option value="Philippine Passport" selected>Philippine Passport (DFA)</option>
                <option value="PhilID / National ID">PhilID / National ID (PSA)</option>
                <option value="UMID">UMID (SSS / GSIS)</option>
                <option value="PRC ID">Professional ID (PRC)</option>
                <option value="Postal ID">Postal ID</option>
              </select>
            </div>
            <div class="field" style="margin: 0;">
              <label for="bmIdNumber">Government ID Number *</label>
              <input type="text" id="bmIdNumber" placeholder="e.g. P1234567A or N01-12-345678" required>
            </div>
          </div>

          <div class="field-row-2" style="margin-bottom: 12px;">
            <div class="field" style="margin: 0;">
              <label for="bmRoomAssignment">Assign Specific Room Number</label>
              <select id="bmRoomAssignment">
                ${initial.availableRooms.map(rm => `<option value="${rm}">Room ${rm}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="margin: 0; display: flex; align-items: center; padding-top: 22px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;">
                <input type="checkbox" id="bmCheckInNow" ${ci === today() ? 'checked' : ''}>
                <span><b>Check in guest immediately</b> (Arrival Today)</span>
              </label>
            </div>
          </div>
        ` : ''}

        <!-- Promo Code Section -->
        <div class="field">
          <label for="bmPromo">Promotion Voucher Code</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="bmPromo" placeholder="WELCOME10, DINESTAY" style="text-transform: uppercase;" value="${esc(initialPromo)}">
            <button type="button" class="btn-secondary" id="btnApplyPromo" style="white-space: nowrap;">Apply</button>
          </div>
          <div id="bmPromoMsg" class="text-sm" style="margin-top: 4px;"></div>
        </div>

        <!-- Payment Mode -->
        <div class="field">
          <label for="bmPaymentMethod">${isStaffWalkIn ? 'Front Desk Settlement Method' : 'Deposit Settlement Method'}</label>
          <select id="bmPaymentMethod">
            ${isStaffWalkIn ? '<option value="Cash" selected>Cash at Front Desk (Official Receipt OR-#####)</option>' : ''}
            <option value="Credit card">Credit / Debit Card (Visa, MasterCard, JCB)</option>
            <option value="GCash">GCash E-Wallet</option>
            <option value="Maya">Maya Digital Bank</option>
            <option value="Bank Transfer">Bank Wire Transfer (BDO, BPI)</option>
            ${!isStaffWalkIn ? '<option value="Cash">Cash at Front Desk (Deposit Guarantee)</option>' : ''}
          </select>
          <span class="field-hint" style="color: var(--ink-3);">Simulated demo transaction (issues instant BIR-compliant OR-#####)</span>
        </div>

        <div class="field">
          <label for="bmNotes">Special Requests &amp; Room Preferences (Optional)</label>
          <textarea id="bmNotes" rows="2" placeholder="Quiet floor, late check-in, honeymoon setup, airport transfer…"></textarea>
        </div>

        <!-- Dynamic Financial Breakdown Container -->
        <div id="bmFinancialSummary" style="background-color: var(--surface-2); padding: 14px 16px; border-radius: var(--r); margin: 16px 0; border: 1px solid var(--line);">
          <!-- Replaced dynamically without touching inputs -->
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn" id="btnConfirmBooking">
            ${isStaffWalkIn ? 'Confirm Walk-in Booking' : 'Confirm &amp; Pay Deposit'}
          </button>
        </div>
      </form>
    </div>
  `;

  showModal(isStaffWalkIn ? 'Front Desk Walk-In Booking' : 'Reserve Accommodation', bodyHtml, '', {
    maxWidth: '680px',
    onOpen(modal) {
      const typeSelect = modal.querySelector('#bmType');
      const ciInput = modal.querySelector('#bmCi');
      const coInput = modal.querySelector('#bmCo');
      const guestInput = modal.querySelector('#bmGuests');
      const promoBtn = modal.querySelector('#btnApplyPromo');
      const promoInput = modal.querySelector('#bmPromo');
      const promoMsg = modal.querySelector('#bmPromoMsg');
      const finContainer = modal.querySelector('#bmFinancialSummary');
      const submitBtn = modal.querySelector('#btnConfirmBooking');
      const form = modal.querySelector('#bookingModalForm');
      const roomAssignSelect = modal.querySelector('#bmRoomAssignment');

      const updateSummaryAndPrice = () => {
        const state = computeState();

        const typeNameDisplay = modal.querySelector('#bmTypeNameDisplay');
        const rateDisplay = modal.querySelector('#bmRateDisplay');
        const stayInfo = modal.querySelector('#bmStayInfo');
        const availBadge = modal.querySelector('#bmAvailabilityBadge');

        if (typeNameDisplay) typeNameDisplay.textContent = selectedType.n;
        if (rateDisplay) rateDisplay.textContent = `${peso(selectedType.r)} / night`;
        if (stayInfo) {
          stayInfo.innerHTML = `${fmtDate(ci)} – ${fmtDate(co)} &middot; ${state.nights} night${state.nights > 1 ? 's' : ''} &middot; Max ${selectedType.g} guests`;
        }
        if (availBadge) {
          if (!state.hasCapacity) {
            availBadge.innerHTML = `<span class="pill pill--bad">Exceeds capacity (Max ${selectedType.g} guests)</span>`;
          } else if (state.availableRooms.length > 0) {
            availBadge.innerHTML = `<span class="pill pill--ok">${state.availableRooms.length} room${state.availableRooms.length > 1 ? 's' : ''} available</span>`;
          } else {
            availBadge.innerHTML = `<span class="pill pill--bad">Fully booked for selected dates</span>`;
          }
        }

        if (roomAssignSelect) {
          roomAssignSelect.innerHTML = state.availableRooms.length > 0
            ? state.availableRooms.map(rm => `<option value="${rm}">Room ${rm}</option>`).join('')
            : '<option value="0">No rooms available</option>';
        }

        if (finContainer) {
          finContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span class="text-secondary">Room accommodation (${state.nights} nights &times; ${peso(selectedType.r)}):</span>
              <b>${peso(state.baseTotal)}</b>
            </div>
            ${activePromo ? `
              <div style="display: flex; justify-content: space-between; padding: 2px 0; color: var(--ok);">
                <span>Promotion Discount (${activePromo.code}):</span>
                <b>&minus; ${peso(state.discount)}</b>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; color: var(--ink-3);">
              <span>VAT (${CONFIG.tax.vatPct}%) &amp; Service Charge (${CONFIG.tax.svcPct}%):</span>
              <span>${peso(state.taxes.vat + state.taxes.svc)} (included)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); margin-top: 6px; font-size: 15px;">
              <b>Total Accommodation Rate:</b>
              <b style="color: var(--ink); font-size: 16px;">${peso(state.netTotal)}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; color: var(--gold-ink); font-weight: 600;">
              <span>50% Guarantee Deposit Due:</span>
              <span style="font-size: 16px;">${peso(state.depDue)}</span>
            </div>
            <div class="text-sm" style="color: var(--ink-3); margin-top: 4px;">
              Remaining balance of ${peso(state.balDue)} is settled upon check-in or via the Guest Portal.
            </div>
          `;
        }

        if (submitBtn) {
          submitBtn.disabled = !state.canBook;
          submitBtn.innerHTML = state.canBook
            ? (isStaffWalkIn ? `Confirm Walk-in Booking (${peso(state.depDue)})` : `Confirm &amp; Pay Deposit (${peso(state.depDue)})`)
            : (!state.hasCapacity ? 'Exceeds Room Capacity' : 'Unavailable for Dates');
        }
      };

      if (typeSelect) {
        typeSelect.onchange = () => {
          selectedType = types.find(t => t.n === typeSelect.value) || types[0];
          if (guestInput) guestInput.max = selectedType.g;
          updateSummaryAndPrice();
        };
      }

      if (ciInput) {
        ciInput.onchange = () => {
          ci = ciInput.value;
          const minCo = addDays(ci, 1);
          if (co <= ci) {
            co = minCo;
            if (coInput) coInput.value = co;
          }
          if (coInput) coInput.min = minCo;
          updateSummaryAndPrice();
        };
      }

      if (coInput) {
        coInput.onchange = () => {
          co = coInput.value;
          updateSummaryAndPrice();
        };
      }

      if (guestInput) {
        guestInput.oninput = () => {
          guests = Number(guestInput.value || 1);
          updateSummaryAndPrice();
        };
      }

      if (promoBtn && promoInput) {
        const applyPromoCode = (code) => {
          if (!code) {
            activePromo = null;
            if (promoMsg) promoMsg.innerHTML = '';
            updateSummaryAndPrice();
            return;
          }
          const validation = Data.validatePromo(code, {
            scope: 'rooms',
            nights: dateDiff(ci, co),
            spend: dateDiff(ci, co) * selectedType.r
          });
          if (validation.valid) {
            activePromo = validation.promo;
            if (promoMsg) {
              promoMsg.innerHTML = `<span style="color: var(--ok); font-weight: 600;">Promo code applied: ${esc(activePromo.title)}</span>`;
            }
            toast(`Promo ${code} applied successfully`, 'ok');
          } else {
            activePromo = null;
            if (promoMsg) {
              promoMsg.innerHTML = `<span style="color: var(--bad);">${esc(validation.error)}</span>`;
            }
            toast(validation.error, 'warn');
          }
          updateSummaryAndPrice();
        };

        promoBtn.onclick = () => applyPromoCode(promoInput.value.trim().toUpperCase());
        promoInput.onkeydown = e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyPromoCode(promoInput.value.trim().toUpperCase());
          }
        };

        if (initialPromo) {
          applyPromoCode(initialPromo.toUpperCase());
        }
      }

      updateSummaryAndPrice();

      if (form) {
        form.onsubmit = e => {
          e.preventDefault();

          const gName = (modal.querySelector('#bmGuestName')?.value || '').trim();
          const phone = (modal.querySelector('#bmPhone')?.value || '').trim();
          const email = (modal.querySelector('#bmEmail')?.value || '').trim();
          const method = modal.querySelector('#bmPaymentMethod')?.value || (isStaffWalkIn ? 'Cash' : 'Credit card');
          const notes = (modal.querySelector('#bmNotes')?.value || '').trim();
          const idType = isStaffWalkIn ? (modal.querySelector('#bmIdType')?.value || '') : '';
          const idNumber = isStaffWalkIn ? (modal.querySelector('#bmIdNumber')?.value || '').trim() : '';
          const checkInNow = isStaffWalkIn ? !!modal.querySelector('#bmCheckInNow')?.checked : false;
          const assignedRoom = isStaffWalkIn
            ? Number(modal.querySelector('#bmRoomAssignment')?.value || computeState().availableRooms[0] || 0)
            : computeState().availableRooms[0];

          if (gName.length < 2) {
            toast('Please enter the primary guest full name', 'warn');
            modal.querySelector('#bmGuestName')?.focus();
            return;
          }
          if (typeof isValidPhMobile === 'function' && !isValidPhMobile(phone)) {
            toast('Please provide a valid Philippine mobile number (e.g. +63 917 123 4567 or 09171234567)', 'warn');
            modal.querySelector('#bmPhone')?.focus();
            return;
          }
          if (!isStaffWalkIn && (!email || (typeof isValidEmail === 'function' && !isValidEmail(email)))) {
            toast('Please enter a valid email address for reservation confirmation and receipt delivery', 'warn');
            modal.querySelector('#bmEmail')?.focus();
            return;
          }
          if (isStaffWalkIn && (!idType || !idNumber)) {
            toast('Valid government-issued photo ID Type and ID Number are required for walk-in desk registration', 'warn');
            modal.querySelector('#bmIdNumber')?.focus();
            return;
          }

          const state = computeState();
          if (!state.canBook) {
            toast('Selected room type is unavailable for your dates or exceeds capacity.', 'bad');
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Securing Reservation…';
          }

          try {
            const newRes = Data.createReservation({
              g: gName,
              t: selectedType.n,
              n: assignedRoom,
              i: ci,
              o: co,
              gu: guests,
              ph: phone,
              email: email,
              m: method,
              note: notes,
              rt: selectedType.r,
              promo: activePromo,
              source: isStaffWalkIn ? 'Walk-in' : 'Online',
              createdBy: isStaffWalkIn ? { id: staffSession.id, name: staffSession.name, role: staffSession.role } : null,
              idType,
              idNumber,
              checkInNow,
              initialPayment: (isStaffWalkIn || (method === 'Credit Card' || method === 'Debit Card' || method === 'GCash' || method === 'Maya')) ? {
                amount: state.depDue,
                method: method,
                kind: 'Deposit',
                note: isStaffWalkIn ? 'Walk-in desk guarantee settlement' : '50% guarantee deposit on booking',
                auth: 'AUTH-' + Math.floor(100000 + Math.random() * 900000),
                ref: 'DEP-' + Date.now().toString().slice(-6)
              } : null
            });

            if (activePromo) {
              Data.incrementPromo(activePromo.code);
            }

            if (!isStaffWalkIn) {
              Data.setGuestSession({
                name: gName,
                email: email,
                phone: phone,
                code: newRes.c
              });
            }

            closeModal();

            // Confirmation Modal (Carries slot line 427!)
            showModal(
              `Booking Confirmed &mdash; ${newRes.c}`,
              `
              <div style="text-align: center; padding: 12px 0;">
                <span class="pill pill--ok" style="font-size: 13px; padding: 4px 12px;">${isStaffWalkIn ? 'Walk-In Booking Confirmed' : 'Guaranteed Booking'}</span>
                <h2 style="margin: 12px 0 4px; font-size: 32px; font-family: 'Cormorant Garamond', serif;">${newRes.c}</h2>
                <p class="text-secondary" style="font-size: 14px;">${isStaffWalkIn ? 'Walk-in guest' : 'Thank you,'} <b>${esc(gName)}</b>. Room reservation secured.</p>

                <div class="card card-sm" style="margin: 16px 0; text-align: left; background-color: var(--surface-2); font-size: 13px; border: 1px solid var(--line);">
                  <div><b>Room Category:</b> ${esc(selectedType.n)} (Room ${assignedRoom})</div>
                  <div><b>Stay Period:</b> ${fmtDate(ci)} – ${fmtDate(co)} (${state.nights} nights)</div>
                  <div><b>Registered Guests:</b> ${guests} guest${guests > 1 ? 's' : ''}</div>
                  <div><b>Status:</b> <span class="pill ${newRes.st === 'Checked-in' ? 'pill--ok' : 'pill--info'}">${newRes.st}</span></div>
                  <div><b>Deposit Settled:</b> ${peso(state.depDue)} via ${esc(method)}</div>
                  <div style="color: var(--bad); font-weight: 600;"><b>Balance Due:</b> ${peso(state.balDue)} at Front Desk check-in</div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                  ${isStaffWalkIn ? `
                    <a href="../management/reservations.html?code=${newRes.c}" class="btn">
                      View in Reservations &rarr;
                    </a>
                  ` : `
                    <a href="../guest/guest-portal.html?code=${newRes.c}" class="btn">
                      Open Guest Portal &rarr;
                    </a>
                  `}
                  <button class="btn-secondary" onclick="printTaxInvoice('${newRes.c}')">
                    <span class="ic" data-icon="print">[ICON: print]</span> Print Tax Invoice
                  </button>
                </div>
              </div>
              `,
              '',
              { maxWidth: '520px' }
            );

            if (typeof onComplete === 'function') {
              try { onComplete(newRes); } catch (err) {}
            }
          } catch (createErr) {
            toast(createErr.message || 'Failed to complete reservation', 'bad');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = `Confirm Booking (${peso(state.depDue)})`;
            }
          }
        };
      }
    }
  });
}

// ─── Intent Auto-Resume on Page Ready ───
if (typeof window !== 'undefined') {
  window.showAuthGateModal = showAuthGateModal;
  window.openBookingModal = openBookingModal;

  window.addEventListener('DOMContentLoaded', () => {
    try {
      if (typeof getPendingIntent === 'function') {
        const guestSession = (typeof Data !== 'undefined' && Data.getGuestSession) ? Data.getGuestSession() : null;
        const intent = getPendingIntent();
        if (guestSession && intent && intent.type === 'room') {
          clearPendingIntent();
          setTimeout(() => {
            openBookingModal(intent.roomType, intent.ci, intent.co, intent.guests, intent.promo);
            if (typeof toast === 'function') {
              toast('Welcome back! Your pending room reservation has been restored.', 'ok');
            }
          }, 250);
        }
      }
    } catch (e) {}
  });
}

// ─── 2. Global Folio & Ledger Modal ───
function openFolioModal(resCode, onUpdate = null) {
  const res = Data.findRes(resCode);
  if (!res) {
    toast('Reservation not found', 'bad');
    return;
  }

  const renderFolio = () => {
    const r = Data.findRes(resCode);
    if (!r) return;
    const nts = Data.nts(r);
    const roomCharge = Data.roomChg(r);
    const total = Data.tot(r);
    const paid = Data.paidAmt(r);
    const bal = Data.balOf(r);

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 18px;">${esc(r.g)}</h3>
            <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
            <div class="text-xs text-muted" style="margin-top: 2px;">${fmtDate(r.i)} to ${fmtDate(r.o)} (${nts} nights)</div>
          </div>
          <div style="text-align: right;">
            <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : 'pill--warn'}">${r.st}</span>
            <div style="margin-top: 4px; font-weight: 600; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
              ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled (₱0)'}
            </div>
          </div>
        </div>

        <!-- 1. Charges Section -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b>1. Charges Breakdown</b>
            <span class="text-secondary text-xs">Room + Incidentals</span>
          </div>
          <div class="table-wrap" style="max-height: 150px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Item / Description</th>
                  <th>Category</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Room Accommodation (${nts} nights &times; ${peso(r.rt || 3200)})</td>
                  <td>Accommodation</td>
                  <td style="text-align: right; font-weight: 600;">${peso(roomCharge)}</td>
                </tr>
                ${(r.x || []).map(x => `
                  <tr>
                    <td>${esc(x.desc)}</td>
                    <td>${esc(x.cat || 'Incidentals')}</td>
                    <td style="text-align: right; font-weight: 600;">${peso(x.amt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Post Charge Form -->
          <div style="background: var(--surface-2); padding: 10px; border-radius: var(--r); margin-top: 8px; border: 1px solid var(--line);">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">Add Folio Charge:</div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; align-items: end;">
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Description *</label>
                <input type="text" id="folioChgDesc" placeholder="e.g. Minibar, Laundry, Airport Transfer" style="height: 32px; font-size: 12px;">
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Category</label>
                <select id="folioChgCat" style="height: 32px; font-size: 12px;">
                  <option value="Dining">Dining</option>
                  <option value="Spa">Spa &amp; Wellness</option>
                  <option value="Minibar">Minibar</option>
                  <option value="Laundry">Laundry</option>
                  <option value="Incidentals" selected>Incidentals</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Amount (₱) *</label>
                <input type="number" id="folioChgAmt" min="1" placeholder="0" style="height: 32px; font-size: 12px;">
              </div>
              <button class="btn btn-sm" id="btnFolioPostCharge" style="height: 32px; white-space: nowrap;">Post Charge</button>
            </div>
          </div>
        </div>

        <!-- 2. Payments & Receipts Section -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b>2. Recorded Payments &amp; Receipts</b>
            <span class="text-secondary text-xs">Official Receipts (OR-#####)</span>
          </div>
          <div class="table-wrap" style="max-height: 150px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>OR No.</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Type</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(r.pay || []).map(p => `
                  <tr>
                    <td><b>${esc(p.id || p.or)}</b></td>
                    <td>${fmtDate(p.d)}</td>
                    <td>${esc(p.m)}</td>
                    <td>
                      <span class="pill ${p.k === 'Refund' || p.t === 'Refund' ? 'pill--bad' : 'pill--ok'}" style="font-size: 11px;">
                        ${esc(p.k || p.t || 'Payment')}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 600; color: ${p.k === 'Refund' || p.t === 'Refund' ? 'var(--bad)' : 'var(--ink)'};">
                      ${p.k === 'Refund' || p.t === 'Refund' ? `&minus; ${peso(p.a || p.amt)}` : peso(p.a || p.amt)}
                    </td>
                  </tr>
                `).join('')}
                ${(!r.pay || !r.pay.length) ? `
                  <tr><td colspan="5" class="text-center text-muted" style="padding: 12px;">No payments recorded yet.</td></tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- Post Payment Form -->
          <div style="background: var(--surface-2); padding: 10px; border-radius: var(--r); margin-top: 8px; border: 1px solid var(--line);">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">Record Payment / Deposit / Refund:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 6px; align-items: end;">
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Payment Type</label>
                <select id="folioPayType" style="height: 32px; font-size: 12px;">
                  <option value="Payment" selected>Payment</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Refund">Refund</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Method</label>
                <select id="folioPayMethod" style="height: 32px; font-size: 12px;">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Amount (₱)</label>
                <input type="number" id="folioPayAmt" min="1" value="${Math.max(0, bal)}" style="height: 32px; font-size: 12px;">
              </div>
              <button class="btn btn-sm" id="btnFolioPostPayment" style="height: 32px; white-space: nowrap;">Record</button>
            </div>
          </div>
        </div>

        <!-- Ledger Financial Summary -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 10px 14px; border-radius: var(--r); border: 1px solid var(--line); font-size: 13px;">
          <div><b>Total Charges:</b> ${peso(total)}</div>
          <div style="color: var(--ok);"><b>Total Paid:</b> ${peso(paid)}</div>
          <div style="font-weight: 700; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
            ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Zero Balance (Settled)'}
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div>
          <button class="btn-secondary" id="btnFolioPrintInv">
            <span class="ic" data-icon="print">[ICON: print]</span> Tax Invoice
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    showModal(`Guest Folio &amp; Ledger &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '720px' });

    // Scoped Lookups
    const modalEl = document.getElementById('appModalBackdrop');
    if (!modalEl) return;

    const btnPostChg = modalEl.querySelector('#btnFolioPostCharge');
    if (btnPostChg) {
      btnPostChg.onclick = () => {
        const desc = (modalEl.querySelector('#folioChgDesc')?.value || '').trim();
        const cat = modalEl.querySelector('#folioChgCat')?.value || 'Incidentals';
        const amt = parseFloat(modalEl.querySelector('#folioChgAmt')?.value);
        if (!desc) {
          toast('Enter a charge description', 'warn');
          return;
        }
        if (isNaN(amt) || amt <= 0) {
          toast('Enter a valid charge amount', 'warn');
          return;
        }
        Data.addCharge(r.c, desc, amt, cat);
        toast(`Added ${desc} (${peso(amt)}) to folio`, 'ok');
        renderFolio();
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      };
    }

    const btnPostPay = modalEl.querySelector('#btnFolioPostPayment');
    if (btnPostPay) {
      btnPostPay.onclick = () => {
        const type = modalEl.querySelector('#folioPayType')?.value || 'Payment';
        const method = modalEl.querySelector('#folioPayMethod')?.value || 'Cash';
        const amt = parseFloat(modalEl.querySelector('#folioPayAmt')?.value);
        if (isNaN(amt) || amt <= 0) {
          toast('Enter a valid payment amount', 'warn');
          return;
        }

        if (type === 'Refund' && amt > paid) {
          toast('Refund amount cannot exceed total settled payments', 'bad');
          return;
        }

        const orNo = Data.addPayment(r.c, amt, method, type, 'Front Desk Settlement');
        toast(`Recorded ${peso(amt)} via ${method} (${orNo.id || orNo})`, 'ok');
        renderFolio();
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      };
    }

    const btnPrintInv = modalEl.querySelector('#btnFolioPrintInv');
    if (btnPrintInv) {
      btnPrintInv.onclick = () => printTaxInvoice(r.c);
    }
  };

  renderFolio();
}

// ─── 3. Global Reservation Detail Modal ───
function openReservationDetail(code, onUpdate = null) {
  const r = Data.findRes(code);
  if (!r) {
    toast('Reservation not found', 'bad');
    return;
  }

  const nts = Data.nts(r);
  const total = Data.tot(r);
  const paid = Data.paidAmt(r);
  const bal = Data.balOf(r);
  const isClean = Data.isRoomClean(r.n);
  const canCheckIn = r.st === 'Confirmed' && isClean && (paid >= Data.depAmt(r));
  const canCheckOut = r.st === 'Checked-in';

  const bodyHtml = `
    <div style="font-size: 13px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 20px;">${esc(r.g)}</h2>
          <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
          ${r.ph ? `<div class="text-sm text-muted">Phone: ${esc(r.ph)}</div>` : ''}
          ${r.email ? `<div class="text-sm text-muted">Email: ${esc(r.email)}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : 'pill--bad'}">${r.st}</span>
          <div style="font-size: 12px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'}; font-weight: 600; margin-top: 4px;">
            ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled (₱0)'}
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
          <b>${isClean ? '<span style="color:var(--ok);">Clean &amp; Ready</span>' : '<span style="color:var(--bad);">Dirty / Cleaning in progress</span>'}</b>
        </div>
      </div>

      ${r.note ? `
        <div style="background: var(--bg); border: 1px solid var(--line); padding: 10px; border-radius: var(--r); margin-bottom: 14px;">
          <span class="text-xs text-secondary">Guest Special Requests:</span>
          <div style="margin-top: 2px;">${esc(r.note)}</div>
        </div>
      ` : ''}

      ${r.promo ? `
        <div style="background: rgba(184, 137, 26, 0.1); color: var(--gold-ink); padding: 8px 12px; border-radius: var(--r); margin-bottom: 14px; font-size: 12px; border: 1px solid var(--gold);">
          Promo Applied: <b>${esc(typeof r.promo === 'object' ? r.promo.code : r.promo)}</b>
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
        ${r.st === 'Confirmed' ? `
          <button class="btn btn-sm" id="btnDetailCheckIn" ${!canCheckIn ? 'title="Requires clean room & deposit payment"' : ''}>Check In</button>
        ` : ''}
        ${canCheckOut ? `
          <button class="btn btn-sm" id="btnDetailCheckOut">Check Out</button>
        ` : ''}
        ${r.st !== 'Cancelled' && r.st !== 'Checked-out' ? `
          <button class="btn-ghost btn-sm" id="btnDetailCancel" style="color: var(--bad);">Cancel Booking</button>
        ` : ''}
        <button class="btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  showModal(`Reservation &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '640px' });

  const modalEl = document.getElementById('appModalBackdrop');
  if (!modalEl) return;

  const btnFolio = modalEl.querySelector('#btnDetailFolio');
  if (btnFolio) {
    btnFolio.onclick = () => {
      openFolioModal(r.c, () => openReservationDetail(r.c, onUpdate));
    };
  }

  const btnInv = modalEl.querySelector('#btnDetailInvoice');
  if (btnInv) {
    btnInv.onclick = () => printTaxInvoice(r.c);
  }

  const btnCheckIn = modalEl.querySelector('#btnDetailCheckIn');
  if (btnCheckIn) {
    btnCheckIn.onclick = () => {
      const res = Data.checkIn(r.c);
      if (res.success) {
        toast(`Guest ${r.g} checked into Room ${r.n}`, 'ok');
        openReservationDetail(r.c, onUpdate);
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      } else {
        toast(res.error, 'warn');
      }
    };
  }

  const btnCheckOut = modalEl.querySelector('#btnDetailCheckOut');
  if (btnCheckOut) {
    btnCheckOut.onclick = () => {
      if (bal > 0) {
        toast(`Please settle outstanding folio balance of ${peso(bal)} before check-out`, 'warn');
        openFolioModal(r.c, () => openReservationDetail(r.c, onUpdate));
        return;
      }
      const res = Data.checkOut(r.c);
      if (res.success) {
        toast(`Guest ${r.g} checked out. Room ${r.n} marked Dirty for housekeeping turnover.`, 'ok');
        openReservationDetail(r.c, onUpdate);
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      }
    };
  }

  const btnCancel = modalEl.querySelector('#btnDetailCancel');
  if (btnCancel) {
    btnCancel.onclick = () => {
      const diff = dateDiff(today(), r.i);
      const isFree = diff >= CONFIG.freeCancelDays;
      const policyNotice = isFree
        ? 'Full deposit refund will be issued under 3-day policy.'
        : `1st-night fee (${peso(r.rt || 3200)}) will be retained under policy.`;

      const confirmBody = `
        <p>Are you sure you want to cancel reservation <b>${esc(r.c)}</b> (${esc(r.g)})?</p>
        <p class="text-sm text-secondary" style="margin-top: 8px;">${policyNotice}</p>
      `;

      const confirmFooter = `
        <button class="btn-secondary" onclick="openReservationDetail('${r.c}', ${onUpdate ? 'onUpdate' : 'null'})">Back</button>
        <button class="btn btn-danger" id="btnConfirmCancelRes">Cancel Reservation</button>
      `;

      showModal('Confirm Cancellation', confirmBody, confirmFooter, { maxWidth: '440px' });

      const cModal = document.getElementById('appModalBackdrop');
      const confirmBtn = cModal ? cModal.querySelector('#btnConfirmCancelRes') : null;
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const cancelRes = Data.cancelReservation(r.c, 'Staff');
          if (cancelRes.success) {
            toast(`Reservation ${r.c} cancelled. Refund: ${peso(cancelRes.refundAmt)}`, 'ok');
            closeModal();
            if (typeof onUpdate === 'function') {
              try { onUpdate(); } catch (e) {}
            }
          }
        };
      }
    };
  }
}

// ─── 4. BIR Tax Invoice Print Helper ───
function printTaxInvoice(resCode) {
  const res = Data.findRes(resCode);
  if (!res) {
    toast('Reservation not found for invoice', 'bad');
    return;
  }

  const nts = Data.nts(res);
  const total = Data.tot(res);
  const paid = Data.paidAmt(res);
  const balance = Data.balOf(res);
  const tax = taxBreakdown(total);

  const invoiceHtml = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #111; padding: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 22px; color: var(--gold-ink);">${CONFIG.hotelName}</h2>
          <div style="font-size: 12px; color: #555;">${CONFIG.address}</div>
          <div style="font-size: 12px; color: #555;">TIN: ${CONFIG.legal.tin} &middot; Permit: ${CONFIG.legal.permit}</div>
          <div style="font-size: 12px; color: #555;">Tel: ${CONFIG.phones[0]} &middot; Official Folio &amp; Tax Invoice</div>
        </div>
        <div style="text-align: right;">
          <span class="pill pill--ok" style="font-size: 11px;">OFFICIAL FOLIO</span>
          <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">Code: ${res.c}</div>
          <div style="font-size: 12px; color: #666;">Date: ${fmtDate(today())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line); font-size: 12px;">
        <div>
          <div><b>Guest:</b> ${esc(res.g)}</div>
          <div><b>Phone:</b> ${esc(res.ph) || 'On file'}</div>
          <div><b>Category:</b> ${esc(res.t)} (Room ${res.n})</div>
        </div>
        <div>
          <div><b>Check-In:</b> ${fmtDate(res.i)} (2:00 PM)</div>
          <div><b>Check-Out:</b> ${fmtDate(res.o)} (12:00 PM)</div>
          <div><b>Stay:</b> ${nts} nights &middot; ${res.gu} guests</div>
        </div>
      </div>

      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 14px;">
        <thead>
          <tr style="background: var(--surface-2); text-align: left;">
            <th style="padding: 6px 8px;">Description</th>
            <th style="padding: 6px 8px; text-align: center;">Qty</th>
            <th style="padding: 6px 8px; text-align: right;">Rate</th>
            <th style="padding: 6px 8px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 8px;">Room Accommodation: ${esc(res.t)}</td>
            <td style="padding: 6px 8px; text-align: center;">${nts}</td>
            <td style="padding: 6px 8px; text-align: right;">${peso(res.rt || 3200)}</td>
            <td style="padding: 6px 8px; text-align: right;">${peso(Data.roomChg(res))}</td>
          </tr>
          ${(res.x || []).map(x => `
            <tr>
              <td style="padding: 6px 8px;">${esc(x.desc)}</td>
              <td style="padding: 6px 8px; text-align: center;">1</td>
              <td style="padding: 6px 8px; text-align: right;">${peso(x.amt)}</td>
              <td style="padding: 6px 8px; text-align: right;">${peso(x.amt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; border-top: 1px solid var(--line); padding-top: 10px; font-size: 12px; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Tax &amp; Levy Breakdown</div>
          <div style="display: flex; justify-content: space-between;"><span>Vatable Base (Net):</span><span>${peso(tax.net)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>12% VAT:</span><span>${peso(tax.vat)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>10% Service Charge:</span><span>${peso(tax.svc)}</span></div>
        </div>
        <div style="background: var(--surface-2); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line);">
          <div style="display: flex; justify-content: space-between;"><span>Total Charges:</span><b>${peso(total)}</b></div>
          <div style="display: flex; justify-content: space-between; color: var(--ok);"><span>Payments Applied:</span><b>&minus; ${peso(paid)}</b></div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 4px; font-weight: 600; color: ${balance > 0 ? 'var(--bad)' : 'var(--ok)'};">
            <span>${balance > 0 ? 'Balance Due:' : 'Net Balance:'}</span>
            <span>${balance > 0 ? peso(balance) : 'PAID IN FULL'}</span>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px;" class="no-print">
        <button class="btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn" onclick="window.print()">Print / Save PDF</button>
      </div>
    </div>
  `;

  showModal('Official Tax Folio', invoiceHtml, '', { maxWidth: '640px' });
}

// ─── Global Window Exposure ───
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
  window.openFolioModal = openFolioModal;
  window.openReservationDetail = openReservationDetail;
  window.printTaxInvoice = printTaxInvoice;
}
