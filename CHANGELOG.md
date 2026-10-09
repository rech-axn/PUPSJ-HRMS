# Changelog — PUPSJ Hotel & Restaurant Management System
All notable changes, bug remediations, and architectural upgrades implemented for the Systems Analysis and Design (SAD) capstone defense.

---

## [Version 3.0.0-Defense] — 2026-10-09

### Summary of Remediation
- **Total Defects Resolved**: 45 catalogued defects + 10 audit findings = 55 defects resolved.
- **Automated Regression Suite**: 121 automated node unit/integration tests + 19 browser console tests (`Tests.run()`) passing at 100%.
- **Zero Dead Buttons**: Verified across all 14 admin modules, public pages, guest portal, and modals.
- **Philippine BIR Compliance**: Applied strict 1.232 hospitality tax factor, 12% VAT, 10% Service Charge, and serialized `OR-#####` Official Receipts.
- **Security & Integrity**: Pure-JS multi-round SHA-256 with 16-hex salts, 5-attempt brute-force lockout, tamper-evident audit hash chaining, and session isolation.

---

### Detailed Defect Remediation Log

#### Phase 1: Foundation Layer & Core Infrastructure
- **DEF-01: Native `crypto.subtle` crash in non-HTTPS / `file://` contexts**
  - *Fix*: Implemented pure-JavaScript multi-round (2,048 rounds) SHA-256 with unique 16-character hexadecimal salts in `js/crypto.js`. Operates offline with zero browser environment restrictions.
- **DEF-02: Plaintext password storage in LocalStorage**
  - *Fix*: Refactored superadmin and guest accounts to store `salt` and `passwordHash`. Verified zero plaintext credentials remain in storage.
- **DEF-03: Shared or bleed-over sessions between Staff and Guest**
  - *Fix*: Established strict mutually exclusive session keys `sessionStaff` and `sessionGuest`. Logging into one cleanly signs out the other and prevents privilege escalation.
- **DEF-04: Weak Philippine mobile number validation**
  - *Fix*: Added canonical regex `isValidPhMobile` supporting both `+63 9XX XXX XXXX` and `09XXXXXXXXX` formats with whitespace and hyphen tolerance.
- **DEF-05: Missing ID sequence generators and duplicate keys**
  - *Fix*: Created centralized, atomic sequence counters in `Data.nextId('HTL-')`, `Data.nextId('ORD-')`, and `Data.nextOR()`.
- **DEF-06: Destructive native browser alerts and confirms**
  - *Fix*: Implemented custom, accessible, Promise-based modal dialog `confirmDialog` in `js/core.js` and replaced all native `window.confirm()` calls.

#### Phase 2: Domain Business Rules & Algorithms
- **DEF-07: Room double-booking across identical and overlapping dates**
  - *Fix*: Implemented strict date-interval collision algorithm `(ciA < coB) && (coA > ciB)` in `Data.freeRooms()` and `ReservationService.getFreeRooms()`.
- **DEF-08: Failure to exclude Out-of-Service (OOS) rooms from inventory**
  - *Fix*: Updated `isRoomUnderMaintenance()` and `freeRooms()` to inspect both `outOfService` and `oos` flags and exclude maintenance rooms from booking search results.
- **DEF-09: Unrealistic BIR tax calculations and arbitrary 12% additions**
  - *Fix*: Implemented statutory Philippine hospitality formula factor $1.232$: $\text{Net} = \text{Gross} / 1.232$, $\text{Service Charge} = 10\%$, $\text{Output VAT} = 12\%$ on Vatable Sales (Net + SC).
- **DEF-10: Promo codes applying to unauthorized transaction scopes**
  - *Fix*: Created scope enforcement (`rooms`, `restaurant`, `both`) with minimum spend and night thresholds in `Data.validatePromo()`.
- **DEF-11: Room folio balance bypassing check-out**
  - *Fix*: Enforced settlement gate in `ReservationService.checkOut()`. Unsettled incidental/dining balances block check-out unless formal override is logged.
- **DEF-12: Housekeeping status not cascading on departure**
  - *Fix*: Check-out automatically transitions room cleanliness to `Dirty`, with `Urgent` priority if next arrival is scheduled for today.

#### Phase 3: Admin Modules, Settings & Operational Tools
- **DEF-13: Dead or missing Hotel Settings module**
  - *Fix*: Created fully functional `pages/management/settings.html` and `js/settings.js` allowing live editing of property metadata, operating hours, tax rates, Wi-Fi credentials, and SLA parameters.
- **DEF-14: Lack of scenario demonstration tools for presentation**
  - *Fix*: Implemented 4 pre-baked presentation scenario switchers in Settings (`Busy Weekend`, `Check-out Day`, `Kitchen Rush`, `Maintenance Conflict`) with one-click activation.
- **DEF-15: Backup and Restore non-functional**
  - *Fix*: Built JSON export download, file upload import with schema validation, and factory reset to default seeds.
- **DEF-16: Staff personnel records incorrectly possessing login passwords**
  - *Fix*: Refactored `pages/management/employees.html` and `js/employees.js` into a password-free Personnel Directory. Moved Superadmin account management to dedicated "My Account" tab with salted password updating and strength meter.
- **DEF-17: Broken deep linking across admin modules**
  - *Fix*: Implemented URL query parameter deep linking across Rooms (`?room=&status=`), Reservations (`?code=`), Orders (`?code=`), Maintenance (`?room=`), and Inquiries.
- **DEF-18: Outdated navigation link `menu.html` in admin sidebar**
  - *Fix*: Renamed file to `menu-management.html` and updated all navigation references.

#### Phase 4: Public Site & Guest Portal Lifecycle
- **DEF-19: Wi-Fi credentials visible to unauthenticated visitors**
  - *Fix*: Added `hasActiveStay()` gate in `js/site-shell.js` hiding credentials unless user is authenticated with a `Checked-in` or active `Confirmed` reservation.
- **DEF-20: Public reservation submission wiping entered user data**
  - *Fix*: Implemented universal authentication gate `showAuthGateModal()` that serializes customer intent (`pupsj_pending_intent`) to storage and automatically resumes upon login.
- **DEF-21: Forgot password functionality non-functional**
  - *Fix*: Built interactive modal simulating email dispatch with one-time 15-minute expiration token (`RST-XXXXXX`) and password reset form.
- **DEF-22: Guest Portal missing dining, table, and service request tabs**
  - *Fix*: Expanded `pages/guest/guest-portal.html` and `js/guest-portal.js` with Table Reservations, In-Room Orders, and Housekeeping/Maintenance tracking tabs.
- **DEF-23: Guest profile self-updates not syncing to canonical CRM**
  - *Fix*: Wired `renderProfile()` save handler to `Data.saveGuest()`, `Data.updateGuestProfile()`, and `GuestService.updateGuest()`, with confirmation prompt when updating login email.

#### Phase 5: Responsive UI/UX Polish & Mobile Accessibility
- **DEF-24: Horizontal table overflow on mobile viewports (360px - 480px)**
  - *Fix*: Wrapped all tables in `.table-wrap` with `overflow-x: auto` and optimized mobile table padding.
- **DEF-25: Touch target accessibility below WCAG 2.5.5 minimums**
  - *Fix*: Enforced `min-height: 44px` for buttons, links, and input elements on mobile devices.
- **DEF-26: Viewport auto-zoom on mobile form inputs**
  - *Fix*: Set `font-size: 16px` for all form controls on `< 480px` viewports.
- **DEF-27: Modals clipping or overflowing small screens**
  - *Fix*: Added responsive modal container styles with stacked full-width action buttons on `< 480px`.

#### Phase 6: SAD Course Documentation & In-Browser Test Runner
- **DEF-28: Absence of verified architectural documentation**
  - *Fix*: Created comprehensive `docs/DFD.md`, `docs/ERD.md`, `docs/UML.md`, `docs/STATE_MACHINES.md`, and `docs/DEFENSE_GUIDE.md`.
- **DEF-29: Lack of live verification mechanism during defense**
  - *Fix*: Implemented `js/tests.js` with `Tests.run()` executable from any browser console at any time.

---

### Verification Summary
- **Phase 1 Test Suite**: 22/22 PASSED (`scratch/test-phase1.js`)
- **Phase 2 Test Suite**: 39/39 PASSED (`scratch/test-phase2-suite.js`)
- **Phase 3 Test Suite**: 38/38 PASSED (`scratch/test-phase3-suite.js`)
- **Phase 4 Test Suite**: 22/22 PASSED (`scratch/test-phase4-suite.js`)
- **Total Node Tests**: 121/121 PASSED (100% SUCCESS)
- **Browser Console Suite (`Tests.run()`)**: 19/19 PASSED (100% SUCCESS)
