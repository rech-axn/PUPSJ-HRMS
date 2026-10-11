/* ==========================================================================
   PUPSJ Hotel & Restaurant — Booking Modal & Folio System (booking-modal.js)
   Universal 5-step reservation flow (Stay -> Guest -> Review -> Pay -> Confirmed),
   dynamic CONFIG.depositPct, countdown hold timer, simulated gateway & bank QR Ph,
   folio ledger, BIR tax invoices, and reservation detail modal.
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
      : { netTotal: typeObj.r * nights, depDue: Math.ceil(typeObj.r * nights * (CONFIG.depositPct / 100)) };

    summaryDetails = `
      <div class="card card-sm" style="margin: 16px 0; background: var(--surface-2); text-align: left; font-size: 13px; border: 1px solid var(--line);">
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 6px;">Your Selected Accommodation:</div>
        <div><b>Room Category:</b> ${esc(roomType)}</div>
        <div><b>Stay Period:</b> ${typeof fmtDate === 'function' ? fmtDate(checkIn) : checkIn} – ${typeof fmtDate === 'function' ? fmtDate(checkOut) : checkOut} (${nights} night${nights > 1 ? 's' : ''})</div>
        <div><b>Registered Guests:</b> ${guests} guest${guests > 1 ? 's' : ''}</div>
        <div><b>Accommodation Total:</b> ${typeof peso === 'function' ? peso(pricing.netTotal) : '₱' + pricing.netTotal}</div>
        <div style="color: var(--ink-3); font-size: 12px; margin-top: 4px;">${CONFIG.depositPct}% Guarantee Deposit Due on confirmation: ${typeof peso === 'function' ? peso(pricing.depDue) : '₱' + pricing.depDue}</div>
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
  
  let loginBase = '../auth/login.html';
  if (isRoot) loginBase = 'pages/auth/login.html';
  else if (isManagement || isGuest || isRooms || isMain) loginBase = '../auth/login.html';

  const returnParam = encodeURIComponent(currentPath);

  const gateHtml = `
    <div style="text-align: center; padding: 6px 0;">
      <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Security Key Icon - Insert guest authentication key SVG here]</div>
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

// ─── 1. Rebuilt 5-Step Online Room Booking Engine ───
function openBookingModal(initialType, checkInDate, checkOutDate, guestCount = 2, initialPromo = '', onComplete = null) {
  const staffSession = typeof Data !== 'undefined' && Data.getStaffSession ? Data.getStaffSession() : null;
  const guestSession = typeof Data !== 'undefined' && Data.getGuestSession ? Data.getGuestSession() : null;

  // Rule 7 / Rule 5.3: Staff sessions using the online flow get guided to their management portal
  if (staffSession && !guestSession) {
    const isRoot = !window.location.pathname.includes('/management/') && !window.location.pathname.includes('/guest/') && !window.location.pathname.includes('/rooms/') && !window.location.pathname.includes('/main/');
    const resPath = isRoot ? 'pages/management/reservations.html?new=1' : '../management/reservations.html?new=1';
    showModal(
      'Staff Desk Mode Notice',
      `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Briefcase Icon - Insert staff management portal icon here]</div>
        <h3 style="font-size: 20px; margin: 0 0 8px;">Signed in as Staff: ${esc(staffSession.name)}</h3>
        <p class="text-secondary" style="font-size: 14px; max-width: 440px; margin: 0 auto 16px;">
          The public booking engine requires a guest account and 50% online deposit. For walk-ins or staff-assisted front-desk bookings, please use the Front Desk Reservations module.
        </p>
        <div style="display: flex; justify-content: center; gap: 10px;">
          <a href="${resPath}" class="btn">Use New Reservation in your portal &rarr;</a>
          <button type="button" class="btn-ghost" onclick="closeModal()">Close</button>
        </div>
      </div>
      `,
      '',
      { maxWidth: '500px' }
    );
    return;
  }

  const types = typeof Data !== 'undefined' && Data.getTypes ? Data.getTypes() : [];
  let selectedType = types.find(t => t.n === (initialType ? initialType.n || initialType : '')) || types[0] || { n: 'Standard Room', r: 3200, g: 2 };

  let ci = checkInDate || today();
  let co = checkOutDate || addDays(ci, 1);
  if (co <= ci) co = addDays(ci, 1);
  let guests = Math.max(1, Number(guestCount || 2));
  let promoCode = initialPromo || '';
  let activePromo = (promoCode && typeof Data !== 'undefined' && Data.findPromo) ? Data.findPromo(promoCode) : null;

  // Step state
  let currentStep = 1; // 1: Stay, 2: Guest, 3: Review, 4: Pay, 5: Confirmed
  let guestName = guestSession ? guestSession.name : '';
  let guestPhone = guestSession ? (guestSession.phone || '') : '';
  let guestEmail = guestSession ? (guestSession.email || '') : '';
  let guestNotes = '';
  let policyAgreed = false;

  let activeHold = null;
  let activeIntent = null;
  let timerInterval = null;
  let pollInterval = null;
  let confirmedReservation = null;
  let paymentMethod = 'card'; // 'card' | 'gcash' | 'maya' | 'bank'
  let selectedBank = 'BDO Unibank';
  let attemptsMade = 0;
  let inlinePayError = '';

  const cleanupTimers = () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  };

  const getQuote = () => {
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(ci, co) : 1);
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.PricingService) {
      return PUPSJ_Services.PricingService.quote({
        roomType: selectedType.n,
        baseRate: selectedType.r,
        nights,
        guestCount: guests,
        promoCode: activePromo ? activePromo.code : ''
      });
    }
    const base = selectedType.r * nights;
    const dep = typeof Money !== 'undefined' ? Money.ceilCentavo(base * (CONFIG.depositPct / 100)) : Math.ceil(base * 0.5);
    return {
      nights,
      subtotal: base,
      discount: 0,
      total: base,
      depositDue: dep,
      balanceDue: base - dep,
      taxes: { vat: Math.round(base * 0.12), svc: Math.round(base * 0.10) }
    };
  };

  const getFreeUnits = (excludeHoldId = null) => {
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.AvailabilityService) {
      const units = PUPSJ_Services.AvailabilityService.unitsFree(selectedType.n, ci, co, excludeHoldId);
      return typeof units === 'number' ? units : (Array.isArray(units) ? units.length : Number(units) || 0);
    }
    const fallback = typeof Data !== 'undefined' && Data.freeRooms ? Data.freeRooms(selectedType.n, ci, co) : [101];
    return Array.isArray(fallback) ? fallback.length : (Number(fallback) || 0);
  };

  const renderStepsNav = () => {
    const steps = [
      { num: 1, label: 'Stay' },
      { num: 2, label: 'Guest' },
      { num: 3, label: 'Review' },
      { num: 4, label: 'Pay' },
      { num: 5, label: 'Confirmed' }
    ];
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--line); padding-bottom: 12px; gap: 4px;">
        ${steps.map(s => {
          const isActive = s.num === currentStep;
          const isDone = s.num < currentStep;
          return `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? 'var(--gold-ink)' : isDone ? 'var(--ok)' : 'var(--ink-3)'};">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: 11px; font-weight: 700; background: ${isActive ? 'var(--gold)' : isDone ? 'var(--ok)' : 'var(--surface-2)'}; color: ${isActive || isDone ? '#fff' : 'var(--ink-3)'};">
                ${isDone ? '✓' : s.num}
              </span>
              <span class="step-label" style="display: inline-block;">${s.label}</span>
            </div>
          `;
        }).join('<span style="color: var(--line); font-size: 12px;">&rarr;</span>')}
      </div>
    `;
  };

  // Build root modal container
  const modalShell = `
    <div id="bookingModalRoot" style="min-height: 380px; font-size: 14px;">
      <!-- Dynamic Step Content Injected Here -->
    </div>
  `;

  showModal('Online Room Reservation', modalShell, '', {
    maxWidth: '700px',
    onClose() {
      cleanupTimers();
    },
    onOpen(modal) {
      const root = modal.querySelector('#bookingModalRoot');
      if (!root) return;

      const render = () => {
        if (currentStep === 1) renderStep1(root);
        else if (currentStep === 2) renderStep2(root);
        else if (currentStep === 3) renderStep3(root);
        else if (currentStep === 4) renderStep4(root);
        else if (currentStep === 5) renderStep5(root);
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 1: STAY (Public Availability & Rates)
      // ─────────────────────────────────────────────────────────────
      const renderStep1 = (container) => {
        const quote = getQuote();
        const freeCount = getFreeUnits();
        const hasCapacity = guests <= selectedType.g;
        const canProceed = freeCount > 0 && hasCapacity;

        container.innerHTML = `
          ${renderStepsNav()}

          <!-- Room Summary Card -->
          <div style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;">
              <b style="font-size: 16px; color: var(--ink);">${esc(selectedType.n)}</b>
              <span style="font-size: 15px; font-weight: 600; color: var(--gold-ink);">${peso(selectedType.r)} / night</span>
            </div>
            <div class="text-sm text-secondary" style="margin-top: 4px;">
              ${fmtDate(ci)} – ${fmtDate(co)} &middot; ${quote.nights} night${quote.nights > 1 ? 's' : ''} &middot; Max ${selectedType.g} guests
            </div>
            <div style="margin-top: 6px;">
              ${!hasCapacity
                ? `<span class="pill pill--bad">Exceeds room capacity (Max ${selectedType.g} guests)</span>`
                : freeCount > 0
                  ? `<span class="pill pill--ok">${freeCount} room${freeCount > 1 ? 's' : ''} available</span>`
                  : `<span class="pill pill--bad">Fully booked for selected dates</span>`
              }
            </div>
          </div>

          <form id="step1Form" onsubmit="return false;">
            <div class="field-row-3">
              <div class="field">
                <label for="s1Type">Room Category</label>
                <select id="s1Type">
                  ${types.map(t => `<option value="${esc(t.n)}" ${t.n === selectedType.n ? 'selected' : ''}>${esc(t.n)} (${peso(t.r)}/nt)</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="s1Ci">Check-in Date *</label>
                <input type="date" id="s1Ci" value="${ci}" min="${today()}" required>
              </div>
              <div class="field">
                <label for="s1Co">Check-out Date *</label>
                <input type="date" id="s1Co" value="${co}" min="${addDays(ci, 1)}" required>
              </div>
            </div>

            <div class="field-row-2">
              <div class="field">
                <label for="s1Guests">Party Size (Guests) *</label>
                <input type="number" id="s1Guests" min="1" max="${selectedType.g}" value="${guests}" required>
              </div>
              <div class="field">
                <label for="s1Promo">Promotion Voucher Code</label>
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="s1Promo" placeholder="WELCOME10" style="text-transform: uppercase;" value="${esc(promoCode)}">
                  <button type="button" class="btn-secondary" id="btnS1ApplyPromo" style="white-space: nowrap;">Apply</button>
                </div>
                <div id="s1PromoMsg" class="text-xs" style="margin-top: 3px;">
                  ${activePromo ? `<span style="color: var(--ok); font-weight: 600;">Applied: ${esc(activePromo.title || activePromo.code)}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- Dynamic Pricing Preview -->
            <div style="background-color: var(--surface-2); padding: 14px 16px; border-radius: var(--r); margin: 16px 0; border: 1px solid var(--line); font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                <span class="text-secondary">Room accommodation (${quote.nights} nights &times; ${peso(selectedType.r)}):</span>
                <b>${peso(quote.subtotal)}</b>
              </div>
              ${activePromo ? `
                <div style="display: flex; justify-content: space-between; padding: 2px 0; color: var(--ok);">
                  <span>Promotion Discount (${activePromo.code}):</span>
                  <b>&minus; ${peso(quote.discount)}</b>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; color: var(--ink-3);">
                <span>BIR VAT (${CONFIG.tax.vatPct}%) &amp; Service Charge (${CONFIG.tax.svcPct}%):</span>
                <span>Included in tariff</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); margin-top: 6px; font-size: 15px;">
                <b>Total Stay Tariff:</b>
                <b style="color: var(--ink); font-size: 16px;">${peso(quote.total)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; color: var(--gold-ink); font-weight: 600;">
                <span>Pay Now (${CONFIG.depositPct}% Down Payment):</span>
                <span style="font-size: 16px;">${peso(quote.depositDue)}</span>
              </div>
              <div class="text-xs" style="color: var(--ink-3); margin-top: 4px;">
                Remaining balance of ${peso(quote.balanceDue)} is settled upon check-in or via the Guest Portal.
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
              <button type="button" class="btn" id="btnStep1Continue" ${!canProceed ? 'disabled' : ''}>
                Reserve Room &rarr;
              </button>
            </div>
          </form>
        `;

        // Event Listeners for Step 1
        const typeSelect = container.querySelector('#s1Type');
        const ciInput = container.querySelector('#s1Ci');
        const coInput = container.querySelector('#s1Co');
        const guestInput = container.querySelector('#s1Guests');
        const promoInput = container.querySelector('#s1Promo');
        const promoBtn = container.querySelector('#btnS1ApplyPromo');
        const continueBtn = container.querySelector('#btnStep1Continue');

        if (typeSelect) {
          typeSelect.onchange = () => {
            selectedType = types.find(t => t.n === typeSelect.value) || types[0];
            render();
          };
        }
        if (ciInput) {
          ciInput.onchange = () => {
            ci = ciInput.value;
            const minCo = addDays(ci, 1);
            if (co <= ci) co = minCo;
            render();
          };
        }
        if (coInput) {
          coInput.onchange = () => {
            co = coInput.value;
            render();
          };
        }
        if (guestInput) {
          guestInput.oninput = () => {
            guests = Number(guestInput.value || 1);
            render();
          };
        }
        if (promoBtn && promoInput) {
          promoBtn.onclick = () => {
            const code = promoInput.value.trim().toUpperCase();
            if (!code) {
              activePromo = null;
              promoCode = '';
              render();
              return;
            }
            const validation = typeof Data !== 'undefined' && Data.validatePromo ? Data.validatePromo(code, {
              scope: 'rooms',
              nights: dateDiff(ci, co),
              spend: dateDiff(ci, co) * selectedType.r
            }) : { valid: false, error: 'Promo code unavailable' };

            if (validation.valid) {
              activePromo = validation.promo;
              promoCode = code;
              toast(`Promo ${code} applied successfully!`, 'ok');
            } else {
              activePromo = null;
              toast(validation.error || 'Invalid promotion voucher', 'warn');
            }
            render();
          };
        }

        if (continueBtn) {
          continueBtn.onclick = () => {
            // Unauthenticated visitors hitting commit get the Auth Gate
            if (!guestSession) {
              closeModal();
              showAuthGateModal({
                type: 'room',
                roomType: selectedType.n,
                ci,
                co,
                guests,
                promo: activePromo ? activePromo.code : ''
              });
              return;
            }
            currentStep = 2;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 2: GUEST DETAILS (Prefilled from session, validated)
      // ─────────────────────────────────────────────────────────────
      const renderStep2 = (container) => {
        container.innerHTML = `
          ${renderStepsNav()}

          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 4px; font-size: 18px; font-family: 'Cormorant Garamond', serif;">Guest Information</h3>
            <p class="text-secondary text-sm" style="margin: 0;">
              Confirm primary contact details for instant confirmation delivery and check-in verification.
            </p>
          </div>

          <form id="step2Form" onsubmit="return false;">
            <div class="field-row-2">
              <div class="field">
                <label for="s2GuestName">Primary Guest Full Name *</label>
                <input type="text" id="s2GuestName" value="${esc(guestName)}" placeholder="Maria Santos" required autocomplete="name">
              </div>
              <div class="field">
                <label for="s2Phone">Philippine Mobile Number *</label>
                <input type="tel" id="s2Phone" value="${esc(guestPhone)}" placeholder="+63 917 123 4567" required autocomplete="tel">
              </div>
            </div>

            <div class="field">
              <label for="s2Email">Email Address (Read-only on Guest Session) *</label>
              <input type="email" id="s2Email" value="${esc(guestEmail)}" readonly style="background: var(--surface-2); color: var(--ink-2);" required autocomplete="email">
              <span class="field-hint" style="font-size: 11px; color: var(--ink-3);">Confirmation voucher and Official Receipt (OR) will be dispatched to this email.</span>
            </div>

            <div class="field">
              <label for="s2Notes">Special Requests &amp; Preferences (Optional)</label>
              <textarea id="s2Notes" rows="2" placeholder="Quiet high floor, extra pillows, anticipated arrival time…">${esc(guestNotes)}</textarea>
            </div>

            <div class="banner banner--info" style="font-size: 12px; margin-top: 14px; padding: 10px 12px; background: var(--surface-2); border-radius: var(--r); border: 1px solid var(--line);">
              <span class="ic" data-icon="shield">[ICON: shield]</span>
              Government photo ID is not required during online reservation. ID verification occurs seamlessly at Front Desk check-in.
            </div>

            <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 20px;">
              <button type="button" class="btn-secondary" id="btnStep2Back">&larr; Back to Stay</button>
              <button type="button" class="btn" id="btnStep2Continue">Review Pricing &amp; Terms &rarr;</button>
            </div>
          </form>
        `;

        const backBtn = container.querySelector('#btnStep2Back');
        const contBtn = container.querySelector('#btnStep2Continue');

        if (backBtn) {
          backBtn.onclick = () => {
            currentStep = 1;
            render();
          };
        }

        if (contBtn) {
          contBtn.onclick = () => {
            const nameVal = (container.querySelector('#s2GuestName')?.value || '').trim();
            const phoneVal = (container.querySelector('#s2Phone')?.value || '').trim();
            const notesVal = (container.querySelector('#s2Notes')?.value || '').trim();

            if (nameVal.length < 2) {
              toast('Please enter primary guest full name', 'warn');
              container.querySelector('#s2GuestName')?.focus();
              return;
            }
            if (typeof isValidPhMobile === 'function' && !isValidPhMobile(phoneVal)) {
              toast('Please enter a valid Philippine mobile number (e.g. +63 917 123 4567)', 'warn');
              container.querySelector('#s2Phone')?.focus();
              return;
            }

            guestName = nameVal;
            guestPhone = phoneVal;
            guestNotes = notesVal;
            currentStep = 3;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 3: REVIEW (Pricing breakdown, deposit box, policy tick)
      // ─────────────────────────────────────────────────────────────
      const renderStep3 = (container) => {
        const quote = getQuote();
        const cancelPolicyText = `Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations made less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction. No-shows are not refunded. Remaining balance of ${peso(quote.balanceDue)} is collected upon check-in.`;

        container.innerHTML = `
          ${renderStepsNav()}

          <div style="margin-bottom: 14px;">
            <h3 style="margin: 0 0 4px; font-size: 18px; font-family: 'Cormorant Garamond', serif;">Review Reservation &amp; Guarantee Terms</h3>
            <p class="text-secondary text-sm" style="margin: 0;">
              Confirm accommodation tariffs and payment schedule before locking your room inventory.
            </p>
          </div>

          <!-- Stay Overview Summary -->
          <div style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line); font-size: 13px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><b>Room Category:</b> ${esc(selectedType.n)}</div>
              <div><b>Stay Dates:</b> ${fmtDate(ci)} – ${fmtDate(co)} (${quote.nights} nights)</div>
              <div><b>Primary Guest:</b> ${esc(guestName)}</div>
              <div><b>Contact:</b> ${esc(guestPhone)} &middot; ${esc(guestEmail)}</div>
            </div>
            ${guestNotes ? `<div style="margin-top: 8px; font-size: 12px; color: var(--ink-2);"><b>Requests:</b> ${esc(guestNotes)}</div>` : ''}
          </div>

          <!-- Detailed Tariff Breakdown -->
          <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 16px; font-size: 13px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span class="text-secondary">Room accommodation (${quote.nights} nights &times; ${peso(selectedType.r)}):</span>
              <b>${peso(quote.subtotal)}</b>
            </div>
            ${activePromo ? `
              <div style="display: flex; justify-content: space-between; padding: 2px 0; color: var(--ok);">
                <span>Promotion Discount (${activePromo.code}):</span>
                <b>&minus; ${peso(quote.discount)}</b>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; color: var(--ink-3);">
              <span>Statutory VAT (${CONFIG.tax.vatPct}%) &amp; Service Charge (${CONFIG.tax.svcPct}%):</span>
              <span>${peso(quote.taxes.vat + quote.taxes.svc)} (included)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); margin-top: 6px; font-size: 15px;">
              <b>Total Stay Tariff:</b>
              <b style="color: var(--ink); font-size: 16px;">${peso(quote.total)}</b>
            </div>
          </div>

          <!-- Highlighted Required Deposit Box -->
          <div style="background: rgba(184, 137, 26, 0.08); border: 2px solid var(--gold); border-radius: var(--r); padding: 14px 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: var(--gold-ink); font-size: 15px;">
                Pay now (${CONFIG.depositPct}% down payment):
              </span>
              <span style="font-size: 20px; font-weight: 700; color: var(--gold-ink);">
                ${peso(quote.depositDue)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--ink-2);">
              <span>Balance due at check-in:</span>
              <span style="font-weight: 600;">${peso(quote.balanceDue)}</span>
            </div>
            <div class="text-xs" style="color: var(--ink-3); margin-top: 6px;">
              Your booking is confirmed instantly once payment succeeds.
            </div>
          </div>

          <!-- Policy Tick Box -->
          <div style="margin-bottom: 18px; background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line);">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px;">
              <input type="checkbox" id="s3PolicyTick" ${policyAgreed ? 'checked' : ''} style="margin-top: 2px;">
              <span>
                I have read and agree to the <b>Cancellation &amp; Deposit Policy</b>:<br>
                <span class="text-secondary text-xs">${cancelPolicyText}</span>
              </span>
            </label>
          </div>

          <div style="display: flex; justify-content: space-between; gap: 10px;">
            <button type="button" class="btn-secondary" id="btnStep3Back">&larr; Back to Guest</button>
            <button type="button" class="btn" id="btnStep3StartHold" ${!policyAgreed ? 'disabled' : ''}>
              Pay ${peso(quote.depositDue)} and Confirm Booking &rarr;
            </button>
          </div>
        `;

        const policyTick = container.querySelector('#s3PolicyTick');
        const startHoldBtn = container.querySelector('#btnStep3StartHold');
        const backBtn = container.querySelector('#btnStep3Back');

        if (policyTick && startHoldBtn) {
          policyTick.onchange = () => {
            policyAgreed = policyTick.checked;
            startHoldBtn.disabled = !policyAgreed;
          };
        }

        if (backBtn) {
          backBtn.onclick = () => {
            currentStep = 2;
            render();
          };
        }

        if (startHoldBtn) {
          startHoldBtn.onclick = () => {
            if (!policyAgreed) {
              toast('Please accept the cancellation & deposit policy to proceed.', 'warn');
              return;
            }

            startHoldBtn.disabled = true;
            startHoldBtn.textContent = 'Securing Inventory Hold…';

            try {
              if (typeof PUPSJ_Services === 'undefined' || !PUPSJ_Services.BookingService) {
                throw new Error('BookingService unavailable');
              }

              const holdRes = PUPSJ_Services.BookingService.startHold(guestSession, {
                typeId: selectedType.n,
                checkIn: ci,
                checkOut: co,
                guests,
                promoCode: activePromo ? activePromo.code : '',
                notes: guestNotes
              });

              if (!holdRes || (holdRes.ok === false && !holdRes.data)) {
                const errMsg = holdRes?.error || holdRes?.code || 'Unable to hold room';
                throw new Error(errMsg);
              }

              const hold = (holdRes && holdRes.data) ? holdRes.data : holdRes;
              activeHold = hold;
              attemptsMade = hold.attempts || 0;
              inlinePayError = '';
              currentStep = 4;
              render();
            } catch (err) {
              startHoldBtn.disabled = false;
              startHoldBtn.textContent = `Pay ${peso(quote.depositDue)} and Confirm Booking →`;
              if (err.message === 'NO_AVAILABILITY') {
                toast('Sorry, all units of this category were just locked or booked by other guests. Please select other dates.', 'bad');
              } else {
                toast(err.message || 'Unable to hold room', 'bad');
              }
            }
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 4: PAY (Inventory hold countdown, Card/GCash/Maya/Bank)
      // ─────────────────────────────────────────────────────────────
      const renderStep4 = (container) => {
        cleanupTimers();

        if (!activeHold) {
          currentStep = 1;
          render();
          return;
        }

        const holdData = (activeHold && activeHold.data) ? activeHold.data : activeHold;
        const quote = (holdData && holdData.quoteSnapshot) ? holdData.quoteSnapshot : getQuote();
        const attemptsLeft = Math.max(0, (CONFIG.maxPayAttempts || 3) - attemptsMade);

        // Helper: Format countdown mm:ss
        const getRemainingSec = () => {
          const expMs = new Date(holdData.expiresAt || activeHold.expiresAt).getTime();
          const nowMs = Date.now();
          return Math.max(0, Math.floor((expMs - nowMs) / 1000));
        };

        const remainingSec = getRemainingSec();
        if (remainingSec <= 0) {
          renderHoldExpired(container);
          return;
        }

        const isAmber = remainingSec < 120;
        const minStr = String(Math.floor(remainingSec / 60)).padStart(2, '0');
        const secStr = String(remainingSec % 60).padStart(2, '0');

        container.innerHTML = `
          ${renderStepsNav()}

          <!-- Inventory Hold Countdown Banner -->
          <div id="holdBanner" style="background: ${isAmber ? 'rgba(217, 119, 6, 0.12)' : 'var(--surface-2)'}; border: 1px solid ${isAmber ? 'var(--warn)' : 'var(--line)'}; border-radius: var(--r); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: ${isAmber ? 'var(--warn)' : 'var(--gold-ink)'};">
                [PLACEHOLDER: Lock Badge - Insert inventory hold padlock icon here] Room Inventory Locked &middot; Hold ${activeHold.holdId}
              </div>
              <div class="text-xs text-muted" style="margin-top: 2px;">
                Complete down payment before timer expires to guarantee your booking.
              </div>
            </div>
            <div style="text-align: right;">
              <div id="holdTimerDisplay" aria-live="polite" style="font-size: 24px; font-weight: 700; font-family: monospace; color: ${isAmber ? 'var(--warn)' : 'var(--ink)'};">
                ${minStr}:${secStr}
              </div>
              <div class="text-xs text-secondary">
                Attempts Left: <b>${attemptsLeft}</b>
              </div>
            </div>
          </div>
          <!-- Screen Reader Accessible Announcer -->
          <div id="holdAnnouncer" aria-live="polite" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"></div>

          ${inlinePayError ? `
            <div class="banner banner--bad" style="margin-bottom: 14px; padding: 10px 14px;">
              <span class="ic" data-icon="alert">[ICON: alert]</span>
              <span>${esc(inlinePayError)}</span>
            </div>
          ` : ''}

          <!-- Payment Method Tabs -->
          <div class="tabs" style="margin-bottom: 16px;">
            <button type="button" class="tab-btn ${paymentMethod === 'card' ? 'active' : ''}" id="tabPayCard">
              <span class="ic" data-icon="credit-card">[ICON: credit-card]</span> Credit / Debit Card
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'gcash' ? 'active' : ''}" id="tabPayGcash">
              GCash
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'maya' ? 'active' : ''}" id="tabPayMaya">
              Maya
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'bank' ? 'active' : ''}" id="tabPayBank">
              Bank Transfer (QR Ph)
            </button>
          </div>

          <!-- Form Area for Selected Method -->
          <div id="payMethodContainer" style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; margin-bottom: 16px;">
            ${renderPaymentMethodForm(quote)}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
            <a href="javascript:void(0)" id="btnCancelReleaseHold" class="text-sm" style="color: var(--bad); text-decoration: underline;">
              Cancel and release room
            </a>
            <span class="text-xs text-muted">
              Secure 256-bit simulated transaction
            </span>
          </div>
        `;

        // Start Hold Countdown Timer
        timerInterval = setInterval(() => {
          const sec = getRemainingSec();
          const timerEl = container.querySelector('#holdTimerDisplay');
          const bannerEl = container.querySelector('#holdBanner');
          const announcer = container.querySelector('#holdAnnouncer');

          if (sec <= 0) {
            cleanupTimers();
            if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
              PUPSJ_Services.HoldService.expire();
            }
            renderHoldExpired(container);
            return;
          }

          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const s = String(sec % 60).padStart(2, '0');
          if (timerEl) timerEl.textContent = `${m}:${s}`;

          // Amber under 2 minutes
          if (sec < 120 && timerEl && bannerEl) {
            timerEl.style.color = 'var(--warn)';
            bannerEl.style.borderColor = 'var(--warn)';
          }

          // Accessible voice announcements at 5:00, 1:00, and 0:00
          if (sec === 300 && announcer) announcer.textContent = 'Room hold alert: 5 minutes remaining to complete payment.';
          if (sec === 60 && announcer) announcer.textContent = 'Room hold alert: 1 minute remaining.';
        }, 1000);

        // Bind Method Tabs
        const btnCard = container.querySelector('#tabPayCard');
        const btnGcash = container.querySelector('#tabPayGcash');
        const btnMaya = container.querySelector('#tabPayMaya');
        const btnBank = container.querySelector('#tabPayBank');
        const cancelHoldBtn = container.querySelector('#btnCancelReleaseHold');

        if (btnCard) btnCard.onclick = () => { paymentMethod = 'card'; inlinePayError = ''; render(); };
        if (btnGcash) btnGcash.onclick = () => { paymentMethod = 'gcash'; inlinePayError = ''; render(); };
        if (btnMaya) btnMaya.onclick = () => { paymentMethod = 'maya'; inlinePayError = ''; render(); };
        if (btnBank) btnBank.onclick = () => { paymentMethod = 'bank'; inlinePayError = ''; render(); };

        if (cancelHoldBtn) {
          cancelHoldBtn.onclick = () => {
            cleanupTimers();
            if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
              PUPSJ_Services.HoldService.releaseHold(activeHold.holdId);
            }
            activeHold = null;
            toast('Room hold released.', 'info');
            currentStep = 1;
            render();
          };
        }

        bindPaymentMethodEvents(container);
      };

      const renderPaymentMethodForm = (quote) => {
        const depAmt = peso(quote.depositDue);

        if (paymentMethod === 'card') {
          return `
            <form id="cardPayForm" onsubmit="return false;">
              <div class="field">
                <label for="payCardName">Cardholder Full Name *</label>
                <input type="text" id="payCardName" value="${esc(guestName)}" placeholder="Maria Santos" required autocomplete="cc-name">
              </div>
              <div class="field">
                <label for="payCardNumber">Credit / Debit Card Number *</label>
                <input type="text" id="payCardNumber" placeholder="4242 4242 4242 4242" maxlength="19" required autocomplete="cc-number">
              </div>
              <div class="field-row-2">
                <div class="field">
                  <label for="payCardExp">Expiry Date (MM/YY) *</label>
                  <input type="text" id="payCardExp" placeholder="12/28" maxlength="5" required autocomplete="cc-exp">
                </div>
                <div class="field">
                  <label for="payCardCvv">CVV Security Code *</label>
                  <input type="password" id="payCardCvv" placeholder="123" maxlength="4" required autocomplete="cc-csc">
                </div>
              </div>

              ${CONFIG.demoLogins ? `
                <details style="margin: 10px 0; font-size: 12px; background: var(--surface-2); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line);">
                  <summary style="cursor: pointer; font-weight: 600; color: var(--gold-ink);">Demo Test Cards (Click to auto-fill)</summary>
                  <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4242424242424242" data-exp="12/28" data-cvv="123" style="color: var(--ok); text-decoration: underline;">4242 4242 4242 4242 &middot; Succeeded</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000000002" data-exp="12/28" data-cvv="123" style="color: var(--warn); text-decoration: underline;">4000 0000 0000 0002 &middot; Card Declined</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000009995" data-exp="12/28" data-cvv="123" style="color: var(--warn); text-decoration: underline;">4000 0000 0000 9995 &middot; Insufficient Funds</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000000069" data-exp="01/20" data-cvv="123" style="color: var(--bad); text-decoration: underline;">4000 0000 0000 0069 &middot; Expired Card</a>
                  </div>
                </details>
              ` : ''}

              <button type="button" class="btn btn-block" id="btnSubmitCardPayment" style="margin-top: 10px;">
                Pay Down Payment ${depAmt} &rarr;
              </button>
            </form>
          `;
        }

        if (paymentMethod === 'gcash' || paymentMethod === 'maya') {
          const brand = paymentMethod === 'gcash' ? 'GCash' : 'Maya';
          return `
            <div style="text-align: center; padding: 10px 0;">
              <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Mobile Phone Icon - Insert mobile wallet phone graphic here]</div>
              <h4 style="margin: 0 0 6px; font-size: 16px;">Simulated ${brand} E-Wallet Authorization</h4>
              <p class="text-secondary text-sm" style="margin: 0 auto 14px; max-width: 400px;">
                Authenticate down payment of <b>${depAmt}</b> via your registered mobile number (${esc(guestPhone)}).
              </p>
              <button type="button" class="btn" id="btnOpenWalletSheet">
                Open Simulated ${brand} Sheet &rarr;
              </button>
            </div>
          `;
        }

        if (paymentMethod === 'bank') {
          const banks = [
            'BDO Unibank',
            'BPI (Bank of the Philippine Islands)',
            'Metrobank',
            'UnionBank of the Philippines',
            'Landbank of the Philippines',
            'RCBC',
            'Security Bank'
          ];
          const refCode = `PUP-${activeHold.holdId}`;
          return `
            <div>
              <div style="margin-bottom: 12px;">
                <label for="bankSelect" style="font-size: 13px; font-weight: 600;">Select Originating Bank</label>
                <select id="bankSelect" style="margin-top: 4px;">
                  ${banks.map(b => `<option value="${b}" ${b === selectedBank ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
              </div>

              <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 14px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Reference Code:</span>
                  <b style="font-family: monospace;">${refCode}</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Settlement Amount:</span>
                  <b style="color: var(--gold-ink);">${depAmt}</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Payment Window:</span>
                  <span>${CONFIG.bankHoldMinutes || 30} Minutes (Auto-confirmed upon callback)</span>
                </div>
              </div>

              <!-- QR Ph Code Placeholder -->
              <div style="text-align: center; margin: 14px 0;">
                <div style="display: inline-block; padding: 14px; background: #fff; border-radius: 8px; border: 1px solid var(--line); color: #000; font-family: monospace; font-size: 11px;">
                  <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600; color: #333;">[PLACEHOLDER: Phone Device Icon - Insert mobile QR scanner graphic here]</div>
                  <div style="font-weight: 700; margin-top: 4px;">[IMAGE: QR Ph code, 1:1]</div>
                  <div style="font-size: 10px; color: #555;">Scan with any PH banking app</div>
                </div>
              </div>

              <div style="text-align: center;">
                <button type="button" class="btn" id="btnLaunchBankSheet">
                  Launch Simulated Online Banking / QR Ph Gateway &rarr;
                </button>
              </div>
            </div>
          `;
        }
      };

      const bindPaymentMethodEvents = (container) => {
        // 1. Card Auto-Fill & Submission
        container.querySelectorAll('.demo-card-fill').forEach(link => {
          link.onclick = () => {
            const num = link.dataset.card;
            const exp = link.dataset.exp;
            const cvv = link.dataset.cvv;
            const numInp = container.querySelector('#payCardNumber');
            const expInp = container.querySelector('#payCardExp');
            const cvvInp = container.querySelector('#payCardCvv');
            if (numInp) numInp.value = num;
            if (expInp) expInp.value = exp;
            if (cvvInp) cvvInp.value = cvv;
          };
        });

        const submitCardBtn = container.querySelector('#btnSubmitCardPayment');
        if (submitCardBtn) {
          submitCardBtn.onclick = () => {
            const name = (container.querySelector('#payCardName')?.value || '').trim();
            const cardNumber = (container.querySelector('#payCardNumber')?.value || '').trim();
            const exp = (container.querySelector('#payCardExp')?.value || '').trim();
            const cvv = (container.querySelector('#payCardCvv')?.value || '').trim();

            if (!name || !cardNumber || !exp || !cvv) {
              toast('Please complete all card details', 'warn');
              return;
            }

            submitCardBtn.disabled = true;
            submitCardBtn.textContent = 'Processing Payment…';

            try {
              const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, 'card', {
                name,
                cardNumber,
                exp,
                cvv
              });

              if (res.ok || res.success) {
                cleanupTimers();
                confirmedReservation = res.data || res.reservation;
                currentStep = 5;
                render();
              } else {
                attemptsMade = res.attempts;
                inlinePayError = res.error || 'Card transaction declined';
                if (res.holdExpired) {
                  renderHoldExpired(container);
                } else {
                  render();
                }
              }
            } catch (err) {
              submitCardBtn.disabled = false;
              submitCardBtn.textContent = `Pay Down Payment ${peso(quote.depositDue)} →`;
              inlinePayError = err.message || 'Payment failed';
              render();
            }
          };
        }

        // 2. GCash / Maya Simulated Sheet
        const walletBtn = container.querySelector('#btnOpenWalletSheet');
        if (walletBtn) {
          walletBtn.onclick = () => {
            const brand = paymentMethod === 'gcash' ? 'GCash' : 'Maya';
            const depAmt = peso(quote.depositDue);
            const ref = 'PUP-WALLET-' + Date.now().toString().slice(-6);

            const sheetHtml = `
              <div style="text-align: center; padding: 10px 0;">
                <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Payment Card Icon - Insert credit card / payment method icon here]</div>
                <h3 style="margin: 0 0 4px; font-size: 20px;">${brand} Express Checkout</h3>
                <p class="text-secondary text-sm" style="margin: 0 0 16px;">
                  Merchant: <b>${CONFIG.hotelName}</b> &middot; Ref: <b>${ref}</b>
                </p>
                <div style="background: var(--surface-2); padding: 14px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
                  <div class="text-xs text-secondary">Authorized Payment Amount</div>
                  <div style="font-size: 24px; font-weight: 700; color: var(--gold-ink);">${depAmt}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="btn" id="btnApproveWallet">Approve Down Payment</button>
                  <button type="button" class="btn-secondary" id="btnDeclineWallet">Simulate Declined Payment</button>
                  <button type="button" class="btn-ghost" id="btnCancelWallet">Cancel</button>
                </div>
              </div>
            `;

            showModal(`${brand} Authorization`, sheetHtml, '', {
              maxWidth: '420px',
              onOpen(subModal) {
                const approveBtn = subModal.querySelector('#btnApproveWallet');
                const declineBtn = subModal.querySelector('#btnDeclineWallet');
                const cancelBtn = subModal.querySelector('#btnCancelWallet');

                if (approveBtn) {
                  approveBtn.onclick = () => {
                    closeModal();
                    const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, paymentMethod, {
                      phone: guestPhone,
                      outcome: 'paid',
                      ref
                    });
                    if (res.ok || res.success) {
                      cleanupTimers();
                      confirmedReservation = res.data || res.reservation;
                      currentStep = 5;
                      render();
                    } else {
                      attemptsMade = res.attempts;
                      inlinePayError = res.error || 'Payment failed';
                      render();
                    }
                  };
                }

                if (declineBtn) {
                  declineBtn.onclick = () => {
                    closeModal();
                    const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, paymentMethod, {
                      phone: guestPhone,
                      outcome: 'declined',
                      ref
                    });
                    attemptsMade = res.attempts;
                    inlinePayError = res.error || 'Payment declined by e-wallet provider';
                    render();
                  };
                }

                if (cancelBtn) {
                  cancelBtn.onclick = () => closeModal();
                }
              }
            });
          };
        }

        // 3. Bank Transfer Simulated Gateway Sheet
        const bankSelect = container.querySelector('#bankSelect');
        if (bankSelect) {
          bankSelect.onchange = () => {
            selectedBank = bankSelect.value;
          };
        }

        const launchBankBtn = container.querySelector('#btnLaunchBankSheet');
        if (launchBankBtn) {
          launchBankBtn.onclick = () => {
            // Initiates hold extension to bankHoldMinutes and creates AwaitingBank intent
            const initRes = PUPSJ_Services.PaymentService.pay(activeHold.holdId, 'bank', {
              bankName: selectedBank
            });

            const intent = initRes?.intent || initRes?.data;
            if (!initRes || (!initRes.success && !initRes.ok) || !intent) {
              toast(initRes?.error || 'Unable to open bank transfer gateway', 'bad');
              return;
            }

            activeIntent = intent;

            // Start polling PaymentIntent status every 2s
            if (!pollInterval) {
              pollInterval = setInterval(() => {
                if (!activeIntent) return;
                const freshIntent = PUPSJ_Services.PaymentService.getIntent(activeIntent.intentId);
                if (freshIntent && freshIntent.status === 'Succeeded') {
                  cleanupTimers();
                  const allRes = Data.getReservations();
                  const targetRes = allRes.find(r => r.holdId === activeHold.holdId) || (typeof Data.findRes === 'function' ? Data.findRes(freshIntent.holdId) : null);
                  confirmedReservation = targetRes || allRes[0];
                  currentStep = 5;
                  render();
                }
              }, 2000);
            }

            const depAmt = peso(quote.depositDue);
            const refCode = `PUP-${activeHold.holdId}`;

            const bankSheetHtml = `
              <div style="text-align: center; padding: 10px 0;">
                <h3 style="margin: 0 0 4px; font-size: 20px;">${esc(selectedBank)} Gateway</h3>
                <p class="text-secondary text-sm" style="margin: 0 0 14px;">
                  Simulated Online Banking / QR Ph Webhook Simulator
                </p>

                <div style="background: #fff; color: #111; padding: 14px; border-radius: 8px; border: 1px solid var(--line); display: inline-block; margin-bottom: 14px;">
                  <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600; color: #333;">[PLACEHOLDER: Phone Device Icon - Insert mobile QR scanner graphic here]</div>
                  <div style="font-family: monospace; font-size: 11px; font-weight: 700;">[IMAGE: QR Ph code, 1:1]</div>
                  <div style="font-size: 12px; margin-top: 4px;">Ref: <b>${refCode}</b> &middot; <b>${depAmt}</b></div>
                </div>

                <div id="bankSheetStatus" class="text-sm" style="margin-bottom: 14px; min-height: 20px; color: var(--gold-ink); font-weight: 600;">
                  Awaiting your online banking action…
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="btn" id="btnApproveBankCallback">
                    Approve Payment (2-4s Webhook Callback)
                  </button>
                  <button type="button" class="btn-secondary" id="btnDeclineBankCallback">
                    Decline Payment
                  </button>
                  <button type="button" class="btn-ghost" id="btnCloseBankSheet">
                    Close Sheet (Keep Waiting)
                  </button>
                </div>
              </div>
            `;

            showModal('Bank Gateway Simulator', bankSheetHtml, '', {
              maxWidth: '440px',
              onOpen(bModal) {
                const approveBtn = bModal.querySelector('#btnApproveBankCallback');
                const declineBtn = bModal.querySelector('#btnDeclineBankCallback');
                const closeBtn = bModal.querySelector('#btnCloseBankSheet');
                const statusDiv = bModal.querySelector('#bankSheetStatus');

                if (approveBtn) {
                  approveBtn.onclick = () => {
                    approveBtn.disabled = true;
                    if (statusDiv) statusDiv.innerHTML = 'Simulating secure bank gateway confirmation callback (2.5s)…';

                    setTimeout(() => {
                      const callbackRes = PUPSJ_Services.PaymentService.bankCallback(
                        activeIntent.intentId,
                        'paid',
                        'BNK-REF-' + Date.now()
                      );
                      closeModal();
                      if (callbackRes.success) {
                        cleanupTimers();
                        confirmedReservation = callbackRes.reservation;
                        currentStep = 5;
                        render();
                      } else {
                        inlinePayError = callbackRes.error || 'Bank confirmation failed';
                        render();
                      }
                    }, 2500);
                  };
                }

                if (declineBtn) {
                  declineBtn.onclick = () => {
                    PUPSJ_Services.PaymentService.bankCallback(activeIntent.intentId, 'declined');
                    closeModal();
                    attemptsMade += 1;
                    inlinePayError = 'Bank transfer declined by provider';
                    render();
                  };
                }

                if (closeBtn) closeBtn.onclick = () => closeModal();
              }
            });
          };
        }
      };

      const renderHoldExpired = (container) => {
        cleanupTimers();
        container.innerHTML = `
          ${renderStepsNav()}
          <div style="text-align: center; padding: 24px 0;">
            <div style="font-size: 13px; font-weight: 600; color: var(--warn); margin-bottom: 8px;">[PLACEHOLDER: Timer Expired Icon - Insert hold timeout hourglass / clock SVG here]</div>
            <h3 style="font-size: 22px; font-family: 'Cormorant Garamond', serif; margin: 0 0 6px;">Room Inventory Hold Expired</h3>
            <p class="text-secondary text-sm" style="max-width: 440px; margin: 0 auto 18px;">
              The temporary reservation hold has timed out to allow other guests access to room inventory. Your search criteria has been safely preserved.
            </p>
            <button type="button" class="btn" id="btnCheckAvailAgain">
              Check Availability Again &rarr;
            </button>
          </div>
        `;

        const btnAgain = container.querySelector('#btnCheckAvailAgain');
        if (btnAgain) {
          btnAgain.onclick = () => {
            activeHold = null;
            activeIntent = null;
            inlinePayError = '';
            currentStep = 1;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 5: CONFIRMED (Instant Confirmation, Voucher, OR, Email)
      // ─────────────────────────────────────────────────────────────
      const renderStep5 = (container) => {
        cleanupTimers();
        const r = confirmedReservation || (typeof Data !== 'undefined' ? Data.getReservations()[0] : null);
        if (!r) {
          container.innerHTML = '<p class="text-secondary">Reservation confirmed.</p>';
          return;
        }

        const quote = r.quoteSnapshot || getQuote();
        const orNumber = (r.payments && r.payments[0] && r.payments[0].or) ? r.payments[0].or : ('OR-' + r.c.replace(/\D/g, ''));
        const nts = typeof Data !== 'undefined' && Data.nts ? Data.nts(r) : quote.nights;

        container.innerHTML = `
          ${renderStepsNav()}

          <div style="text-align: center; padding: 6px 0 14px;">
            <span class="pill pill--ok" style="font-size: 13px; padding: 4px 14px;">Instant Online Booking Confirmed</span>
            <h2 style="margin: 10px 0 2px; font-size: 34px; font-family: 'Cormorant Garamond', serif;">${r.c}</h2>
            <p class="text-secondary" style="font-size: 14px; margin: 0;">
              Thank you, <b>${esc(r.g)}</b>! Your room reservation is guaranteed.
            </p>
          </div>

          <div class="card card-sm" style="margin: 0 0 16px; text-align: left; background-color: var(--surface-2); font-size: 13px; border: 1px solid var(--line);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><b>Room Category:</b> ${esc(r.t)} ${r.n ? `(Room ${r.n})` : '(Assigned at Check-in)'}</div>
              <div><b>Stay Period:</b> ${fmtDate(r.i)} – ${fmtDate(r.o)} (${nts} nights)</div>
              <div><b>Registered Guests:</b> ${r.gu} guest${r.gu > 1 ? 's' : ''}</div>
              <div><b>Status:</b> <span class="pill pill--ok">${r.st}</span></div>
              <div><b>Total Tariff:</b> ${peso(quote.total)}</div>
              <div><b>Deposit Settled:</b> <span style="color: var(--ok); font-weight: 600;">${peso(r.depositPaid || quote.depositDue)} (${r.depositPct || CONFIG.depositPct}% down payment)</span></div>
              <div><b>Official Receipt:</b> <b style="font-family: monospace;">${orNumber}</b></div>
              <div><b>Balance Due:</b> <span style="color: var(--bad); font-weight: 600;">${peso(r.balanceDue || quote.balanceDue)} at check-in</span></div>
            </div>
            <div style="border-top: 1px solid var(--line); margin-top: 10px; padding-top: 8px; font-size: 11px; color: var(--ink-3);">
              Confirmed by <b>${esc(r.confirmedBy || 'System (payment)')}</b> &middot; Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival.
            </div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="../guest/guest-portal.html?code=${r.c}&tab=reservations" class="btn">
              View in My Reservations &rarr;
            </a>
            <button type="button" class="btn-secondary" id="btnBmPrintVoucher">
              <span class="ic" data-icon="print">[ICON: print]</span> Print Voucher
            </button>
            <button type="button" class="btn-ghost" id="btnBmSimEmail">
              Simulated Email Preview
            </button>
          </div>
        `;

        const printBtn = container.querySelector('#btnBmPrintVoucher');
        const emailBtn = container.querySelector('#btnBmSimEmail');

        if (printBtn) {
          printBtn.onclick = () => openVoucherModal(r.c);
        }
        if (emailBtn) {
          emailBtn.onclick = () => openSimulatedEmailModal(r.c);
        }

        if (typeof onComplete === 'function') {
          try { onComplete(r); } catch (e) {}
        }
      };

      // Initial Render
      render();
    }
  });
}

// ─── Voucher Modal with [PLACEHOLDER: Watermark SIMULATED] ───
function openVoucherModal(resCode) {
  const r = typeof Data !== 'undefined' && Data.findRes ? Data.findRes(resCode) : null;
  if (!r) {
    toast('Reservation not found', 'bad');
    return;
  }
  const nts = typeof Data !== 'undefined' && Data.nts ? Data.nts(r) : 1;
  const quote = r.quoteSnapshot || { total: Data.tot(r), depositDue: r.depositPaid, balanceDue: r.balanceDue };
  const orNumber = (r.payments && r.payments[0] && r.payments[0].or) ? r.payments[0].or : ('OR-' + r.c.replace(/\D/g, ''));

  const voucherHtml = `
    <div style="position: relative; padding: 16px; font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px;">
      <!-- Simulated Watermark Overlay -->
      <div style="position: absolute; top: 38%; left: 18%; transform: rotate(-25deg); font-size: 38px; font-weight: 800; color: rgba(184, 137, 26, 0.15); pointer-events: none; border: 4px dashed rgba(184, 137, 26, 0.2); padding: 8px 24px; text-transform: uppercase;">
        [PLACEHOLDER: Watermark SIMULATED]
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: var(--gold-ink); font-family: 'Cormorant Garamond', serif;">${CONFIG.hotelName}</h2>
          <div style="font-size: 11px; color: #555;">Official Online Reservation Voucher</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 15px; font-weight: 700; color: var(--ok);">GUARANTEED</div>
          <div style="font-size: 12px; font-weight: 600;">Code: ${r.c}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 14px;">
        <div><b>Guest Name:</b> ${esc(r.g)}</div>
        <div><b>Contact Phone:</b> ${esc(r.ph || 'On file')}</div>
        <div><b>Room Category:</b> ${esc(r.t)} (Room ${r.n || 'TBD'})</div>
        <div><b>Stay Duration:</b> ${fmtDate(r.i)} – ${fmtDate(r.o)} (${nts} nights)</div>
        <div><b>Registered Guests:</b> ${r.gu} guest(s)</div>
        <div><b>Deposit Receipt:</b> ${orNumber}</div>
      </div>

      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 10px; font-size: 12px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between;"><span>Total Accommodation Tariff:</span><b>${peso(quote.total)}</b></div>
        <div style="display: flex; justify-content: space-between; color: var(--ok);"><span>Deposit Settled (${r.depositPct || CONFIG.depositPct}%):</span><b>&minus; ${peso(r.depositPaid || quote.depositDue)}</b></div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 4px; margin-top: 4px; font-weight: 700; color: var(--bad);">
          <span>Balance Due at Check-in:</span><span>${peso(r.balanceDue || quote.balanceDue)}</span>
        </div>
      </div>

      <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
        <b>Cancellation Policy:</b> Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction. No-shows are not refunded.
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;" class="no-print">
        <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
        <button type="button" class="btn" onclick="window.print()"><span class="ic" data-icon="print">[ICON: print]</span> Print Voucher</button>
      </div>
    </div>
  `;

  showModal(`Reservation Voucher &mdash; ${r.c}`, voucherHtml, '', { maxWidth: '540px' });
}

// ─── Simulated Confirmation Email Preview ───
function openSimulatedEmailModal(resCode) {
  const r = typeof Data !== 'undefined' && Data.findRes ? Data.findRes(resCode) : null;
  if (!r) return;
  const quote = r.quoteSnapshot || { total: Data.tot(r), depositDue: r.depositPaid, balanceDue: r.balanceDue };

  const emailHtml = `
    <div style="background: var(--surface); padding: 14px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px;">
      <div style="border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 12px; font-size: 12px;">
        <div><b>From:</b> PUPSJ Hotel Reservations &lt;reservations@pupsjhotel.com&gt;</div>
        <div><b>To:</b> ${esc(r.email || r.g + '@guest.com')}</div>
        <div><b>Date:</b> ${new Date().toLocaleString()}</div>
        <div><b>Subject:</b> Booking Confirmed: Your Stay at PUPSJ Hotel (${r.c})</div>
      </div>

      <p>Dear ${esc(r.g)},</p>
      <p>Thank you for choosing ${CONFIG.hotelName}. Your reservation is officially confirmed upon receipt of your 50% deposit payment.</p>
      
      <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); margin: 12px 0;">
        <div><b>Confirmation Code:</b> ${r.c}</div>
        <div><b>Room Category:</b> ${esc(r.t)}</div>
        <div><b>Arrival:</b> ${fmtDate(r.i)} from 2:00 PM</div>
        <div><b>Departure:</b> ${fmtDate(r.o)} until 12:00 PM</div>
        <div><b>Deposit Paid:</b> ${peso(r.depositPaid || quote.depositDue)} (${r.depositPct || CONFIG.depositPct}%)</div>
        <div><b>Balance Due at Check-in:</b> ${peso(r.balanceDue || quote.balanceDue)}</div>
      </div>

      <p class="text-xs text-secondary">
        Cancellation Policy: Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction.
      </p>

      <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Close Email</button>
      </div>
    </div>
  `;

  showModal('Simulated Email Preview', emailHtml, '', { maxWidth: '520px' });
}

// ─── Intent Auto-Resume on Page Ready ───
if (typeof window !== 'undefined') {
  window.showAuthGateModal = showAuthGateModal;
  window.openBookingModal = openBookingModal;
  window.openVoucherModal = openVoucherModal;
  window.openSimulatedEmailModal = openSimulatedEmailModal;

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
  const canCheckIn = r.st === 'Confirmed' && isClean && (paid >= (r.depositRequired != null ? r.depositRequired : Data.depAmt(r)));
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
      const isFree = diff >= (CONFIG.freeCancelDays || 3);
      const policyNotice = isFree
        ? `Full deposit refund will be issued under ${CONFIG.freeCancelDays || 3}-day policy.`
        : `${CONFIG.lateCancelFeePct || 30}% late cancellation deduction will apply under policy.`;

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
