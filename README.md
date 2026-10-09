# PUPSJ Hotel & Restaurant Management System

An editorial, lightweight, fully-featured hospitality management platform (Public Guest Site, Guest Self-Service Portal, and Staff Operations System) engineered strictly in **plain HTML, Vanilla CSS, and modular Vanilla JavaScript using `localStorage`**. No external frameworks, no libraries, and zero build step required.

---

## 1. Project Directory Structure

```text
SAD_UI/
├── index.html                           # Root landing redirect -> pages/main/home.html
├── ICONS.md                             # Catalogue of icon placeholders and SVG specifications
├── README.md                            # System architecture, configuration, and credentials guide
├── css/
│   └── site.css                         # THE SINGLE unified stylesheet for the entire platform (~29.9 KB)
├── js/
│   ├── core.js                          # Shared utilities: CONFIG, Manila-safe today(), esc(), modal, toast, exportCSV()
│   ├── data.js                          # Unified domain data layer, relative-date seeds, schema migrations, and audit logging
│   ├── site-shell.js                    # Public site navigation header, footer, and interactive concierge bot
│   ├── staff-shell.js                   # Staff operations shell: auth guard, responsive sidebar (<900px drawer), search, notifications
│   ├── booking-modal.js                 # Shared booking dialog, room auto-assigner, folio ledger modal, and tax invoice
│   ├── home.js                          # Public home page logic
│   ├── about.js                         # Public about page & published guest reviews
│   ├── contact.js                       # Public contact form submitting to staff inquiries
│   ├── menu.js                          # Public dining menu catalog & table reservation booking
│   ├── rooms-deals.js                   # Public live room rates, stay calculator, and active promos
│   ├── guest-login.js                   # Unified authentication, guest registration & exact lookup
│   ├── guest-portal.js                  # Guest self-service portal (stay folio, dining orders, housekeeping, loyalty, messaging)
│   ├── dashboard.js                     # Staff operations dashboard, KPIs, month calendar, pending alerts
│   ├── reservations.js                  # Staff reservations ledger (table, month/week/agenda calendar, check-in/out)
│   ├── guests.js                        # Staff guest CRM directory (profiles, cards, table, walk-in check-in)
│   ├── housekeeping.js                  # Staff housekeeping matrix, arrival priority, and guest requests queue
│   ├── maintenance.js                   # Staff facility work orders, priority triage, and out-of-service room toggling
│   ├── orders.js                        # Staff restaurant POS, dining/in-room tickets, and folio billing
│   ├── kitchen.js                       # Kitchen Display System (KDS) board with 30s timers and station routing
│   ├── tables.js                        # Restaurant floor plan grid, table status, and reservation seating
│   ├── menu-mgmt.js                     # Staff menu catalog CRUD, 86 availability toggling, and categories
│   ├── payments.js                      # Finance folios ledger, official receipts journal, and quick POS terminal
│   ├── reports.js                       # Management KPIs (ADR, RevPAR, Occupancy %), SVG charts, and print-to-PDF
│   ├── rooms.js                         # Room inventory management, status checks, and deletion protection
│   ├── roomtypes.js                     # Room categories CRUD, capacity limits, descriptions, and amenities
│   ├── promotions.js                    # Marketing discounts engine, qualifying criteria, and active toggles
│   ├── messages.js                      # Staff messaging inbox, conversation threads, and live guest replies
│   ├── inquiries.js                     # Public contact inquiries queue, mailto integration, and staff notes
│   ├── feedback.js                      # Guest reviews moderation, ratings distribution, and website publishing
│   ├── employees.js                     # Staff account administration and role labels
│   └── audit.js                         # Immutable system audit trail and CSV export
├── assets/
│   └── images/
│       └── homepage.webp                # Hero background image
└── pages/
    ├── main/
    │   ├── home.html                    # Public home page
    │   ├── about.html                   # Public about page
    │   ├── contact.html                 # Public contact page
    │   ├── menu.html                    # Public restaurant menu & table booking
    │   ├── privacy.html                 # Privacy policy
    │   └── terms.html                   # Terms & conditions
    ├── rooms/
    │   ├── rooms-deals.html             # Public room availability & promotions
    │   ├── rooms.html                   # Staff room inventory
    │   └── roomtypes.html               # Staff room categories
    ├── auth/
    │   └── guest-login.html             # Unified sign-in, account creation & booking finder
    ├── guest/
    │   ├── guest-portal.html            # In-house guest self-service portal
    │   └── guests.html                  # Staff guest CRM
    └── management/
        ├── dashboard.html               # Staff executive dashboard
        ├── reservations.html            # Staff reservations ledger & calendar
        ├── housekeeping.html            # Staff housekeeping & room turnover
        ├── maintenance.html             # Staff facility work orders
        ├── orders.html                  # Staff restaurant POS & order billing
        ├── kitchen.html                 # Kitchen Display System (KDS)
        ├── tables.html                  # Floor plan & table seating
        ├── menu.html                    # Staff menu catalog
        ├── payments.html                # Finance folios & receipt ledger
        ├── reports.html                 # Business performance & reports
        ├── promotions.html              # Promotions & discount campaigns
        ├── messages.html                # Guest communications inbox
        ├── inquiries.html               # Public contact inquiries queue
        ├── feedback.html                # Guest feedback & reviews moderation
        ├── employees.html               # Staff administrator accounts
        └── audit.html                   # System audit log & data reset
```

---

## 2. Central Configuration (`js/core.js`)

All hotel facts, addresses, policies, tax rates, contact channels, and rules are centralized in `CONFIG` inside `js/core.js`:

```javascript
window.CONFIG = {
  hotelName: 'PUPSJ Hotel & Restaurant',
  brandShort: 'PUPSJ Hotel',
  locationCity: 'San Juan City, Metro Manila',
  address: 'San Juan City, Metro Manila, Philippines',
  phones: ['+63 (2) 8735-5555', '+63 917 123 4567'],
  emails: {
    reservations: 'reservations@pupsjhotel.ph',
    concierge: 'concierge@pupsjhotel.ph',
    billing: 'billing@pupsjhotel.ph'
  },
  hours: {
    frontDesk: '24 Hours Daily',
    checkIn: '2:00 PM',
    checkOut: '12:00 PM',
    restaurant: '6:00 AM – 10:00 PM'
  },
  wifi: {
    network: 'PUPSJ-Guest-HighSpeed',
    password: 'MabuhayStay2026'
  },
  taxRates: {
    vatPct: 12,
    serviceChargePct: 10
  },
  depositPct: 50,
  freeCancelDays: 3,
  loyalty: {
    silverNights: 5,
    goldNights: 12,
    platinumNights: 25,
    pointsPerNight: 100
  },
  legal: {
    tin: '[PLACEHOLDER: TIN]',
    permit: '[PLACEHOLDER: BIR PERMIT]'
  },
  demoLogins: true
};
```

---

## 3. Demo Accounts & Default Credentials

Demo accounts can be used to immediately access all features. On `pages/auth/guest-login.html`, one-click demo login buttons are provided:

### Staff Accounts (Staff Operations & Management)
| Role / Label | Username | Password | Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access to all staff modules |
| **Manager** | `manager` | `manager123` | Full access to all staff modules |
| **Front Desk** | `frontdesk` | `desk123` | Full access to all staff modules |
| **Housekeeping** | `housekeeper` | `clean123` | Full access to all staff modules |
| **Kitchen Chef** | `chef` | `cook123` | Full access to all staff modules |

*Note: In accordance with project requirements, role is an organizational label; any authenticated staff member can access all staff pages.*

### Guest Demo Account (Guest Portal)
- **Email:** `maria.santos@email.com`
- **Password:** `guest123`
- **Linked Active Booking:** `HTL-2041` (In-house stay in Deluxe Ocean View Room 201)

### Booking Quick Lookup
- **Reservation Code:** `HTL-2041`
- **Last Name:** `Santos` (or Phone: `0917-123-4567`)

---

## 4. Resetting Demo Data

To restore all data collections back to a fresh state with **dynamically relative dates** (anchored relative to Manila `today()`):
1. Sign in as any staff member.
2. Go to **Settings &rarr; Audit Log** (`pages/management/audit.html`).
3. Click the red **"Reset Demo Data"** button at the top right.
4. Confirm the prompt. All `pupsj.*` keys will be cleared and regenerated relative to today.

Alternatively, open your browser developer console on any page and execute:
```javascript
Data.resetDemoData();
location.reload();
```

---

## 5. Security & Academic Disclaimer

> **IMPORTANT NOTICE:**  
> This project is designed for academic demonstration and portfolio evaluation. All data, user accounts, and session tokens are persisted inside client-side browser `localStorage`.  
> Passwords are intentionally stored in unencrypted format to permit standalone operation without external database or server dependencies.  
> **This is NOT suitable for production environments.** A production deployment must implement:
> - A secure server-side runtime (Node.js, Go, Python, etc.)
> - Strict transport security over HTTPS
> - Salted password hashing using `bcrypt` or `Argon2`
> - Secure, HTTP-only, SameSite session cookies or JWT tokens
> - Proper role-based access control (RBAC) enforced on server endpoints
> - Payment processing via certified PCI-DSS compliant payment gateways (PayMongo, Stripe, Maya Checkout). All payments in this system are purely simulated.
