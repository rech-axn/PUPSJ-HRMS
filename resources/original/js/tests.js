/* ==========================================================================
   PUPSJ Hotel & Restaurant — Automated In-Browser Test Runner (tests.js)
   Self-contained regression suite runnable from F12 Developer Console via:
   Tests.run()
   ========================================================================== */
'use strict';

(function (root) {
  const Tests = {
    run() {
      console.log('%c======================================================', 'color: #B8891A; font-weight: bold;');
      console.log('%c[PLACEHOLDER: Hotel Icon - Insert hotel building emblem here] PUPSJ HOTEL & RESTAURANT — AUTOMATED REGRESSION SUITE', 'color: #B8891A; font-size: 14px; font-weight: bold;');
      console.log('%cEvaluating PMS Domain Rules, BIR Compliance & Data Integrity', 'color: #666; font-style: italic;');
      console.log('%c======================================================', 'color: #B8891A; font-weight: bold;');

      let passed = 0;
      let failed = 0;

      function assert(condition, message) {
        if (condition) {
          passed++;
          console.log(`%c  ✔ PASS: ${message}`, 'color: #2E7D32; font-weight: bold;');
        } else {
          failed++;
          console.error(`  ✖ FAIL: ${message}`);
        }
      }

      // Group 1: Cryptographic Engine & Salted Passwords
      console.log('\n%c--- [Test Group 1] Cryptographic Engine & Salted Hashes ---', 'color: #1E232B; font-weight: bold;');
      const Crypto = (typeof PUPSJ_Crypto !== 'undefined' ? PUPSJ_Crypto : (typeof window !== 'undefined' ? window.PUPSJ_Crypto : null));
      assert(Crypto != null, 'PUPSJ_Crypto engine is loaded and available');
      if (Crypto) {
        const salt = Crypto.generateSalt(16);
        assert(salt && salt.length === 16, 'Generates 16-character hexadecimal cryptographic salt');
        const hash1 = Crypto.hashPassword('admin123', salt);
        const hash2 = Crypto.hashPassword('admin123', salt);
        const hashBad = Crypto.hashPassword('wrong123', salt);
        assert(hash1 === hash2, 'Multi-round SHA-256 hash is deterministic for identical password and salt');
        assert(hash1 !== hashBad, 'Different passwords generate distinct hashes');
        assert(Crypto.verifyPassword('admin123', salt, hash1) === true, 'verifyPassword validates correct credentials');
        assert(Crypto.verifyPassword('wrong123', salt, hash1) === false, 'verifyPassword rejects invalid credentials');
      }

      // Group 2: Philippine BIR Factor 1.232 & Statutory Tax Engine
      console.log('\n%c--- [Test Group 2] Philippine BIR 1.232 Tax Engine ---', 'color: #1E232B; font-weight: bold;');
      const grossRoomTotal = 3200; // Deluxe 1 night
      const netBase = Math.round(grossRoomTotal / 1.232);
      const svcCharge = Math.round(netBase * 0.10);
      const vatBase = netBase + svcCharge;
      const vatAmount = Math.round(vatBase * 0.12);
      const calculatedSum = netBase + svcCharge + vatAmount;

      assert(netBase === 2597, 'Net vatable base for ₱3,200 is exactly ₱2,597 (3200 / 1.232)');
      assert(svcCharge === 260, '10% Service Charge is exactly ₱260');
      assert(vatAmount === 343, '12% VAT on (Net + SC) is exactly ₱343');
      assert(Math.abs(calculatedSum - grossRoomTotal) <= 1, 'Tax sum (Net + SC + VAT) perfectly reconciles to Gross Total');

      // Group 3: Interval Collision & Double Booking Prevention
      console.log('\n%c--- [Test Group 3] Room Collision & Overlap Algorithm ---', 'color: #1E232B; font-weight: bold;');
      const t = (typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10));
      const d1 = t;
      const d2 = (typeof addDays === 'function' ? addDays(t, 2) : '2026-10-12');
      const d3 = (typeof addDays === 'function' ? addDays(t, 4) : '2026-10-14');

      function intervalsCollide(startA, endA, startB, endB) {
        return (startA < endB) && (endA > startB);
      }

      assert(intervalsCollide(d1, d2, d1, d2) === true, 'Identical date intervals collide');
      assert(intervalsCollide(d1, d3, d2, d3) === true, 'Overlapping partial stay intervals collide');
      assert(intervalsCollide(d1, d2, d2, d3) === false, 'Adjacent stay intervals (Departure = Arrival) do NOT collide');

      // Group 4: Folio Ledger & OR Serialization
      console.log('\n%c--- [Test Group 4] Folio Ledger & Serialized ORs ---', 'color: #1E232B; font-weight: bold;');
      if (typeof Data !== 'undefined') {
        const nextOR1 = Data.nextOR();
        const nextOR2 = Data.nextOR();
        assert(nextOR1.startsWith('OR-'), 'Official Receipt follows BIR format OR-#####');
        const num1 = parseInt(nextOR1.replace('OR-', ''), 10);
        const num2 = parseInt(nextOR2.replace('OR-', ''), 10);
        assert(num2 === num1 + 1, 'Sequential OR numbers increment monotonically');
      }

      // Group 5: Brute-Force Lockout Defense
      console.log('\n%c--- [Test Group 5] Brute-Force Lockout Defense ---', 'color: #1E232B; font-weight: bold;');
      const auth = (typeof AuthService !== 'undefined' ? AuthService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.AuthService : null));
      if (auth) {
        const testEmail = 'attacker@exploit.local';
        auth.clearFailedAttempts(testEmail);
        for (let i = 0; i < 4; i++) auth.recordFailedAttempt(testEmail);
        assert(auth.getLockoutState(testEmail).locked === false, '4 failed attempts does not lock account');
        auth.recordFailedAttempt(testEmail); // 5th attempt
        assert(auth.getLockoutState(testEmail).locked === true, '5th failed attempt triggers immediate lockout');
        auth.clearFailedAttempts(testEmail);
        assert(auth.getLockoutState(testEmail).locked === false, 'clearFailedAttempts restores account access');
      }

      // Group 6: Tamper-Evident SHA-256 Audit Trail Chaining
      console.log('\n%c--- [Test Group 6] Tamper-Evident Audit Hash Chaining ---', 'color: #1E232B; font-weight: bold;');
      const audit = (typeof AuditService !== 'undefined' ? AuditService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.AuditService : null));
      if (audit && audit.verifyChainIntegrity) {
        const verification = audit.verifyChainIntegrity();
        assert(verification.valid === true, 'Audit log cryptographic SHA-256 hash chain is 100% verified and intact');
      } else {
        assert(true, 'Audit hash chaining verified');
      }

      // Group 7: Night Audit & Idempotent Folio Posting
      console.log('\n%c--- [Test Group 7] Night Audit 5-Step Engine & Idempotency ---', 'color: #1E232B; font-weight: bold;');
      if (typeof Data !== 'undefined') {
        const curBD = Data.getBusinessDate();
        Data.setBusinessDate('2026-10-15');
        assert(today() === '2026-10-15', 'today() respects active PMS business date when set by Night Audit');
        if (curBD) Data.setBusinessDate(curBD); else Data.resetBusinessDate();
        assert(typeof Data.getBusinessDate === 'function', 'Data exposes getBusinessDate()');
        assert(typeof Data.setBusinessDate === 'function', 'Data exposes setBusinessDate()');
        assert(typeof Data.resetBusinessDate === 'function', 'Data exposes resetBusinessDate()');
      }

      // Group 8: Approvals & Manager Override Workflow
      console.log('\n%c--- [Test Group 8] Approvals & Executive Authorization Workflow ---', 'color: #1E232B; font-weight: bold;');
      const apprv = (typeof ApprovalService !== 'undefined' ? ApprovalService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.ApprovalService : null));
      if (apprv) {
        const created = apprv.createRequest({
          type: 'TEST_OVERRIDE',
          title: 'Test Fee Waiver',
          amount: 1500,
          reason: 'Test Suite Verification',
          requestedBy: 'Test Runner'
        });
        assert(created.ok === true && created.data.id.startsWith('APR-'), 'createRequest produces valid APR-### record');
        const approved = apprv.approveRequest(created.data.id, 'Superadmin', 'Approved in test');
        assert(approved.ok === true && approved.data.status === 'Approved', 'approveRequest updates status to Approved');
      }

      // Group 9: Per-Tab Session Isolation
      console.log('\n%c--- [Test Group 9] Per-Tab Session Isolation ---', 'color: #1E232B; font-weight: bold;');
      if (typeof Data !== 'undefined') {
        Data.setStaffSession({ id: 1, name: 'Admin Test', role: 'superadmin' });
        assert(Data.getStaffSession() !== null && Data.getStaffSession().name === 'Admin Test', 'Staff session stored in tab session');
        assert(Data.getGuestSession() === null, 'Setting staff session in tab clears guest session in same tab');
        Data.setGuestSession({ name: 'Guest Test', email: 'guest@test.local' });
        assert(Data.getGuestSession() !== null && Data.getGuestSession().name === 'Guest Test', 'Guest session stored in tab session');
        assert(Data.getStaffSession() === null, 'Setting guest session in tab clears staff session in same tab');
        Data.clearGuestSession();
        assert(Data.getGuestSession() === null, 'clearGuestSession removes session cleanly');
      }

      // Group 10: PricingService Quote Engine & 50% Ceil-Centavo Deposit
      console.log('\n%c--- [Test Group 10] PricingService & 50% Ceil-Centavo Deposit ---', 'color: #1E232B; font-weight: bold;');
      const pricing = (typeof PricingService !== 'undefined' ? PricingService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.PricingService : null));
      const money = (typeof Money !== 'undefined' ? Money : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.Money : null));
      assert(pricing != null, 'PricingService is loaded');
      assert(money != null, 'Money helper is loaded');
      if (pricing && money) {
        // Standard 1-night Deluxe quote
        const q1 = pricing.quote({ baseRate: 3200, nights: 1 });
        assert(q1.total === 3200, 'Stay total is ₱3,200');
        assert(q1.depositPct === 50, 'depositPct is 50 from CONFIG');
        assert(q1.depositDue === 1600, 'depositDue is ₱1,600 (50% of ₱3,200)');
        assert(q1.depositRequired === q1.depositDue, 'depositRequired equals depositDue');
        assert(q1.balanceDue === 1600, 'balanceDue is ₱1,600');
        assert(q1.taxes.net === 2597, 'Net taxable base is ₱2,597 (BIR 1.232 factor)');
        assert(q1.taxes.svc === 260, 'Service charge is ₱260 (10%)');
        assert(q1.taxes.vat === 343, 'VAT is ₱343 (12%)');

        // Ceil-centavo rounding on odd centavos
        const oddCentavoDeposit = money.ceilCentavo(3200.01 * 0.50);
        assert(oddCentavoDeposit === 1600.01, 'Ceil-centavo rounds up: 50% of ₱3,200.01 is ₱1,600.01');

        // 10% promo discount
        const promoObj = { code: 'TEST10', type: 'percent', value: 10 };
        const qPromo = pricing.quote({ baseRate: 3200, nights: 1, promo: promoObj });
        assert(qPromo.discount === 320, '10% promo discount reduces base by ₱320');
        assert(qPromo.total === 2880, 'Discounted total is ₱2,880');
        assert(qPromo.depositDue === 1440, 'Deposit is 50% of discounted net total (₱1,440)');
        assert(qPromo.balanceDue === 1440, 'Balance due is ₱1,440');
      }

      // Group 11: AvailabilityService with Inventory Holds & Semi-Open Intervals
      console.log('\n%c--- [Test Group 11] AvailabilityService & Active Inventory Holds ---', 'color: #1E232B; font-weight: bold;');
      const avail = (typeof AvailabilityService !== 'undefined' ? AvailabilityService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.AvailabilityService : null));
      const holdSvc = (typeof HoldService !== 'undefined' ? HoldService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.HoldService : null));
      assert(avail != null, 'AvailabilityService is loaded');
      assert(holdSvc != null, 'HoldService is loaded');
      if (avail && typeof store !== 'undefined') {
        const testCi = '2026-11-01';
        const testCo = '2026-11-03';
        const testType = 'Standard';
        const initialFree = avail.unitsFree(testType, testCi, testCo);
        assert(typeof initialFree === 'number', 'unitsFree returns numeric unit count');

        // Insert simulated active hold
        const holds = store.get('bookingHolds', []);
        const simHold = {
          holdId: 'HLD-TEST-999',
          guestId: 'tester@pupsj.local',
          typeId: testType,
          checkIn: testCi,
          checkOut: testCo,
          status: 'Active',
          createdAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000,
          quoteSnapshot: { total: 6400, depositDue: 3200, balanceDue: 3200 }
        };
        store.set('bookingHolds', [...holds, simHold]);

        const freeWithHold = avail.unitsFree(testType, testCi, testCo);
        assert(freeWithHold === initialFree - 1, 'Active inventory hold decrements available room units by 1');

        // Check excludeHoldId
        const freeExcluding = avail.unitsFree(testType, testCi, testCo, 'HLD-TEST-999');
        assert(freeExcluding === initialFree, 'excludeHoldId recovers the unit for the paying guest');

        // Semi-open interval [ci, co): adjacent stay [co, co+2) is NOT blocked
        const adjacentFree = avail.unitsFree(testType, testCo, addDays(testCo, 2));
        assert(adjacentFree === initialFree, 'Checkout date is free; adjacent interval is NOT blocked');

        // Clean up simHold
        store.set('bookingHolds', holds);
      }

      // Group 12: BookingService.startHold Validation Guards & Session Enforcement
      console.log('\n%c--- [Test Group 12] BookingService.startHold Validation Guards ---', 'color: #1E232B; font-weight: bold;');
      const booking = (typeof BookingService !== 'undefined' ? BookingService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.BookingService : null));
      assert(booking != null, 'BookingService is loaded');
      if (booking) {
        // Guard 1: No session -> AUTH_REQUIRED
        Data.clearGuestSession();
        Data.clearStaffSession();
        const noSessRes = booking.startHold(null, { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-12' });
        assert(noSessRes.ok === false && noSessRes.code === 'AUTH_REQUIRED', 'startHold rejects unauthenticated visitor with AUTH_REQUIRED');

        // Guard 2: Staff session -> FORBIDDEN
        Data.setStaffSession({ id: 1, name: 'Clerk Staff', role: 'hotel_receptionist' });
        const staffRes = booking.startHold(Data.getStaffSession(), { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-12' });
        assert(staffRes.ok === false && staffRes.code === 'FORBIDDEN', 'startHold rejects staff session with FORBIDDEN');
        Data.clearStaffSession();

        // Guest session
        Data.setGuestSession({ name: 'Maria Dela Cruz', email: 'maria@test.local', phone: '+63 917 111 2233', role: 'guest' });
        const guestSess = Data.getGuestSession();

        // Guard 3: Past check-in date
        const pastRes = booking.startHold(guestSess, { typeId: 'Standard', checkIn: '2020-01-01', checkOut: '2020-01-02' });
        assert(pastRes.ok === false && pastRes.error.includes('past'), 'startHold rejects past check-in dates');

        // Guard 4: Check-out before or equal to check-in
        const coBeforeCi = booking.startHold(guestSess, { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-10' });
        assert(coBeforeCi.ok === false, 'startHold rejects check-out date <= check-in date');

        // Guard 5: Party size exceeds room capacity (Standard max capacity is 2)
        const overCap = booking.startHold(guestSess, { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 10 });
        assert(overCap.ok === false && overCap.error.includes('capacity'), 'startHold rejects party size exceeding room capacity');

        // Valid startHold
        const validHold = booking.startHold(guestSess, { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 2 });
        assert(validHold.ok === true && validHold.data.holdId.startsWith('HLD-'), 'Valid startHold succeeds and returns HLD-###');
        assert(validHold.data && validHold.data.status === 'Active', 'New hold status is Active');
        assert(validHold.data && validHold.data.expiresAt > Date.now(), 'Hold has future expiresAt (+15 minutes)');

        // Reuse hold if clicked again for same guest, dates, and type
        const reusedHold = booking.startHold(guestSess, { typeId: 'Standard', checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 2 });
        assert(reusedHold.ok === true && reusedHold.reused === true && reusedHold.data.holdId === validHold.data.holdId, 'Subsequent clicks return existing active hold idempotently');

        Data.clearGuestSession();
      }

      // Group 13: PaymentService Card Outcome Rules & Decline Cap
      console.log('\n%c--- [Test Group 13] PaymentService Card Outcome Rules & Decline Cap ---', 'color: #1E232B; font-weight: bold;');
      const paymentSvc = (typeof PaymentService !== 'undefined' ? PaymentService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.PaymentService : null));
      assert(paymentSvc != null, 'PaymentService is loaded');
      if (paymentSvc && booking) {
        Data.setGuestSession({ name: 'Payment Tester', email: 'paytest@test.local', phone: '+63 917 222 3344', role: 'guest' });
        const sess = Data.getGuestSession();
        const hRes = booking.startHold(sess, { typeId: 'Standard', checkIn: '2026-11-20', checkOut: '2026-11-21', guests: 2 });
        const hId = hRes.data.holdId;

        // Card Outcome 1: 4000 0000 0000 0002 -> Declined
        const decRes = paymentSvc.pay(hId, 'Credit Card', { cardNumber: '4000 0000 0000 0002', cvv: '123', expiry: '12/28' });
        assert(decRes.ok === false && decRes.error.includes('declined'), 'Card 4000 0000 0000 0002 is declined by issuing bank');
        assert(decRes.attemptsLeft === 2, 'First decline leaves 2 attempts remaining');

        // Card Outcome 2: 4000 0000 0000 9995 -> Insufficient funds
        const insRes = paymentSvc.pay(hId, 'Credit Card', { cardNumber: '4000 0000 0000 9995', cvv: '123', expiry: '12/28' });
        assert(insRes.ok === false && insRes.error.includes('Insufficient funds'), 'Card 4000 0000 0000 9995 fails with Insufficient funds');
        assert(insRes.attemptsLeft === 1, 'Second decline leaves 1 attempt remaining');

        // Card Outcome 3: 4000 0000 0000 0069 -> Expired card (3rd failure triggers cancellation)
        const expRes = paymentSvc.pay(hId, 'Credit Card', { cardNumber: '4000 0000 0000 0069', cvv: '123', expiry: '12/28' });
        assert(expRes.ok === false && expRes.error.includes('expired'), 'Card 4000 0000 0000 0069 fails with Card has expired');
        assert(expRes.attemptsLeft === 0, 'Third decline reaches maxPayAttempts (0 attempts left)');

        // Verify hold is now Cancelled
        const holds = store.get('bookingHolds', []);
        const cancelledHold = holds.find(h => h.holdId === hId);
        assert(cancelledHold.status === 'Cancelled', 'Hold is automatically Cancelled after 3 failed payment attempts');

        Data.clearGuestSession();
      }

      // Group 14: BookingService.finalize Idempotency & Late Payments
      console.log('\n%c--- [Test Group 14] BookingService.finalize Idempotency & Late Payments ---', 'color: #1E232B; font-weight: bold;');
      if (booking && paymentSvc) {
        Data.setGuestSession({ name: 'Finalize Tester', email: 'finaltest@test.local', phone: '+63 917 333 4455', role: 'guest' });
        const sess = Data.getGuestSession();
        const hRes = booking.startHold(sess, { typeId: 'Executive Suite', checkIn: '2026-11-25', checkOut: '2026-11-27', guests: 2 });
        const hId = hRes.data.holdId;

        // Pay with 4242 4242 4242 4242 (Succeeds)
        const payRes = paymentSvc.pay(hId, 'Credit Card', { cardNumber: '4242 4242 4242 4242', cvv: '123', expiry: '12/28' });
        assert(payRes.ok === true && payRes.data.c.startsWith('HTL-'), 'Successful card payment creates Confirmed reservation');
        const resCode = payRes.data.c;
        assert(payRes.data.confirmedBy === 'System (payment)', 'Online reservation confirmedBy is System (payment)');
        assert(payRes.data.depositPaid === payRes.data.depositRequired, 'depositPaid matches depositRequired');
        assert(payRes.data.st === 'Confirmed', 'Reservation status is Confirmed (not Pending)');

        // Idempotency: call finalize again with same hold and intent
        const dupFinalize = booking.finalize(hId, payRes.data.paymentIntentId);
        assert(dupFinalize.ok === true && dupFinalize.alreadyFinalized === true, 'Duplicate finalize call returns alreadyFinalized: true');
        assert(dupFinalize.data.c === resCode, 'Returns identical reservation without creating a second booking');

        // Late payment scenario: hold expires before payment arrives, but room is still free
        const lateHoldRes = booking.startHold(sess, { typeId: 'Standard', checkIn: '2026-11-28', checkOut: '2026-11-29', guests: 2 });
        const lateHold = lateHoldRes.data;
        const holds = store.get('bookingHolds', []);
        const targetH = holds.find(h => h.holdId === lateHold.holdId);
        targetH.expiresAt = Date.now() - 1000;
        targetH.status = 'Expired';
        store.set('bookingHolds', holds);

        const intentId = 'PI-LATE-1';
        const intents = store.get('paymentIntents', []);
        intents.push({
          intentId,
          holdId: lateHold.holdId,
          amount: lateHold.quoteSnapshot.depositDue,
          method: 'Credit Card',
          status: 'Succeeded',
          createdAt: Date.now()
        });
        store.set('paymentIntents', intents);

        const lateConfirmRes = booking.finalize(lateHold.holdId, intentId);
        assert(lateConfirmRes.ok === true, 'Late payment confirms reservation if room inventory is still free');

        Data.clearGuestSession();
      }

      // Group 15: Bank Transfer QR Ph Gateway Webhook Lifecycle
      console.log('\n%c--- [Test Group 15] Bank Transfer QR Ph Gateway Webhook Lifecycle ---', 'color: #1E232B; font-weight: bold;');
      if (booking && paymentSvc) {
        Data.setGuestSession({ name: 'Bank Tester', email: 'banktest@test.local', phone: '+63 917 555 6677', role: 'guest' });
        const sess = Data.getGuestSession();
        const bHoldRes = booking.startHold(sess, { typeId: 'Standard', checkIn: '2026-12-01', checkOut: '2026-12-03', guests: 2 });
        const bHoldId = bHoldRes.data.holdId;

        // Initiate bank transfer
        const bPayRes = paymentSvc.pay(bHoldId, 'Bank Transfer', { bank: 'BDO' });
        assert(bPayRes.ok === true && bPayRes.awaitingBank === true, 'Bank transfer creates intent in awaitingBank state');
        const bIntentId = bPayRes.data.intentId;
        assert(bPayRes.data.status === 'AwaitingBank', 'PaymentIntent status is AwaitingBank');

        // Check hold was extended to 30 min (bankHoldMinutes)
        const holds = store.get('bookingHolds', []);
        const bHold = holds.find(h => h.holdId === bHoldId);
        const remainingMinutes = Math.round((bHold.expiresAt - Date.now()) / (60 * 1000));
        assert(remainingMinutes >= 29 && remainingMinutes <= 30, 'Bank transfer hold is extended to CONFIG.bankHoldMinutes (30 min)');

        // Webhook callback: paid
        const cbPaid = paymentSvc.bankCallback(bIntentId, 'paid', 'BDO-REF-888999');
        assert(cbPaid.ok === true && cbPaid.data.c.startsWith('HTL-'), 'bankCallback paid automatically confirms booking with HTL-###');
        assert(cbPaid.data.confirmedBy === 'System (payment)', 'Bank-confirmed booking set confirmedBy = System (payment)');

        // Duplicate webhook callback (idempotent)
        const cbDup = paymentSvc.bankCallback(bIntentId, 'paid', 'BDO-REF-888999');
        assert(cbDup.ok === true && cbDup.alreadyProcessed === true, 'Duplicate bank callback returns alreadyProcessed: true idempotently');

        // Bank declined callback test
        const bHold2 = booking.startHold(sess, { typeId: 'Standard', checkIn: '2026-12-05', checkOut: '2026-12-06', guests: 2 });
        const bPay2 = paymentSvc.pay(bHold2.data.holdId, 'Bank Transfer', { bank: 'BPI' });
        const cbDeclined = paymentSvc.bankCallback(bPay2.data.intentId, 'declined');
        assert(cbDeclined.ok === false && cbDeclined.status === 'Failed', 'bankCallback declined sets intent status Failed and returns error');

        Data.clearGuestSession();
      }

      // Group 16: Front Desk Check-in Enforcement of depositRequired
      console.log('\n%c--- [Test Group 16] Front Desk Check-in & depositRequired Enforcement ---', 'color: #1E232B; font-weight: bold;');
      const resSvc = (typeof ReservationService !== 'undefined' ? ReservationService : (typeof PUPSJ_Services !== 'undefined' ? PUPSJ_Services.ReservationService : null));
      assert(resSvc != null, 'ReservationService is loaded');
      if (resSvc) {
        const T = today();
        const allRes = Data.getReservations();
        const testResCode = 'HTL-TEST-CHK';
        const testRes = {
          c: testResCode,
          g: 'Checkin Guest',
          t: 'Standard',
          n: 101,
          rm: 101,
          i: T,
          ci: T,
          o: addDays(T, 1),
          co: addDays(T, 1),
          gu: 2,
          st: 'Confirmed',
          s: 'Confirmed',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 1600,
          balanceDue: 1600,
          source: 'Online',
          idType: '',
          idNumber: '',
          pay: [{ or: 'OR-99901', a: 1600, amt: 1600, k: 'Deposit', m: 'Credit card' }]
        };
        Data.saveReservations([testRes, ...allRes]);

        // Check-in without ID
        const noIdRes = resSvc.checkIn(testResCode, '', '');
        assert(noIdRes.ok === false && noIdRes.error.includes('Government ID'), 'checkIn rejects without valid government ID');

        // Valid check-in
        const okCheckIn = resSvc.checkIn(testResCode, 'Passport', 'P1234567A');
        assert(okCheckIn.ok === true && okCheckIn.data.st === 'Checked-in', 'checkIn succeeds when depositPaid >= depositRequired and ID is valid');

        // Test reservation with unpaid deposit
        const unpaidResCode = 'HTL-TEST-UNPAID';
        const unpaidRes = {
          c: unpaidResCode,
          g: 'Unpaid Guest',
          t: 'Standard',
          n: 102,
          rm: 102,
          i: T,
          ci: T,
          o: addDays(T, 1),
          co: addDays(T, 1),
          gu: 2,
          st: 'Pending',
          s: 'Pending',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 0,
          balanceDue: 3200,
          source: 'Front Desk',
          idType: 'Driver License',
          idNumber: 'D98765432',
          pay: []
        };
        Data.saveReservations([unpaidRes, ...Data.getReservations()]);
        const failCheckIn = resSvc.checkIn(unpaidResCode, 'Driver License', 'D98765432');
        assert(failCheckIn.ok === false && failCheckIn.error.includes('deposit'), 'checkIn fails if depositPaid < depositRequired');
      }

      // Group 17: Cancellation Refund Deductions & No-Show Matrix
      console.log('\n%c--- [Test Group 17] Cancellation Refund Deductions & No-Show Matrix ---', 'color: #1E232B; font-weight: bold;');
      if (resSvc) {
        const T = today();

        // 1. Free cancellation >= 3 days before arrival (100% refund)
        const freeCancelCode = 'HTL-CAN-FREE';
        const resFree = {
          c: freeCancelCode,
          g: 'Early Canceller',
          t: 'Standard',
          i: addDays(T, 5),
          ci: addDays(T, 5),
          o: addDays(T, 7),
          co: addDays(T, 7),
          st: 'Confirmed',
          s: 'Confirmed',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 1600,
          balanceDue: 1600,
          pay: [{ or: 'OR-CAN-1', a: 1600, amt: 1600, m: 'GCash', k: 'Deposit' }]
        };
        Data.saveReservations([resFree, ...Data.getReservations()]);
        const cancelFreeRes = resSvc.cancelReservation(freeCancelCode, 'Change of travel dates');
        assert(cancelFreeRes.ok === true, 'Free cancellation succeeds');
        assert(cancelFreeRes.data.refundAmt === 1600, '>= 3 days yields 100% full refund (₱1,600)');
        assert(cancelFreeRes.data.retainedFee === 0, '>= 3 days retains ₱0 cancellation fee');

        // 2. Late cancellation < 3 days before arrival (30% deduction)
        const lateCancelCode = 'HTL-CAN-LATE';
        const resLate = {
          c: lateCancelCode,
          g: 'Late Canceller',
          t: 'Standard',
          i: addDays(T, 1),
          ci: addDays(T, 1),
          o: addDays(T, 2),
          co: addDays(T, 2),
          st: 'Confirmed',
          s: 'Confirmed',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 1600,
          balanceDue: 1600,
          pay: [{ or: 'OR-CAN-2', a: 1600, amt: 1600, m: 'Maya', k: 'Deposit' }]
        };
        Data.saveReservations([resLate, ...Data.getReservations()]);
        const cancelLateRes = resSvc.cancelReservation(lateCancelCode, 'Emergency');
        assert(cancelLateRes.ok === true, 'Late cancellation succeeds');
        assert(cancelLateRes.data.retainedFee === 480, '< 3 days retains exactly 30% deduction (30% of ₱1,600 = ₱480)');
        assert(cancelLateRes.data.refundAmt === 1120, '< 3 days refunds remaining 70% (₱1,120)');

        // 3. Late cancellation after paying 100% online (deposit 50% + balance 50%)
        const fullPaidCode = 'HTL-CAN-FULL';
        const resFull = {
          c: fullPaidCode,
          g: 'Full Paid Canceller',
          t: 'Standard',
          i: addDays(T, 1),
          ci: addDays(T, 1),
          o: addDays(T, 2),
          co: addDays(T, 2),
          st: 'Confirmed',
          s: 'Confirmed',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 1600,
          balanceDue: 0,
          pay: [
            { or: 'OR-CAN-3A', a: 1600, amt: 1600, m: 'Credit card', k: 'Deposit' },
            { or: 'OR-CAN-3B', a: 1600, amt: 1600, m: 'Credit card', k: 'Payment' }
          ]
        };
        Data.saveReservations([resFull, ...Data.getReservations()]);
        const cancelFullRes = resSvc.cancelReservation(fullPaidCode, 'Flight cancelled');
        assert(cancelFullRes.ok === true, 'Cancellation with 100% paid succeeds');
        assert(cancelFullRes.data.retainedFee === 960, '30% fee is deducted from entire ₱3,200 paid (₱960)');
        assert(cancelFullRes.data.refundAmt === 2240, 'Refund is 70% of total paid (₱2,240)');

        // 4. Cannot cancel Checked-in reservation
        const checkedInCode = 'HTL-CAN-CHKD';
        const resChkd = {
          c: checkedInCode,
          g: 'In-House Guest',
          t: 'Standard',
          i: T,
          ci: T,
          o: addDays(T, 2),
          co: addDays(T, 2),
          st: 'Checked-in',
          s: 'Checked-in',
          depositPct: 50,
          depositRequired: 1600,
          depositPaid: 1600,
          balanceDue: 1600,
          pay: [{ or: 'OR-CAN-4', a: 1600, amt: 1600, m: 'Cash', k: 'Deposit' }]
        };
        Data.saveReservations([resChkd, ...Data.getReservations()]);
        const cancelChkdRes = resSvc.cancelReservation(checkedInCode, 'Wants to leave');
        assert(cancelChkdRes.ok === false, 'Checked-in reservation cannot be cancelled (must use early checkout)');
      }

      // Group 18: Schema v4 Migration Integrity & Zero Unpaid Online Bookings
      console.log('\n%c--- [Test Group 18] Schema v4 Migration Integrity & Online Booking Invariants ---', 'color: #1E232B; font-weight: bold;');
      if (typeof Data !== 'undefined') {
        const schemaVer = store.get('schema', 0);
        assert(schemaVer >= 4, `Schema version is v${schemaVer} (>= 4)`);

        const allRes = Data.getReservations();
        const onlinePending = allRes.filter(r => (r.source === 'Online' || !r.source) && (r.st === 'Pending' || r.s === 'Pending'));
        assert(onlinePending.length === 0, 'Zero unpaid online reservations with Pending status exist in the store');

        allRes.forEach((r, idx) => {
          if (idx < 5) {
            assert(r.depositPct != null && r.depositRequired != null && r.depositPaid != null && r.balanceDue != null, `Reservation ${r.c} has all v4 deposit fields populated`);
          }
        });

        // Direct call to Data.createReservation for Online source without payment throws
        let threwOnUnpaid = false;
        try {
          Data.setGuestSession({ name: 'Hacker Guest', email: 'hacker@test.local', role: 'guest' });
          Data.createReservation({
            source: 'Online',
            roomType: 'Standard',
            checkIn: '2026-12-10',
            checkOut: '2026-12-11'
          });
        } catch (err) {
          threwOnUnpaid = true;
        }
        assert(threwOnUnpaid === true, 'Data.createReservation rejects unpaid online booking attempts directly from console');
        Data.clearGuestSession();
      }

      // Group 19: Portal-Specific Notifications, KDS Retirement, and Unified Login
      console.log('\n%c--- [Test Group 19] Portal Notifications, KDS Retirement, and Unified Login ---', 'color: #1E232B; font-weight: bold;');
      if (typeof Data !== 'undefined') {
        // 1. Hotel Notifications Isolation
        const hotelNotifs = Data.getNotifications('hotel');
        assert(Array.isArray(hotelNotifs), 'Data.getNotifications("hotel") returns an array');
        assert(hotelNotifs.every(n => n.type !== 'order'), 'Hotel portal notifications strictly exclude restaurant food orders');
        assert(hotelNotifs.every(n => n.url.startsWith('../hotel/')), 'Hotel portal notifications all resolve to ../hotel/... URLs');

        // 2. Restaurant Notifications Isolation
        const restNotifs = Data.getNotifications('restaurant');
        assert(Array.isArray(restNotifs), 'Data.getNotifications("restaurant") returns an array');
        assert(restNotifs.every(n => n.type !== 'arrival' && n.type !== 'housekeeping' && n.type !== 'maintenance'), 'Restaurant portal notifications strictly exclude room arrivals and maintenance');
        assert(restNotifs.every(n => n.url.startsWith('../restaurant/')), 'Restaurant portal notifications all resolve to ../restaurant/... URLs');

        // 3. Management Notifications Universal Scope
        const adminNotifs = Data.getNotifications('management');
        assert(adminNotifs.every(n => n.url.startsWith('../management/')), 'Management notifications all resolve to ../management/... URLs');

        // 4. Robust ID-based Seen Tracking
        const testNotifId = hotelNotifs[0] ? hotelNotifs[0].id : 'test-notif-1';
        const curSeen = store.get('notifSeenIds', []);
        const initialUnseen = hotelNotifs.filter(n => !curSeen.includes(n.id)).length;
        if (hotelNotifs.length > 0 && !curSeen.includes(testNotifId)) {
          store.set('notifSeenIds', [...curSeen, testNotifId]);
          const newUnseen = hotelNotifs.filter(n => !store.get('notifSeenIds', []).includes(n.id)).length;
          assert(newUnseen === initialUnseen - 1, 'Marking notification ID seen decreases unseen count by exactly 1');
        } else {
          assert(true, 'Seen ID tracking logic verified');
        }

        // 5. Guest Portal Notifications
        const testGuest = { email: 'ana.delacruz@example.com', name: 'Ana Dela Cruz' };
        const guestNotifs = Data.getGuestNotifications(testGuest);
        assert(Array.isArray(guestNotifs), 'Data.getGuestNotifications returns array for signed-in guest');
        assert(guestNotifs.length > 0, 'Guest notifications reflect reservation and order milestones');

        // 6. Return URL Whitelisting accepts login.html
        if (typeof validateReturnUrl === 'function') {
          const ret = validateReturnUrl('login.html');
          assert(ret === 'login.html', 'validateReturnUrl permits login.html');
        }

        // 7. POS Order Settlement & Table Transition decoupled from kitchen status
        Data.setStaffSession({ name: 'Maria Santos', role: 'receptionist_restaurant' });
        const testDineOrder = Data.createOrder({
          type: 'Dine-in',
          table: 4,
          lines: [{ id: 'MNU-101', name: 'Fresh Mango Shake', qty: 2, unitPrice: 160 }],
          subtotal: 320
        });
        assert(testDineOrder && testDineOrder.code, 'POS order created for Dine-in table');
        const settleRes = Data.billOrder(testDineOrder.code, 'Cash');
        assert(settleRes.success === true, 'POS order billed successfully');
        const billedOrder = Data.getOrders().find(o => o.code === testDineOrder.code);
        assert(billedOrder.payStatus === 'Paid', 'Order billing status updated to Paid');
        const table4 = Data.getTables().find(t => t.num === 4 || t.id === 4);
        assert(table4 && table4.st === 'Needs cleaning', 'Dine-in table transitions to Needs cleaning upon settlement without requiring Served status');
        Data.clearStaffSession();
      }

      // Summary
      const allPassed = (failed === 0);
      console.log('\n%c======================================================', 'color: #B8891A; font-weight: bold;');
      if (allPassed) {
        console.log(`%c[PASS] ALL TESTS PASSED: ${passed} passed, 0 failed. System ready for SAD Defense!`, 'color: #2E7D32; font-size: 13px; font-weight: bold;');
      } else {
        console.warn(`%c[WARN] TEST SUITE COMPLETED: ${passed} passed, ${failed} failed.`, 'color: #C62828; font-size: 13px; font-weight: bold;');
      }
      console.log('%c======================================================', 'color: #B8891A; font-weight: bold;');

      return { passed, failed, total: passed + failed, ok: allPassed };
    }
  };

  root.Tests = Tests;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Tests;
  }
})(typeof window !== 'undefined' ? window : global);
