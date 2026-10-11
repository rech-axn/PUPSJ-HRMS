## 0. Use Case Specifications (Online Reservation Engine)

### UC-RES-01: Create Online Room Reservation
- **Primary Actor**: [PLACEHOLDER: Guest Actor - Input online guest user persona here] Online Guest / Visitor
- **Preconditions**:
  1. Room type has at least 1 free unit for requested stay interval $[ci, co)$ (`AvailabilityService.unitsFree >= 1`).
  2. Visitor is authenticated as `guest` (if unauthenticated, the Auth Gate intercepts at the "Reserve" step, preserves search parameters in `sessionStorage`, and resumes immediately post-authentication).
- **Postconditions**:
  1. 15-minute `BookingHold` consumed and marked `Paid`.
  2. 50% down payment recorded in unified payments ledger with sequential BIR `OR-#####`.
  3. Folio initialized with 50% deposit credit and room charges.
  4. Reservation created with status `Confirmed` (`confirmedBy: 'System (payment)'`, source `'Online'`).
  5. Room unit assigned from free pool.
  6. Hotel front desk notified in real-time (`"New online booking HTL-####, ₱__ paid"`).
  7. Instant confirmation voucher rendered with `[PLACEHOLDER: Watermark SIMULATED]`.
- **Main Flow**:
  1. Visitor browses public availability and selects dates, guests, and room type.
  2. System quotes pricing using BIR 1.232 factor and computes 50% deposit due.
  3. Visitor clicks "Reserve". System verifies guest authentication (triggers Auth Gate if needed).
  4. System acquires 15-minute inventory hold (`BookingService.startHold`).
  5. Guest reviews price breakdown and agrees to cancellation policy checkbox.
  6. Guest submits payment via Card, GCash, Maya, or Bank Transfer QR Ph.
  7. System executes `BookingService.finalize()` atomically in `Store.transaction()`.
  8. System renders instant confirmation screen and issues printable voucher.
- **Alternative / Exceptional Flows**:
  - *Late Payment / Expired Hold*: If room is still free, system re-locks unit and confirms. If room is taken, system auto-refunds payment in full, sets intent `Refunded`, and alerts guest.
  - *Payment Declined*: System increments hold attempts, displays inline error, and retains hold if attempts $< 3$.

---

### UC-RES-02: Modify Stay Dates or Room Type
- **Primary Actor**: [PLACEHOLDER: Guest Actor - Input registered guest user persona here] Registered Guest
- **Preconditions**:
  1. Guest has an active `Confirmed` stay in Guest Portal.
  2. Check-in date has not passed (`checkInDate > today()`).
- **Postconditions**:
  1. Reservation record updated with new dates, room type, and nightly rate snapshot.
  2. Any increase in the 50% deposit requirement is collected via instant top-up payment before changes commit.
  3. Room re-allocated; hotel notified.
- **Main Flow**:
  1. Guest opens Guest Portal > My Reservations and clicks "Modify".
  2. Guest selects new dates or room type. System checks availability excluding existing stay.
  3. System recalculates quote. If new 50% deposit exceeds current `depositPaid`, guest pays difference.
  4. System commits modification and updates ledger.

---

### UC-RES-03: Cancel Reservation
- **Primary Actor**: [PLACEHOLDER: Guest Actor - Input registered guest user persona here] Registered Guest
- **Preconditions**:
  1. Guest has an active `Confirmed` stay.
  2. Stay status is not `Checked-in` (checked-in stays require early checkout).
- **Postconditions**:
  1. Reservation status transitioned to `Cancelled`.
  2. Room unit released back to sellable inventory pool.
  3. If $\ge 3$ days prior to arrival (`daysToArrival >= CONFIG.freeCancelDays`), 100% of all payments refunded.
  4. If $< 3$ days prior to arrival, 30% penalty deducted (`CONFIG.lateCancelFeePct = 30`), remaining 70% refunded.
  5. Refund recorded as negative payment with unique BIR `OR-#####`.
  6. Audit trail logged and hotel notified.
- **Main Flow**:
  1. Guest clicks "Cancel" in Guest Portal.
  2. Modal displays refund computation: `"Paid ₱__, deduction (30%) ₱__, you will be refunded ₱__"`.
  3. Guest confirms cancellation. System executes `ReservationService.cancelReservation()`.

---

## 1. Class Diagram (Architecture & Domain Services)

The system follows a clean modular service-oriented architecture implemented in vanilla JavaScript. Services encapsulate domain rules, state mutations, and persistence transactions.

```mermaid
classDiagram
    class BookingService {
        +startHold(session, input) Result
        +finalize(holdId, intentId) Result
    }

    class AvailabilityService {
        +unitsFree(typeId, ci, co, excludeHoldId) int
    }

    class HoldService {
        +expire() Object
        +getActiveHold(holdId) Object
        +releaseHold(holdId, guestId) Result
    }

    class PaymentService {
        +METHODS Array
        +pay(holdId, method, details) Result
        +bankCallback(intentId, outcome, bankRef) Result
        +recordPayment(params) Result
        +getPayments() Array
    }

    class PricingService {
        +quote(params) Object
        +validatePromo(code, context) Object
        +calculateTaxes(grossTotal) Object
    }

    class ReservationService {
        +createReservation(data) Result
        +checkIn(code, idType, idNumber) Result
        +checkOut(code, overrideReason) Result
        +cancelReservation(code, reason) Result
        +modifyStay(code, newParams) Result
    }

    class AuthService {
        +login(email, password) Result
        +registerGuest(data) Result
        +getLockoutState(email) Object
        +getCurrentSession() Object
    }

    class FolioService {
        +getFolio(reservationCode) Object
        +postCharge(resCode, charge) Result
        +postPayment(resCode, payment) Result
    }

    class AuditService {
        +log(action, targetType, targetId, details, actorRole, actorName) Object
        +verifyChainIntegrity() Object
    }

    class BookingHold {
        +string holdId
        +string guestId
        +string typeId
        +string checkIn
        +string checkOut
        +int guests
        +string status
        +int expiresAt
        +Object quoteSnapshot
    }

    class PaymentIntent {
        +string intentId
        +string holdId
        +int amount
        +string method
        +string status
        +string authRef
        +string bankRef
    }

    %% Relationships
    BookingService ..> AvailabilityService : checks free rooms
    BookingService ..> HoldService : manages hold lifecycle
    BookingService ..> PricingService : captures quoteSnapshot
    BookingService ..> PaymentService : verifies intent
    BookingService ..> ReservationService : creates reservation
    PaymentService ..> BookingService : triggers finalize
    ReservationService ..> PricingService : calculates BIR taxes
    ReservationService ..> FolioService : reconciles
    ReservationService ..> AuditService : logs audit trail
    BookingService ..> BookingHold : creates & consumes
    PaymentService ..> PaymentIntent : creates & settles
```

---

## 2. Sequence Diagrams (Core Business Workflows)

### 2.1 Workflow 1: Guest Online Reservation with 50% Guarantee Down Payment & Instant Confirmation

Demonstrates public browsing, auth gate, 15-minute inventory hold, payment intent settlement, atomic finalize transaction, and real-time hotel receptionist notification.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as [PLACEHOLDER: Guest Actor - Input guest user icon here] Guest
    participant UI as [PLACEHOLDER: Booking UI - Input booking interface component icon here] Booking UI
    participant BookSvc as [PLACEHOLDER: Booking Service - Input booking service icon here] BookingService
    participant PaySvc as [PLACEHOLDER: Payment Service - Input payment service icon here] PaymentService
    participant Store as [PLACEHOLDER: Data Store - Input reactive store icon here] Store
    participant Notif as [PLACEHOLDER: Notification Service - Input notification alert icon here] NotificationService
    actor Receptionist as [PLACEHOLDER: Receptionist Actor - Input front desk staff icon here] Hotel Receptionist

    Guest->>UI: Select Room Type, Dates (ci, co), Guests
    UI->>BookSvc: Check Availability & Quote Stay
    BookSvc->>Store: AvailabilityService.unitsFree(type, ci, co)
    Store-->>BookSvc: Units Free: 4
    BookSvc-->>UI: Quote (Stay Total ₱6,400, 50% Down Payment ₱3,200)

    Guest->>UI: Click "Reserve"
    alt Unauthenticated Visitor
        UI-->>Guest: Present Auth Gate (Sign In / Register)
        Guest->>UI: Sign In (Search restored from sessionStorage)
    end

    UI->>BookSvc: startHold(guestSession, stayParams)
    BookSvc->>Store: Create BookingHold HLD-10492 (Status: Active, 15m Timer)
    Store-->>BookSvc: Hold Confirmed
    BookSvc-->>UI: Hold Started (15:00 Countdown Live)

    Guest->>UI: Review Breakdown & Submit Payment (Card / GCash / Maya)
    UI->>PaySvc: pay(HLD-10492, method, credentials)
    PaySvc->>Store: Create PaymentIntent PI-2018 (Status: Succeeded)
    PaySvc->>BookSvc: finalize(HLD-10492, PI-2018)

    activate BookSvc
    BookSvc->>Store: Store.transaction() [Atomic Execution]
    Note over BookSvc,Store: 1. Validate Hold Active & Intent Succeeded<br/>2. Re-check Availability & Assign Room 201<br/>3. Create Reservation HTL-3091 (Status: Confirmed, ConfirmedBy: 'System')<br/>4. Issue BIR Receipt OR-10088 & Credit Folio ₱3,200<br/>5. Transition Hold to Paid & Intent to Succeeded
    BookSvc->>Notif: Broadcast "New online booking HTL-3091, ₱3,200 paid"
    Notif-->>Receptionist: Alert Banner & Sound: "New Online Booking HTL-3091"
    BookSvc-->>PaySvc: Finalize Succeeded (HTL-3091, OR-10088)
    deactivate BookSvc

    PaySvc-->>UI: Confirmation Payload
    UI-->>Guest: Render Confirmed Step, Voucher & Simulated Email Preview
```

---

### 2.1b Workflow 1b: Bank Transfer QR Ph Gateway Webhook Callback

Demonstrates the 30-minute extended hold, QR Ph simulation sheet, and automated gateway webhook callback confirming the booking without manual staff intervention.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as [PLACEHOLDER: Guest Actor - Input guest user icon here] Guest
    participant UI as [PLACEHOLDER: Booking UI - Input booking interface component icon here] Booking UI
    participant PaySvc as [PLACEHOLDER: Payment Service - Input payment service icon here] PaymentService
    participant BookSvc as [PLACEHOLDER: Booking Service - Input booking service icon here] BookingService
    participant Gateway as [PLACEHOLDER: Bank Gateway - Input bank QR Ph gateway icon here] Bank Gateway / QR Ph
    participant Store as [PLACEHOLDER: Data Store - Input reactive store icon here] Store
    actor Receptionist as [PLACEHOLDER: Receptionist Actor - Input front desk staff icon here] Hotel Receptionist

    Guest->>UI: Choose Bank Transfer & Pick Bank (BDO)
    UI->>PaySvc: pay(holdId, 'Bank Transfer', { bank: 'BDO' })
    PaySvc->>Store: Extend Hold to 30 min (CONFIG.bankHoldMinutes)
    PaySvc->>Store: Create PaymentIntent (Status: 'AwaitingBank')
    PaySvc-->>UI: Intent Created (Ref: PUP-HLD-10492, 30:00 Timer)
    UI-->>Guest: Display QR Ph Code Sheet & "Waiting for your bank to confirm..."

    Guest->>Gateway: Scan QR Ph & Authorize Payment in Bank App
    Gateway->>Gateway: Process Settlement (2-4 s delay)
    Gateway->>PaySvc: bankCallback(intentId, 'paid', 'BNK-REF-998877')

    activate PaySvc
    Note over PaySvc: Webhook Received (Idempotent Handler)
    PaySvc->>Store: Update Intent -> Succeeded (settledAt: now)
    PaySvc->>BookSvc: finalize(holdId, intentId)
    BookSvc->>Store: Create Confirmed Reservation HTL-3092 & BIR OR-10089
    BookSvc->>Receptionist: Real-time Alert: "New Online Booking HTL-3092"
    PaySvc-->>Gateway: 200 OK Webhook Acknowledged
    deactivate PaySvc

    UI->>PaySvc: Poll Intent Status / Storage Event
    PaySvc-->>UI: Status = Succeeded (Reservation HTL-3092)
    UI-->>Guest: Auto-transition to Step 5 Confirmed Screen
```

---

### 2.2 Workflow 2: Front Desk Walk-In Check-In with BIR Official Receipt Generation

Demonstrates immediate walk-in registration, mandatory government photo ID recording, room assignment, front desk cash settlement, and room occupancy status toggle.

```mermaid
sequenceDiagram
    autonumber
    actor Clerk as [PLACEHOLDER: Front Desk Clerk - Input desk receptionist staff icon here] Front Desk Clerk
    participant AdminUI as [PLACEHOLDER: Admin UI - Input reservations desk console icon here] Reservations Admin UI
    participant Res as [PLACEHOLDER: Reservation Service - Input reservation engine icon here] ReservationService
    participant HK as [PLACEHOLDER: Housekeeping Service - Input housekeeping management icon here] HousekeepingService
    participant Folio as [PLACEHOLDER: Folio Service - Input billing ledger icon here] FolioService
    participant Audit as [PLACEHOLDER: Audit Service - Input audit logging icon here] AuditService

    Clerk->>AdminUI: Click "New Reservation / Walk-In"
    Clerk->>AdminUI: Enter Guest Name, Mobile, Govt ID (Passport P1234567A), Room 201
    AdminUI->>Res: Validate Room 201 Cleanliness & Availability
    Res-->>AdminUI: Room 201 is Clean & Unoccupied

    Clerk->>AdminUI: Collect Cash Payment (₱3,200) & Check "Check in guest immediately"
    AdminUI->>Res: createReservation({ source: 'Walk-in', checkInNow: true, ... })

    activate Res
    Res->>Folio: postPayment(HTL-10493, { amount: 3200, method: 'Cash', kind: 'Full Payment' })
    Folio->>Folio: Next BIR OR -> OR-10089
    Folio-->>Res: Payment Recorded (Balance: 0)
    Res->>Res: Set Reservation Status = 'Checked-in'
    Res->>HK: updateRoomStatus(201, 'Occupied')
    Res->>Audit: log("Check-in", "Reservation", "HTL-10493", "Walk-in guest checked into Room 201")
    Res-->>AdminUI: Check-In Succeeded (HTL-10493, OR-10089)
    deactivate Res

    AdminUI-->>Clerk: Display Check-In Success, Room Key Prompt & Print Official Receipt
```

---

### 2.3 Workflow 3: In-Room Dining Order Charged to Hotel Room Folio

Demonstrates order placement from the restaurant/room-service module, kitchen ticket management, folio ledger posting, and balance recalculation.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as [PLACEHOLDER: Guest / Waiter Actor - Input dining guest or server icon here] Guest / Waiter
    participant POSUI as [PLACEHOLDER: Dining Menu UI - Input POS terminal icon here] POS & Menu UI
    participant POS as [PLACEHOLDER: POS Service - Input kitchen order service icon here] POSService
    participant Folio as [PLACEHOLDER: Folio Service - Input billing ledger icon here] FolioService
    participant Kitchen as [PLACEHOLDER: Kitchen Display - Input kitchen display system icon here] Kitchen Display (KDS)
    participant Store as [PLACEHOLDER: Storage - Input order storage icon here] Storage

    Guest->>POSUI: Select Menu Items (Crispy Pata, Garlic Rice, Halo-Halo)
    Guest->>POSUI: Select Settlement: "Charge to Room 201"
    POSUI->>POS: createOrder({ items, diningType: 'Room Service', room: 201 })

    activate POS
    POS->>Store: Find Active Stay for Room 201 -> HTL-10493 (Checked-in)
    POS->>Folio: postCharge("HTL-10493", { desc: "Room Service ORD-10214", amount: 1250, cat: "Dining" })
    Folio->>Store: Append to Folio Charges (New Room Balance: ₱1,250)
    POS->>Store: Create Order Ticket ORD-10214 (Status: 'Preparing')
    POS-->>Kitchen: Broadcast new order to Kitchen Display System
    POS-->>POSUI: Order Dispatched & Charged to Room 201
    deactivate POS

    Kitchen->>Kitchen: Chef clicks "Mark Ready" -> "Mark Served"
    Kitchen->>POS: updateOrderStatus("ORD-10214", "Served")
    POS->>Store: Update Ticket State
```

---

### 2.4 Workflow 4: Housekeeping Turnover on Express Check-Out

Demonstrates guest-initiated or front-desk check-out, automated balance verification, cascading room status to `Dirty` with turnaround priority assignment, and cleaning completion.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as [PLACEHOLDER: Guest / Clerk Actor - Input guest or front desk icon here] Guest / Clerk
    participant Portal as [PLACEHOLDER: Guest Portal UI - Input guest self-service portal icon here] Guest Portal / Desk UI
    participant Res as [PLACEHOLDER: Reservation Service - Input reservation engine icon here] ReservationService
    participant Folio as [PLACEHOLDER: Folio Service - Input billing ledger icon here] FolioService
    participant HK as [PLACEHOLDER: Housekeeping Service - Input housekeeping management icon here] HousekeepingService
    participant Audit as [PLACEHOLDER: Audit Service - Input audit logging icon here] AuditService

    Guest->>Portal: Click "Express Check-Out"
    Portal->>Folio: getFolio("HTL-10493")
    Folio-->>Portal: { balance: 0, charges: 4450, payments: 4450 }

    alt Balance > 0
        Portal-->>Guest: Block Check-Out: "Outstanding folio balance of ₱X must be settled"
    else Balance == 0
        Guest->>Portal: Confirm Check-Out
        Portal->>Res: checkOut("HTL-10493")
        activate Res
        Res->>Res: Set Reservation Status = 'Checked-out'
        Res->>HK: triggerCheckoutDirty(Room 201)
        activate HK
        HK->>HK: Inspect arrival schedule for Room 201 today
        HK->>HK: Set Room 201 Status = 'Dirty', Priority = 'Urgent'
        HK-->>Res: Housekeeping Queue Updated
        deactivate HK
        Res->>Audit: log("Guest Check-out", "Reservation", "HTL-10493", "Room 201 marked Dirty (Urgent)")
        Res-->>Portal: Check-Out Complete
        deactivate Res
        Portal-->>Guest: "Express check-out completed. Thank you for staying with us!"
    end
```
