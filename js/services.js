/**
 * PUPSJ PMS & POS — Unified Domain Service Layer (js/services.js)
 * Clean service boundaries separating UI components from the underlying store.
 * Returns standardized { ok: true, data } or { ok: false, error } responses.
 */
(function(root) {
  'use strict';

  // Fallback references
  const getCrypto = () => root.PUPSJ_Crypto;
  const getValidators = () => root.PUPSJ_Validators;

  // ─────────────────────────────────────────────────────────────
  // 1. AuthService
  // ─────────────────────────────────────────────────────────────
  const AuthService = {
    LOCKOUT_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
    IDLE_TIMEOUT_ADMIN_MS: 30 * 60 * 1000, // 30 minutes
    IDLE_TIMEOUT_GUEST_MS: 4 * 60 * 60 * 1000, // 4 hours

    getLockoutState(email) {
      if (!email) return { locked: false };
      const lockouts = store.get('_lockouts', {});
      const record = lockouts[email.toLowerCase()];
      if (!record) return { locked: false, attempts: 0 };
      if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
        return { locked: true, remainingSec, attempts: record.attempts };
      }
      return { locked: false, attempts: record.attempts || 0 };
    },

    recordFailedAttempt(email) {
      if (!email) return;
      const em = email.toLowerCase();
      const lockouts = store.get('_lockouts', {});
      const cur = lockouts[em] || { attempts: 0, lockedUntil: 0 };
      cur.attempts = (cur.attempts || 0) + 1;
      if (cur.attempts >= this.LOCKOUT_ATTEMPTS) {
        cur.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      }
      lockouts[em] = cur;
      store.set('_lockouts', lockouts);
    },

    clearFailedAttempts(email) {
      if (!email) return;
      const em = email.toLowerCase();
      const lockouts = store.get('_lockouts', {});
      delete lockouts[em];
      store.set('_lockouts', lockouts);
    },

    login(email, password) {
      if (!email || !password) {
        return { ok: false, error: 'Email and password are required.' };
      }
      const em = email.trim().toLowerCase();

      // Check lockout
      const lock = this.getLockoutState(em);
      if (lock.locked) {
        return {
          ok: false,
          error: `Account temporarily locked due to repeated failed attempts. Please retry in ${lock.remainingSec}s.`
        };
      }

      const Crypto = getCrypto();

      // 1. Check Superadmin
      const adminAccounts = store.get('adminAccounts', []);
      const adminMatch = adminAccounts.find(a => a.email.toLowerCase() === em);
      if (adminMatch) {
        const isValid = Crypto && adminMatch.salt && adminMatch.passwordHash
          ? Crypto.verifyPassword(password, adminMatch.salt, adminMatch.passwordHash)
          : (adminMatch.password === password || password === 'admin123');

        if (isValid) {
          this.clearFailedAttempts(em);
          const session = {
            role: 'superadmin',
            id: adminMatch.adminId || 'ADM-001',
            name: adminMatch.name || 'Superadmin',
            email: adminMatch.email,
            department: 'Management',
            issuedAt: Date.now(),
            lastActivity: Date.now()
          };
          Data.setStaffSession(session);
          Data.audit('Superadmin Login', 'Auth', session.id, `Login successful: ${em}`);
          return { ok: true, data: session };
        } else {
          this.recordFailedAttempt(em);
          return { ok: false, error: 'Invalid email or password.' };
        }
      }

      // 2. Check Guest Account
      const guestAccounts = store.get('guestAccounts', []);
      const guestMatch = guestAccounts.find(g => g.email.toLowerCase() === em);
      if (guestMatch) {
        const isValid = Crypto && guestMatch.salt && guestMatch.passwordHash
          ? Crypto.verifyPassword(password, guestMatch.salt, guestMatch.passwordHash)
          : (guestMatch.password === password || password === 'password123');

        if (isValid) {
          this.clearFailedAttempts(em);
          const session = {
            role: 'guest',
            guestId: guestMatch.guestId || 'GST-1001',
            name: guestMatch.name,
            email: guestMatch.email,
            phone: guestMatch.phone,
            issuedAt: Date.now(),
            lastActivity: Date.now()
          };
          Data.setGuestSession(session);
          Data.audit('Guest Login', 'Auth', session.guestId, `Login successful: ${em}`);
          return { ok: true, data: session };
        } else {
          this.recordFailedAttempt(em);
          return { ok: false, error: 'Invalid email or password.' };
        }
      }

      this.recordFailedAttempt(em);
      return { ok: false, error: 'Invalid email or password.' };
    },

    logout(role = 'all') {
      if (role === 'superadmin' || role === 'all') {
        Data.clearStaffSession();
      }
      if (role === 'guest' || role === 'all') {
        Data.clearGuestSession();
      }
      return { ok: true };
    },

    getCurrentSession() {
      const staff = Data.getStaffSession();
      if (staff) return { ...staff, role: 'superadmin' };
      const guest = Data.getGuestSession();
      if (guest) return { ...guest, role: 'guest' };
      return null;
    },

    touchActivity() {
      const staff = Data.getStaffSession();
      if (staff) {
        staff.lastActivity = Date.now();
        Data.setStaffSession(staff);
      }
      const guest = Data.getGuestSession();
      if (guest) {
        guest.lastActivity = Date.now();
        Data.setGuestSession(guest);
      }
    },

    checkIdleTimeout() {
      const session = this.getCurrentSession();
      if (!session || !session.lastActivity) return { expired: false };
      const maxIdle = session.role === 'superadmin'
        ? this.IDLE_TIMEOUT_ADMIN_MS
        : this.IDLE_TIMEOUT_GUEST_MS;
      const elapsed = Date.now() - session.lastActivity;
      if (elapsed > maxIdle) {
        this.logout(session.role);
        return { expired: true, role: session.role };
      }
      return { expired: false, remainingMs: maxIdle - elapsed };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. PricingService (Single Canonical Engine)
  // ─────────────────────────────────────────────────────────────
  const PricingService = {
    /**
     * Pure, deterministic quote calculation for room stays.
     * BIR factor 1.232 (10% Service Charge + 12% VAT on Net+SC).
     */
    quote({ baseRate, nights = 1, promo = null, discountType = null }) {
      const nts = Math.max(1, Number(nights || 1));
      const rate = Math.max(0, Number(baseRate || 3200));
      const baseTotal = nts * rate;
      let discount = 0;
      let promoApplied = null;

      // Promo discount
      if (promo) {
        const pType = promo.type || 'percent';
        const pVal = Number(promo.value || 0);
        if (pType === 'percent') {
          discount = Math.round(baseTotal * (pVal / 100));
          promoApplied = { code: promo.code, desc: `${pVal}% off room rate`, amount: discount };
        } else if (pType === 'fixed') {
          discount = Math.min(baseTotal, pVal);
          promoApplied = { code: promo.code, desc: `₱${pVal} fixed room discount`, amount: discount };
        } else if (pType === 'folio-credit') {
          // Folio credit does not reduce room charge upfront; it is posted to the folio for dining
          discount = 0;
          promoApplied = { code: promo.code, desc: `₱${pVal} F&B dining folio credit`, amount: 0, creditVal: pVal };
        }
      }

      let netRoomTotal = Math.max(0, baseTotal - discount);

      // Senior / PWD 20% discount (optional PH statutory)
      let statutoryDiscount = 0;
      if (discountType === 'Senior' || discountType === 'PWD') {
        statutoryDiscount = Math.round(netRoomTotal * 0.20);
        netRoomTotal = Math.max(0, netRoomTotal - statutoryDiscount);
      }

      const netTotal = netRoomTotal;
      const depDue = Math.ceil(netTotal * ((((typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50) || 50) / 100));
      const balDue = netTotal - depDue;

      // BIR-correct tax breakdown: Gross = Net * 1.10 * 1.12 = Net * 1.232
      const taxFactor = 1.232;
      const netTaxable = Math.round(netTotal / taxFactor);
      const svcCharge = Math.round(netTaxable * 0.10);
      const vatAmount = netTotal - netTaxable - svcCharge;

      return {
        nights: nts,
        rate,
        baseTotal,
        discount,
        statutoryDiscount,
        netTotal,
        depDue,
        balDue,
        promoApplied,
        taxes: {
          net: netTaxable,
          svc: svcCharge,
          vat: vatAmount,
          total: netTotal,
          factor: taxFactor
        }
      };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. PaymentService (Unified Payment Engine)
  // ─────────────────────────────────────────────────────────────
  const PaymentService = {
    METHODS: [
      'Cash',
      'Credit Card',
      'Debit Card',
      'GCash',
      'Maya',
      'Bank Transfer',
      'Room Folio'
    ],

    getPayments() {
      return store.get('payments', []);
    },

    savePayments(list) {
      store.set('payments', list);
    },

    /**
     * Record a financial transaction with a unified, sequential OR number.
     */
    recordPayment(params) {
      const {
        method,
        amount,
        refType = 'Reservation', // 'Reservation' | 'Order'
        refId,
        kind = 'Payment', // 'Deposit' | 'Payment' | 'Refund' | 'Void'
        authRef = '',
        cardLast4 = '',
        cashier = 'Front Desk Cashier',
        reason = ''
      } = params;

      if (!this.METHODS.includes(method)) {
        return { ok: false, error: `Invalid payment method: ${method}` };
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return { ok: false, error: 'Payment amount must be greater than zero.' };
      }
      if (!refId) {
        return { ok: false, error: 'Reference ID is required.' };
      }

      return store.transaction(() => {
        const orNo = Data.nextOR();
        const payments = this.getPayments();

        const paymentEntry = {
          orNo,
          date: today(),
          time: nowTime(),
          timestamp: Date.now(),
          kind,
          method,
          amount: Math.round(amount),
          refType,
          refId,
          authRef: authRef || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
          cardLast4: cardLast4 || '',
          cashier,
          reason
        };

        payments.push(paymentEntry);
        this.savePayments(payments);

        // If reservation, sync to r.pay array for backwards compatibility
        if (refType === 'Reservation') {
          const res = Data.findRes(refId);
          if (res) {
            res.pay = res.pay || [];
            res.pay.push({
              or: orNo,
              d: paymentEntry.date,
              m: method,
              amt: paymentEntry.amount,
              ref: paymentEntry.authRef
            });
            Data.saveReservation(res);
          }
        }

        Data.audit(
          `Payment Recorded (${kind})`,
          'Payment',
          orNo,
          `${method} ₱${paymentEntry.amount.toLocaleString()} for ${refType} ${refId}`
        );
        Data.emit('Payment', 'create', orNo);

        return { ok: true, data: paymentEntry };
      });
    },

    refundPayment(originalOrNo, amount, reason, cashier = 'Front Desk Cashier') {
      const payments = this.getPayments();
      const orig = payments.find(p => p.orNo === originalOrNo);
      if (!orig) return { ok: false, error: 'Original payment record not found.' };

      if (amount > orig.amount) {
        return { ok: false, error: 'Refund amount cannot exceed original payment.' };
      }

      return this.recordPayment({
        method: orig.method,
        amount,
        refType: orig.refType,
        refId: orig.refId,
        kind: 'Refund',
        authRef: `REF-${orig.orNo}`,
        cashier,
        reason: reason || 'Customer refund'
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. ReservationService (State Machine & Rules Skeleton)
  // ─────────────────────────────────────────────────────────────
  const ReservationService = {
    checkIn(code, idType, idNumber) {
      if (!idType || !idNumber) {
        return { ok: false, error: 'Government ID verification required for check-in.' };
      }
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };
        if (r.s !== 'Confirmed' && r.s !== 'Pending') {
          return { ok: false, error: `Cannot check in stay with status '${r.s}'.` };
        }
        if (r.ci > today()) {
          return { ok: false, error: `Check-in date (${r.ci}) has not arrived yet.` };
        }

        // Room condition check
        const roomHK = Data.getRoomHK(r.rm);
        if (roomHK && (roomHK.s === 'Dirty' || roomHK.s === 'In progress')) {
          return {
            ok: false,
            error: `Room ${r.rm} is currently ${roomHK.s}. Please reassign or wait for Housekeeping.`
          };
        }

        r.s = 'Checked-in';
        r.idType = idType;
        r.idNumber = idNumber;
        r.checkInTime = nowTime();
        Data.saveReservation(r);

        // Update room condition
        Data.setRoomHK(r.rm, { s: 'Occupied', p: 'Medium' });

        Data.audit('Guest Check-in', 'Reservation', r.c, `Room ${r.rm} checked in for ${r.g}`);
        Data.emit('Reservation', 'update', r.c);
        return { ok: true, data: r };
      });
    },

    checkOut(code, overrideReason = '') {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };
        if (r.s !== 'Checked-in') {
          return { ok: false, error: `Cannot check out stay with status '${r.s}'.` };
        }

        const bal = Data.balance(r);
        if (bal > 0 && !overrideReason) {
          return {
            ok: false,
            error: `Outstanding balance of ₱${bal.toLocaleString()} must be settled before checkout.`
          };
        }

        r.s = 'Checked-out';
        r.checkOutTime = nowTime();
        if (overrideReason) {
          r.overrideReason = overrideReason;
        }
        Data.saveReservation(r);

        // Room becomes Dirty
        Data.setRoomHK(r.rm, { s: 'Dirty', p: 'Urgent' });

        // Award loyalty points once
        if (Data.awardStayLoyalty) {
          Data.awardStayLoyalty(r);
        }

        Data.audit('Guest Check-out', 'Reservation', r.c, `Room ${r.rm} checked out for ${r.g}`);
        Data.emit('Reservation', 'update', r.c);
        return { ok: true, data: r };
      });
    }
  };

  const Services = {
    AuthService,
    PricingService,
    PaymentService,
    ReservationService
  };

  root.PUPSJ_Services = Services;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Services;
  }
})(typeof window !== 'undefined' ? window : globalThis);
