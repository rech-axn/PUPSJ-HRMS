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

      // Authenticate through central AuthService with lockout & salted SHA-256
      const authRes = (typeof AuthService !== 'undefined')
        ? AuthService.login(email, pass)
        : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.AuthService.login(email, pass) : null);

      if (authRes && authRes.ok) {
        const session = authRes.data;
        if (session.role === 'superadmin') {
          toast(`Welcome back, Superadmin (${session.name}).`, 'ok');
          const dest = safeNextUrl || '../management/dashboard.html';
          setTimeout(() => { location.href = dest; }, 350);
        } else {
          toast(`Welcome back, ${session.name}.`, 'ok');
          const dest = resolvePostAuthRedirect(false, session);
          setTimeout(() => { location.href = dest; }, 350);
        }
        return;
      }

      if (authRes && !authRes.ok) {
        toast(authRes.error, 'bad');
        return;
      }

      // Fallback
      toast('Invalid email or password.', 'bad');
    };
  }

  
  // ─── Real Forgot Password Simulation Flow ───
  const btnForgot = $('btnForgotPass');
  if (btnForgot) {
    btnForgot.onclick = () => openForgotPasswordModal();
  }

  function openForgotPasswordModal() {
    const bodyHtml = `
      <div style="font-size: 13px;">
        <p class="text-sm text-secondary" style="margin-bottom: 14px;">
          Enter your registered email address to receive a simulated one-time password reset token.
        </p>
        <form id="forgotPassForm" onsubmit="return false;">
          <div class="field" style="margin-bottom: 14px;">
            <label for="forgotEmail">Registered Account Email *</label>
            <input type="email" id="forgotEmail" required placeholder="e.g. ana.delacruz@example.com">
          </div>
          <button type="submit" class="btn btn-block" id="btnRequestResetToken">Generate Reset Token &rarr;</button>
        </form>
      </div>
    `;

    showModal('Forgot Password Recovery', bodyHtml, '', {
      maxWidth: '460px',
      onOpen: modalEl => {
        const form = modalEl.querySelector('#forgotPassForm');
        if (form) {
          form.onsubmit = () => {
            const email = modalEl.querySelector('#forgotEmail').value.trim().toLowerCase();
            const guestAccs = Data.getGuestAccounts();
            const adminAccs = store.get('adminAccounts', []);
            const isGuest = guestAccs.find(g => g.email.toLowerCase() === email);
            const isAdmin = adminAccs.find(a => a.email.toLowerCase() === email);

            if (!isGuest && !isAdmin) {
              toast('No registered account found with this email address.', 'bad');
              return;
            }

            const token = 'RST-' + Math.floor(100000 + Math.random() * 900000);
            store.set('_resetToken_' + email, {
              token,
              expires: Date.now() + 15 * 60 * 1000
            });

            closeModal();
            showSimulatedEmailModal(email, token);
          };
        }
      }
    });
  }

  function showSimulatedEmailModal(email, token) {
    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="background: var(--surface-2); border: 1px solid var(--line); border-radius: 4px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--gold-ink); font-weight: 600; margin-bottom: 4px;">Simulated Email Dispatch</div>
          <div style="margin-bottom: 4px;"><b>To:</b> ${esc(email)}</div>
          <div style="margin-bottom: 8px;"><b>Subject:</b> Password Reset Token for PUPSJ Account</div>
          <hr style="border: none; border-top: 1px dashed var(--line); margin: 8px 0;">
          <p style="margin: 0 0 8px 0;">Hello,</p>
          <p style="margin: 0 0 10px 0;">You requested a password reset. Use the one-time token below within 15 minutes:</p>
          <div style="background: var(--surface); border: 1px solid var(--gold); border-radius: 4px; padding: 10px; text-align: center; font-size: 20px; font-weight: 700; letter-spacing: 2px; color: var(--gold-ink);">
            ${token}
          </div>
        </div>

        <button type="button" class="btn btn-block" id="btnProceedToReset">Proceed to Enter Token &amp; New Password &rarr;</button>
      </div>
    `;

    showModal('Simulated Email Received', bodyHtml, '', {
      maxWidth: '480px',
      onOpen: modalEl => {
        const btnProceed = modalEl.querySelector('#btnProceedToReset');
        if (btnProceed) {
          btnProceed.onclick = () => {
            closeModal();
            showResetPasswordFormModal(email, token);
          };
        }
      }
    });
  }

  function showResetPasswordFormModal(email, defaultToken) {
    const bodyHtml = `
      <form id="resetPassExecForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field" style="margin-bottom: 12px;">
          <label for="resetTokenInp">One-Time Token *</label>
          <input type="text" id="resetTokenInp" value="${defaultToken}" required placeholder="e.g. RST-123456">
        </div>
        <div class="field" style="margin-bottom: 12px;">
          <label for="resetNewPass">New Password (Min. 8 characters) *</label>
          <input type="password" id="resetNewPass" required minlength="8" placeholder="Enter new secure password">
        </div>
        <div class="field" style="margin-bottom: 18px;">
          <label for="resetConfirmPass">Confirm New Password *</label>
          <input type="password" id="resetConfirmPass" required minlength="8" placeholder="Re-type new password">
        </div>
        <button type="submit" class="btn btn-block" id="btnSubmitResetPass">Update Password &rarr;</button>
      </form>
    `;

    showModal('Set New Password', bodyHtml, '', {
      maxWidth: '440px',
      onOpen: modalEl => {
        const form = modalEl.querySelector('#resetPassExecForm');
        if (form) {
          form.onsubmit = () => {
            const tokenInp = modalEl.querySelector('#resetTokenInp').value.trim();
            const newPass = modalEl.querySelector('#resetNewPass').value;
            const confirmPass = modalEl.querySelector('#resetConfirmPass').value;

            const stored = store.get('_resetToken_' + email);
            if (!stored || stored.token !== tokenInp) {
              toast('Invalid or expired reset token.', 'bad');
              return;
            }

            if (Date.now() > stored.expires) {
              toast('Token has expired. Please request a new token.', 'bad');
              return;
            }

            if (newPass !== confirmPass) {
              toast('Passwords do not match.', 'bad');
              return;
            }

            if (newPass.length < 8) {
              toast('Password must be at least 8 characters long.', 'bad');
              return;
            }

            // Update account
            const Crypto = window.PUPSJ_Crypto;
            const salt = Crypto ? Crypto.generateSalt() : 'salt';
            const hash = Crypto ? Crypto.hashPassword(newPass, salt) : newPass;

            const guestAccs = Data.getGuestAccounts();
            const guest = guestAccs.find(g => g.email.toLowerCase() === email);
            if (guest) {
              guest.salt = salt;
              guest.passwordHash = hash;
              guest.password = newPass;
              Data.saveGuestAccounts(guestAccs);
            }

            const adminAccs = store.get('adminAccounts', []);
            const admin = adminAccs.find(a => a.email.toLowerCase() === email);
            if (admin) {
              admin.salt = salt;
              admin.passwordHash = hash;
              store.set('adminAccounts', adminAccs);
            }

            store.remove('_resetToken_' + email);
            Data.audit('Password Reset', 'Auth', email, 'Password reset via simulated token');
            closeModal();
            toast('Password reset successfully! Please sign in.', 'ok');
            if ($('loginEmail')) $('loginEmail').value = email;
            if ($('loginPassword')) $('loginPassword').value = '';
          };
        }
      }
    });
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

      const Crypto = window.PUPSJ_Crypto;
      const salt = Crypto ? Crypto.generateSalt() : 'legacy_salt';
      const passwordHash = Crypto ? Crypto.hashPassword(pass, salt) : pass;

      const guests = Data.getGuestAccounts();
      const newGuest = {
        name,
        email,
        phone,
        salt,
        passwordHash,
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
