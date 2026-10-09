# UML Class & Sequence Diagrams
**Course**: Systems Analysis and Design (SAD)  
**Location Context**: San Juan City, Metro Manila, Philippines  
**System Scope**: PUPSJ Hotel & Restaurant Management System

---

## 1. Class Diagram (Architecture & Domain Services)

The system follows a clean modular service-oriented architecture implemented in vanilla JavaScript. Services encapsulate domain rules, state mutations, and persistence transactions.

```mermaid
classDiagram
    class AuthService {
        +int LOCKOUT_ATTEMPTS
        +int LOCKOUT_DURATION_MS
        +login(email, password) Result
        +registerGuest(data) Result
        +getLockoutState(email) Object
        +recordFailedAttempt(email) void
        +clearFailedAttempts(email) void
    }

    class ReservationService {
        +createReservation(data) Result
        +checkIn(code, roomNo) Result
        +checkOut(code, overrideReason) Result
        +cancelReservation(code, reason) Result
        +getFreeRooms(type, ci, co) Array
        +expireHolds() int
    }

    class PricingService {
        +quote(params) Object
        +validatePromo(code, context) Object
        +calculateTaxes(grossTotal) Object
    }

    class FolioService {
        +getFolio(reservationCode) Object
        +postCharge(resCode, charge) Result
        +postPayment(resCode, payment) Result
        +generateOfficialReceipt(resCode, payment) Object
    }

    class POSService {
        +createOrder(orderData) Result
        +updateOrderStatus(code, newStatus) Result
        +chargeToRoom(orderCode, resCode) Result
        +getKitchenTickets() Array
    }

    class HousekeepingService {
        +updateRoomStatus(roomNo, status, priority, staffId) Result
        +triggerCheckoutDirty(roomNo) void
        +getCleaningQueue() Array
    }

    class MaintenanceService {
        +createTicket(ticketData) Result
        +resolveTicket(ticketId, notes) Result
        +toggleOutOfService(roomNo, isOOS, reason) Result
    }

    class AuditService {
        +log(action, targetType, targetId, details, actorRole, actorName) Object
        +verifyChainIntegrity() Object
        +exportAuditLog() Array
    }

    class Data {
        +getReservations() Array
        +saveReservations(list) void
        +getRooms() Array
        +getRoomHK(roomNo) Object
        +setRoomHK(roomNo, status) void
        +getGuestAccounts() Array
        +saveGuest(data) Object
        +nextId(prefix) String
        +nextOR() String
        +audit(action, targetType, targetId, details) void
    }

    class Store {
        +get(key, defaultValue) Any
        +set(key, value, notify) void
        +transaction(callback) Any
    }

    %% Relationships
    ReservationService ..> PricingService : uses
    ReservationService ..> HousekeepingService : cascades
    ReservationService ..> FolioService : reconciles
    ReservationService ..> AuditService : logs
    FolioService ..> PricingService : calculates BIR taxes
    POSService ..> FolioService : posts room charges
    MaintenanceService ..> HousekeepingService : updates room lock
    ReservationService ..> Data : queries & mutates
    FolioService ..> Data : updates ledger
    Data ..> Store : persists JSON
```

---

## 2. Sequence Diagrams (Core Business Workflows)

### 2.1 Workflow 1: Guest Online Reservation with 50% Guarantee Deposit & Hold Expiration

Demonstrates customer booking, pricing quote with 1.232 factor tax decomposition, 50% deposit settlement, and immediate confirmation.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as 👤 Guest
    participant Web as 💻 Public Web UI
    participant Auth as 🔐 AuthService
    participant Res as 🏨 ReservationService
    participant Price as 🧮 PricingService
    participant Folio as 💳 FolioService
    participant Audit as 📜 AuditService
    participant Store as 💾 Storage

    Guest->>Web: Select Room, Dates (ci, co), and Guests
    Web->>Res: Check availability for dates
    Res->>Store: Query free rooms (exclude OOS & overlaps)
    Store-->>Res: Available Rooms [101, 102]
    Res-->>Web: Availability Confirmed

    Guest->>Web: Submit Guest Details & Optional Promo (WELCOME10)
    Web->>Price: quote({ baseRate, nights, promo })
    Price-->>Web: { netTotal: 5760, depDue: 2880, taxes: { net: 4675, vat: 561, svc: 524 } }

    Guest->>Web: Confirm & Pay Deposit via GCash / Card (₱2,880)
    Web->>Res: createReservation({ roomType, ci, co, promo, initialPayment })
    
    activate Res
    Res->>Store: Next Sequential ID -> HTL-10492
    Res->>Folio: postPayment(HTL-10492, { amount: 2880, method: 'GCash', kind: 'Deposit' })
    Folio->>Store: Issue Serialized BIR Official Receipt (OR-10088)
    Res->>Store: Save Reservation (Status: Confirmed, Total: 5760, Paid: 2880, Bal: 2880)
    Res->>Audit: log("Create Reservation", "Reservation", "HTL-10492", "Paid Deposit ₱2,880 via GCash")
    Audit->>Store: Append Tamper-Evident SHA-256 Log Entry
    Res-->>Web: Booking Confirmed (HTL-10492, OR-10088)
    deactivate Res

    Web-->>Guest: Render Confirmation Card & Official Receipt Modal
```

---

### 2.2 Workflow 2: Front Desk Walk-In Check-In with BIR Official Receipt Generation

Demonstrates immediate walk-in registration, mandatory government photo ID recording, room assignment, front desk cash settlement, and room occupancy status toggle.

```mermaid
sequenceDiagram
    autonumber
    actor Clerk as 👔 Front Desk Clerk
    participant AdminUI as 🖥️ Reservations Admin UI
    participant Res as 🏨 ReservationService
    participant HK as 🧹 HousekeepingService
    participant Folio as 💳 FolioService
    participant Audit as 📜 AuditService

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
    actor Guest as 👤 Guest / Waiter
    participant POSUI as 🍽️ POS & Menu UI
    participant POS as 🍳 POSService
    participant Folio as 💳 FolioService
    participant Kitchen as 👨‍🍳 Kitchen Display (KDS)
    participant Store as 💾 Storage

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
    actor Guest as 👤 Guest / Clerk
    participant Portal as 📱 Guest Portal / Desk UI
    participant Res as 🏨 ReservationService
    participant Folio as 💳 FolioService
    participant HK as 🧹 HousekeepingService
    participant Audit as 📜 AuditService

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
