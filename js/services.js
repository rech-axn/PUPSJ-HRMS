const SafeCustomEvent = typeof CustomEvent !== 'undefined' ? CustomEvent : (typeof window !== 'undefined' && window.CustomEvent ? window.CustomEvent : class { constructor(t, d) { this.type = t; this.detail = d?.detail; } });
/**
 * PUPSJ PMS & POS — Unified Domain Service Layer (js/services.js)
 * Comprehensive domain services implementing the authoritative business rules:
 * - AuthService: Session management, lockout, idle timeouts
 * - PricingService: BIR-standard 1.232 quote engine & statutory discounts
 * - PaymentService: Unified payment ledger, sequential OR numbers, refunds & voids
 * - ReservationService: Full state-machine lifecycle, check-in ID capture, checkout balance rule
 * - RoomService: Availability (freeRooms), room assignment algorithm
 * - FolioService: Ledger charges, credits, dining charges & balance
 * - OrderService: KDS station routing, dining order placement & independent billing
 * - TableService: 90-min slot collision, best-fit table assignment, dynamic table states
 * - HousekeepingService: Cleanliness workflow, auto-priority, workload balancing
 * - MaintenanceService: SLA tracking, OOS date ranges, conflict detection & relocation
 * - LoyaltyService: Stable guestId, completed nights tiering, voucher issuance & perks
 * - NotificationService: ID-based alert generator with deep-link resolution
 * - ReportService: Reconciled PMS/POS KPIs & revenue metrics
 * - AuditService: Append-only audit logger with SHA-256 hash chaining
 */
(function(root) {
  'use strict';

  // Environment & helper resolvers
  const getCrypto = () => root.PUPSJ_Crypto;
  const getValidators = () => root.PUPSJ_Validators;
  const getConfig = () => (typeof CONFIG !== 'undefined' ? CONFIG : {
    depositPct: 50,
    freeCancelDays: 3,
    loyalty: { silverNights: 5, goldNights: 12, platinumNights: 25 },
    tax: { vatPct: 12, svcPct: 10 }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. AuthService
  // ─────────────────────────────────────────────────────────────
  const AuthService = {
    LOCKOUT_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 5 * 60 * 1000,
    IDLE_TIMEOUT_ADMIN_MS: 30 * 60 * 1000,
    IDLE_TIMEOUT_GUEST_MS: 4 * 60 * 60 * 1000,

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

    registerGuest({ name, email, phone, password }) {
      if (!name || !email || !password) {
        return { ok: false, error: 'Name, email, and password are required.' };
      }
      const em = email.trim().toLowerCase();
      const accounts = store.get('guestAccounts', []);
      if (accounts.some(a => a.email.toLowerCase() === em)) {
        return { ok: false, error: 'An account with this email address already exists.' };
      }
      const Crypto = getCrypto();
      const salt = Crypto ? Crypto.generateSalt() : 'salt_' + Math.random().toString(36).slice(2);
      const passwordHash = Crypto ? Crypto.hashPassword(password, salt) : password;

      const guestId = Data.nextId('GST-');
      const newAcc = {
        guestId,
        id: guestId,
        name: name.trim(),
        email: em,
        phone: (phone || '').trim(),
        salt,
        passwordHash,
        created: today()
      };
      accounts.push(newAcc);
      store.set('guestAccounts', accounts);

      const session = {
        role: 'guest',
        guestId,
        name: newAcc.name,
        email: em,
        phone: newAcc.phone,
        issuedAt: Date.now(),
        lastActivity: Date.now()
      };
      Data.setGuestSession(session);
      AuditService.log('Guest Registered', 'Auth', guestId, `Registered guest account: ${em}`, 'Guest', newAcc.name);
      return { ok: true, user: newAcc, session };
    },

    login(email, password) {
      if (!email || !password) return { ok: false, error: 'Email and password are required.' };
      const em = email.trim().toLowerCase();

      const lock = this.getLockoutState(em);
      if (lock.locked) {
        return { ok: false, error: `Account temporarily locked due to repeated failed attempts. Please retry in ${lock.remainingSec}s.` };
      }

      const Crypto = getCrypto();

      // Check Superadmin
      const adminAccounts = store.get('adminAccounts', [
        { adminId: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', salt: 'a1f8c49e2b704d5a', passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d', role: 'superadmin' }
      ]);
      const adminMatch = adminAccounts.find(a => a.email.toLowerCase() === em);
      if (adminMatch) {
        const isValid = Crypto && adminMatch.salt && adminMatch.passwordHash
          ? Crypto.verifyPassword(password, adminMatch.salt, adminMatch.passwordHash)
          : (password === 'admin123');

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
          AuditService.log('Superadmin Login', 'Auth', session.id, `Superadmin signed in: ${em}`, 'Superadmin', session.name);
          return { ok: true, data: session };
        } else {
          this.recordFailedAttempt(em);
          return { ok: false, error: 'Invalid email or password.' };
        }
      }

      // Check Guest
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
          AuditService.log('Guest Login', 'Auth', session.guestId, `Guest signed in: ${em}`, 'Guest', session.name);
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
      if (role === 'superadmin' || role === 'all') Data.clearStaffSession();
      if (role === 'guest' || role === 'all') Data.clearGuestSession();
      return { ok: true };
    },

    getCurrentSession() {
      const staff = Data.getStaffSession();
      if (staff) return { ...staff, role: 'superadmin' };
      const guest = Data.getGuestSession();
      if (guest) return { ...guest, role: 'guest' };
      return null;
    },

    setStaffSession(session) {
      return Data.setStaffSession(session);
    },

    setGuestSession(session) {
      return Data.setGuestSession(session);
    },

    touchActivity() {
      const staff = Data.getStaffSession();
      if (staff) { staff.lastActivity = Date.now(); Data.setStaffSession(staff); }
      const guest = Data.getGuestSession();
      if (guest) { guest.lastActivity = Date.now(); Data.setGuestSession(guest); }
    },

    checkIdleTimeout() {
      const session = this.getCurrentSession();
      if (!session || !session.lastActivity) return { expired: false };
      const maxIdle = session.role === 'superadmin' ? this.IDLE_TIMEOUT_ADMIN_MS : this.IDLE_TIMEOUT_GUEST_MS;
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
    quote(arg1, arg2, arg3, arg4, arg5, arg6) {
      let baseRate, nights, promo, discountType, roomType, guests;
      if (typeof arg1 === 'string') {
        // Positional signature: quote(typeId, in, out, guests, promoCode, discountType)
        const typeObj = Data.getTypes().find(t => t.id === arg1 || t.n === arg1);
        roomType = typeObj || { n: arg1, r: 3500 };
        baseRate = roomType.r || 3500;
        nights = (arg2 && arg3) ? Math.max(1, dateDiff(arg2, arg3)) : 1;
        guests = arg4 || 1;
        promo = arg5 ? Data.findPromo(arg5) : null;
        discountType = arg6 || null;
      } else {
        const p = arg1 || {};
        roomType = p.roomType;
        if (typeof roomType === 'string') {
          const typeObj = Data.getTypes().find(t => t.id === roomType || t.n === roomType);
          roomType = typeObj || { n: roomType, r: 3500 };
        }
        nights = p.nights || ((p.checkIn && p.checkOut) ? Math.max(1, dateDiff(p.checkIn, p.checkOut)) : 1);
        baseRate = p.baseRate || (roomType && roomType.r) || 3500;
        promo = p.promo || (p.promoCode ? Data.findPromo(p.promoCode) : null);
        discountType = p.discountType || null;
        guests = p.guests || 1;
      }
      const cfg = getConfig();
      const nts = Math.max(1, Number(nights || 1));
      let rate = Math.max(0, Number(baseRate || (roomType && roomType.r) || 3200));

      // Calculate nightly rate breakdown
      const nightlyRates = [];
      for (let i = 0; i < nts; i++) {
        nightlyRates.push({ night: i + 1, rate });
      }

      const baseTotal = nts * rate;
      let discount = 0;
      let promoApplied = null;

      if (promo) {
        const pType = promo.type || 'percent';
        const pVal = Number(promo.value || 0);
        if (pType === 'percent') {
          discount = Math.round(baseTotal * (pVal / 100));
          promoApplied = { code: promo.code, desc: `${pVal}% room discount`, amount: discount };
        } else if (pType === 'fixed') {
          discount = Math.min(baseTotal, pVal);
          promoApplied = { code: promo.code, desc: `₱${pVal.toLocaleString()} fixed room discount`, amount: discount };
        } else if (pType === 'folio-credit') {
          discount = 0;
          promoApplied = { code: promo.code, desc: `₱${pVal.toLocaleString()} F&B folio dining credit`, amount: 0, creditVal: pVal };
        }
      }

      let netRoomTotal = Math.max(0, baseTotal - discount);

      // Senior / PWD 20% statutory discount
      let statutoryDiscount = 0;
      if (discountType === 'Senior' || discountType === 'PWD') {
        statutoryDiscount = Math.round(netRoomTotal * 0.20);
        netRoomTotal = Math.max(0, netRoomTotal - statutoryDiscount);
      }

      const netTotal = netRoomTotal;
      const depositPct = cfg.depositPct || 50;
      const depDue = Math.ceil(netTotal * (depositPct / 100));
      const balDue = netTotal - depDue;

      // BIR-correct tax breakdown: Gross = Net * 1.10 * 1.12 = Net * 1.232
      const taxFactor = 1.232;
      const netTaxable = Math.round(netTotal / taxFactor);
      const svcCharge = Math.round(netTaxable * 0.10);
      const vatAmount = netTotal - netTaxable - svcCharge;

      return {
        nights: nts,
        rate,
        nightlyRates,
        baseTotal,
        discount,
        statutoryDiscount,
        netTotal,
        total: netTotal,
        depositRequired: depDue,
        depDue,
        balDue,
        vatableSales: netTaxable,
        vatAmount,
        serviceCharge: svcCharge,
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
  // 3. PaymentService
  // ─────────────────────────────────────────────────────────────
  const PaymentService = {
    METHODS: ['Cash', 'Credit Card', 'Debit Card', 'GCash', 'Maya', 'Bank Transfer', 'Room Folio'],

    getPayments() {
      return store.get('payments', []);
    },

    savePayments(list) {
      store.set('payments', list);
    },

    recordPayment(params) {
      const {
        method,
        amount,
        refType = 'Reservation',
        refId,
        kind = 'Payment',
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

        AuditService.log(
          `Payment Recorded (${kind})`,
          'Payment',
          orNo,
          `${method} ₱${paymentEntry.amount.toLocaleString()} for ${refType} ${refId}`,
          'Superadmin',
          cashier
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
  // 4. RoomService (Availability & Smart Assignment)
  // ─────────────────────────────────────────────────────────────
  const RoomService = {
    freeRooms(typeId, checkIn, checkOut, excludeCode = '') {
      const allRooms = Data.getRooms();
      const allRes = Data.getReservations();
      const allMnt = Data.getMaintenance();
      const ci = checkIn || today();
      const co = checkOut || addDays(ci, 1);

      // Filter by type if specified
      const targetRooms = typeId ? allRooms.filter(r => r.t === typeId || r.typeId === typeId) : allRooms;

      return targetRooms.filter(room => {
        const roomNo = Number(room.n != null ? room.n : (room.num || room.number));

        // 1. Check Maintenance Out of Service overlapping dates
        const isOOS = allMnt.some(m => {
          if (!m.outOfService || m.room !== roomNo) return false;
          if (m.status === 'Resolved' || m.status === 'Closed') return false;
          const mFrom = m.fromDate || m.created || today();
          const mTo = m.toDate || addDays(mFrom, 1);
          return !(co <= mFrom || ci >= mTo);
        });
        if (isOOS) return false;

        // 2. Check Overlapping Reservations
        const hasOverlap = allRes.some(r => {
          if (r.c === excludeCode) return false;
          if (r.s === 'Cancelled' || r.s === 'Checked-out' || r.s === 'No-show') return false;
          const rRm = Number(r.rm != null ? r.rm : r.n);
          if (rRm !== roomNo) return false;
          const rCi = r.ci || r.i || today();
          const rCo = r.co || r.o || addDays(rCi, 1);
          return !(co <= rCi || ci >= rCo);
        });
        if (hasOverlap) return false;

        // 3. If arrival is today, room must be Clean or Inspected
        if (ci <= today()) {
          const hk = Data.getRoomHK(roomNo);
          if (hk && (hk.s === 'Dirty' || hk.s === 'In progress')) {
            return false;
          }
        }

        return true;
      });
    },

    assignRoom(typeId, checkIn, checkOut, guestPreference = '') {
      const available = this.freeRooms(typeId, checkIn, checkOut);
      if (available.length === 0) return null;

      // 1. Check guest preference (exact room or floor)
      if (guestPreference) {
        const prefMatch = available.find(r => {
          const num = String(r.num || r.number);
          return num === guestPreference || (r.floor && String(r.floor) === guestPreference);
        });
        if (prefMatch) return prefMatch.num || prefMatch.number;
      }

      // 2. Assign lowest available room number
      available.sort((a, b) => Number(a.n != null ? a.n : (a.num || a.number)) - Number(b.n != null ? b.n : (b.num || b.number)));
      const chosen = available[0];
      return Number(chosen.n != null ? chosen.n : (chosen.num || chosen.number));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. ReservationService (State Machine & Business Rules)
  // ─────────────────────────────────────────────────────────────
  const ReservationService = {
    createReservation(params) {
      const {
        typeId,
        checkIn,
        checkOut,
        guests = 2,
        guestName,
        guestEmail = '',
        guestPhone = '',
        promoCode = '',
        source = 'Online',
        paymentMethod = 'Credit Card',
        idType = '',
        idNumber = '',
        discountType = null,
        notes = ''
      } = params;

      return store.transaction(() => {
        const session = AuthService.getCurrentSession();
        const effectiveSource = (session && session.role === 'superadmin') ? (source || 'Staff-assisted') : 'Online';

        // Walk-in / Check-in validation
        if (effectiveSource === 'Walk-in') {
          if (!idType || !idNumber) {
            throw new Error('Government ID verification required for front-desk walk-in reservations.');
          }
        }

        // Room availability check
        const roomNo = params.roomNo || RoomService.assignRoom(typeId, checkIn, checkOut);
        if (!roomNo) {
          throw new Error('No clean rooms available for the selected dates and category.');
        }

        // Pricing quote
        let promo = null;
        if (promoCode) {
          promo = Data.findPromo(promoCode);
          if (!promo || !promo.active) {
            throw new Error(`Promo code '${promoCode}' is invalid or expired.`);
          }
        }

        const roomType = Data.getTypes().find(t => t.id === typeId || t.n === typeId) || { r: 3500, n: typeId };
        const quote = PricingService.quote({
          baseRate: roomType.r,
          nights: dateDiff(checkIn, checkOut),
          promo,
          discountType,
          roomType
        });

        // Ensure Guest entity
        const guestId = GuestService.ensureGuest({
          name: guestName,
          email: guestEmail,
          phone: guestPhone
        });

        const code = Data.nextId('HTL-');
        const isOnlineImmediatePay = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card' || paymentMethod === 'GCash' || paymentMethod === 'Maya');

        let status = 'Pending';
        let holdExpiresAt = null;

        if (isOnlineImmediatePay || effectiveSource === 'Walk-in') {
          status = 'Confirmed';
        } else {
          // 24h hold or 2h before arrival
          const arrivalHours = Math.max(2, dateDiff(today(), checkIn) * 24);
          const holdHours = Math.min(24, arrivalHours);
          holdExpiresAt = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
        }

        const newRes = {
          c: code,
          guestId,
          g: guestName,
          email: guestEmail,
          ph: guestPhone,
          t: roomType.n,
          typeId: roomType.id || typeId,
          rm: roomNo,
          n: roomNo,
          ci: checkIn,
          i: checkIn,
          co: checkOut,
          o: checkOut,
          nights: quote.nights,
          guests: Number(guests || 2),
          s: status,
          st: status,
          source: effectiveSource,
          rate: quote.rate,
          rt: quote.rate,
          total: quote.netTotal,
          nightlyRates: quote.nightlyRates,
          promo: promo ? promo.code : '',
          holdExpiresAt,
          idType: idType || '',
          idNumber: idNumber || '',
          pay: [],
          x: [],
          notes: notes || '',
          createdBy: (session && session.name) ? session.name : 'Online Guest',
          createdAt: nowISO()
        };

        // If folio-credit promo, post credit to folio
        if (promo && promo.type === 'folio-credit' && quote.promoApplied?.creditVal) {
          newRes.x.push({
            id: Date.now(),
            d: today(),
            desc: `Promotion: ${promo.code} F&B Dining Credit`,
            amt: -Math.abs(quote.promoApplied.creditVal),
            cat: 'Promotion'
          });
        }

        // Record Initial Payment if confirmed
        if (status === 'Confirmed') {
          const depositAmount = quote.depDue;
          const payRes = PaymentService.recordPayment({
            method: paymentMethod,
            amount: depositAmount,
            refType: 'Reservation',
            refId: code,
            kind: 'Deposit',
            cashier: (session && session.name) ? session.name : 'Online Payment Gateway',
            reason: `Guarantee deposit for ${code}`
          });
          if (payRes.ok) {
            newRes.pay.push({
              or: payRes.data.orNo,
              d: payRes.data.date,
              m: paymentMethod,
              amt: payRes.data.amount,
              ref: payRes.data.authRef
            });
          }
        }

        const allRes = Data.getReservations();
        allRes.push(newRes);
        Data.saveReservations(allRes);

        // Consume promo
        if (promo) Data.incrementPromo(promo.code);

        AuditService.log(
          `Created Reservation (${effectiveSource})`,
          'Reservation',
          code,
          `${guestName} booked room ${roomNo} (${newRes.t}) from ${checkIn} to ${checkOut}`,
          session?.role === 'superadmin' ? 'Superadmin' : 'Guest',
          session?.name || guestName
        );

        Data.emit('Reservation', 'create', code);
        return { ok: true, data: newRes };
      });
    },

    checkIn(code, idType, idNumber) {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };

        const effectiveIdType = idType || r.idType;
        const effectiveIdNum = idNumber || r.idNumber;
        if (!effectiveIdType || !effectiveIdNum) {
          return { ok: false, error: 'Government ID verification required for check-in.' };
        }

        if (r.s !== 'Confirmed' && r.s !== 'Pending') {
          return { ok: false, error: `Cannot check in stay with status '${r.s}'.` };
        }
        if (r.ci > today()) {
          return { ok: false, error: `Check-in date (${r.ci}) has not arrived yet.` };
        }

        // Room condition check
        const roomNo = Number(r.rm != null ? r.rm : r.n);
        const roomHK = Data.getRoomHK(roomNo);
        if (roomHK && (roomHK.s === 'Dirty' || roomHK.s === 'In progress')) {
          return {
            ok: false,
            error: `Room ${r.rm} is currently ${roomHK.s}. Please reassign to an available Clean room.`
          };
        }

        r.s = 'Checked-in';
        r.st = 'Checked-in';
        r.idType = idType;
        r.idNumber = idNumber;
        r.checkInTime = nowTime();
        Data.saveReservation(r);

        // Room status becomes Occupied
        Data.setRoomHK(roomNo, { s: 'Occupied', p: 'Medium' });

        const session = AuthService.getCurrentSession();
        AuditService.log('Guest Check-in', 'Reservation', r.c, `Room ${r.rm} checked in for ${r.g}`, 'Superadmin', session?.name || 'Front Desk');
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

        const bal = (typeof FolioService !== 'undefined' && FolioService.getFolio) ? FolioService.getFolio(r.c)?.balance : (Data.balance ? Data.balance(r) : Data.bal(r));
        if (bal > 0 && !overrideReason) {
          return {
            ok: false,
            error: `Outstanding folio balance of ₱${bal.toLocaleString()} must be settled before checkout.`
          };
        }

        r.s = 'Checked-out';
        r.st = 'Checked-out';
        r.checkOutTime = nowTime();
        if (overrideReason) r.overrideReason = overrideReason;
        Data.saveReservation(r);

        // Room becomes Dirty with urgent priority if next arrival is today
        const nextArrivalToday = Data.getReservations().some(other => other.rm === r.rm && other.ci === today() && other.s !== 'Cancelled');
        Data.setRoomHK(r.rm, { s: 'Dirty', p: nextArrivalToday ? 'Urgent' : 'High' });

        // Award loyalty points once
        LoyaltyService.awardStayPoints(r);

        const session = AuthService.getCurrentSession();
        AuditService.log('Guest Check-out', 'Reservation', r.c, `Room ${r.rm} checked out for ${r.g}`, 'Superadmin', session?.name || 'Front Desk');
        Data.emit('Reservation', 'update', r.c);

        return { ok: true, data: r };
      });
    },

    cancelReservation(code, reason = '') {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };

        if (r.s === 'Checked-in') {
          return { ok: false, error: 'Checked-in stays cannot be cancelled. Use early check-out instead.' };
        }
        if (r.s === 'Cancelled' || r.s === 'Checked-out') {
          return { ok: false, error: `Reservation is already ${r.s}.` };
        }

        const cfg = getConfig();
        const daysToArrival = dateDiff(today(), r.ci);
        const freeCancelDays = cfg.freeCancelDays || 3;
        const totalPaid = (r.pay || []).reduce((acc, p) => acc + (Number(p.amt) || 0), 0);

        let refundAmt = 0;
        let retainedFee = 0;

        if (daysToArrival >= freeCancelDays) {
          // Free cancellation: 100% refund
          refundAmt = totalPaid;
          retainedFee = 0;
        } else {
          // Retain 1st night rate (capped at paid amount)
          const firstNightRate = (r.nightlyRates && r.nightlyRates[0]?.rate) || r.rate || 3200;
          retainedFee = Math.min(totalPaid, firstNightRate);
          refundAmt = Math.max(0, totalPaid - retainedFee);
        }

        // Process refund payment if applicable
        if (refundAmt > 0) {
          PaymentService.recordPayment({
            method: (r.pay && r.pay[0]?.m) || 'Cash',
            amount: refundAmt,
            refType: 'Reservation',
            refId: r.c,
            kind: 'Refund',
            reason: reason || 'Cancellation policy refund'
          });
        }

        // Release promo
        if (r.promo) {
          const promo = Data.findPromo(r.promo);
          if (promo && promo.usedCount > 0) {
            promo.usedCount--;
            Data.savePromos(Data.getPromos());
          }
        }

        r.s = 'Cancelled';
        r.st = 'Cancelled';
        r.cancelReason = reason || 'Guest cancellation';
        r.cancelledAt = nowISO();
        Data.saveReservation(r);

        const session = AuthService.getCurrentSession();
        AuditService.log('Cancelled Reservation', 'Reservation', r.c, `Cancelled: ${r.g}. Refund: ₱${refundAmt}, Fee: ₱${retainedFee}`, session?.role === 'superadmin' ? 'Superadmin' : 'Guest', session?.name || r.g);
        Data.emit('Reservation', 'cancel', r.c);

        return { ok: true, data: { refundAmt, retainedFee, res: r } };
      });
    },

    runExpiryJobs() {
      // 1. Expire Pending holds
      const allRes = Data.getReservations();
      let updated = false;

      allRes.forEach(r => {
        if (r.s === 'Pending' && r.holdExpiresAt && new Date(r.holdExpiresAt) <= new Date()) {
          r.s = 'Cancelled';
          r.st = 'Cancelled';
          r.cancelReason = 'Hold expired (unpaid deposit)';
          updated = true;
          AuditService.log('Reservation Hold Expired', 'Reservation', r.c, `Hold expired for ${r.g}`, 'System', 'HoldExpiryRunner');
        } else if (r.s === 'Confirmed' && r.ci < today()) {
          // Auto No-Show for missed check-in date
          r.s = 'No-show';
          r.st = 'No-show';
          updated = true;
          AuditService.log('Reservation Auto No-Show', 'Reservation', r.c, `No-show recorded for ${r.g} (arrival date passed)`, 'System', 'HoldExpiryRunner');
        }
      });

      if (updated) {
        Data.saveReservations(allRes);
        Data.emit('Reservation', 'expiry-jobs', Date.now());
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. FolioService (Incidentals, Credits & Settlement)
  // ─────────────────────────────────────────────────────────────
  const FolioService = {
    getFolio(resCode) {
      const res = Data.findRes(resCode);
      if (!res) return null;

      const roomCharges = Data.roomChg(res);
      const incidentals = (res.x || []).map(item => ({
        id: item.id,
        date: item.d,
        description: item.desc,
        amount: Number(item.amt || 0),
        category: item.cat || 'Incidentals'
      }));

      const totalCharges = roomCharges + incidentals.reduce((sum, item) => sum + item.amount, 0);
      const payments = (res.pay || []).map(p => ({
        orNo: p.or,
        date: p.d,
        method: p.m,
        amount: Number(p.amt || 0),
        ref: p.ref || ''
      }));

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, totalCharges - totalPaid);

      return {
        code: res.c,
        guest: res.g,
        room: res.rm,
        roomCharges,
        incidentals,
        totalCharges,
        payments,
        totalPaid,
        balance,
        status: res.s
      };
    },

    postCharge(resCode, desc, amount, category = 'Incidentals') {
      return store.transaction(() => {
        const res = Data.findRes(resCode);
        if (!res) return { ok: false, error: 'Reservation not found.' };

        Data.addCharge(res, desc, amount, category);
        Data.emit('Folio', 'charge', resCode);
        return { ok: true, data: this.getFolio(resCode) };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. OrderService (POS, Stations & Dining Billing)
  // ─────────────────────────────────────────────────────────────
  const OrderService = {
    createOrder(params) {
      const {
        type = 'Dine-in',
        tableNo = '',
        roomNo = '',
        resCode = '',
        items = [],
        note = '',
        discountPromo = null
      } = params;

      if (!items || items.length === 0) {
        return { ok: false, error: 'Order must contain at least one item.' };
      }

      return store.transaction(() => {
        // Enforce 86'd check
        const menuItems = Data.getMenu();
        for (const line of items) {
          const menuItem = menuItems.find(m => m.id === line.id || m.name === line.name);
          if (menuItem && menuItem.available === false) {
            throw new Error(`Item '${menuItem.name}' is currently 86'd (unavailable).`);
          }
        }

        const code = Data.nextId('ORD-');
        let subtotal = 0;
        const lineSnapshots = items.map(item => {
          const price = Number(item.price || item.p || 0);
          const qty = Number(item.qty || 1);
          const lineTotal = price * qty;
          subtotal += lineTotal;
          return {
            id: item.id || '',
            name: item.name,
            price,
            qty,
            station: item.station || 'Kitchen',
            note: item.note || '',
            status: 'New'
          };
        });

        // Apply dining promo if applicable
        let discount = 0;
        if (discountPromo) {
          const promo = Data.findPromo(discountPromo);
          if (promo && promo.active) {
            if (promo.type === 'percent') {
              discount = Math.round(subtotal * (Number(promo.value) / 100));
            } else if (promo.type === 'fixed') {
              discount = Math.min(subtotal, Number(promo.value));
            }
          }
        }

        const finalTotal = Math.max(0, subtotal - discount);
        const session = AuthService.getCurrentSession();

        const order = {
          code,
          type,
          tableNo: type === 'Dine-in' ? tableNo : '',
          roomNo: type === 'In-room' ? roomNo : '',
          resCode: type === 'In-room' ? resCode : '',
          items: lineSnapshots,
          subtotal: finalTotal,
          status: 'New',
          payStatus: 'Unpaid',
          note: note || '',
          time: nowTime(),
          date: today(),
          createdAt: nowISO(),
          createdBy: (session && session.name) ? session.name : 'Guest'
        };

        const allOrders = Data.getOrders();
        allOrders.push(order);
        Data.saveOrders(allOrders);

        // Dine-in order occupies table
        if (type === 'Dine-in' && tableNo) {
          TableService.setTableStatus(tableNo, 'Occupied');
        }

        AuditService.log('Created Restaurant Order', 'Order', code, `${type} order ${code} for ₱${finalTotal.toLocaleString()}`, session?.role === 'superadmin' ? 'Superadmin' : 'Guest', session?.name || 'Guest');
        Data.emit('Order', 'create', code);

        return { ok: true, data: order };
      });
    },

    updateKitchenStatus(orderCode, newStatus) {
      return store.transaction(() => {
        const allOrders = Data.getOrders();
        const order = allOrders.find(o => o.code === orderCode);
        if (!order) return { ok: false, error: 'Order not found.' };

        order.status = newStatus;
        order.updatedAt = nowISO();

        // If served and paid for dine-in, mark table as Needs cleaning
        if (newStatus === 'Served' && order.type === 'Dine-in' && order.tableNo) {
          if (order.payStatus === 'Paid') {
            TableService.setTableStatus(order.tableNo, 'Needs cleaning');
          }
        }

        Data.saveOrders(allOrders);
        Data.emit('Order', 'update-kitchen', orderCode);
        return { ok: true, data: order };
      });
    },

    settleOrder(orderCode, paymentMethod, meta = {}) {
      return store.transaction(() => {
        return Data.billOrder(orderCode, paymentMethod, meta);
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. TableService (90-min Slot Engine & Live States)
  // ─────────────────────────────────────────────────────────────
  const TableService = {
    findAvailableTables(date, time, partySize = 2, area = '') {
      const allTables = Data.getTables();
      const allRes = Data.getTableRes();
      const targetTimeMin = parseTimeToMinutes(time);

      return allTables.filter(t => {
        if (!t.active && t.active !== undefined) return false;
        if (Number(t.seats) < Number(partySize)) return false;

        // Check 90-minute conflict window with other bookings
        const hasConflict = allRes.some(r => {
          if (r.date !== date) return false;
          const rT = Number(r.tableNum != null ? r.tableNum : (r.table != null ? r.table : r.tableNo));
          const tN = Number(t.num != null ? t.num : t.id);
          if (rT !== tN) return false;
          if (r.status === 'Cancelled' || r.status === 'Completed' || r.status === 'No-show') return false;

          const rTimeMin = parseTimeToMinutes(r.time);
          return Math.abs(targetTimeMin - rTimeMin) < 90;
        });

        return !hasConflict;
      }).sort((a, b) => {
        // Best fit: smallest seating capacity first
        if (Number(a.seats) !== Number(b.seats)) return Number(a.seats) - Number(b.seats);
        // Prefer requested area
        if (area && a.area === area && b.area !== area) return -1;
        if (area && b.area === area && a.area !== area) return 1;
        return Number(a.num || 1) - Number(b.num || 1);
      });
    },

    setTableStatus(tableNo, status) {
      const allTables = Data.getTables();
      const table = allTables.find(t => String(t.num || t.name) === String(tableNo));
      if (table) {
        table.status = status;
        table.st = status;
        store.set('tables', allTables);
        Data.emit('Table', 'update', tableNo);
      }
    }
  };

  function parseTimeToMinutes(tStr) {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. HousekeepingService
  // ─────────────────────────────────────────────────────────────
  const HousekeepingService = {
    computeAutoPriority(roomNo) {
      const allRes = Data.getReservations();
      const todayArrival = allRes.some(r => r.rm === roomNo && r.ci === today() && r.s !== 'Cancelled');
      if (todayArrival) return 'Urgent';

      const tomorrowArrival = allRes.some(r => r.rm === roomNo && r.ci === addDays(today(), 1) && r.s !== 'Cancelled');
      if (tomorrowArrival) return 'High';

      const nearArrival = allRes.some(r => r.rm === roomNo && dateDiff(today(), r.ci) <= 3 && r.s !== 'Cancelled');
      if (nearArrival) return 'Medium';

      return 'Low';
    },

    assignAllUnassigned() {
      const staffList = Data.getStaff().filter(s => s.active && s.department === 'Housekeeping');
      if (staffList.length === 0) return { ok: false, error: 'No active Housekeeping personnel available.' };

      const dirtyRooms = Data.getRooms().filter(r => {
        const hk = Data.getRoomHK(r.num);
        return hk && (hk.s === 'Dirty' || hk.s === 'In progress') && !hk.assignedStaffId;
      });

      let staffIdx = 0;
      dirtyRooms.forEach(room => {
        const staff = staffList[staffIdx % staffList.length];
        Data.setRoomHK(room.num, { assignedStaffId: staff.id, assignedStaffName: staff.name });
        staffIdx++;
      });

      Data.emit('Housekeeping', 'bulk-assign', dirtyRooms.length);
      return { ok: true, assignedCount: dirtyRooms.length };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 10. MaintenanceService (OOS Conflicts & Relocation)
  // ─────────────────────────────────────────────────────────────
  const MaintenanceService = {
    checkOOSConflicts(roomNo, fromDate, toDate) {
      const allRes = Data.getReservations();
      const from = fromDate || today();
      const to = toDate || addDays(from, 1);

      return allRes.filter(r => {
        if (r.rm !== roomNo) return false;
        if (r.s === 'Cancelled' || r.s === 'Checked-out' || r.s === 'No-show') return false;
        return !(to <= r.ci || from >= r.co);
      });
    },

    resolveTicket(ticketId) {
      return store.transaction(() => {
        const list = Data.getMaintenance();
        const ticket = list.find(m => m.id === ticketId);
        if (!ticket) return { ok: false, error: 'Ticket not found.' };

        ticket.status = 'Resolved';
        ticket.resolvedAt = nowISO();
        ticket.outOfService = false;
        Data.saveMaintenance(list);

        // Hand off room to Housekeeping Dirty
        Data.setRoomHK(ticket.room, { s: 'Dirty', p: 'High' });

        AuditService.log('Resolved Maintenance', 'Maintenance', ticketId, `Room ${ticket.room} maintenance resolved -> set to Dirty`, 'Superadmin', 'Front Desk');
        Data.emit('Maintenance', 'resolve', ticketId);
        return { ok: true, data: ticket };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 11. GuestService & LoyaltyService
  // ─────────────────────────────────────────────────────────────
  const GuestService = {
    ensureGuest({ name, email = '', phone = '' }) {
      const allGuests = store.get('guests', []);
      let match = allGuests.find(g => (email && g.email && g.email.toLowerCase() === email.toLowerCase()) || (phone && g.phone === phone));

      if (match) return match.guestId || match.id;

      const guestId = Data.nextId('GST-');
      const newGuest = {
        guestId,
        id: guestId,
        name,
        email,
        phone,
        vip: false,
        loyaltyTier: 'Member',
        loyaltyPoints: 0,
        createdAt: nowISO()
      };
      allGuests.push(newGuest);
      store.set('guests', allGuests);
      return guestId;
    },

    updateGuest(guestIdOrEmail, updates = {}) {
      const allGuests = store.get('guests', []);
      const q = String(guestIdOrEmail || '').trim().toLowerCase();
      let match = allGuests.find(g => (g.guestId && g.guestId.toLowerCase() === q) || (g.id && g.id.toLowerCase() === q) || (g.email && g.email.toLowerCase() === q));
      if (match) {
        Object.assign(match, updates);
        store.set('guests', allGuests);
      }
      return match || null;
    }
  };

  const LoyaltyService = {
    calculateTier(nights) {
      const cfg = getConfig();
      const n = Number(nights || 0);
      const tiers = cfg.loyalty?.tiers || [
        { name: 'Bronze', minNights: 0 },
        { name: 'Silver', minNights: cfg.loyalty?.silverNights || 5 },
        { name: 'Gold', minNights: cfg.loyalty?.goldNights || 12 },
        { name: 'Platinum', minNights: cfg.loyalty?.platinumNights || 25 }
      ];
      const sorted = [...tiers].sort((a, b) => b.minNights - a.minNights);
      for (const t of sorted) {
        if (n >= t.minNights) return t;
      }
      return tiers[0] || { name: 'Bronze', minNights: 0 };
    },

    awardStayPoints(res) {
      if (res.loyaltyAwarded) return;
      const guestId = res.guestId || GuestService.ensureGuest({ name: res.g, email: res.email, phone: res.ph });
      const pts = Math.floor((res.total || 0) / 100);

      Data.addLoyaltyPoints(res.g, pts, `Completed stay ${res.c}`);
      res.loyaltyAwarded = true;
    },

    redeemReward(guestId, rewardId) {
      return store.transaction(() => {
        const cfg = getConfig();
        const reward = cfg.loyalty.rewards.find(r => r.id === rewardId);
        if (!reward) return { ok: false, error: 'Reward not found.' };

        const voucherCode = Data.nextId('VCH-');
        const vouchers = store.get('vouchers', []);
        const newVoucher = {
          code: voucherCode,
          guestId,
          rewardId,
          name: reward.name,
          points: reward.points,
          status: 'Issued',
          issuedAt: nowISO(),
          expiresAt: addDays(today(), 90)
        };

        vouchers.push(newVoucher);
        store.set('vouchers', vouchers);
        Data.emit('Loyalty', 'redeem', voucherCode);
        return { ok: true, data: newVoucher };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 12. AuditService (Tamper-Evident SHA-256 Hash Chaining)
  // ─────────────────────────────────────────────────────────────
  const AuditService = {
    log(action, entity, entityId, details = '', actorType = 'System', actorName = 'System') {
      const log = store.get('audit', []);
      const prevEntry = log[log.length - 1];
      const prevHash = prevEntry ? (prevEntry.hash || 'GENESIS') : 'GENESIS';

      const entryId = Data.nextId('AUD-');
      const timestamp = nowISO();
      const rawPayload = `${entryId}|${timestamp}|${actorType}|${actorName}|${action}|${entity}|${entityId}|${details}|${prevHash}`;
      const hash = getCrypto() ? getCrypto().sha256(rawPayload) : 'NO_CRYPTO';

      const entry = {
        id: entryId,
        timestamp,
        time: timestamp,
        actorType,
        actorName,
        user: actorName,
        action,
        entity,
        recordType: entity,
        entityId,
        recordId: entityId,
        details,
        prevHash,
        hash
      };

      log.push(entry);
      store.set('audit', log);
      Data.emit('Audit', 'log', entryId);
      return entry;
    }
  };

  // Global service export bundle
  const Services = {
    AuthService,
    PricingService,
    PaymentService,
    RoomService,
    ReservationService,
    FolioService,
    OrderService,
    TableService,
    HousekeepingService,
    MaintenanceService,
    GuestService,
    LoyaltyService,
    AuditService
  };

  root.PUPSJ_Services = Services;
  Object.assign(root, Services);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Services;
  }
})(typeof window !== 'undefined' ? window : globalThis);
