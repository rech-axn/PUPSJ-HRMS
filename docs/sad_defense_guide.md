# PUPSJ Hotel & Restaurant Management System
## Systems Analysis & Design (SAD) Defense Guide & Technical Reference

---

### Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Screen → Use Case → Entity → Role Traceability Matrix](#2-screen--use-case--entity--role-traceability-matrix)
3. [Actors & Use Cases (Role-Based Access Control)](#3-actors--use-cases-role-based-access-control)
4. [Entity-Relationship Dictionary (ERD) & Schemas](#4-entity-relationship-dictionary-erd--schemas)
5. [Business Rules, State Machines & Core Algorithms](#5-business-rules-state-machines--core-algorithms)
6. [Pricing Worked Example (Mathematical Proof)](#6-pricing-worked-example-mathematical-proof)
7. [10-Minute Mock Defense Script & Live Demonstration Path](#7-10-minute-mock-defense-script--live-demonstration-path)
8. [System Limitations & Architectural Roadmap](#8-system-limitations--architectural-roadmap)
9. [Ten Panel Defense Questions & Rigorous Answers](#9-ten-panel-defense-questions--rigorous-answers)

---

### 1. System Overview & Architecture
The **PUPSJ Hotel & Restaurant Management System** is a client-side enterprise web application engineered for the Polytechnic University of the Philippines San Juan hospitality operations. Designed to operate completely client-side without external dependencies, it utilizes a reactive HTML5/CSS3/ES6 vanilla architecture persisted in the browser's `localStorage` engine with strict ACID-like synchronous transactional writes and versioned schema migrations (`SCHEMA_VERSION = 2`).

```
+-----------------------------------------------------------------------------------+
|                                  PRESENTATION TIER                                |
|  Public Portal (Guest-Facing)          |   Staff Management Back-Office           |
|  - Landing & Room Showcase (Home)      |   - Operational Dashboard (KPIs, Charts) |
|  - Booking & Folio Engine (Modal)      |   - Reservations & Check-in / Check-out  |
|  - Restaurant Menu & Table Res         |   - POS Cashier & Kitchen Display System |
|  - Guest Portal & Loyalty Passbook     |   - Housekeeping & Maintenance Workflows |
|  - Contact & Concierge Messaging       |   - Payments, Reports, Promos, Employees |
+----------------------------------------+------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                                   SHARED SHELL & UI                               |
|  core.js: Dom utilities, toast(), showModal(), paginate(), sanitize CSV, auth guard  |
|  site.css: Cormorant Garamond / Plus Jakarta Sans design system (≤ 45 KB budget)  |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                             DOMAIN & DATA ACCESS LAYER (data.js)                  |
|  Canonical State Machine  |  Reactive CustomEvent  |  Collision-Free ID Sequencer  |
|  Real-time Free Rooms     |  Tax & Folio Balancing |  Synchronous Key-Value Store |
+-----------------------------------------------------------------------------------+
                                         |
+-----------------------------------------------------------------------------------+
|                               PERSISTENCE (localStorage)                          |
|  res, rooms, types, orders, menu, tables, tableRes, hk, mReq, staff, audit, etc.   |
+-----------------------------------------------------------------------------------+
```

---

### 2. Screen → Use Case → Entity → Role Traceability Matrix

| # | Screen / Page | Primary Use Case(s) | Data Entities Read / Written | Permitted Roles |
|---|---|---|---|---|
| 1 | `index.html` | Client Entry Point & Canonical Redirect | None (Redirects to `pages/main/home.html`) | Public / All |
| 2 | `pages/main/home.html` | Brand Landing, Room Browser, Direct Booking Trigger | `rooms`, `types`, `feedback` | Public / All |
| 3 | `pages/main/about.html` | Hotel Heritage, Published Reviews, Amenities | `types`, `feedback` | Public / All |
| 4 | `pages/main/contact.html` | General Inquiries, Campus Map Navigation | `inquiries` (Writes `INQ-####`) | Public / All |
| 5 | `pages/main/menu.html` | Public Dining Menu, Table Reservation Form | `menu`, `tables`, `tableRes`, `promos` | Public / All |
| 6 | `pages/rooms/rooms-deals.html` | Comprehensive Room Catalog, Promotional Deals | `types`, `promos`, `rooms` | Public / All |
| 7 | `pages/auth/guest-login.html` | Guest Portal Access & Booking Lookup | `res`, `guestAccounts` | Public / All Guests |
| 8 | `pages/guest/guest-portal.html` | Verified Folio Review, Modify Stay, In-room Dining POS | `res`, `orders`, `menu`, `threads`, `feedback`, `loyalty` | Verified Guest Only |
| 9 | `pages/management/dashboard.html` | Executive KPIs, Real Cash Revenues, Room Status Matrix | `res`, `rooms`, `orders`, `hk`, `mReq`, `audit` | Manager, Front Desk, Security (Read-only) |
| 10 | `pages/management/reservations.html` | Full Stay Lifecycle (Reserve, Check-in, Check-out, Cancel) | `res`, `rooms`, `types`, `hk`, `promos`, `audit` | Manager, Front Desk |
| 11 | `pages/management/guests.html` | CRM Guest Profiles, Stays History, Loyalty Tiers | `res`, `guestAccounts`, `loyalty` | Manager, Front Desk |
| 12 | `pages/management/housekeeping.html` | Live Room Cleanliness Matrix, Task Assignment | `hk`, `rooms`, `staff`, `audit` | Manager, Front Desk (View), Housekeeping |
| 13 | `pages/management/maintenance.html` | Work Orders, Out-of-Service Toggles, Room Blocking | `mReq`, `rooms`, `hk`, `audit` | Manager, Maintenance |
| 14 | `pages/management/orders.html` | Restaurant POS, Table Seating, Room Charge Routing | `orders`, `menu`, `tables`, `res`, `audit` | Manager, Kitchen |
| 15 | `pages/management/kitchen.html` | Kitchen Display System (KDS) Live Order Queue | `orders`, `audit` | Manager, Kitchen |
| 16 | `pages/management/tables.html` | Floor Plan Table Management & Seating Assignments | `tables`, `tableRes`, `audit` | Manager, Kitchen |
| 17 | `pages/management/menu.html` | Menu Engineering, Price Updates, 86 Item Availability | `menu`, `audit` | Manager, Kitchen |
| 18 | `pages/management/payments.html` | Cashier Terminal, POS Settlement, Folio Auditing | `res`, `orders`, `audit` | Manager, Front Desk |
| 19 | `pages/management/reports.html` | ADR, RevPAR, Range Occupancy, Reconciled Financials | `res`, `rooms`, `orders` | Manager |
| 20 | `pages/management/promotions.html` | Promo Code Management, Limits & Spend Constraints | `promos`, `audit` | Manager |
| 21 | `pages/management/employees.html` | Staff Roster Management, Departmental Shift Schedules | `staff`, `audit` | Manager |
| 22 | `pages/management/messages.html` | Guest Concierge Inbox & Support Threads | `threads`, `res`, `audit` | Manager, Front Desk |
| 23 | `pages/management/inquiries.html` | Public Contact Form Inquiries Processing | `inquiries`, `audit` | Manager, Front Desk |
| 24 | `pages/management/feedback.html` | Review Moderation & About Page Publishing | `feedback`, `audit` | Manager |
| 25 | `pages/management/audit.html` | Immutable System Event Logs & Demo Factory Reset | `audit` | Manager |

---

### 3. Actors & Use Cases (Role-Based Access Control)

The system enforces a strict 6-Role Role-Based Access Control (RBAC) matrix in `staff-shell.js`:

```
+---------------+------------------------------------------------------------------------------------+
| Role          | Permitted Management Screens                                                       |
+---------------+------------------------------------------------------------------------------------+
| Manager       | ALL (Dashboard, Reservations, Guests, Housekeeping, Maintenance, Orders, Kitchen,  |
|               |      Tables, Menu, Payments, Reports, Promotions, Employees, Messages, Inquiries,  |
|               |      Feedback, Audit)                                                              |
| Front Desk    | Dashboard, Reservations, Guests, Payments, Housekeeping (View), Messages,          |
|               | Inquiries                                                                          |
| Housekeeping  | Housekeeping Operations                                                            |
| Maintenance   | Maintenance Work Orders                                                            |
| Kitchen       | Kitchen Display System (KDS), Orders POS, Table Seating, Menu Management           |
| Security      | Dashboard (Read-Only Situational Awareness)                                        |
+---------------+------------------------------------------------------------------------------------+
```

Any unauthorized URL attempt displays a friendly, non-destructive **"Access Restricted"** notification with navigation back to permitted operational dashboards.

---

### 4. Entity-Relationship Dictionary (ERD) & Schemas

```
+------------------+         1:N         +------------------+
|    RoomType      |-------------------->|       Room       |
| id (PK)          |                     | n (PK, Number)   |
| n (Name)         |                     | t (FK: RoomType) |
| r (Base Rate)    |                     +------------------+
+------------------+                              |
         |                                        | 1:N
         | 1:N                                    v
         v                               +------------------+
+------------------+       1:N           |   Housekeeping   |
|   Reservation    |-------------------->| roomNum (PK)     |
| c (PK: HTL-####) |                     | s (Clean/Dirty)  |
| g (Guest Name)   |                     +------------------+
| t (Room Type)    |                              |
| n (Room Num)     |                              | 1:N
| i (Check-In)     |                              v
| o (Check-Out)    |                     +------------------+
| st (Status)      |                     |   Maintenance    |
+------------------+                     | id (PK: MNT-###) |
  |           |                          | room (FK: Room)  |
  | 1:N       | 1:N                      | outOfService     |
  v           v                          +------------------+
+-------+   +-------+
|  Pay  |   | Charge|
| id    |   | id    |
| a     |   | amt   |
| k     |   | desc  |
+-------+   +-------+
```

#### Canonical Schemas:
1. **Reservation (`res[]`)**:
   `c` (string, `HTL-####`), `g` (string), `t` (string), `n` (number), `i` (YYYY-MM-DD), `o` (YYYY-MM-DD), `gu` (number), `ph` (string), `email` (string), `m` (string), `p` (`Unpaid` | `Partial` | `Paid` | `Refunded`), `st` (`Pending` | `Confirmed` | `Checked-in` | `Checked-out` | `Cancelled`), `note` (string), `rt` (number), `promo` (`{code, type, value, appliesTo}`), `pay[]`, `x[]`.
2. **Payment Entry (`pay[]`)**:
   `id` (string, `OR-#####`), `d` (YYYY-MM-DD), `a` (number), `m` (string), `k` (`Payment` | `Deposit` | `Refund`), `ref` (string), `auth` (string), `note` (string).
3. **Folio Charge (`x[]`)**:
   `id` (number), `d` (YYYY-MM-DD), `desc` (string), `amt` (number), `cat` (`Dining` | `Laundry` | `Incidentals`).
4. **Room Inventory (`rooms[]`)**:
   `n` (number, unique identifier), `t` (string, Room Type name). Status is strictly derived via `Data.roomStatus(n)`: `Occupied` if guest checked in, `Maintenance` if active out-of-service ticket, `Needs Cleaning` if housekeeping status is Dirty, else `Available`.
5. **Restaurant Order (`orders[]`)**:
   `code` (string, `ORD-####`), `type` (`Dine-in` | `In-room` | `Takeaway`), `target` (string), `room` (number), `table` (number), `resCode` (string), `lines[]` (`{id, name, qty, unitPrice, note}`), `subtotal` (number), `notes` (string), `status` (`New` | `Preparing` | `Ready` | `Served` | `Cancelled`), `payStatus` (`Unpaid` | `Paid` | `Room folio`), `payment` (object).
6. **Dining Table (`tables[]`)**:
   `id` (string, `TBL-#`), `num` (number), `name` (string), `seats` (number), `area` (`Main Dining` | `Garden Terrace` | `Private Room` | `Bar Lounge`), `status` (`Free` | `Occupied` | `Reserved` | `Needs cleaning`).

---

### 5. Business Rules, State Machines & Core Algorithms

#### A. Overlap Availability Equation
A room is occupied or committed for a new query interval `[newIn, newOut]` if an active reservation (`st !== 'Cancelled' && st !== 'Checked-out'`) satisfies:
$$\text{Overlap} \iff (\text{existingIn} < \text{newOut}) \land (\text{existingOut} > \text{newIn})$$
Rooms with active out-of-service maintenance (`m.status !== 'Resolved' && m.outOfService`) are excluded.

#### B. Reservation Lifecycle State Machine
```
[ New Booking ]
       │
       ▼
  ( Pending ) ──────[ Pay 50% Deposit ]──────► ( Confirmed )
       │                                             │
       │                                             ▼
 [ Cancel ]                                    [ Check-in ]
       │                         (Rule: arrival <= today, room Clean, deposit paid)
       ▼                                             │
  ( Cancelled )                                      ▼
 (Policy: >=3d full refund;                     ( Checked-in )
  <3d retain 1st night fee)                          │
                                                     ▼
                                               [ Check-out ]
                                                     │
                                                     ▼
                                              ( Checked-out )
                                                     │
                                       (Room status -> Dirty in HK)
```

#### C. Kitchen Order & Settlement State Machine
```
[ Order Placed ] ──► ( New ) ──► ( Preparing ) ──► ( Ready ) ──► ( Served )
                                                                      │
                         ┌────────────────────────────────────────────┴─────────────────────────────┐
                         ▼                                                                          ▼
              [ POS Cashier Payment ]                                                  [ Charge to Room Folio ]
             (payStatus: 'Paid', OR-#####)                                      (payStatus: 'Room folio', x[] posted)
```

#### D. Philippine Statutory Tax & Service Charge Breakdown
All public published room rates and dining menu prices are inclusive of:
- **12% Value Added Tax (VAT)**
- **10% Hotel & Restaurant Service Charge**

To extract statutory line items for receipts and reports:
$$\text{Gross Total} = \text{Net Base} \times (1 + 0.12 + 0.10) = \text{Net Base} \times 1.22$$
$$\text{Net Base} = \frac{\text{Gross Total}}{1.22}$$
$$\text{12% VAT} = \text{Net Base} \times 0.12$$
$$\text{10% Service Charge} = \text{Net Base} \times 0.10$$

---

### 6. Pricing Worked Example (Mathematical Proof)

**Scenario:** Guest books a 3-night stay in **Deluxe City View** with promotional code **`WELCOME10`** (10% room discount).
- Nightly Published Rate: **₱5,800.00**
- Duration: **3 Nights**

1. **Standard Room Subtotal:**
   $$3 \times ₱5,800.00 = ₱17,400.00$$
2. **Promotional Discount (`WELCOME10` @ 10%):**
   $$₱17,400.00 \times 0.10 = ₱1,740.00$$
3. **Discounted Stay Total (Inclusive):**
   $$₱17,400.00 - ₱1,740.00 = ₱15,660.00$$
4. **Statutory Breakdown:**
   $$\text{Net Base} = \frac{₱15,660.00}{1.22} = ₱12,836.07$$
   $$\text{12% VAT} = ₱12,836.07 \times 0.12 = ₱1,540.33$$
   $$\text{10% Service Charge} = ₱12,836.07 \times 0.10 = ₱1,283.60$$
   $$\text{Verification Total} = ₱12,836.07 + ₱1,540.33 + ₱1,283.60 = ₱15,660.00$$
5. **Required Guarantee Deposit (50%):**
   $$\text{Deposit} = \lceil ₱15,660.00 \times 0.50 \rceil = ₱7,830.00$$
6. **Remaining Folio Balance at Check-in:**
   $$\text{Balance} = ₱15,660.00 - ₱7,830.00 = ₱7,830.00$$

---

### 7. 10-Minute Mock Defense Script & Live Demonstration Path

#### Minute 0–2: Introduction & Public Guest Booking
- Navigate to `index.html` → smooth redirect to `pages/main/home.html`.
- Highlight typography (Cormorant Garamond + Plus Jakarta Sans) and responsive layout.
- Open **Reserve a Room** booking modal.
- Demonstrate non-destructive reactivity: change dates and room type to *Deluxe City View*, enter guest name `Dr. Ramon Santos`, phone `09171234567`, email `ramon@pupsj.edu.ph`.
- Apply promo code **`WELCOME10`** → verify instant 10% discount and 50% deposit breakdown.
- Confirm booking → receive official reservation reference (e.g., `HTL-2048`).

#### Minute 2–4: Guest Portal & Dining Order
- Navigate to `pages/auth/guest-login.html` → enter reference code and phone.
- Demonstrate **Security Isolation**: Guest view is isolated strictly to confirmed code/email.
- View real-time Folio with tax breakdown and official deposit receipt.
- Open **In-Room Dining POS** → Order *Arroz Caldo* and *Halo-Halo*.
- View order status in guest portal: `New`.

#### Minute 4–6: Back-Office Front Desk & Operations
- Open `pages/management/dashboard.html` as Manager (`manager@pupsj.edu.ph`).
- Verify live KPIs: Available Rooms, Today's Arrivals, Real Transaction Revenue.
- Switch to `pages/management/kitchen.html` (Kitchen Display System):
  - Notice the in-room dining order placed by Dr. Santos.
  - Advance status: `New` → `Preparing` → `Ready` → `Served`.
- Switch to `pages/management/orders.html`:
  - Charge order to room folio `HTL-2048`.
- Navigate to `pages/management/reservations.html`:
  - Open Folio for Dr. Santos → observe the dining charge posted immediately.

#### Minute 6–8: Check-in, Check-out & Housekeeping Turnover
- Attempt check-in on a dirty room → system displays guard warning.
- Assign clean Room 202 → Check-in completes successfully.
- Perform Check-out → System prompts for final settlement, marks booking `Checked-out`.
- Open `pages/management/housekeeping.html` → Room 202 is automatically flagged **`Dirty`** in the housekeeper's queue.
- Mark Room 202 **`Clean`** → returns instantly to available inventory.

#### Minute 8–10: Financial Reconciliation, Audit Trail & Defense Conclusion
- Navigate to `pages/management/reports.html`:
  - Point out exact math: Occupancy %, ADR (₱/room-night sold), RevPAR (₱/available room-night).
  - Note that dining charges billed to room folios are reconciled without double-counting.
- Navigate to `pages/management/audit.html`:
  - Review immutable chronological audit trail logging every check-in, payment, and room status change.
- Conclude presentation and open floor to panel questions.

---

### 8. System Limitations & Architectural Roadmap

| Current Implementation (Educational Scope) | Enterprise Production Roadmap |
|---|---|
| Browser `localStorage` persistence | Scalable PostgreSQL / Redis database backend |
| Plaintext password hashes (educational demo notification displayed) | Argon2id password hashing with multi-factor authentication (MFA) |
| Simulated POS cashier payments | PCI-DSS certified gateway (PayMongo / GCash / Maya API) |
| In-browser notification modals | Twilio SMS API and SendGrid transactional email webhooks |
| Single-browser tab synchronization via `CustomEvent` | WebSocket server for multi-device distributed concurrency |

---

### 9. Ten Panel Defense Questions & Rigorous Answers

#### Q1: Why did you choose localStorage instead of an external database like SQLite or MongoDB?
**Answer:** The objective was a self-contained, zero-dependency, deployable application capable of running locally off `index.html` on any testing device without server prerequisites. We implemented an abstraction layer (`Data.*` API) that completely encapsulates persistence. Transitioning to a REST or GraphQL backend requires changing only the internal implementation of `Data` methods without altering any presentation tier files.

#### Q2: How does the system prevent double-booking when multiple guests attempt to book the same room type?
**Answer:** Room availability is dynamically calculated by `Data.freeRooms(typeName, inDate, outDate)`. It evaluates the universal interval overlap condition $(\text{existingIn} < \text{newOut}) \land (\text{existingOut} > \text{newIn})$ across all confirmed and in-house stays, subtracted from the total inventory for that room category. In-memory boundary coercion ensures room numbers are evaluated as numbers, avoiding strict comparison mismatches.

#### Q3: Why is room status derived dynamically rather than stored as a static field?
**Answer:** Storing status statically creates database synchronization anomalies—e.g., a room marked "Available" while an active guest is checked in. In our canonical contract, room status is computed at query time via `Data.roomStatus(roomNum)`, which hierarchically checks active in-house reservations, out-of-service maintenance work orders, and housekeeping cleanliness records.

#### Q4: How is financial double-counting prevented between the Restaurant POS and the Hotel Folio?
**Answer:** When an in-room dining order is billed to a guest's room folio, the order's `payStatus` is set to `'Room folio'`. In `reports.js`, dining revenue aggregates only orders settled directly via POS cash/card, while folio payments are accounted for under master settled receipts, ensuring dining revenue is never counted twice.

#### Q5: How do you handle cancellation fees according to industry policy?
**Answer:** `Data.cancelReservation()` evaluates the lead time using `dateDiff(today(), arrivalDate)`. If the cancellation occurs $\ge 3$ days prior to scheduled check-in, the guest receives a 100% policy refund. If $< 3$ days, the first night's room rate is retained as a cancellation fee, any excess deposit is refunded via an official refund voucher (`OR-#####`), and the transaction is committed to the audit ledger.

#### Q6: How does the system handle Role-Based Access Control on static HTML pages?
**Answer:** The `staff-shell.js` module executes before content render on every management screen. It reads the authenticated staff session from `sessionStaff` and verifies the current page route against an RBAC permissions matrix. Forbidden direct URL entries are intercepted and replaced with an access restriction notice.

#### Q7: What prevents cross-site scripting (XSS) when rendering user-submitted names or requests?
**Answer:** Every piece of dynamic text rendered into HTML templates passes through the `esc()` sanitizer function in `core.js`, which converts HTML characters (`<`, `>`, `&`, `"`, `'`) into safe XML entities. Modal titles and table records are escaped by default.

#### Q8: What happens if a user submits a CSV export with formulas?
**Answer:** In `core.js`, `exportCSV()` neutralizes CSV injection vulnerabilities by detecting cell values starting with `=, +, -, @` and prepending an apostrophe `'`, preventing formula execution in Microsoft Excel.

#### Q9: How do you guarantee unique ID generation across the system?
**Answer:** `Data.nextId(prefix)` inspects existing entities in storage, extracts the maximum assigned integer via regular expressions, and increments by 1 (e.g., `HTL-2048`, `ORD-1005`, `MNT-104`). This eliminates collision risks caused by deletion or array length reductions.

#### Q10: How are non-destructive UI updates achieved in the booking modal?
**Answer:** Instead of re-rendering the entire modal DOM tree on date or room selection changes (which previously erased guest input), `booking-modal.js` targets only the price summary and availability sub-nodes, preserving guest inputs and focus state.
