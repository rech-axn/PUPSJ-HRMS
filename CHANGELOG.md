# CHANGELOG — PUPSJ Hotel & Restaurant PMS

All notable changes and architectural enhancements are recorded in this file.

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
