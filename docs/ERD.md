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
        string holdExpiresAt
        string created
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
| `s` / `st` / `status` | `VARCHAR(20)` | NN | - | `'Pending'`| Lifecycle state: `Pending`, `Confirmed`, `Checked-in`, `Checked-out`, `Cancelled`, `No-show`. |
| `source` | `VARCHAR(20)` | NN | - | `'Web'` | Booking origin: `Web`, `Walk-in`, `Staff-assisted`, `OTA`. |
| `rt` / `nightlyRate` | `INT` | NN | - | - | Philippine Peso integer rate per night. |
| `total` / `grossTotal` | `INT` | NN | - | - | Gross accommodation total inclusive of VAT and Service Charge. |
| `promo` | `VARCHAR(20)` | NULL | FK | `""` | Applied voucher discount code. |
| `holdExpiresAt` | `DATETIME` | NULL | - | `NULL` | ISO-8601 timestamp. Active for unconfirmed web bookings (24h default). |

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
