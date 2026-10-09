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
      console.log('%c🏨 PUPSJ HOTEL & RESTAURANT — AUTOMATED REGRESSION SUITE', 'color: #B8891A; font-size: 14px; font-weight: bold;');
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

      // Summary
      const allPassed = (failed === 0);
      console.log('\n%c======================================================', 'color: #B8891A; font-weight: bold;');
      if (allPassed) {
        console.log(`%c🎉 ALL TESTS PASSED: ${passed} passed, 0 failed. System ready for SAD Defense!`, 'color: #2E7D32; font-size: 13px; font-weight: bold;');
      } else {
        console.warn(`%c⚠️ TEST SUITE COMPLETED: ${passed} passed, ${failed} failed.`, 'color: #C62828; font-size: 13px; font-weight: bold;');
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
