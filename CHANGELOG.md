# CHANGELOG — PUPSJ Hotel & Restaurant PMS

All notable changes and architectural enhancements are recorded in this file.

## [Phase 2: Domain Business Rules & Algorithms] - 2026-10-09

### Added
- **Domain Services Suite (`js/services.js`)**: Fully realized domain service implementations:
  - `PricingService.quote()`: Deterministic BIR-compliant quote engine (tax factor 1.232, 10% Service Charge, 12% VAT), statutory discounts (Senior Citizen/PWD 20% discount + VAT exempt).
  - `ReservationService`: Full lifecycle state-machine (`Pending` → `Confirmed` → `Checked-in` → `Checked-out`, cancel guards, zero-balance checkout enforcement).
  - `PaymentService`: Unified ledger recording sequential OR numbers (`OR-YYYY-XXXXX`), method validation, deposit tracking, refunds, and voids.
  - `RoomService`: Availability calculation (`freeRooms`), fragment-minimizing room assignment.
  - `FolioService`: Ledger charges, posted incidentals, dining charges, and balance reconciliation.
  - `OrderService`: POS order placement, station routing (Kitchen vs Bar), and decoupled billing.
  - `TableService`: 90-minute conflict detection, best-fit table capacity matching, live table state management.
  - `HousekeepingService`: Cleanliness state machine (`Dirty` → `In progress` → `Clean` → `Inspected`), automated arrival-based priorities, round-robin workload balancing.
  - `MaintenanceService`: SLA tracking, OOS overlapping reservation detection, Relocation Assistant modal.
  - `LoyaltyService`: Stable guest ID association, completed nights tier calculation (5/12/25), voucher creation.
  - `AuditService`: Tamper-evident append-only audit logger with SHA-256 hash chaining.
- **Relocation Assistant Modal (`js/maintenance.js`)**: Interactive dialog triggered when flagging an occupied/booked room Out of Service, providing instant 1-click relocation to available rooms of the same type.
- **Housekeeping Workload Balancer (`js/housekeeping.js`)**: "Assign All Unassigned" distributes unassigned dirty rooms across active personnel by lowest open count.
- **Dining Promotions & Statutory Discounts (`js/orders.js`)**: POS settlement modal validates dining promo codes (`GOURMET25`, `BRUNCH41`, `SUNSETBOGO`) and applies Senior Citizen / PWD 20% discounts with ID number capture.
- **Bar Lounge Tables (`js/data.js`, `js/tables.js`)**: Populated Bar Lounge tables (`TBL-8`, `TBL-9`) with full area filtering.

### Fixed & Closed Defects
- **Defect 5.1.3**: Wrapped staff reservation creation in try/catch, validated Source and captured Gov ID, protecting promo quota.
- **Defect 5.1.4**: Decoupled billing status from kitchen status in `Data.billOrder()`; in-room dining orders progress naturally through KDS stations.
- **Defect 5.1.5**: Fixed argument signature in POS settlement modal (`btnConfirmDirectPay`), passing payment method and metadata correctly.
- **Defect 5.1.6**: POS direct orders consume sequential unified OR numbers from sequence counter and write to unified payments ledger.
- **Defect 5.1.7**: Reports engine captures in-room dining folio charges in Dining Revenue, reconciling Dashboard, Reports, and Payments ledger.
- **Defect 5.1.8**: Room capacity and date validation strictly enforced in data layer; walk-in modal routes through `createReservation` capturing Gov ID.
- **Defect 5.1.12**: Booking modal Cash and Bank Transfer deposits stay `Pending` with hold timer rather than auto-confirming unpaid stays.
- **Defect 5.2.16**: Rate quotes and folio calculations reconciled: nightly rate snapshot preserved, pure `quote()` calculation.
- **Defect 5.2.17**: Dining promo codes (`GOURMET25`, `BRUNCH41`, `SUNSETBOGO`) applied during POS bill settlement.
- **Defect 5.2.18**: Standardized BIR tax factor 1.232 across all modules; POS receipt chits reference hotel TIN from configuration.
- **Defect 5.2.19**: `cancelReservation` returns `{ refundAmt, retainedFee }`; UI displays retained fee toast correctly; checked-in stays blocked from cancellation.
- **Defect 5.2.20**: Zero-balance checkout enforced across services, modal, and portal; superadmin override requires logged reason in audit.
- **Defect 5.2.21**: Loyalty tier calculation uses completed nights (`Checked-out`) and CONFIG thresholds (`5/12/25`).
- **Defect 5.2.25**: Table reservation code prefix updated to `TRS-`; 90-minute conflict algorithm ignores `Cancelled`, `Completed`, and `No-show`.
- **Defect 5.2.26**: KDS station-level ticket filtering (Kitchen vs Bar) and in-place order age timers without board re-rendering.
- **Defect 5.2.27**: Flagging room Out of Service checks overlapping reservations and triggers Relocation Assistant; resolving ticket sets room to `Dirty` and housekeeping priority to `Urgent` or `High` (never `'Standard'`).
- **Defect 5.2.28**: Room status transitions normalized; room number aliasing resolved across services.
- **Defect 5.2.29**: Payments ledger method filter operates case-insensitively, properly matching `'Credit Card'`.
- **Defect 5.2.30**: Dashboard "In-House Guests" KPI displays guest headcount alongside room count; dining sales excludes unpaid orders; Manila local date formatting avoids 1-day UTC shift.
- **Defect 5.2.31**: Reports engine pro-rates realized room revenue and dynamic room-night capacity.
- **Defect 5.2.35**: Sequential counters used for `TYP-`, `CHG-`, and `AUD-` avoiding `Date.now()` collisions.
- **Defect 5.3.45**: Role check in `housekeeping.js` references active personnel without non-existent `'Admin'` role; "Assign All Unassigned" workload balancing helper added.

## [Phase 1: Foundation Layer] - 2026-10-09

### Added
- **Pure-JS Cryptographic Engine (`js/crypto.js`)**: RFC 6234 compliant SHA-256 implementation with salted multi-round iterations. Works completely offline on `file://` without `crypto.subtle`.
- **Validation Schema Engine (`js/validate.js`)**: Reusable entity validator schemas covering guests, reservations, orders, tables, maintenance, housekeeping, payments, and promos.
- **Service Layer (`js/services.js`)**: Clean domain service abstractions (`AuthService`, `ReservationService`, `PricingService`, `PaymentService`, `RoomService`, `OrderService`, `HousekeepingService`, `MaintenanceService`, `LoyaltyService`, `NotificationService`, `ReportService`, `AuditService`).
- **Transactional Storage Engine**: Added `store.transaction(fn)` snapshotting keys and rolling back on unhandled exceptions to prevent partial writes.
- **Persisted ID Sequences**: Replaced `Date.now()` and array-length IDs with persisted counters (`HTL`, `ORD`, `OR`, `TRS`, `MNU`, `MSG`, `INQ`, `HKR`, `MNT`, `FB`, `VCH`, `GST`, `LOY`, `TYP`, `AUD`).
- **Cross-Tab Synchronization**: Added `window.addEventListener('storage')` and `Data.emit()` event bus to keep guest and admin tabs reactive.
- **Non-Destructive Versioned Migrations**: Replaced data-wiping `SCHEMA_VERSION` reset with incremental `Data.migrate(fromVersion)`.

### Fixed
- **Defect 5.1.1**: Removed `defaultManager` auto-grant in `staff-shell.js`. Enforced strict two-role authentication guard (redirect unauthenticated to login, show Access Denied to guests).
- **Defect 5.1.2**: Migrated staff and guest sessions from `localStorage` to tab-isolated `sessionStorage`, enabling side-by-side demonstration tabs.
- **Defect 5.1.5**: Fixed POS payment method parameter mapping so direct payments record actual chosen method (Cash, Card, GCash, Maya) instead of defaulting to Cash.
- **Defect 5.1.6**: Implemented unified payments store and persisted `OR-#####` counter eliminating duplicate receipt numbers.
- **Defect 5.1.9**: Hardened `validateReturnUrl()` against backslash and protocol-relative bypasses (`/\evil.com`).
- **Defect 5.1.14**: Eliminated data wiping on schema version bumps.
- **Defect 5.1.15**: Migrated cleartext passwords to salted iterated SHA-256 hashes with account lockout and idle timeout safeguards.
- **Defect 5.2.16**: Unified pricing under `PricingService.quote()`.
- **Defect 5.2.18**: Updated tax formula to BIR-standard factor 1.232 (10% Service Charge inside 12% VAT base) and unified TIN from CONFIG.
- **Defect 5.2.29**: Standardized `PaymentMethod` enum across reservations and POS payments.
- **Defect 5.2.35**: Eliminated `Date.now()` concurrency bugs with centralized sequence generator.
- **Defect 5.2.36**: Added tick-level memoization cache for room status and availability checks.

## [Phase 0: Baseline Audit] - 2026-10-09
- Verified all 45 defects from Section 5 against source code.
- Initialized local Git repository with baseline commit `6e113b4`.
- Compiled comprehensive findings into `phase0_audit_report.md`.
