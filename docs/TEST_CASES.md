# PUPSJ Hotel & Restaurant PMS — Test Case Specifications (Online Reservation Engine)
**Course**: Systems Analysis and Design (SAD)  
**Location Context**: San Juan City, Metro Manila, Philippines  
**System Scope**: Rebuilt Online Room Reservation Engine & Inventory Hold Subsystem  
**Automated Runner**: `Tests.run()` via F12 Console or `node scratch/test-all-suites.js`

---

## Overview

This catalogue defines formal test case specifications verifying all business rules, algorithms, and edge cases specified in the PUPSJ Online Reservation Engine rebuild. Each test case maps directly to automated assertions in `js/tests.js` (Groups 10 through 18).

---

### TC-RES-001: Pricing Quote Engine & 50% Ceil-Centavo Deposit
- **Objective**: Verify that the pricing engine applies the statutory Philippine BIR 1.232 factor, calculates taxes, and computes the 50% guarantee deposit rounded up to the nearest centavo.
- **Preconditions**: `CONFIG.depositPct = 50`.
- **Test Inputs**:
  - Room Type: `Standard` (Base Rate: ₱3,200)
  - Length of Stay: 1 Night
- **Expected Results**:
  1. Stay Total = ₱3,200.00
  2. BIR Net Taxable Base = $\text{round}(3200 / 1.232) = ₱2,597.00$
  3. 10% Service Charge = $\text{round}(2597 \times 0.10) = ₱260.00$
  4. 12% VAT = $3200 - 2597 - 260 = ₱343.00$
  5. Deposit Due = $\text{ceilCentavo}(3200 \times 0.50) = ₱1,600.00$
  6. Balance Due = ₱1,600.00
  7. Fractional centavo check ($₱3,200.01 \times 0.50$): Deposit Due = ₱1,600.01.
- **Automated Mapping**: `js/tests.js` > Test Group 10.

---

### TC-RES-002: Public Browsing & Authentication Gate
- **Objective**: Verify that unauthenticated visitors can browse rates and availability, but clicking "Reserve" triggers the Auth Gate and preserves search parameters across authentication.
- **Preconditions**: Visitor tab has no active guest session (`pupsj_sessionGuest = null`).
- **Test Inputs**:
  - Search: Room Type `Standard`, Check-in: `2026-11-10`, Check-out: `2026-11-12`, Guests: 2.
- **Expected Results**:
  1. Public search renders availability and quote without error.
  2. Clicking "Reserve" intercepts execution and opens Auth Gate modal (`showAuthGateModal`).
  3. Search parameters are saved to `sessionStorage.pupsj_pendingBookingIntent`.
  4. Server-side `BookingService.startHold(null, ...)` returns `{ ok: false, code: 'AUTH_REQUIRED' }`.
  5. After sign-in/up, intent is restored and visitor lands on Step 4 (Guest Details).
- **Automated Mapping**: `js/tests.js` > Test Group 12 (Guard 1).

---

### TC-RES-003: 15-Minute Real-Time Inventory Hold
- **Objective**: Verify that starting a reservation acquires an inventory hold that decrements available room inventory for overlapping dates without creating an unpaid reservation.
- **Preconditions**: Authenticated guest session; room type has $N$ units free.
- **Test Inputs**: `BookingService.startHold(guestSession, { typeId: 'Standard', checkIn: '2026-11-01', checkOut: '2026-11-03' })`.
- **Expected Results**:
  1. Hold record created with `status: 'Active'` and `expiresAt = now + 15m`.
  2. `AvailabilityService.unitsFree` for that date interval returns $N - 1$.
  3. Adjacent stay interval starting on check-out date is not blocked (checkout day is free).
  4. No reservation record created in `pupsj.res`.
- **Automated Mapping**: `js/tests.js` > Test Group 11 & Test Group 12.

---

### TC-RES-004: Hold Idempotent Reuse on Rapid Clicks
- **Objective**: Prevent duplicate inventory consumption when a guest double-clicks "Reserve" or re-submits identical stay criteria.
- **Preconditions**: Active hold exists for guest, room type, and dates.
- **Test Inputs**: Second call to `BookingService.startHold` with identical parameters.
- **Expected Results**:
  1. System returns existing active hold (`reused: true`).
  2. Free room units remain unchanged (no second unit locked).
- **Automated Mapping**: `js/tests.js` > Test Group 12.

---

### TC-RES-005: Card Outcome Simulation Rules
- **Objective**: Verify that simulated card numbers produce deterministic payment gateway responses per specification.
- **Preconditions**: Active `BookingHold` exists.
- **Test Inputs & Expected Outcomes**:
  - `4242 4242 4242 4242`: Succeeded $\rightarrow$ Triggers instant finalize.
  - `4000 0000 0000 0002`: Declined by issuing bank $\rightarrow$ `{ ok: false, error: 'Card declined by issuing bank.' }`.
  - `4000 0000 0000 9995`: Insufficient funds $\rightarrow$ `{ ok: false, error: 'Card declined: Insufficient funds.' }`.
  - `4000 0000 0000 0069`: Expired card $\rightarrow$ `{ ok: false, error: 'Card declined: Card has expired.' }`.
  - Invalid Luhn checksum: Rejects with Luhn check failed.
- **Automated Mapping**: `js/tests.js` > Test Group 13.

---

### TC-RES-006: Max Payment Attempts & Hold Release
- **Objective**: Ensure room inventory is not tied up indefinitely by repeated failed payment attempts.
- **Preconditions**: `CONFIG.maxPayAttempts = 3`.
- **Test Inputs**: Submit 3 consecutive declining card numbers on active hold.
- **Expected Results**:
  1. Each failure decrements `attemptsLeft`.
  2. On 3rd failure, hold status transitions to `Cancelled`.
  3. Locked room unit is immediately released back to sellable pool.
- **Automated Mapping**: `js/tests.js` > Test Group 13.

---

### TC-RES-007: Atomic Finalize Transaction
- **Objective**: Verify that payment success and booking confirmation execute as one atomic, irreversible transaction with zero manual hotel approval.
- **Preconditions**: `PaymentIntent.status == 'Succeeded'`.
- **Test Inputs**: `BookingService.finalize(holdId, intentId)`.
- **Expected Results**:
  1. Hold status transitions to `Paid`.
  2. Reservation created with status `Confirmed` and `confirmedBy: 'System (payment)'`.
  3. `depositPaid` equals `depositRequired` (50%).
  4. Serialized BIR `OR-#####` generated in unified payments ledger.
  5. Folio ledger credited with 50% deposit.
  6. Hotel front desk notified in real-time.
- **Automated Mapping**: `js/tests.js` > Test Group 14.

---

### TC-RES-008: Finalize Idempotency & Re-submission Protection
- **Objective**: Verify that page refresh, double-clicks on confirmation, or network replays cannot duplicate reservations or official receipts.
- **Preconditions**: Reservation already finalized (`hold.status == 'Paid'`).
- **Test Inputs**: Duplicate call to `BookingService.finalize(holdId, intentId)`.
- **Expected Results**:
  1. Returns existing reservation record (`alreadyFinalized: true`).
  2. No duplicate `HTL-#####` or `OR-#####` generated.
- **Automated Mapping**: `js/tests.js` > Test Group 14.

---

### TC-RES-009: Late Payment Auto-Recovery When Room Free
- **Objective**: Verify handling when a payment settles after the hold expired, but the room is still available.
- **Preconditions**: Hold `expiresAt` in the past, status `Expired`; physical room inventory free units $\ge 1$.
- **Test Inputs**: `BookingService.finalize` called with succeeded intent.
- **Expected Results**: System re-locks inventory, assigns room, and confirms reservation.
- **Automated Mapping**: `js/tests.js` > Test Group 14.

---

### TC-RES-010: Late Payment Automatic Full Refund When Room Taken
- **Objective**: Prevent overbooking when payment arrives after hold expired and another guest booked the last room.
- **Preconditions**: Hold expired; free units $= 0$.
- **Test Inputs**: `BookingService.finalize` called with succeeded intent.
- **Expected Results**:
  1. System aborts booking creation (no reservation created).
  2. PaymentIntent status set to `Refunded`.
  3. Guest receives automatic full refund notification.
- **Automated Mapping**: `js/services.js` (`finalize` lines 974-990).

---

### TC-RES-011: Automated Bank Transfer QR Ph Gateway Webhook
- **Objective**: Verify that online bank transfers simulate real-world payment gateway webhooks without receptionist manual verification.
- **Preconditions**: Guest selects Bank Transfer and bank (e.g. BDO).
- **Test Inputs**:
  1. `PaymentService.pay(holdId, 'Bank Transfer', { bank: 'BDO' })`.
  2. Simulated webhook callback: `PaymentService.bankCallback(intentId, 'paid', 'BDO-REF-888999')`.
- **Expected Results**:
  1. Hold timer extended to 30 minutes (`CONFIG.bankHoldMinutes = 30`).
  2. Intent created in `AwaitingBank` status.
  3. Webhook callback transitions intent to `Succeeded` and triggers `finalize`.
  4. Reservation created with status `Confirmed` (`confirmedBy: 'System (payment)'`).
  5. Duplicate webhook callback is idempotent (`alreadyProcessed: true`).
- **Automated Mapping**: `js/tests.js` > Test Group 15.

---

### TC-RES-012: Periodic Hold Expiration Engine
- **Objective**: Verify that `HoldService.expire()` cleans expired holds and frees inventory.
- **Preconditions**: Active hold with `expiresAt <= Date.now()`.
- **Test Inputs**: `HoldService.expire()`.
- **Expected Results**:
  1. Hold status transitions from `Active` to `Expired`.
  2. Any associated promo reservation released.
  3. Associated room inventory unit unlocked.
- **Automated Mapping**: `js/tests.js` > Test Group 11.

---

### TC-RES-013: Front Desk Check-in Enforcement of Deposit
- **Objective**: Verify that guests cannot check in without meeting the 50% deposit requirement.
- **Preconditions**: Reservation exists in PMS.
- **Test Inputs**:
  - Case A: `depositPaid < depositRequired` $\rightarrow$ Check-in fails with deposit error.
  - Case B: `depositPaid >= depositRequired` but missing government ID $\rightarrow$ Fails with ID error.
  - Case C: `depositPaid >= depositRequired` with valid government ID $\rightarrow$ Check-in succeeds (`Checked-in`).
- **Automated Mapping**: `js/tests.js` > Test Group 16.

---

### TC-RES-014: Tiered Cancellation Policy
- **Objective**: Verify refund calculations for free cancellations ($\ge 3$ days), late cancellations ($< 3$ days), and in-house stays.
- **Preconditions**: `CONFIG.freeCancelDays = 3`, `CONFIG.lateCancelFeePct = 30`.
- **Test Inputs**:
  - Free Cancel: Arrival in 5 days, ₱1,600 paid $\rightarrow$ Refund = ₱1,600.00 (100%), Deduction = ₱0.
  - Late Cancel: Arrival in 1 day, ₱1,600 paid $\rightarrow$ Deduction = ₱480.00 (30%), Refund = ₱1,120.00 (70%).
  - Full Paid Late Cancel: Arrival in 1 day, ₱3,200 paid $\rightarrow$ Deduction = ₱960.00 (30%), Refund = ₱2,240.00 (70%).
  - Checked-in stay: Cancellation blocked (early checkout required).
- **Automated Mapping**: `js/tests.js` > Test Group 17.

---

### TC-RES-015: Invariant Verification & Schema v4 Migration
- **Objective**: Verify that schema v4 migration populated all deposit fields without altering existing reservations, and that zero unpaid online bookings exist.
- **Preconditions**: Schema initialized to v4.
- **Test Inputs**: Scan all reservations in `pupsj.res`.
- **Expected Results**:
  1. `store.get('schema') >= 4`.
  2. Zero reservations with `source === 'Online'` have status `'Pending'`.
  3. Every reservation has `depositPct`, `depositRequired`, `depositPaid`, and `balanceDue`.
  4. Direct invocation of `Data.createReservation({ source: 'Online' })` without payment throws an exception.
- **Automated Mapping**: `js/tests.js` > Test Group 18.
