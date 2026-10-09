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
