# Entity-Relationship Diagram (ERD) & Data Dictionary
**Course**: Systems Analysis and Design (SAD)  
**Location Context**: San Juan City, Metro Manila, Philippines  
**System Scope**: PUPSJ Hotel & Restaurant Management System

---

## 1. Entity-Relationship Diagram (Crow's Foot Notation)

```mermaid
erDiagram
    ADMIN_ACCOUNT {
        string adminId PK
        string email UQ
        string name
        string passwordHash
        string salt
        string role
    }

    GUEST_ACCOUNT {
        string guestId PK
        string email UQ
        string name
        string phone
        string passwordHash
        string salt
        string loyaltyTier
        int loyaltyPoints
        string created
    }

    ROOM_TYPE {
        string typeId PK
        string name
        int baseRate
        int capacity
        string bedConfiguration
        string amenities
    }

    ROOM {
        int roomNumber PK
        string typeId FK
        int floor
        string hkStatus
        string priority
        int assignedStaffId FK
        boolean outOfService
    }

    RESERVATION {
        string reservationCode PK
        string guestId FK
        int roomNumber FK
        string roomType
        string checkInDate
        string checkOutDate
        int nights
        int guestCount
        string status
        string source
        int nightlyRate
        int grossTotal
        int depositPct
        int depositRequired
        int depositPaid
        int balanceDue
        string holdId FK
        string paymentIntentId FK
        string confirmedAt
        string confirmedBy
        string created
    }

    BOOKING_HOLD {
        string holdId PK
        string guestId FK
        string typeId FK
        string checkIn
        string checkOut
        int guests
        string promoCode
        string status
        int createdAt
        int expiresAt
        string method
        int attempts
        string paymentIntentId FK
    }

    PAYMENT_INTENT {
        string intentId PK
        string holdId FK
        int amount
        string method
        string status
        string failureReason
        string cardBrand
        string cardLast4
        string bankName
        string bankRef
        string authRef
        int createdAt
        int settledAt
    }

    FOLIO_PAYMENT {
        string officialReceipt PK
        string reservationCode FK
        string date
        int amount
        string method
        string kind
        string authReference
        string cardLast4
    }

    FOLIO_CHARGE {
        string chargeId PK
        string reservationCode FK
        string description
        int amount
        string postedDate
        string category
    }

    RESTAURANT_TABLE {
        int tableNumber PK
        int capacity
        string shape
        string status
        string assignedServer
    }

    MENU_ITEM {
        string itemId PK
        string name
        string category
        int price
        boolean isAvailable
        string allergenTags
    }

    DINING_ORDER {
        string orderCode PK
        int tableNumber FK
        string reservationCode FK
        string diningType
        string status
        int grossTotal
        string placedAt
    }

    ORDER_ITEM {
        string orderItemId PK
        string orderCode FK
        string itemId FK
        int quantity
        int unitPrice
        int subtotal
        string notes
    }

    MAINTENANCE_TICKET {
        string ticketId PK
        int roomNumber FK
        string title
        string priority
        string status
        string reportedDate
        string resolvedDate
    }

    PROMO_CODE {
        string code PK
        string title
        string appliesTo
        string discountType
        int discountValue
        int minNights
        int minSpend
        string validFrom
        string validTo
        boolean active
    }

    AUDIT_LOG {
        int id PK
        string timestamp
        string action
        string targetType
        string targetId
        string actorRole
        string actorName
        string details
        string prevHash
        string currentHash
    }

    %% Relationships
    ROOM_TYPE ||--o{ ROOM : classifies
    ROOM ||--o{ RESERVATION : accommodates
    GUEST_ACCOUNT ||--o{ RESERVATION : books
    GUEST_ACCOUNT ||--o{ BOOKING_HOLD : initiates
    BOOKING_HOLD ||--o| RESERVATION : finalizes_into
    BOOKING_HOLD ||--o{ PAYMENT_INTENT : creates
    RESERVATION ||--o{ FOLIO_PAYMENT : settles
    RESERVATION ||--o{ FOLIO_CHARGE : accrues
    RESERVATION ||--o{ DINING_ORDER : charges_to_room
    RESTAURANT_TABLE ||--o{ DINING_ORDER : hosts
    DINING_ORDER ||--o{ ORDER_ITEM : includes
    MENU_ITEM ||--o{ ORDER_ITEM : ordered_as
    ROOM ||--o{ MAINTENANCE_TICKET : tracks_repairs
```

---

## 2. Comprehensive Data Dictionary

### 2.1 Entity: `RESERVATION` (Primary Hotel Bookings)
Stores all front-desk and web reservation transactions.

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c` / `reservationCode` | `VARCHAR(16)` | NN | PK | - | Format `HTL-#####`. Monotonically incrementing sequence counter. |
| `guestId` | `VARCHAR(16)` | NN | FK | - | Foreign key to `GUEST_ACCOUNT` or `WALK-HTL-#####` for walk-ins. |
| `g` / `guestName` | `VARCHAR(100)` | NN | - | - | Legal full name of primary registered guest. |
| `email` | `VARCHAR(120)` | NULL | - | `""` | Primary email address for folio and confirmation dispatch. |
| `ph` / `phone` | `VARCHAR(20)` | NN | - | - | Philippine mobile number (+63 9XX XXX XXXX or 09XXXXXXXXX). |
| `n` / `rm` / `roomNumber`| `INT` | NN | FK | - | Assigned physical room number (101 to 304). |
| `t` / `roomType` | `VARCHAR(50)` | NN | - | - | Room category name (`Standard`, `Deluxe`, `Executive Suite`, etc.). |
| `ci` / `i` / `checkIn` | `DATE` | NN | - | - | ISO-8601 `YYYY-MM-DD`. Must be $\ge$ booking date. |
| `co` / `o` / `checkOut` | `DATE` | NN | - | - | ISO-8601 `YYYY-MM-DD`. Must be $>$ `checkIn`. |
| `nights` | `INT` | NN | - | `1` | Computed night duration: $\text{dateDiff}(ci, co)$. |
| `guests` | `INT` | NN | - | `2` | Number of occupants. Must be $\le \text{RoomType.capacity}$. |
| `s` / `st` / `status` | `VARCHAR(20)` | NN | - | `'Confirmed'`| Lifecycle state: `Confirmed`, `Checked-in`, `Checked-out`, `Cancelled`, `No-show` (`Pending` only for staff desk). |
| `source` | `VARCHAR(20)` | NN | - | `'Online'` | Booking origin: `Online`, `Walk-in`, `Staff-assisted`. |
| `rt` / `nightlyRate` | `INT` | NN | - | - | Philippine Peso integer rate per night snapshot. |
| `total` / `grossTotal` | `INT` | NN | - | - | Gross accommodation total inclusive of VAT and Service Charge. |
| `depositPct` | `INT` | NN | - | `50` | Snapshot percentage required as down payment (default 50). |
| `depositRequired` | `NUMERIC(10,2)` | NN | - | - | Calculated 50% deposit amount rounded up to centavos (`Money.ceilCentavo`). |
| `depositPaid` | `NUMERIC(10,2)` | NN | - | `0` | Sum of all deposit payments settled. Required $\ge$ `depositRequired` for check-in. |
| `balanceDue` | `NUMERIC(10,2)` | NN | - | - | Remaining balance to be settled at check-in or online (`total - depositPaid`). |
| `holdId` | `VARCHAR(16)` | NULL | FK | `""` | Reference to original `BookingHold` (`HLD-#####`). |
| `paymentIntentId` | `VARCHAR(16)` | NULL | FK | `""` | Reference to successful `PaymentIntent` (`PI-#####`). |
| `confirmedAt` | `DATETIME` | NULL | - | `nowISO()` | Timestamp when 50% down payment completed. |
| `confirmedBy` | `VARCHAR(50)` | NN | - | `'System (payment)'` | Confirmer label: `'System (payment)'` or front desk clerk name. |
| `promo` | `VARCHAR(20)` | NULL | FK | `""` | Applied voucher discount code. |
| `created` | `DATE` | NN | - | `today()` | Creation business date. |

---

### 2.2 Entity: `FOLIO_PAYMENT` (Official BIR Receipts)
Tracks all cash, card, and electronic wallet settlements.

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `or` / `officialReceipt` | `VARCHAR(16)` | NN | PK | - | Format `OR-#####`. Serialized BIR official tax receipt number. |
| `reservationCode` | `VARCHAR(16)` | NN | FK | - | Associated stay code (`HTL-#####`). |
| `d` / `date` | `DATE` | NN | - | `today()`| Transaction date in `YYYY-MM-DD` format. |
| `amt` / `amount` | `INT` | NN | - | - | Settled amount in PHP. |
| `m` / `method` | `VARCHAR(30)` | NN | - | `'Cash'` | Method: `Cash`, `Credit Card`, `Debit Card`, `GCash`, `Maya`, `Bank Transfer`. |
| `k` / `kind` | `VARCHAR(30)` | NN | - | `'Deposit'`| Settlement purpose: `Deposit`, `Partial Payment`, `Full Payment`, `Incidental`. |
| `auth` | `VARCHAR(50)` | NULL | - | `""` | Electronic gateway authorization code or front-desk auth reference. |
| `cardLast4` | `VARCHAR(4)` | NULL | - | `""` | Masked terminal card digits. |

---

### 2.3 Entity: `ROOM` (Physical Room Units)
Tracks physical room attributes and real-time operational status.

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `n` / `roomNumber` | `INT` | NN | PK | - | Room identifier (Floor 1: 101-104; Floor 2: 201-204; Floor 3: 301-304). |
| `t` / `type` | `VARCHAR(50)` | NN | FK | - | Associated room type name. |
| `floor` | `INT` | NN | - | - | Floor number: $\lfloor \text{roomNumber} / 100 \rfloor$. |
| `hk` / `hkStatus` | `VARCHAR(20)` | NN | - | `'Clean'` | Cleanliness state: `Clean`, `Inspecting`, `Dirty`. |
| `p` / `priority` | `VARCHAR(20)` | NULL | - | `""` | Housekeeping turnaround priority: `Urgent`, `High`, `Normal`, `Low`. |
| `a` / `assignedStaffId` | `INT` | NULL | - | `0` | Directory ID of assigned personnel. |
| `oos` / `outOfService` | `BOOLEAN` | NN | - | `false` | Out-of-service maintenance lock. If true, excluded from booking queries. |

---

### 2.4 Entity: `DINING_ORDER` & `ORDER_ITEM` (Restaurant POS)

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `code` / `orderCode` | `VARCHAR(16)` | NN | PK | - | Format `ORD-#####`. POS order ticket identifier. |
| `table` / `tableNumber` | `INT` | NULL | FK | `0` | Dine-in table number (1 to 12). `0` for Room Service / Takeaway. |
| `room` / `roomNumber` | `INT` | NULL | FK | `0` | Room number for in-room dining charges. |
| `resCode` | `VARCHAR(16)` | NULL | FK | `""` | Linked reservation for Room Charge settlement. |
| `st` / `status` | `VARCHAR(20)` | NN | - | `'Pending'`| Kitchen pipeline state: `Pending`, `Preparing`, `Ready`, `Served`, `Billed`, `Cancelled`. |
| `tot` / `grossTotal` | `INT` | NN | - | - | Total order amount in PHP. |
| `time` | `VARCHAR(10)` | NN | - | `now()` | Order placement time `HH:mm`. |

---

### 2.5 Entity: `AUDIT_LOG` (Tamper-Evident SHA-256 Ledger)

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `INT` | NN | PK | - | Sequential log entry sequence index. |
| `timestamp` | `DATETIME` | NN | - | `nowISO()`| Exact ISO-8601 UTC timestamp. |
| `action` | `VARCHAR(50)` | NN | - | - | Categorical event: `Check-in`, `Check-out`, `Payment`, `Override`, `OOS Toggle`. |
| `targetType` | `VARCHAR(30)` | NN | - | - | Target entity: `Reservation`, `Room`, `Folio`, `User`, `System`. |
| `targetId` | `VARCHAR(30)` | NN | - | - | ID of modified entity (e.g. `HTL-201`, `Room 201`). |
| `actorRole` | `VARCHAR(30)` | NN | - | - | Actor role (`superadmin`, `guest`, `system`). |
| `actorName` | `VARCHAR(100)` | NN | - | - | Name of logged-in user or front-desk clerk. |
| `prevHash` | `VARCHAR(64)` | NN | - | - | SHA-256 hash of immediately preceding log record. |
| `hash` | `VARCHAR(64)` | NN | - | - | SHA-256 hash of: `prevHash + timestamp + action + targetId + details`. |

---

### 2.6 Entity: `BOOKING_HOLD` (Temporary Room Inventory Locks)
Protects room inventory while a guest completes the checkout and down payment flow.

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `holdId` | `VARCHAR(16)` | NN | PK | - | Format `HLD-#####`. Unique inventory reservation lock. |
| `guestId` | `VARCHAR(120)` | NN | FK | - | Email or ID of the authenticated guest session. |
| `guestName` | `VARCHAR(100)` | NN | - | - | Name of guest reserving the room. |
| `phone` | `VARCHAR(20)` | NN | - | - | Contact phone number. |
| `typeId` | `VARCHAR(50)` | NN | FK | - | Room type locked (`Standard`, `Deluxe`, `Family Suite`, etc.). |
| `checkIn` | `DATE` | NN | - | - | Arrival date in `YYYY-MM-DD` format. |
| `checkOut` | `DATE` | NN | - | - | Departure date in `YYYY-MM-DD` format. |
| `guests` | `INT` | NN | - | `2` | Number of occupants. |
| `promoCode` | `VARCHAR(20)` | NULL | FK | `""` | Optional voucher code applied to hold. |
| `quoteSnapshot` | `JSON` | NN | - | - | Immutable freeze of nightly rates, taxes, total, depositDue (50%), and balanceDue. |
| `status` | `VARCHAR(20)` | NN | - | `'Active'` | State: `Active`, `Paid`, `Expired`, `Cancelled`. |
| `createdAt` | `BIGINT` | NN | - | `Date.now()` | Epoch millisecond creation timestamp. |
| `expiresAt` | `BIGINT` | NN | - | - | Epoch expiry timestamp: `createdAt + 15m` (extended to 30m for Bank Transfer). |
| `method` | `VARCHAR(30)` | NN | - | `'card'` | Chosen payment rail: `card`, `gcash`, `maya`, `bank`. |
| `attempts` | `INT` | NN | - | `0` | Number of failed payment attempts (max 3 before automatic cancellation). |
| `paymentIntentId` | `VARCHAR(16)` | NULL | FK | `NULL` | Linked `PaymentIntent` ID (`PI-#####`). |

---

### 2.7 Entity: `PAYMENT_INTENT` (Simulated Payment Gateway Lifecycle)
Tracks simulated transactions from initiation through webhook settlement.

| Attribute Name | Data Type | Nullable | Key | Default | Description & Business Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `intentId` | `VARCHAR(16)` | NN | PK | - | Format `PI-#####`. Idempotency key per payment attempt. |
| `holdId` | `VARCHAR(16)` | NN | FK | - | Associated `BookingHold` (`HLD-#####`). |
| `amount` | `NUMERIC(10,2)` | NN | - | - | Exact 50% deposit amount to settle in PHP. |
| `method` | `VARCHAR(30)` | NN | - | - | Payment method: `Credit Card`, `GCash`, `Maya`, `Bank Transfer`. |
| `status` | `VARCHAR(20)` | NN | - | `'Created'` | State: `Created`, `Processing`, `AwaitingBank`, `Succeeded`, `Failed`, `Cancelled`, `Expired`, `Refunded`. |
| `failureReason` | `VARCHAR(150)` | NULL | - | `""` | Gateway error: `Card declined`, `Insufficient funds`, `Expired card`. |
| `cardBrand` | `VARCHAR(20)` | NULL | - | `""` | Detected card network: `Visa`, `Mastercard`. |
| `cardLast4` | `VARCHAR(4)` | NULL | - | `""` | Last 4 digits of simulated card (never full card or CVV). |
| `bankName` | `VARCHAR(50)` | NULL | - | `""` | Bank selected for QR Ph transfer (`BDO`, `BPI`, `Metrobank`, etc.). |
| `bankRef` | `VARCHAR(50)` | NULL | - | `""` | Gateway reference code (`PUP-HLD-#####` or bank callback ref). |
| `authRef` | `VARCHAR(50)` | NULL | - | `""` | Transaction authorization code. |
| `reservationCode` | `VARCHAR(16)` | NULL | FK | `NULL` | Associated reservation code post-finalization (`HTL-#####`). |
| `createdAt` | `BIGINT` | NN | - | `Date.now()` | Initiation timestamp. |
| `callbackAt` | `BIGINT` | NULL | - | `NULL` | Timestamp of incoming bank webhook callback. |
| `settledAt` | `BIGINT` | NULL | - | `NULL` | Timestamp of successful gateway settlement. |

