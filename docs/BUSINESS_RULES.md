# PUPSJ Hotel & Restaurant PMS — Business Rules Catalogue

This document provides a single source of truth for all business rules and maps each rule directly to the code location that enforces it.

---

### Category 1: Authentication, Sessions & Access Control
- **BR-001 (Two Roles Only)**: System recognizes only `superadmin` and `guest` login roles. Personnel directory records are task assignment entities without credentials.  
  *Enforcing Location*: `js/services.js` (`AuthService.login`), `js/staff-shell.js` (`initGuard`).
- **BR-002 (Tab-Isolated Sessions)**: Sessions live in `sessionStorage` per browser tab to allow concurrent guest and admin tabs.  
  *Enforcing Location*: `js/data.js` (`getStaffSession`, `setStaffSession`, `getGuestSession`, `setGuestSession`).
- **BR-003 (Idle Session Expiry)**: Admin sessions timeout after 30 minutes of inactivity; Guest sessions timeout after 4 hours.  
  *Enforcing Location*: `js/staff-shell.js`, `js/site-shell.js`.
- **BR-004 (Account Lockout)**: 5 consecutive failed login attempts lock account for 5 minutes.  
  *Enforcing Location*: `js/services.js` (`AuthService.login`).
- **BR-005 (Safe Navigation & Open Redirect Prevention)**: All `?next=` targets are resolved against current path and validated against an internal whitelist.  
  *Enforcing Location*: `js/core.js` (`validateReturnUrl`).

---

### Category 2: Reservation Lifecycle & Pricing
- **BR-010 (Lifecycle State Transitions)**:  
  `Pending` $\rightarrow$ `Confirmed` $\rightarrow$ `Checked-in` $\rightarrow$ `Checked-out`.  
  `Pending` / `Confirmed` $\rightarrow$ `Cancelled`.  
  `Confirmed` $\rightarrow$ `No-show`.  
  *Checked-in stays cannot be cancelled.*  
  *Enforcing Location*: `js/services.js` (`ReservationService`).
- **BR-011 (Pending Hold Expiration)**: Unpaid reservations hold rooms until `holdExpiresAt` (24h or 2h before arrival). Expired holds auto-transition to `Cancelled`.  
  *Enforcing Location*: `js/services.js` (`ReservationService.runExpiryJobs`).
- **BR-012 (Check-in Requirements)**: Check-in requires: arrival date $\le$ today; assigned room Clean/Inspected; deposit satisfied; government ID type and number recorded; guest count $\le$ capacity.  
  *Enforcing Location*: `js/services.js` (`ReservationService.checkIn`).
- **BR-013 (Zero Balance Checkout)**: Check-out requires folio balance $= 0$. Superadmin override requires mandatory reason logged in audit.  
  *Enforcing Location*: `js/services.js` (`ReservationService.checkOut`).
- **BR-014 (BIR-Correct Tax Extraction)**: Rates are tax-inclusive. Under BIR rules, 10% Service Charge is subject to 12% VAT:  
  $$\text{Gross} = \text{Net} \times 1.10 \times 1.12 = \text{Net} \times 1.232$$  
  $$\text{Net} = \frac{\text{Gross}}{1.232}, \quad \text{SC} = \text{Net} \times 0.10, \quad \text{VAT} = (\text{Net} + \text{SC}) \times 0.12$$  
  *Enforcing Location*: `js/core.js` (`taxBreakdown`), `js/services.js` (`PricingService.quote`).
- **BR-015 (Nightly Rate Snapshots)**: Reservations record a nightly rate snapshot at booking time to prevent subsequent rate changes from altering historic quotes.  
  *Enforcing Location*: `js/services.js` (`ReservationService.createReservation`).

---

### Category 3: Folio & Financial Transactions
- **BR-020 (Unified Sequential Official Receipts)**: All money transactions (Room Deposits, Folio Payments, POS Orders, Refunds) share a single persisted `OR-#####` counter.  
  *Enforcing Location*: `js/services.js` (`PaymentService.recordPayment`), `js/data.js` (`nextOR`).
- **BR-021 (Standardized Payment Methods)**: Payment method must be one of `['Cash', 'Credit Card', 'Debit Card', 'GCash', 'Maya', 'Bank Transfer', 'Room Folio']`.  
  *Enforcing Location*: `js/services.js` (`PaymentService`), `js/validate.js`.
- **BR-022 (Overpayment & Refund Caps)**: Non-cash payments cannot exceed total balance. Cash records change. Refunds cannot exceed net payments received.  
  *Enforcing Location*: `js/services.js` (`PaymentService`).

---

### Category 4: Restaurant POS, Tables & KDS
- **BR-030 (Independence of Kitchen & Billing Status)**: Kitchen status (`New` $\rightarrow$ `Preparing` $\rightarrow$ `Ready` $\rightarrow$ `Served`) and billing status (`Unpaid` $\rightarrow$ `Paid` / `Room folio`) are strictly decoupled. Billing does not alter kitchen status.  
  *Enforcing Location*: `js/services.js` (`OrderService`).
- **BR-031 (Station Routing)**: KDS divides orders by station (Bar vs Kitchen). An order becomes Ready when all station tickets are complete.  
  *Enforcing Location*: `js/kitchen.js`, `js/services.js` (`OrderService`).
- **BR-032 (Dynamic Table Status)**: Table status is derived: `Occupied` if active dine-in order, `Reserved` if active booking within 90 min, `Needs cleaning` after settlement, `Free` when cleared.  
  *Enforcing Location*: `js/services.js` (`TableService`).

---

### Category 5: Housekeeping & Maintenance
- **BR-040 (Room Cleanliness Workflow)**: `Dirty` $\rightarrow$ `In progress` $\rightarrow$ `Clean` $\rightarrow$ `Inspected`. Only `Clean` or `Inspected` rooms are sellable/check-in ready.  
  *Enforcing Location*: `js/services.js` (`HousekeepingService`, `RoomService`).
- **BR-041 (Maintenance OOS Relocation)**: Flagging a room Out of Service with future bookings triggers relocation workflow; resolving maintenance marks the room `Dirty` (never available directly).  
  *Enforcing Location*: `js/services.js` (`MaintenanceService`).

---

### Category 6: Loyalty & Identity
- **BR-050 (Stable Guest ID)**: Guests are identified by a stable `guestId` (`GST-####`). Points and bookings reference `guestId`, not guest name.  
  *Enforcing Location*: `js/services.js` (`GuestService`, `LoyaltyService`).

---

### Category 7: Online Room Reservation & Inventory Hold Engine
- **BR-RES-001 (50% Guarantee Down Payment Requirement)**:  
  Online room bookings require a guarantee deposit of exactly 50% (`CONFIG.depositPct = 50`) of the stay total (computed after promotional and statutory discounts, inclusive of 10% Service Charge and 12% BIR VAT). The deposit is rounded up to the nearest centavo using `Money.ceilCentavo(total * depositPct / 100)`.  
  *Enforcing Location*: `js/services.js` (`PricingService.quote`, `BookingService.finalize`), `js/core.js` (`calculateStayPricing`).
- **BR-RES-002 (Real-Time 15-Minute Inventory Hold)**:  
  Clicking "Reserve" acquires a temporary inventory hold for 15 minutes (`CONFIG.holdMinutes = 15`), decrementing sellable rooms for the requested date interval $[ci, co)$ without creating a reservation. Stale holds expire automatically via `HoldService.expire()`.  
  *Enforcing Location*: `js/services.js` (`BookingService.startHold`, `HoldService.expire`, `AvailabilityService.unitsFree`).
- **BR-RES-003 (Instant Automated Confirmation — Zero Hotel Approval)**:  
  Payment confirmation via Credit/Debit card, GCash, Maya, or simulated Bank Transfer instantly triggers `BookingService.finalize()`. The reservation is created directly with status `Confirmed` and `confirmedBy: 'System (payment)'`. Hotel staff are notified in real-time but do not manually approve bookings.  
  *Enforcing Location*: `js/services.js` (`BookingService.finalize`, `PaymentService.pay`, `PaymentService.bankCallback`).
- **BR-RES-004 (Payment-Required Invariant — Zero Unpaid Online Bookings)**:  
  Unpaid online bookings never become reservations. The status `Pending` is strictly prohibited for online sources and is reserved exclusively for staff-assisted desk bookings awaiting deposit. The option "Cash at Front Desk" is permanently removed from the online booking engine.  
  *Enforcing Location*: `js/data.js` (`createReservation`), `js/services.js` (`BookingService.finalize`), `js/booking-modal.js`.
- **BR-RES-005 (Automated QR Ph Bank Transfer & Webhook Gateway Callback)**:  
  Bank transfer payments open a simulated online banking / QR Ph sheet (`[IMAGE: QR Ph code, 1:1]`) with reference `PUP-<holdId>`. The hold window is extended to 30 minutes (`CONFIG.bankHoldMinutes = 30`). The booking is confirmed automatically upon reception of `PaymentService.bankCallback(intentId, 'paid')`, mimicking a real-world payment gateway webhook. Duplicate callbacks are idempotent.  
  *Enforcing Location*: `js/services.js` (`PaymentService.pay`, `PaymentService.bankCallback`, `BookingService.finalize`).
- **BR-RES-006 (Tiered Cancellation Policy)**:  
  Cancellations made 3 or more days prior to arrival (`daysUntilArrival >= CONFIG.freeCancelDays`) receive a 100% full refund of all amounts paid. Cancellations made less than 3 days prior incur a 30% deduction (`CONFIG.lateCancelFeePct = 30`) from total paid amounts, refunding the remaining 70%. No-shows retain 100% of all payments (0% refund). Checked-in stays cannot be cancelled. Refunds issue a dedicated negative payment entry with a unique BIR `OR-#####`.  
  *Enforcing Location*: `js/services.js` (`ReservationService.cancelReservation`), `js/data.js` (`cancelReservation`).
- **BR-RES-007 (Balance Settlement at Check-In or Online Portal)**:  
  Check-in requires `depositPaid >= depositRequired` (guaranteed for online bookings). The remaining balance (`balanceDue = total - depositPaid`) must be settled at front desk check-in or online any time prior via the Guest Portal. Checkout requires folio balance $= 0$.  
  *Enforcing Location*: `js/services.js` (`ReservationService.checkIn`, `ReservationService.checkOut`), `js/guest-portal.js` (`openPayBalanceModal`).
- **BR-RES-008 (Auth Gate & Search Preservation)**:  
  Browsing room types, availability, and nightly rates is completely public. Clicking "Reserve" enforces authentication (`guest` role required). The visitor's selected stay dates, guests, room type, and promo are persisted in `sessionStorage` and restored seamlessly upon sign-in or registration. Staff sessions attempting online booking are rejected with `FORBIDDEN` and redirected to the staff management desk.  
  *Enforcing Location*: `js/booking-modal.js` (`showAuthGateModal`), `js/services.js` (`BookingService.startHold`).

