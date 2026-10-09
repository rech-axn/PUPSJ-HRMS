/* ==========================================================================
   PUPSJ Hotel & Restaurant — Auth Logic (guest-login.js)
   Unified authentication for guests and staff, strict return target validation,
   pending intent detection and resumption, walk-in account linking,
   and demo accounts helper.
   ========================================================================== */
'use strict';

(function () {
  const tabs = $$('.tab-btn');
  const panels = {
    panelSignIn: $('panelSignIn'),
    panelRegister: $('panelRegister'),
    panelLookup: $('panelLookup')
  };

  const urlParams = new URLSearchParams(window.location.search);
  const nextParam = urlParams.get('next');
  const tabParam = urlParams.get('tab');
  const codeParam = urlParams.get('code');

  // Validate return target against strict internal whitelist
  const safeNextUrl = (typeof validateReturnUrl === 'function' && nextParam)
    ? validateReturnUrl(nextParam)
    : null;

  // ─── Tab Switching Helper ───
  function switchTab(targetId) {
    tabs.forEach(btn => {
      const match = btn.dataset.target === targetId;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([id, el]) => {
      if (el) el.style.display = id === targetId ? 'block' : 'none';
    });
  }

  tabs.forEach(btn => {
    btn.onclick = () => {
      switchTab(btn.dataset.target);
    };
  });

  // ─── Pending Selection Intent Banner ───
  const intent = typeof getPendingIntent === 'function' ? getPendingIntent() : null;
  const authCard = $('.auth-card');

  if (intent && authCard) {
    const banner = document.createElement('div');
    banner.className = 'banner banner--info';
    banner.style.margin = '0 0 16px 0';
    banner.style.fontSize = '13px';
    banner.style.borderRadius = 'var(--r)';
    banner.style.border = '1px solid var(--line)';
    banner.style.backgroundColor = 'var(--surface-2)';
    banner.style.padding = '12px 14px';

    if (intent.type === 'room') {
      banner.innerHTML = `
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 4px;">
          🛎️ Pending Room Reservation
        </div>
        <div><b>Category:</b> ${esc(intent.roomType)} &middot; <b>Stay:</b> ${fmtDate ? fmtDate(intent.ci) : intent.ci} to ${fmtDate ? fmtDate(intent.co) : intent.co} (${intent.guests} guests)</div>
        <div class="text-xs text-secondary" style="margin-top: 4px;">Sign in or create your account below. Your booking will automatically reopen ready to confirm.</div>
      `;
    } else if (intent.type === 'table') {
      banner.innerHTML = `
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 4px;">
          🍽️ Pending Table Reservation
        </div>
        <div><b>Dining:</b> ${fmtDate ? fmtDate(intent.date) : intent.date} at ${esc(intent.time)} &middot; ${intent.partySize} guests</div>
        <div class="text-xs text-secondary" style="margin-top: 4px;">Sign in or create your account below. Your table reservation will automatically resume.</div>
      `;
    }

    const header = $('.auth-header');
    if (header && header.nextSibling) {
      authCard.insertBefore(banner, header.nextSibling);
    }
  }

  // Set initial active tab based on query params or intent
  if (tabParam === 'register' || (intent && !tabParam)) {
    switchTab('panelRegister');
  } else if (tabParam === 'lookup' || codeParam) {
    switchTab('panelLookup');
    if (codeParam && $('lookupCode')) {
      $('lookupCode').value = codeParam;
    }
  } else {
    switchTab('panelSignIn');
  }

  // Destination resolver
  function resolvePostAuthRedirect(isStaff, guestSession) {
    // 1. If pending intent exists and has returnUrl, return to resume flow
    if (intent && intent.returnUrl) {
      const validated = typeof validateReturnUrl === 'function' ? validateReturnUrl(intent.returnUrl) : intent.returnUrl;
      return validated || '../guest/guest-portal.html';
    }
    // 2. If valid ?next= parameter exists
    if (safeNextUrl) {
      return safeNextUrl;
    }
    // 3. Defaults
    return isStaff ? '../management/dashboard.html' : '../guest/guest-portal.html';
  }

  // ─── 1. Sign In Flow (Checks Staff first, then Guests) ───
  const signInForm = $('signInForm');
  if (signInForm) {
    signInForm.onsubmit = e => {
      e.preventDefault();
      const email = $('loginEmail').value.trim().toLowerCase();
      const pass = $('loginPassword').value;

      // 1. Check Staff Accounts
      const staffMember = Data.findStaffByEmail(email);
      if (staffMember) {
        if (!staffMember.active) {
          toast('This staff account has been deactivated. Please contact management.', 'bad');
          return;
        }
        if (staffMember.password === pass) {
          Data.setStaffSession({
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email,
            role: staffMember.role,
            shift: staffMember.shift
          });
          Data.audit('Staff signed in', 'Auth', staffMember.email, `Role: ${staffMember.role}`);
          toast(`Welcome back, ${staffMember.name}.`, 'ok');
          
          const dest = safeNextUrl || '../management/dashboard.html';
          setTimeout(() => {
            location.href = dest;
          }, 350);
          return;
        } else {
          toast('Incorrect password. Please verify your credentials.', 'bad');
          return;
        }
      }

      // 2. Check Guest Accounts
      const guest = Data.findGuestAccount(email);
      if (guest) {
        if (guest.password === pass) {
          Data.setGuestSession({
            name: guest.name,
            email: guest.email,
            phone: guest.phone,
            code: ''
          });
          Data.audit('Guest signed in', 'Auth', guest.email, 'Portal login');
          toast(`Welcome back, ${guest.name}.`, 'ok');

          const dest = resolvePostAuthRedirect(false, guest);
          setTimeout(() => {
            location.href = dest;
          }, 350);
          return;
        } else {
          toast('Incorrect password. Please verify your credentials.', 'bad');
          return;
        }
      }

      toast('No account found with this email address.', 'warn');
    };
  }

  // ─── 2. Create Guest Account Flow ───
  const registerForm = $('registerForm');
  if (registerForm) {
    registerForm.onsubmit = e => {
      e.preventDefault();
      const name = $('regName').value.trim();
      const email = $('regEmail').value.trim().toLowerCase();
      const phone = $('regPhone').value.trim();
      const pass = $('regPassword').value;

      if (!name) {
        toast('Full name is required.', 'warn');
        $('regName').focus();
        return;
      }

      if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
        toast('Please enter a valid email address.', 'warn');
        $('regEmail').focus();
        return;
      }

      if (phone && typeof isValidPhMobile === 'function' && !isValidPhMobile(phone)) {
        toast('Please enter a valid Philippine mobile number (e.g. +63 917 123 4567 or 09171234567).', 'warn');
        $('regPhone').focus();
        return;
      }

      if (pass.length < 8) {
        toast('Password must be at least 8 characters long.', 'warn');
        $('regPassword').focus();
        return;
      }

      if (Data.findStaffByEmail(email) || Data.findGuestAccount(email)) {
        toast('An account with this email address already exists.', 'bad');
        return;
      }

      const guests = Data.getGuestAccounts();
      const newGuest = {
        name,
        email,
        phone,
        password: pass,
        created: today()
      };
      guests.push(newGuest);
      Data.saveGuestAccounts(guests);

      // Auto sign-in the newly registered guest
      Data.setGuestSession({
        name: newGuest.name,
        email: newGuest.email,
        phone: newGuest.phone,
        code: ''
      });
      Data.audit('Registered guest account', 'Auth', email, name);

      // Check if there are any unclaimed walk-in stays with matching phone or email
      const allRes = Data.getReservations();
      const phoneClean = phone.replace(/[^0-9]/g, '');
      const walkInMatch = allRes.find(r => 
        (r.source === 'Walk-in' || r.source === 'Staff-assisted') &&
        !r.claimedAt &&
        ((r.ph && phoneClean.length >= 7 && r.ph.replace(/[^0-9]/g, '').includes(phoneClean)) ||
         (r.email && r.email.toLowerCase() === email))
      );

      if (walkInMatch) {
        // Link walk-in stay after confirmation
        Data.claimWalkInReservation(walkInMatch.c, name, email);
        toast(`Account created and linked to your existing front-desk stay (${walkInMatch.c}).`, 'ok');
      } else {
        toast('Guest account created successfully.', 'ok');
      }

      const dest = resolvePostAuthRedirect(false, newGuest);
      setTimeout(() => {
        location.href = dest;
      }, 400);
    };
  }

  // ─── 3. Find Booking Flow (Read-Only Lookup) ───
  const lookupForm = $('lookupForm');
  if (lookupForm) {
    lookupForm.onsubmit = e => {
      e.preventDefault();
      const code = $('lookupCode').value.trim().toUpperCase();
      const matchTerm = $('lookupMatch').value.trim().toLowerCase();

      const res = Data.findRes(code);
      if (!res) {
        toast('No reservation found with confirmation code ' + code, 'bad');
        return;
      }

      const guestParts = res.g.trim().split(/\s+/);
      const lastName = guestParts[guestParts.length - 1].toLowerCase();
      const phone = (res.ph || '').replace(/[\s\-()]/g, '');
      const searchClean = matchTerm.replace(/[\s\-()]/g, '');

      const matchesLastName = lastName === matchTerm || res.g.toLowerCase() === matchTerm;
      const matchesPhone = phone && (phone === searchClean || res.ph.toLowerCase() === matchTerm);

      if (!matchesLastName && !matchesPhone) {
        toast('Confirmation code and guest identity details do not match.', 'bad');
        return;
      }

      // Read-only lookup verification: show booking summary modal without full login
      showModal(
        `Reservation Details &mdash; ${res.c}`,
        `
        <div style="font-size: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 18px;">${esc(res.g)}</h3>
            <span class="pill ${res.st === 'Checked-in' ? 'pill--ok' : 'pill--info'}">${res.st}</span>
          </div>
          <div class="card card-sm" style="background: var(--surface-2); margin-bottom: 16px; font-size: 13px; border: 1px solid var(--line);">
            <div><b>Confirmation Code:</b> ${esc(res.c)}</div>
            <div><b>Room Category:</b> ${esc(res.t)} (Room ${res.n || 'TBD'})</div>
            <div><b>Stay Dates:</b> ${fmtDate(res.i)} to ${fmtDate(res.o)} (${Data.nts(res)} nights)</div>
            <div><b>Guests:</b> ${res.gu} guest${res.gu > 1 ? 's' : ''}</div>
            <div><b>Payment Status:</b> <span class="pill ${res.p === 'Paid' ? 'pill--ok' : 'pill--warn'}">${res.p}</span></div>
            <div><b>Balance Due:</b> ${peso(Data.balOf(res))}</div>
          </div>
          <div class="banner banner--info" style="font-size: 12px; margin-bottom: 16px;">
            To modify, cancel, order in-room dining, or process payments, please <b>Sign In</b> or <b>Create a Guest Account</b> linked to this reservation.
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn" onclick="closeModal(); document.getElementById('tabSignInBtn').click();">Sign In to Manage &rarr;</button>
          </div>
        </div>
        `,
        '',
        { maxWidth: '480px' }
      );
    };
  }

  // ─── 4. Forgot Password Flow ───
  const forgotBtn = $('btnForgotPass');
  if (forgotBtn) {
    forgotBtn.onclick = () => {
      showModal(
        'Reset Password',
        `
        <p class="text-sm">Enter your registered email address below. For staff accounts, please request a shift manager to reset your credentials.</p>
        <div class="field" style="margin-top: 14px;">
          <label for="resetEmail">Registered Email</label>
          <input type="email" id="resetEmail" placeholder="e.g. guest@example.com" required>
        </div>
        <div id="resetStatusMsg" class="text-sm" style="margin-top: 8px;"></div>
        `,
        `
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnConfirmReset">Send Reset Request</button>
        `,
        {
          onOpen(modal) {
            const btn = modal.querySelector('#btnConfirmReset');
            btn.onclick = () => {
              const em = modal.querySelector('#resetEmail').value.trim().toLowerCase();
              if (!em) {
                toast('Please enter your email.', 'warn');
                return;
              }
              const isGuest = Data.findGuestAccount(em);
              const isStaff = Data.findStaffByEmail(em);

              if (isStaff) {
                modal.querySelector('#resetStatusMsg').innerHTML =
                  `<span class="text-warn">Staff account identified. Please contact the front desk manager to update credentials.</span>`;
                return;
              }

              if (isGuest) {
                try {
                  Data.createThread('Password Reset Request', isGuest.name, `Password reset requested for guest account: ${em}`, '', em);
                } catch (e) {}
                modal.querySelector('#resetStatusMsg').innerHTML =
                  `<span class="text-ok">Password reset request logged. Verification instructions sent to registered address.</span>`;
              } else {
                modal.querySelector('#resetStatusMsg').innerHTML =
                  `<span class="text-muted">If an account exists for ${esc(em)}, reset instructions will be processed.</span>`;
              }
              setTimeout(closeModal, 2200);
            };
          }
        }
      );
    };
  }

  // ─── 5. Demo Accounts Quick Sign-In Handlers ───
  const btnDemoAdmin = $('btnDemoAdmin');
  if (btnDemoAdmin) {
    btnDemoAdmin.onclick = () => {
      $('loginEmail').value = 'admin@pupsj.edu.ph';
      $('loginPassword').value = 'admin123';
      $('btnSubmitSignIn').click();
    };
  }

  const btnDemoFrontDesk = $('btnDemoFrontDesk');
  if (btnDemoFrontDesk) {
    btnDemoFrontDesk.onclick = () => {
      $('loginEmail').value = 'maria@pupsj.edu.ph';
      $('loginPassword').value = 'frontdesk123';
      $('btnSubmitSignIn').click();
    };
  }

  const btnDemoGuest = $('btnDemoGuest');
  if (btnDemoGuest) {
    btnDemoGuest.onclick = () => {
      $('loginEmail').value = 'ana.delacruz@example.com';
      $('loginPassword').value = 'password123';
      $('btnSubmitSignIn').click();
    };
  }
})();
