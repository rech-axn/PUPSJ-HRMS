# Systems Analysis and Design (SAD) Mock Defense Guide
**System**: PUPSJ Hotel & Restaurant Management System  
**Institution**: Polytechnic University of the Philippines — San Juan Campus (PUPSJ)  
**Location**: San Juan City, Metro Manila, Philippines  
**Target Roles**: Superadmin (Staff/Management) and Guest (Customer)

---

## 1. Executive Summary & System Overview

The **PUPSJ Hotel & Restaurant Management System** is a unified, real-world enterprise web solution serving both hospitality and food service operations. Developed specifically for an academic capstone and mock defense, the system adheres to strict software engineering standards, statutory Philippine regulatory compliance, and realistic Property Management System (PMS) workflows.

### Core Value Propositions
- **Zero Dead Buttons**: Every action, button, form, filter, and modal triggers real validation, data mutations, and cross-module feedback.
- **Philippine Statutory Tax Compliance**: Full adherence to the Bureau of Internal Revenue (BIR) regulations using the standard hospitality composite factor ($1.232$).
- **Offline & Zero-Build Operability**: Built purely with native HTML5, modern vanilla CSS, and vanilla JavaScript without npm, webpack, or external CDNs, permitting flawless offline execution via `file://`.
- **Tamper-Evident Ledger**: Cryptographic SHA-256 hash chaining on all administrative and financial audit entries.

---

## 2. Philippine Regulatory & Tax Compliance (BIR Engine)

### 2.1 The 1.232 Factor Explained
In the Philippine hospitality industry, hotel rooms and restaurant dining are subject to:
1. **12% Value-Added Tax (VAT)** (National Internal Revenue Code)
2. **10% Service Charge (SC)** (Republic Act No. 11360)

When rates are quoted as **VAT-inclusive and SC-inclusive (Gross Total)**, the decomposition formula is:
$$\text{Net Sales (Vatable Base)} = \frac{\text{Gross Total}}{1.232}$$

**Decomposition Breakdown**:
1. $\text{Net Base} = \text{Gross} / 1.232$
2. $\text{Service Charge (10\% of Net)} = \text{Net Base} \times 0.10$
3. $\text{Vatable Sales (Net + SC)} = \text{Net Base} \times 1.10$
4. $\text{Output VAT (12\% of Vatable Sales)} = \text{Vatable Sales} \times 0.12$
5. $\text{Proof Check}: \text{Net Base} + \text{SC} + \text{VAT} \equiv \text{Gross Total}$

### 2.2 Serialized Official Receipts (OR-#####)
Every cash or electronic transaction (GCash, Maya, Cards) generates a serialized, non-reusable Official Receipt Number (`OR-10001`, `OR-10002`, ...), complete with line-item tax breakdowns for BIR compliance.

---

## 3. Architecture & Technical Decisions

### 3.1 Why Vanilla HTML5, CSS & JavaScript?
- **Zero Build Friction**: No npm dependencies, no Node runtime required at presentation time. Panellists can double-click `index.html` directly from a USB flash drive or zip archive and test immediately.
- **CORS Immunity**: By avoiding asynchronous `fetch()` for local files, the system avoids browser security blocks (`file://` origin restriction in Chrome/Edge).
- **Standards-Compliant DOM**: Modular code structure (`js/crypto.js`, `js/core.js`, `js/data.js`, `js/services.js`) cleanly separates UI, domain logic, and persistence.

### 3.2 Concurrency & Cross-Tab Reactivity
- **Multi-Tab Broadcast**: Utilizes the native browser `window.onstorage` event listener. When a room status or reservation changes in Tab A (e.g. Front Desk check-in), Tab B (Housekeeping or Rooms) auto-refreshes instantaneously without manual page reload.
- **Atomic Transactions**: `store.transaction(fn)` wraps multi-entity mutations to prevent race conditions during booking and settlement.

### 3.3 Security & Role-Based Access Control (RBAC)
- **Two Roles Only**:
  - `superadmin`: Hotel Operations, Front Desk, Housekeeping assignments, POS, Settings, Audit logs.
  - `guest`: Public booking, dining orders, service requests, personal stay history.
- **Personnel Directory Separation**: Staff/Housekeeping/Chefs are records in an operational directory for shift and task assignments—they do NOT possess login passwords or bypass RBAC.
- **Multi-Round SHA-256 with Salts**: Custom, pure-JS multi-round SHA-256 implementation with unique 16-character hexadecimal salts. Zero reliance on `crypto.subtle` (which is blocked in non-HTTPS `file://` contexts).
- **Brute-Force Lockout**: 5 failed login attempts trigger an automatic 5-minute timed lockout with countdown feedback.

---

## 4. Live Mock Defense Demonstration Script

Follow this step-by-step walkthrough during the presentation to demonstrate 100% functionality and impress the panel:

### Act 1: The Public Booking & Guarantee Deposit (3 Minutes)
1. **Open** `pages/main/index.html` or `pages/rooms/rooms-deals.html`.
2. **Search Availability**: Select dates for tomorrow (2 nights, 2 guests). Show how room capacity badges calculate dynamically.
3. **Claim Offer**: Click "Claim Offer" on the `WELCOME10` promo banner. Notice the promo code auto-populates into the booking modal and instantly recalculates the stay total and 50% deposit.
4. **Auth Gate**: Submit booking while unauthenticated. Show the friendly **Guest Account Required** gate that securely preserves customer booking intent (`pupsj_pending_intent`).
5. **Sign In**: Log in as `juan@example.ph` (`password123`). Show how the booking resumes automatically.
6. **Payment & OR**: Select GCash deposit (₱2,880). Click "Confirm & Pay Deposit". Show the instant BIR Official Receipt modal (`OR-#####`) with 12% VAT and 10% SC breakdown.

### Act 2: Front Desk Operations & Walk-In Check-In (3 Minutes)
1. **Navigate** to `pages/management/dashboard.html` (Superadmin logged in).
2. **Review Metrics**: Point out the live KPI tiles (Occupancy %, In-House Guests, Pending Clean Rooms, Revenue).
3. **Walk-In Registration**: Click "+ New Reservation / Walk-In".
   - Enter guest name: *Capt. Andres Bonifacio*.
   - Enter mobile: `09181234567`.
   - Select Government ID: *Philippine Passport* (`P9823411A`).
   - Assign Room: *Room 101*.
   - Check *Check in guest immediately*.
   - Confirm settlement via Front Desk Cash.
4. **Room Board Reaction**: Navigate to `pages/management/rooms.html`. Show that Room 101 immediately turned to Blue `Occupied`!

### Act 3: Restaurant POS & Room Folio Cross-Posting (3 Minutes)
1. **Navigate** to `pages/management/orders.html`.
2. **Create Room Service Order**: Click "New Order".
   - Select Dining Type: *Room Service*.
   - Select Room: *Room 101* (*Andres Bonifacio*).
   - Add items: *Sinigang na Baboy*, *Garlic Rice*, *San Miguel Pale Pilsen*.
   - Select Settlement: *Charge to Room Folio*.
   - Click "Send to Kitchen".
3. **Kitchen Display**: Show the ticket in the Kitchen KDS board with real-time amber/red SLA timer.
4. **Folio Verification**: Return to `pages/management/reservations.html`, open Bonifacio's reservation, and click "View Folio Ledger". Show the restaurant charge posted directly into his room ledger!

### Act 4: Express Check-Out & Housekeeping Cascading (2 Minutes)
1. **Express Check-Out Attempt**: Show that check-out is blocked until the restaurant charge balance is settled.
2. **Settle Folio**: Post cash payment of ₱850 with instant `OR-#####`. Balance is now ₱0.00.
3. **Execute Check-Out**: Click "Check Out Guest".
4. **Housekeeping Queue**: Navigate to `pages/management/rooms.html`. Show Room 101 automatically switched to Amber `Dirty` with `Urgent` priority!
5. **Turnover**: Click "Assign Housekeeper" -> "Mark Clean". Room 101 returns to Green `Clean`!

### Act 5: Real-Time Audit Verification & Settings (2 Minutes)
1. **Navigate** to `pages/management/audit.html`.
2. **Cryptographic Chain**: Point out that every action taken during the demo generated a SHA-256 chained hash.
3. **Verify Button**: Click "Verify SHA-256 Chain". Show the modal: *"Audit Chain Verified: 100% Intact, 0 Tampering Detected"*.
4. **Console Runner**: Open Developer Tools (`F12`), switch to Console, and run:
   ```javascript
   Tests.run();
   ```
   Show the panel **100% green test passes** across all domain rules!

---

## 5. Anticipated Panel Questions & Bulletproof Model Answers

### Q1: "Why did you use LocalStorage instead of a backend database like MySQL or PostgreSQL?"
> **Model Answer**:  
> "For this Systems Analysis and Design defense, our primary research requirement was zero-friction evaluation and offline deployment. External databases require local database server installations (XAMPP/Docker) that often fail across different panel machines. To ensure rigorous software engineering standards within the browser, we implemented an abstraction layer (`Data` and `PUPSJ_Services`) with atomic transactions (`store.transaction`), relational entity keys (Foreign Keys linking Rooms, Reservations, and Folios), and cross-tab reactivity via the `storage` event. If migrated to Node.js/PostgreSQL in a future phase, only the adapter in `data.js` needs to be swapped—all 12 business services and UI components remain completely unchanged."

### Q2: "How do you guarantee that two users don't book the same room on overlapping dates?"
> **Model Answer**:  
> "We implemented an exact date-interval collision algorithm:
> $$\text{Collision Condition}: (\text{New Check-in} < \text{Existing Check-out}) \land (\text{New Check-out} > \text{Existing Check-in})$$
> During availability searches and booking commits, the system queries all non-cancelled reservations for that room number. Furthermore, the search excludes any room currently marked Out-of-Service (`oos: true`) in the maintenance subsystem. If any collision occurs, the room assignment is rejected."

### Q3: "How does your system comply with Philippine tax laws?"
> **Model Answer**:  
> "Under BIR rules for hotels and restaurants, published rates are VAT-inclusive and subject to a 10% Service Charge. We apply the standard composite factor $1.232$:
> $$\text{Net Base} = \text{Gross} / 1.232$$
> Service Charge is calculated as 10% of Net Base, and 12% VAT is applied to the combined Vatable Sales (Net + SC). Every settlement generates a unique, serialized BIR Official Receipt (`OR-#####`) detailing Net Sales, VAT Amount, and Service Charge, exactly matching the BIR 2307/RR-compliant invoice format."

### Q4: "Why don't your personnel records (Housekeeping, Waiters) have passwords?"
> **Model Answer**:  
> "This was a deliberate Systems Analysis and Design decision based on the Principle of Least Privilege. In our system model, Housekeeping and Kitchen staff are operational resources in a personnel directory for task dispatch, shift scheduling, and productivity analytics. They do not have access to administrative settings or customer financial data. There is only one administrative role (`superadmin`) and one customer role (`guest`), preventing privilege creep and maintaining a clean, auditable security perimeter."
