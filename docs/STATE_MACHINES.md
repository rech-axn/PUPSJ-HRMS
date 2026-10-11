# State Machine Diagrams & Transition Matrices
**Course**: Systems Analysis and Design (SAD)  
**Location Context**: San Juan City, Metro Manila, Philippines  
**System Scope**: PUPSJ Hotel & Restaurant Management System

---

## 1. Reservation & Inventory Hold State Machines

### 1.1 Reservation State Diagram

Online reservations are created directly in the `Confirmed` state upon verified payment settlement. The `Pending` state is never used for online bookings and exists solely for staff-assisted front-desk bookings awaiting an in-person deposit window.

```mermaid
stateDiagram-v2
    [*] --> Confirmed : Online 50% Down Payment Succeeded (Card / GCash / Maya / Bank Webhook)
    [*] --> Confirmed : Front Desk Walk-In Full Payment / Check-In
    [*] --> Pending : Staff-Assisted Booking Awaiting Deposit (Receptionist Window)

    Pending --> Confirmed : Front Desk Deposit Collected (depositPaid >= depositRequired)
    Pending --> Cancelled : Hold Window Expired / Cancelled by Staff

    Confirmed --> CheckedIn : Front Desk Check-In on Arrival (Date >= ci, Valid ID, depositPaid >= depositRequired)
    Confirmed --> Cancelled : Free Cancellation Window (>= 3 Days before Arrival -> 100% Refund)
    Confirmed --> Cancelled : Late Cancellation Window (< 3 Days before Arrival -> 30% Deduction, 70% Refund)
    Confirmed --> NoShow : Arrival Date Passes without Check-In (Date > ci -> 100% Retained, 0% Refund)

    CheckedIn --> CheckedOut : Express / Desk Check-Out (Folio Balance == 0)

    Cancelled --> [*]
    NoShow --> [*]
    CheckedOut --> [*]
```

### 1.2 Reservation Transition Matrix

| Initial State | Event / Trigger | Guard Condition | Target State | Side Effects & Actions |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | Online Down Payment | `PaymentIntent.status == Succeeded`, room unit available | `Confirmed` | Issue BIR `OR-#####`, record unified payment, open folio with deposit credit, consume hold, assign room, send guest confirmation voucher & hotel notification. `confirmedBy: 'System (payment)'`. |
| `[None]` | Staff-Assisted Booking | Staff session, temporary hold window specified | `Pending` | Holds room unit temporarily until receptionist-chosen deadline. |
| `Pending` | Deposit Settled | Amount $\ge$ 50% required deposit | `Confirmed` | Issue BIR `OR-#####`, lock allocation, notify guest. |
| `Pending` | Staff Hold Expires | Current time $>$ hold deadline | `Cancelled` | Release inventory back to free pool. |
| `Confirmed` | Guest Arrives | Date $\ge$ Check-in date, valid Govt ID recorded, `depositPaid >= depositRequired` | `Checked-in` | Record check-in timestamp, update physical room HK status to `Occupied`. |
| `Confirmed` | Cancellation ($\ge 3$ days) | `daysUntilArrival >= CONFIG.freeCancelDays` (3 days) | `Cancelled` | Issue 100% full refund (`Refund` payment with unique OR), release room inventory, release promo if redeemed. |
| `Confirmed` | Cancellation ($< 3$ days) | `daysUntilArrival < CONFIG.freeCancelDays` (3 days) | `Cancelled` | Deduct 30% fee (`CONFIG.lateCancelFeePct`), refund remaining 70% (`Refund` payment with unique OR), release room inventory. |
| `Confirmed` | No-Show | Current date $>$ Check-in date | `No-show` | Forfeit 100% of payments received (0% refund), record audit trail, release room inventory for walk-ins. |
| `Checked-in` | Departure Checkout | Folio Balance $== 0$ (or Admin approval override) | `Checked-out` | Mark room `Dirty` (Urgent if next arrival today), award loyalty points. |

---

### 1.3 BookingHold State Machine

Protects room inventory while the guest enters credentials and executes payment.

```mermaid
stateDiagram-v2
    [*] --> Active : Visitor Clicks "Reserve" (Auth Verified, Hold Created)

    Active --> Paid : Payment Succeeded / Bank Webhook Callback (Finalize Transaction)
    Active --> Expired : 15 min Timer Elapsed (30 min for Bank Transfer)
    Active --> Cancelled : 3 Failed Payment Attempts / Guest Clicks "Cancel & Release Room"

    Paid --> [*]
    Expired --> [*]
    Cancelled --> [*]
```

#### BookingHold Transition Matrix

| Initial State | Event / Trigger | Guard Condition | Target State | Side Effects & Actions |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | `BookingService.startHold` | Guest session active, dates valid, `unitsFree >= 1` | `Active` | Generates `HLD-#####`, sets `expiresAt = now + 15m` (extended to 30m for bank), locks 1 room inventory unit. |
| `Active` | Payment Succeeded | `PaymentIntent.status == Succeeded` | `Paid` | Consumes hold, finalizes `Reservation` as `Confirmed`. |
| `Active` | Expiration Timer | `Date.now() >= expiresAt` | `Expired` | Releases locked room inventory unit back to free pool, releases promo code. |
| `Active` | Max Attempts Reached | `attempts >= CONFIG.maxPayAttempts` (3) | `Cancelled` | Releases inventory hold, informs guest to re-select dates. |
| `Active` | Guest Releases Room | Guest clicks "Cancel and release room" | `Cancelled` | Immediately unlocks room unit, cancels active payment intents. |

---

### 1.4 PaymentIntent State Machine

Tracks payment lifecycle across simulated gateways and webhook callbacks.

```mermaid
stateDiagram-v2
    [*] --> Created : Guest Selects Payment Method

    Created --> Processing : Guest Submits Card / E-Wallet Credentials
    Created --> AwaitingBank : Guest Selects Bank Transfer (QR Ph Sheet Opened)

    Processing --> Succeeded : Luhn Valid / Test Card 4242 / E-Wallet Approved
    Processing --> Failed : Card Declined / Insufficient Funds / Expired Card
    
    AwaitingBank --> Succeeded : Bank Callback Webhook Received (`outcome = 'paid'`)
    AwaitingBank --> Failed : Bank Callback Webhook Received (`outcome = 'declined'`)
    AwaitingBank --> Expired : Bank Hold Timeout Elapsed (30 Minutes without Callback)

    Failed --> Processing : Guest Retries Alternative Card / Method (Attempts < 3)
    Failed --> Cancelled : Max Attempts Reached

    Succeeded --> [*]
    Cancelled --> [*]
    Expired --> [*]
```


---

## 2. Restaurant Order State Machine

### 2.1 State Diagram

```mermaid
stateDiagram-v2
    [*] --> Pending : Order Placed by Guest / Table

    Pending --> Preparing : Kitchen Ticket Accepted by Cook
    Pending --> Cancelled : Voided Before Preparation

    Preparing --> Ready : Kitchen Assembly & Cooking Finished
    Ready --> Served : Food Delivered to Dining Table / Guest Room
    Served --> Billed : Table Settlement / Room Folio Posting

    Billed --> [*]
    Cancelled --> [*]
```

### 2.2 Transition Matrix

| Initial State | Event / Trigger | Guard Condition | Target State | Side Effects & Actions |
| :--- | :--- | :--- | :--- | :--- |
| `[None]` | Order created | Valid items in stock | `Pending` | Generate `ORD-#####`, transmit to Kitchen Display (KDS). |
| `Pending` | Kitchen accepts | Cook clicks "Start Cooking"| `Preparing` | Start amber SLA timer (30 min standard prep). |
| `Pending` | Order voided | Waiter cancellation | `Cancelled` | Log void in audit trail, restock ingredients. |
| `Preparing` | Cooking complete | Cook clicks "Mark Ready" | `Ready` | Flash notification to expeditor/servers for pickup. |
| `Ready` | Delivered | Server marks "Served" | `Served` | Update service delivery timestamp. |
| `Served` | Settlement | Paid Cash/Card OR Room Charge| `Billed` | Generate dining OR or post to `FOLIO_CHARGE` in hotel PMS. |

---

## 3. Physical Room Operational State Machine

The operational status of each room is a compound matrix of **Occupancy** (`Vacant` vs `Occupied`) and **Cleanliness** (`Clean`, `Inspecting`, `Dirty`, `Out-of-Service`).

### 3.1 State Diagram

```mermaid
stateDiagram-v2
    [*] --> Clean_Vacant : Initial Seed State

    Clean_Vacant --> Occupied : Guest Check-In (HTL-#####)
    Occupied --> Dirty_Vacant : Guest Express / Desk Check-Out
    Dirty_Vacant --> Inspecting : Housekeeper Completes Turnover
    Inspecting --> Clean_Vacant : Supervisor Approves Inspection

    Clean_Vacant --> Out_of_Service : Maintenance Defect Reported / OOS Toggle
    Occupied --> Out_of_Service : Urgent Facility Failure (Guest Relocated)
    Dirty_Vacant --> Out_of_Service : Plumbing / Electrical Issue Flagged

    Out_of_Service --> Dirty_Vacant : Repair Resolved (Pending Post-Repair Clean)
    Out_of_Service --> Clean_Vacant : Minor Maintenance Completed
```

### 3.2 Transition Matrix

| Initial State | Event / Action | Guard Condition | Target State | System Actions |
| :--- | :--- | :--- | :--- | :--- |
| `Clean / Vacant` | Check-in processed | Reservation status `Confirmed` | `Occupied` | Lock room from booking, update room badge to Blue `Occupied`. |
| `Occupied` | Check-out processed | Folio balance settled | `Dirty / Vacant` | Auto-assign priority: `Urgent` if next arrival is today, else `High`. |
| `Dirty / Vacant` | Housekeeper completes | Bedding & amenities restocked | `Inspecting` | Move to supervisor inspection queue. |
| `Inspecting` | Supervisor sign-off | Quality checklist passed | `Clean / Vacant` | Return to available booking pool, update badge to Green `Clean`. |
| Any State | OOS Toggle / Work Order | Mechanical defect reported | `Out-of-Service` | Exclude room from all inventory collision algorithms; alert desk. |
| `Out-of-Service` | Work order resolved | Technician marks resolved | `Dirty / Vacant` | Place in cleaning queue prior to re-leasing to guests. |
