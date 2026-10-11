# PUPSJ Hotel & Restaurant Management System
## Online Room Reservation Engine Audit (Phase R0)

**Date:** 2026-10-11  
**Scope:** `docs/MASTER_PROMPT.md`, `js/data.js`, `js/core.js`, `js/booking-modal.js`, `js/guest-portal.js`, `js/guest-login.js`, `js/reservations.js`, `js/services.js`, `js/settings.js`.

---

## 1. Audit of Section 2: Defect Verification

| # | Item / Assertion | Status | File & Function | Evidence Snippet |
|---|---|---|---|---|
| **1** | **Reservation created before payment.** `Data.createReservation()` is called first, then `initialPayment` is attached. No payment-failed, timed-out or abandoned path; no inventory hold. | **CONFIRMED** | `js/booking-modal.js` -> `openBookingModal` (line 521)<br>`js/data.js` -> `createReservation` (line 1236) | ```js\nconst newRes = Data.createReservation({ ... initialPayment: ... });\n// inside Data.createReservation:\nif (data.initialPayment) { ... }\n``` |
| **2** | **Unpaid online bookings exist.** The modal offers "Cash at Front Desk (Deposit Guarantee)" and default status in `createReservation` is `'Pending'`; demo data has Pending online bookings. Breaks "no payment, no reservation". | **CONFIRMED** | `js/booking-modal.js` -> `openBookingModal` (lines 351, 539)<br>`js/data.js` -> `createReservation` (line 1209) | ```js\nst: data.st || 'Pending',\n// If Cash at Front Desk or Bank Transfer is chosen, initialPayment is null and status stays 'Pending'\n``` |
| **3** | **"50%" typed into UI strings.** Hardcoded "50%" in UI strings (modal summary, footer button, confirmation text, payment note) instead of rendering `CONFIG.depositPct`, creating drift if config changes. | **CONFIRMED** | `js/booking-modal.js` (lines 47, 376, 543)<br>`js/data.js` (lines 155, 1248, 1436)<br>`js/reservations.js` (lines 905, 1006) | ```js\n'50% Guarantee Deposit Due on confirmation'\n'50% guarantee deposit on booking'\n'Cannot check in: 50% deposit has not been settled.'\n``` |
| **4** | **Two deposit formulas disagree.** `core.js` quote computes `depDue` from `netTotal` with taxes, while `Data.depAmt(r)` uses `roomChg(r)` (room charge only). Guest pays one amount, check-in checks another. | **CONFIRMED** | `js/core.js` -> `calculateStayPricing` (line 621)<br>`js/data.js` -> `depAmt` (line 1338) | ```js\n// core.js line 621:\nconst depDue = Math.ceil(netTotal * (CONFIG.depositPct / 100));\n// data.js line 1338:\nreturn Math.ceil(this.roomChg(r) * (CONFIG.depositPct / 100));\n``` |
| **5** | **Sign-in gate lives only in modal.** `Data.createReservation` accepts any session (staff session counts), only blocks source spoofing, does not check guest role. Console calls bypass gate. | **CONFIRMED** | `js/data.js` -> `createReservation` (lines 1140-1175) | ```js\nif (!staffSession && guestSession) { ... }\nconst guestName = (guestSession ? ... : (data.g || data.guestName || '')).trim();\n// Accepts unauthenticated direct calls, assigns Online source!\n``` |
| **6** | **Status flips by side effect.** `addPayment` sets `Pending` -> `Confirmed` when `paid >= depAmt`. No single `confirm` function, no idempotency; double click/refresh creates duplicate reservations. | **CONFIRMED** | `js/data.js` -> `addPayment` (lines 1379-1381) | ```js\nif (r.st === 'Pending' && this.paidAmt(r) >= this.depAmt(r)) {\n  r.st = 'Confirmed';\n}\n``` |
| **7** | **No availability re-check at payment.** No real-time check or inventory hold at moment of payment. Two guests can pay for the same last room simultaneously. | **CONFIRMED** | `js/booking-modal.js` (lines 509-521) | ```js\nconst state = computeState();\nif (!state.canBook) { ... return; }\n// Checked once at form submit; no lock, no atomic re-check\n``` |
| **8** | **Check-in rule uses depAmt.** Check-in checks `depAmt(r)` (50% room charge only) instead of `reservation.depositRequired` (50% of net total with taxes). | **CONFIRMED** | `js/data.js` -> `checkIn` (line 1435)<br>`js/booking-modal.js` (line 905) | ```js\nif (this.paidAmt(r) < this.depAmt(r)) {\n  return { success: false, error: `Cannot check in: 50% deposit (${peso(this.depAmt(r))}) has not been settled.` };\n}\n``` |
| **9** | **Payment record text & UI layer confirmation.** Payment note hardcodes "50% guarantee deposit" and OR/voucher/confirmation modal are produced directly in UI layers rather than domain services. | **CONFIRMED** | `js/booking-modal.js` (lines 543, 565-580)<br>`js/data.js` (line 1248) | ```js\nnote: isStaffWalkIn ? 'Walk-in desk guarantee settlement' : '50% guarantee deposit on booking',\n// Confirmation modal DOM injected directly inside submit click handler\n``` |

---

## 2. Inventory of References in Codebase

### 2.1 References to `depositPct`
- `js/core.js` (line 54): `depositPct: 50,`
- `js/core.js` (line 621): `const depDue = Math.ceil(netTotal * (CONFIG.depositPct / 100));`
- `js/data.js` (line 1338): `return Math.ceil(this.roomChg(r) * (CONFIG.depositPct / 100));`
- `js/services.js` (line 27): `depositPct: 50,`
- `js/services.js` (line 327): `const depositPct = cfg.depositPct || 50;`
- `js/services.js` (line 328): `const depDue = Math.ceil(netTotal * (depositPct / 100));`
- `js/settings.js` (lines 237, 238, 304, 575, 583): Admin settings for deposit percentage
- `js/site-shell.js` (line 310): Policy text rendering `${CONFIG.depositPct}%`
- `js/guests.js` (line 1068): Walk-in minimum deposit calculation
- `js/reservations.js` (line 1171): Staff reservation initial payment calculation

### 2.2 References to `depAmt`
- `js/data.js` (line 1336): `depAmt(r)` method declaration
- `js/data.js` (line 1379): `if (r.st === 'Pending' && this.paidAmt(r) >= this.depAmt(r))`
- `js/data.js` (line 1435): `if (this.paidAmt(r) < this.depAmt(r))`
- `js/reservations.js` (line 561): `paid >= Data.depAmt(r)`
- `js/booking-modal.js` (line 905): `paid >= Data.depAmt(r)`

### 2.3 References to `depDue`
- `js/core.js` (line 621, 622, 631): `calculateStayPricing` output
- `js/services.js` (lines 328, 329, 346, 347, 672): `PricingService.quote` output
- `js/booking-modal.js` (lines 38, 47, 148, 377, 388, 540, 578, 609): Quote and deposit rendering
- `js/rooms-deals.js` (line 75): Fallback deposit calculation

### 2.4 References to `'Pending'` (Reservation Status)
- `js/data.js` (lines 53, 91, 1209, 1379, 1466): Initial reservation status & status transitions
- `js/reservations.js` (lines 9, 43, 78, 334, 573, 644, 653, 907, 1003, 1169): Admin ledger status filters and badge rendering
- `js/guest-portal.js` (lines 954, 990): Guest portal status filter and badge rendering
- `js/services.js` (lines 620, 680, 725): Reservation lifecycle status checks

### 2.5 Occurrences of Literal Text `'50%'`
- `js/core.js` (line 45): Policy string `'50% room charge secures your booking'`
- `js/data.js` (lines 155, 1248, 1436): Seed data note, `createReservation` payment note, `checkIn` validation message
- `js/booking-modal.js` (lines 47, 376, 543): Modal header, breakdown label, payment note
- `js/reservations.js` (lines 905, 1006): Option label and status text
- `js/guests.js` (line 1010): Hint text for walk-in desk

---

## 3. Architecture Specification for Implementation (Phase R1 & R2)

### 3.1 Proposed Services (in `js/services.js`)

1. **`Money` Helper**
   - Centavo rounding (`roundCentavo`, `ceilCentavo`), arithmetic helpers avoiding floating point issues.
2. **`PricingService.quote(input)`**
   - Inputs: `typeId`, `checkIn`, `checkOut`, `guests`, `promoCode`.
   - Output: `nightly[]`, `subtotal`, `discount`, `taxes` (BIR standard 1.232 factor), `total`, `depositPct`, `depositDue` (ceilCentavo(total * depositPct / 100)), `balanceDue` (total - depositDue).
3. **`AvailabilityService.unitsFree(typeId, checkIn, checkOut, excludeHoldId?)`**
   - Free count = Active rooms of type minus overlapping Confirmed/Checked-in stays minus overlapping Active non-expired `BookingHold`s.
   - Half-open interval `[checkIn, checkOut)`.
4. **`HoldService.expire()`**
   - Expires stale holds (`expiresAt <= now`), cleans up `AwaitingBank` intents past `bankHoldMinutes`, releases inventory and promo reservations.
5. **`BookingService.startHold(session, input)`**
   - Guard: `Auth.requireRole(['guest'])`; blocks visitors with `AUTH_REQUIRED`, blocks staff with `FORBIDDEN`.
   - Validates dates (`checkIn >= today`, nights 1..30), capacity, profile fields.
   - Idempotently creates or reuses active `BookingHold` (HLD-####) for guest/type/dates with 15-minute expiration (`holdMinutes`).
6. **`PaymentService.pay(holdId, method, details)`**
   - Validates active hold, payment attempts < `maxPayAttempts` (3).
   - Generates `PaymentIntent` (PI-####).
   - Simulates Card (Luhn + test outcomes), GCash, Maya, and Bank transfer.
   - Succeeded -> triggers `BookingService.finalize(holdId, intentId)`.
7. **`PaymentService.bankCallback(intentId, outcome, bankRef)`**
   - Simulates payment gateway webhook for QR Ph / Online Banking.
   - Idempotent: transitions `PaymentIntent` to `Succeeded` and calls `BookingService.finalize`.
8. **`BookingService.finalize(holdId, intentId)`**
   - Atomic transaction via `store.transaction()`.
   - Idempotent: returns existing reservation if hold is already `Paid`.
   - Handles late payments (re-check availability; auto-refund if room taken).
   - Creates Confirmed reservation with `depositPct`, `depositRequired`, `depositPaid`, `balanceDue`.
   - Generates sequential OR payment record, opens folio, redeems promo, emits audit, notifies hotel and guest.

### 3.2 Data Migration (Schema v4)
- Non-destructive migration on `Data.init()`:
  - Migrate all existing reservations: set `depositPct = 50`, `depositRequired = ceil(total * 0.5)`, `depositPaid = sum(payments where kind != 'Refund')`, `balanceDue = total - depositPaid`, `confirmedBy = 'System (migration)'`.
  - Initialize stores: `bookingHolds` (`[]`), `paymentIntents` (`[]`).
  - Update `CONFIG`: `depositPct: 50`, `holdMinutes: 15`, `bankHoldMinutes: 30`, `maxPayAttempts: 3`, `freeCancelDays: 3`, `lateCancelFeePct: 30`. Update policy text.
