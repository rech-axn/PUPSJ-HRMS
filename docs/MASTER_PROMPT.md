<USER_REQUEST>
1. ROLE AND MISSION

You are a senior full-stack engineer and hotel-systems analyst. You are taking over an existing vanilla HTML/CSS/JavaScript hotel and restaurant management system ("PUPSJ Hotel & Restaurant", San Juan City, Philippines). It will be presented in a mock defense for a Systems Analysis and Design course, so it must behave like a real-world Property Management System (PMS) plus Restaurant POS: internally consistent, traceable to analysis and design artifacts, and free of dead buttons.

Your mission:

Fix every defect listed in Section 5, and any others you find during the audit.
Make every feature of every admin module actually work, with real validation, real data effects on other modules, and real feedback.
Fix the front-end UI/UX, algorithms, business logic and module connections.
Produce the analysis and design documentation listed in Section 14 so the code and the documents agree.
2. PROJECT SNAPSHOT (what exists today)
Stack: static HTML + one CSS file (css/site.css) + vanilla JS. No build tools. Data lives in localStorage under the prefix pupsj. (see store in core.js).
Folders (inferred from relative paths): index.html, css/, js/, assets/{logo,icon,images}/, pages/main/ (public), pages/rooms/, pages/auth/, pages/guest/, pages/management/.
Core JS: core.js (CONFIG, helpers, modal, toast, CSV, pricing, intent, validators), data.js (the whole data and domain layer, about 1,500 lines), booking-modal.js (booking, folio, reservation detail, invoice), site-shell.js (public nav, footer, concierge), staff-shell.js (admin sidebar, topbar, guard).
Page scripts: home, rooms-deals, menu, about, contact, guest-login, guest-portal (public/guest) and dashboard, reservations, guests, housekeeping, maintenance, orders, kitchen, tables, menu-mgmt, messages, inquiries, feedback, payments, reports, rooms, roomtypes, promotions, employees, audit (admin).
Design system (KEEP IT): warm light theme, solid gold accent (--gold #B8891A), no gradients, 4/6 px radii, Cormorant Garamond headings, Plus Jakarta Sans body, pills, cards, tables, modal, toast, tabs.
3. HARD CONSTRAINTS (non-negotiable)
PLACEHOLDER TEXT MUST NOT BE REMOVED OR REPLACED. Keep every [ICON: name] inside .ic spans, every [IMAGE: description, ratio] produced by imgPlaceholder() and the .img-placeholder blocks, and every [PLACEHOLDER: …] value (for example in CONFIG.legal). The team will swap in real assets later. For any new UI you create, follow the same convention: use ico('name') and imgPlaceholder('desc','16:9'). Do not add real images or new icon files. If you need a new icon name, add a CSS binding line following the existing pattern in site.css and keep the placeholder text.
Stay front-end only (no server, no framework, no build step, no external JS libraries). The system must open from the file system or a simple static host. The only external requests allowed are the existing Google Fonts and the Google Maps embed.
Keep the file/folder structure and page names, except for the one rename in Section 6.7. Update all references if you rename.
Keep the visual design system. You may add classes and tokens, but you may not redesign the brand. Fix inconsistencies instead.
Users in scope: Guest and Superadmin only. See Section 4.
Everything must work offline and survive a page refresh. 6a. The system is presented by double-clicking index.html (a file:// URL), so it must run without any web server. Consequences you must respect:
Use classic <script src> tags only. No ES modules (type="module", import/export): browsers block them on file://.
No fetch() / XHR of local files (JSON, templates, etc.). Keep all data in JS or localStorage.
Do not depend on crypto.subtle (it may be unavailable or restricted on file://). Ship a small pure-JS SHA-256 and use it for password hashing (Section 13).
On file://, location.origin is "null", so URL validation must resolve the target against location.href and compare protocol and path, not origin.
Target browsers: current Chrome and Edge (they share localStorage across file:// pages). Firefox treats each file:// page as its own origin and will not share data between pages, so the docs must say "present in Chrome or Edge". Detect this: if a write on one page is not visible on another page, show a banner explaining the browser requirement.
Google Fonts and the Google Maps embed need internet; make sure the layout still looks acceptable with the system font fallback if they fail to load.
Never leave a button, link, tab, filter, deep link or form that does nothing.
Do not silently rewrite unrelated working behavior. Where you change a rule, record it in the changelog (Section 16).
4. USERS AND ACCESS MODEL

Only two login roles exist: Superadmin and Guest.

Superadmin (single seeded account, admin@pupsj.edu.ph): full access to all pages/management/* and pages/rooms/rooms.html|roomtypes.html. Acts as manager, front desk, cashier, kitchen and housekeeping supervisor in one.
Guest (registered account): public site, booking, table reservations, and the Guest Portal (pages/guest/guest-portal.html).
Visitor (not signed in): public pages only, plus read-only "Find Booking" lookup.
The existing staff names/roles (Front Desk, Housekeeping, Maintenance, Kitchen, Security, etc.) become a Personnel Directory: records used for task assignment dropdowns, with a department and shift, without login credentials. Remove the six-role RBAC matrix and replace it with a two-role guard.
Add role: 'superadmin' | 'guest' to sessions. Every admin page must call a guard that (a) redirects unauthenticated visitors to login with a validated ?next=, and (b) shows an Access Denied card to guests.
5. DEFECTS FOUND IN THE CURRENT CODE (fix all; verify each one in the audit)
5.1 Critical (security / data integrity / broken core flows)
Admin pages are open to anyone. staff-shell.js auto-creates a Manager session when none exists (defaultManager fallback) and Data.setStaffSession then clears the guest session. A guest, or a visitor, who opens dashboard.html becomes Manager. Remove the auto-grant and enforce the guard.
Guest and admin sessions live in localStorage and setGuestSession removes sessionStaff (and vice versa). You cannot show a guest tab and an admin tab side by side, which is exactly what a defense demo needs. Move sessions to sessionStorage (per tab), keep data in localStorage, and add a storage event listener so data changes made in one tab refresh the other tab (live demo: guest orders in-room dining, kitchen screen updates).
"New Reservation" in Admin throws. reservations.js → openNewStaffReservation calls Data.createReservation without source, idType, idNumber. With a staff session the data layer defaults to Walk-in and throws "Government ID verification required". There is no try/catch, so the button silently fails, and Data.incrementPromo has already run (promo count is consumed by a failed booking).
In-room dining from the Guest Portal bypasses the kitchen. guest-portal.js calls createOrder then billOrder(…,'room'), and billOrder forces status='Served', so the order never appears in the KDS (which only shows New/Preparing/Ready). Billing must never change kitchen status.
POS payment method is ignored. orders.js calls Data.billOrder(code, {method,amount,ref}), but the signature is billOrder(code, paymentKind, meta). The object lands in paymentKind, so every POS payment is recorded as Cash. The cash-tendered/change logic is cosmetic.
Duplicate Official Receipt numbers. Data.nextOR() scans only reservation payments. POS payments take an OR number but are never stored there, so consecutive POS payments reuse the same OR. Create one unified payments store and a persisted OR counter.
Reports drop room-billed dining revenue. reports.js excludes folio charges with category Dining from incidentals and counts only directly-paid POS orders as dining. Dining charged to a room folio is counted nowhere. Reports, Payments and Dashboard disagree with each other.
No double-booking guard in the data layer. createReservation checks capacity and dates but never re-checks that room n is free. guests.js walk-in check-in writes straight to storage and bypasses createReservation (no ID capture, no capacity check, no profile rules).
Open redirect. validateReturnUrl checks only the file name. A value like /\evil.com/home.html passes the regex and is treated by browsers as //evil.com. Validate by parsing with new URL(value, location.href), rejecting any backslash, scheme or protocol-relative value, and checking that the resolved path is inside the project and in the allow-list. (On file:// do not compare origin; see 6a.)
Forgot-password does nothing. guest-login.js calls Data.createThread, which throws without a session; the error is swallowed and the UI reports success.
Concierge chat throws for visitors. site-shell.js calls Data.createThread for unmatched questions with no session, so it throws and the bot never answers. Also the Wi-Fi password is shown to everyone in the public FAQ; reveal it only to signed-in guests with a checked-in stay.
Online "Cash" and "Bank Transfer" deposits are recorded as already paid. booking-modal.js always passes initialPayment, so an unpaid guarantee deposit becomes Confirmed. Only card and e-wallet simulated payments may be recorded as paid; cash/bank must create a pending deposit with a hold expiry (Section 8.5).
Walk-in claim has no verification. guest-login.js auto-links any unclaimed walk-in stay when a registrant's phone or email matches. Require a confirmation step (booking code plus last name or phone, plus a simulated OTP).
Schema upgrade wipes all data. Data.init() re-seeds everything whenever SCHEMA_VERSION increases. Replace it with non-destructive, versioned migrations.
Passwords are plaintext and demo credentials are always printed on the login page. See Section 13.
5.2 Logic and calculation defects
Two pricing engines disagree. calculateStayPricing (core.js) treats credit promos as a room discount, Data.roomChg ignores them. The staff booking path posts a negative "Promo discount" folio charge, while the guest path stores a promo object that roomChg discounts. Normalize to one engine and one storage shape (Section 8.2).
Promo DINESTAY semantics are wrong. Its description says a dining credit is posted to the folio, but the code applies it as a room discount. Dining promos (GOURMET25, BRUNCH41, SUNSETBOGO) are validated at table-reservation time but never applied to any bill.
Tax breakdown is not BIR-correct. taxBreakdown divides by 1.22 (VAT 12% plus SC 10% on net). Under PH rules, service charge is part of the VAT base: net x 1.10 x 1.12 = 1.232. orders.js hardcodes 1.22 and a different TIN (000-123-456-000) from CONFIG.legal.tin ([PLACEHOLDER: TIN]). Use one function and one config source (keep the placeholder text).
cancelReservation returns {refundAmt, retainedFee}, but reservations.js reads .fee, so the cancel toast is wrong. Cancelling a Checked-in stay is allowed by the data layer. Add state-machine rules (Section 7.1).
Check-out balance rule is inconsistent. booking-modal.js blocks check-out with a balance, reservations.js allows it via native confirm(), Data.checkOut does not check, and the Guest Portal express checkout bypasses Data.checkOut entirely (no loyalty points, different audit entry).
Loyalty tier mismatch. guests.js counts nights from all non-cancelled stays (including future), while Data.getGuestNights counts only checked-in/out. The "Initial Loyalty Tier" field in the Register Guest modal is never read, and its thresholds (5/10/20) disagree with CONFIG.loyalty (5/12/25). Tier perks (late checkout, 10%/15% dining discount, etc.) are advertised but never applied. Redeeming a reward only writes a negative ledger line; no voucher record exists, although the UI says the front desk is notified.
Loyalty and profiles are keyed by guest name, so two guests with the same name share points. Editing a name in the portal orphans loyalty and reservation links. Introduce a stable guestId.
Guest Portal profile edits go to a store nothing reads (guestProfiles), so the admin CRM never sees them, and the portal can change the session email so that reservations no longer match.
Walk-in registration creates fake accounts (name@guest.local) in guestAccounts, polluting the directory. Separate Guest (person) from GuestAccount (credentials).
Table reservations: 90-minute slot check ignores Completed and No-show bookings (only Cancelled frees a slot). The reservation code prefix TBL- collides with table IDs TBL-1..7. Table status (Free/Occupied/Reserved) is static data, not derived from reservations and orders; creating a dine-in order never occupies a table and settling never frees it.
Kitchen KDS shows whole orders at both stations (a mixed order prints all lines at Bar and Kitchen) and has no per-station completion. Timers re-render the whole board every 30 s.
Maintenance: marking a room Out of Service while future reservations exist silently leaves guests assigned to an unavailable room. Resolved tickets set housekeeping priority 'Standard', which is not a valid priority.
Housekeeping and room status naming: Data.roomStatus returns Cleaning for any non-clean room, including Dirty. A new room in rooms.js gets HK status without a task record.
Payments filter mismatch: payment method values differ in casing (Credit card vs Credit Card), so the ledger method filter misses records. Define one enum.
Dashboard: "In-House Guests" shows the number of occupied rooms (screenshot: "2" with "5% occupancy"). "Dining Sales Today" (₱4,230) adds unpaid and room-charged orders. The weekly chart builds ISO dates with toISOString() (UTC), which is off by one day between 00:00 and 08:00 in Manila. Use the local today() helpers.
Reports: room revenue recognizes future nights as earned, ignores promos, counts any stay with a payment, and "All Time" occupancy uses an arbitrary denominator.
Guest Portal reservation edit re-validates nothing: capacity, promo minimum nights, price-difference confirmation and status guards are missing. Check-out date has no min.
Notification "seen" state is count-based (notifSeen.count) so it breaks when one alert resolves and another appears. Use per-notification IDs.
Dead deep links (the target page ignores the query string): reservations.html?status=Pending (dashboard), rooms.html?type= and ?room= (room types, search), inquiries.html?ref=, orders.html?code=, maintenance.html?id= (notifications and search), messages.html?new=1&guest= (guests), reservations.html?new=1&room= (rooms).
Concurrency of IDs: nextId('MNU-') falls through to Date.now(); addCharge and audit use Date.now() as the ID (collisions). Room-type IDs use TYP-${length+1} (collides after deletes). Use persisted counters.
Performance: Data.roomStatus and Data.freeRooms re-read and re-parse the reservations, maintenance and housekeeping JSON for every room, so a render is O(rooms x parse). Add a per-tick read cache invalidated by the change event.
Filters reset on every data-change event (modules rebuild their whole DOM, including the filter inputs), and messages.js re-renders the search box on each keystroke so it loses focus.
Duplicate implementations of openReservationDetail (booking-modal.js and reservations.js), and an inline onclick="openReservationDetail('…', onUpdate)" in the cancel-confirm footer that throws ReferenceError (scope).
Native confirm() is used for destructive actions in several modules (employees, menu-mgmt, promotions, roomtypes, rooms, maintenance, reservations, audit).
5.3 CSS / UI defects
Undefined tokens: --shadow-sm (used by .kpi-card) and --shadow-md (Access Denied card).
.btn-secondary.active (Weekly/Monthly toggle on the dashboard) has no style, so the toggle shows no state. .btn-active exists but is used inconsistently.
Elements that carry both class grid-2 and an inline grid-template-columns (home restaurant block, contact, guest portal tabs, reports charts row, reservations filter row) do not collapse on mobile because inline styles beat the media query.
The mobile drawer backdrop reuses .modal-backdrop (fixed, full-screen, opacity:0, but still pointer-active). Verify it is not swallowing clicks; give it pointer-events:none unless .show.
Layout, KPI cards and page headers are copy-pasted inline-styled blocks in about 20 files. Extract shared components (Section 11).
Minor: index.html redirects with JS only (add <meta http-equiv="refresh"> and a <noscript> link); the review button says "Publish Review" although moderation is required (rename to "Submit Review"); Admin role referenced in housekeeping.js does not exist.
6. TARGET ARCHITECTURE
6.1 Layers (keep vanilla JS, add structure)
store (localStorage persistence): versioned, quota-safe (toast on write failure), exposes get/set/remove, plus a transaction(fn) helper that snapshots affected keys and rolls back on exception (used for every multi-step write such as create reservation + payment + promo redemption + audit).
Repositories (inside data.js or new js/repo.js): one getter/saver per entity; getters return copies; reads are cached per tick.
Services (new js/services.js or several files): AuthService, GuestService, ReservationService, RoomService, FolioService, PaymentService, PricingService, PromoService, HousekeepingService, MaintenanceService, MenuService, OrderService, TableService, LoyaltyService, MessageService, InquiryService, FeedbackService, NotificationService, ReportService, AuditService. UI modules must never mutate stores directly (today many do list.find(...).x = ...; Data.saveX(list)); they call a service and render the returned {ok, data, error}.
Validators (js/validate.js): one schema/rule set per entity, reused by UI (inline .field.has-error) and services.
UI kit (js/ui.js): shared components (Section 11).
Event bus: a single Data.emit(entity, action, id) that dispatches pupsj:data-change with detail, and also listens to the storage event for cross-tab sync. Modules re-render only their dynamic region and preserve filters, scroll and focus.
6.2 Data model (normalize; this should match your ERD)

Entities and key fields. Use persisted sequences for human-readable IDs.

Guest (guestId GST-####, name, email?, phone, notes, preferences, vip, archived, createdAt)
GuestAccount (guestId FK, email unique, passwordHash, salt, createdAt, lastLogin, failedAttempts, lockedUntil)
AdminAccount (adminId, name, email, passwordHash, salt, lastLogin)
Personnel (staffId, name, department, shift, phone, active; no credentials)
RoomType (typeId, name, baseRate, capacity, bedType, description, amenities[], rateRules[])
Room (roomNo, typeId FK, floor, status flags derived, notes, active)
Reservation (code HTL-####, guestId FK, typeId, roomNo, checkIn, checkOut, guests, source Online|Walk-in|Staff-assisted, status, promoRedemptionId, nightlyRateSnapshot[], idType, idNumber, holdExpiresAt, createdBy, timestamps)
FolioCharge (chargeId, reservation FK, date, description, category, amount, refType/refId e.g. ORD-1001)
Payment (unified: orNo OR-##### unique, date/time, kind Deposit|Payment|Refund|Void, method (enum), amount, refType Reservation|Order, refId, authRef, cardLast4, cashier, reason)
Promo (code, title, description, appliesTo rooms|restaurant|both, type percent|fixed|folio-credit, value, minNights, minSpend, validFrom, validTo, usageLimit, active) and PromoRedemption (id, promo, refType, refId, amount, status Applied|Released)
MenuItem (MNU-###, name, category, price, station, tags, available, archived, [IMAGE] placeholder)
DiningTable (T-#, number, seats, area, active) with derived status
TableReservation (TRS-####, guestId?, name, phone, date, time, party, tableNo, status Pending|Confirmed|Seated|Completed|Cancelled|No-show, promo)
Order (ORD-####, type Dine-in|In-room|Takeaway, tableNo/roomNo/reservation FK, status New|Preparing|Ready|Served|Cancelled, billing status Unpaid|Paid|Room folio|Void, createdBy, timestamps) and OrderLine (item snapshot: id, name, unit price, qty, note, station, line status)
HousekeepingState (per room: Dirty|In progress|Clean|Inspected, priority, assignedStaffId, timestamps) and HousekeepingRequest (HKR-###)
MaintenanceTicket (MNT-###, room, issue, priority, status, outOfService, from/to dates, assignedStaffId, SLA due, resolvedAt)
MessageThread / Message, Inquiry (with replies[]), Feedback, LoyaltyLedger, Voucher (VCH-####, guest, reward, status Issued|Redeemed|Expired), Notification (id, type, refId, createdAt, readBy), AuditLog (id, time, actorType/actorId/name, action, entity, entityId, before, after, details)

Enforce foreign keys in services (cannot delete a RoomType with rooms or reservations; cannot delete Personnel who still have open tasks, reassign or block).

6.3 Migrations

Implement Data.migrate(fromVersion) as ordered, idempotent steps that transform existing data (for example name-keyed loyalty to guestId, split of guestAccounts, unified payments). Never reset data on upgrade. Keep "Reset Demo Data" as an explicit, confirmed superadmin action.

6.4 Seeds

Seeds must be internally consistent (dates relative to local today(); folio, payments, HK, maintenance and orders agree). Fix inconsistencies such as room 501 appearing both checked-out/dirty and out-of-service. Provide named demo scenarios (Section 9, Settings module).

6.5 Sessions

sessionStorage key per tab: {role, id, name, email, issuedAt, lastActivity}. Idle timeout (30 min admin, 4 h guest) with a warning modal. "Remember me" is optional and stored separately.

6.6 Utilities

Keep today(), addDays(), dateDiff() as the only date sources (local time). Add parseISO, fmtTime, and a currency formatter that supports centavos where needed (POS change due).

6.7 One rename

Two different pages are both called menu.html (public pages/main/menu.html, admin pages/management/menu.html), and permissions, the redirect allow-list and nav highlighting key off the file name. Rename the admin page to menu-management.html and update every reference (staff-shell nav, WHITELISTED_PAGES, deep links).

7. AUTHORITATIVE BUSINESS RULES
7.1 Reservation lifecycle (state machine; reject any other transition)

Pending -> Confirmed -> Checked-in -> Checked-out; Pending|Confirmed -> Cancelled; Confirmed -> No-show (after check-in day passes, or manually after cut-off time). Checked-in may not be cancelled (early check-out instead). Only ReservationService changes status.

Pending: no (or insufficient) deposit; holds the room until holdExpiresAt (default 24 h or 2 h before arrival if sooner), then auto-expires to Cancelled (Hold expired) on next app load/interval, releasing the room and promo.
Confirmed: deposit >= CONFIG.depositPct of the (discounted) room charge, or full payment.
Check-in requires: arrival date <= today; room assigned, Clean/Inspected, not Out of Service, not occupied; deposit satisfied; government ID type and number captured (for all sources, not just walk-ins); guest count <= capacity. If the assigned room is not ready, offer Change Room (same type first, then upgrade or downgrade with a rate rule).
Check-out requires balance = 0. Superadmin may override with a mandatory reason (logged in audit). On check-out: status -> Checked-out, room -> Dirty with priority by next arrival, HK task created, loyalty points awarded once, invoice generated, feedback request created, open dine-in tabs for that stay blocked.
Modify dates / guests: re-run availability (excluding self), capacity and promo eligibility; show price difference; require superadmin confirmation or guest acknowledgement; record before/after.
Extend stay and early check-out (recalculate nights; early departure after check-in follows the policy, with no refund of unused nights unless the superadmin overrides).
Cancellation policy (CONFIG): free if >= freeCancelDays before arrival (full refund); else retain first night (cap at amount paid), refund the rest; No-show retains first night. Refund creates a Refund payment with its own OR number; promo redemption is released (usage count decremented); room released.
7.2 Pricing and tax (single engine: PricingService.quote())
Inputs: room type, check-in, check-out, guests, promo code, discount type (Senior/PWD optional). Output: nightly breakdown, subtotal, discount, net total, deposit due, balance, tax breakdown.
Rates are tax-inclusive (current behavior). Tax extraction must be BIR-correct: gross = net x 1.10 (service charge) x 1.12 (VAT on net+SC), so factor = 1.232. Show Net, Service Charge, VAT. Use it everywhere (booking modal, folio, invoice, POS receipt, reports). Totals do not change; only the breakdown does.
Persist a nightly rate snapshot on the reservation so later rate edits never rewrite history.
Optional but recommended: rate rules on a RoomType (weekend surcharge, seasonal date-range override). Quote sums per-night rates.
Promo types: percent and fixed reduce the room charge; folio-credit posts a negative, category Promotion credit that can only offset Dining charges up to its value. One promo per booking (no stacking). Promo usage is consumed only when the booking/order is saved, and released on cancel/void.
Optional Philippine statutory discounts (Senior Citizen / PWD, 20% and VAT-exempt on the discounted portion) for restaurant bills (ID number required) and room folios. If implemented, document the formula in the code and in the SAD.
7.3 Folio and payments
Folio = room charges + posted charges - credits. Balance = total - net payments.
All money movement goes through PaymentService with enum methods: Cash | Credit Card | Debit Card | GCash | Maya | Bank Transfer | Room Folio.
OR numbers: persisted sequential counter, unique across rooms and POS. Refund and void get their own numbers and reference the original.
Overpayment is rejected (or recorded as change for cash). Refund cannot exceed net paid. Voiding a payment requires reason and creates an audit entry.
Online guest payments are simulated but must look real: card form with Luhn check, expiry validation, CVV (never stored), only brand and last-4 stored; GCash/Maya open a simulated confirm sheet; Bank Transfer creates a pending payment awaiting superadmin confirmation.
7.4 Restaurant, POS and kitchen
Order types: Dine-in (table), In-room (checked-in stay only), Takeaway. Menu items that are 86'd cannot be added (enforced in the service, not only the UI). Each line stores a snapshot of price, station and optional note (the UI needs a per-line note input).
Kitchen status (New -> Preparing -> Ready -> Served -> Cancelled) and billing status (Unpaid -> Paid | Room folio | Void) are independent. Billing never alters kitchen status; serving never marks an order paid.
A mixed order creates one KDS ticket per station showing only that station's lines; the order becomes Ready when all station tickets are ready.
In-room dining by a guest: order starts New, bill posts to the room folio when served (or at order time as a pending charge that is voided if cancelled). Cancellation after posting reverses the folio charge.
Dine-in: placing an order sets the table Occupied; settling and serving sets it Needs cleaning; marking clean sets it Free. Table status is derived from reservations, orders and manual overrides, never hand-edited without a log entry.
Dining promo codes apply at bill settlement (and optionally at order time), subject to minSpend; record a PromoRedemption.
Void requires reason; voiding a paid order creates a refund payment.
7.5 Table reservations
Operating hours from CONFIG (06:00-22:00). Slot length 90 minutes; only Pending|Confirmed|Seated block a table. Best-fit assignment: smallest table with seats >= party, preferring the guest's requested area.
Cut-off: no same-day bookings within 60 minutes of the slot. Auto No-show 30 minutes after slot if still Confirmed. Guests can view, modify and cancel their own table reservations in the portal.
Code prefix TRS- (not TBL-).
7.6 Housekeeping and maintenance
Room cleaning states: Dirty -> In progress -> Clean -> (Inspected). A room is sellable/check-in-ready only when Clean or Inspected. Priority is automatic: arrival today = Urgent, tomorrow = High, within 3 days = Medium, else Low; manual override allowed; valid values only Urgent|High|Medium|Low.
Auto-assignment helper: "Assign all unassigned" distributes dirty rooms across active Housekeeping personnel by current workload (round-robin by lowest open count).
Guest housekeeping and maintenance requests have visible status tracking in the Guest Portal.
Maintenance: SLA by priority (Urgent 2 h, High 8 h, Medium 24 h, Low 72 h), overdue badge, optional start/end dates for Out-of-Service. Marking a room out of service with overlapping future reservations opens a Relocation dialog listing each affected booking with suggested rooms (same type, then adjacent type); the action cannot complete until resolved or explicitly overridden with a reason. Resolving a ticket returns the room to Dirty (HK), never straight to Available.
7.7 Loyalty
One function computes tier from completed nights (Checked-out). Thresholds come only from CONFIG.loyalty. Points earned once per completed stay (and optionally on dining spend), idempotent (cannot double award). Redemption creates a Voucher record (code, status, expiry) visible to the guest and redeemable by the superadmin at the front desk/POS; tier perks that can be automated (dining discount %, late check-out eligibility) are applied and shown on bills.
7.8 Messaging, inquiries, feedback
Threads belong to a guestId. Unread counters work in both directions and the guest portal shows the badge (gpMsgBadge exists and is never filled).
Inquiries get an internal reply log, status flow New -> In progress -> Resolved, assignment to Personnel, canned replies, and "Convert to reservation" / "Convert to message thread".
Feedback: guests rate overall plus the five categories (cleanliness, staff, comfort, dining, value) with star widgets (use [ICON: star-filled] / [ICON: star-empty]), one per completed stay. Ratings of 2 or below auto-create a follow-up task/notification. Published reviews appear on About; unpublishing removes them immediately.
8. ALGORITHMS TO IMPLEMENT OR REPAIR
8.1 Availability and room assignment

freeRooms(type, in, out, excludeCode): exclude rooms with overlapping non-cancelled/non-checked-out reservations, rooms Out-of-Service during any overlapping date (respect from/to dates), and rooms not ready when in <= today. Add assignRoom() that prefers (1) the guest's requested room or floor, (2) a room that does not split a longer free block (minimize fragmentation), (3) lowest number. Re-check availability inside createReservation within the transaction (race with another tab).

8.2 Quote

quote(typeId, in, out, guests, promoCode, discountType), deterministic and pure, used by every screen. Unit-testable from the console (Tests.run()).

8.3 Table assignment (Section 7.5), best-fit with 90-minute collision test; waitlist optional.
8.4 Housekeeping priority and workload balancing (Section 7.6).
8.5 Hold expiry

On load and every 60 s: expire Pending reservations past holdExpiresAt; auto No-show; auto table No-show; recompute notifications. All logged to audit as actor System.

8.6 Metrics (single ReportService; Dashboard, Reports and Payments must reconcile)
Available room-nights = (active rooms - OOO rooms) x days.
Occupancy % = occupied room-nights / available room-nights (count only nights up to today for "realized"; show "on the books" separately for future).
ADR = room revenue / occupied room-nights. RevPAR = room revenue / available room-nights.
Room revenue = recognized nightly rates (net of promo), prorated by date range.
F&B revenue = all non-void orders by date, split by settlement (Paid vs Room folio), including room-billed dining.
Collections = sum of payments minus refunds by date and method. Outstanding = open folio balances.
Dashboard "In-house guests" = sum of guests across Checked-in stays (rooms occupied shown separately).
Reconciliation check (shown in Reports and in tests): total collections = payments ledger = sum of payment lines on folios + POS payments.
8.7 Notifications

ID-based with read state per notification. Sources: unread messages, new inquiries, unpaid deposits, hold expiring soon, arrivals today, departures today (not yet checked out after 12:00), urgent HK, overdue maintenance, new orders, low rating feedback, new table reservations pending. Every notification links to a working deep link.

8.8 Sequences and IDs

Persisted counters in a meta store for HTL, ORD, OR, TRS, MNU, MSG, INQ, HKR, MNT, FB, VCH, GST, LOY, TYP, audit. No Date.now() IDs.

9. ADMIN MODULE SPECIFICATIONS (every item below must work end-to-end)

For every module also provide: search, relevant filters that persist across data refreshes, column sorting where tabular, pagination, empty state, CSV export of the filtered view, inline validation, confirm modal (no native confirm()), toast feedback, audit logging with before/after, deep-link parameters, and keyboard accessibility.

Dashboard - Quick actions (New Reservation, New POS Order, Register Guest, Table Seating, Housekeeping, Maintenance) all work. KPIs: arrivals, departures, in-house guests and rooms, occupancy %, dining sales (paid and room-billed, separated from unpaid). Today's lists with inline actions (Check-in, Collect deposit). Attention banner with working filtered links (?status=Pending, etc.). Revenue chart: local dates, weekly/monthly toggle with visible active state, tooltips, reconciles with Reports. Month calendar highlights today, shows arrivals/departures/stays per day, and clicking a day opens that day's list. Recent bookings sorted by creation; activity feed from audit.
Reservations - Ledger (search, status, date range, source, sort, pagination, export) and calendar (Month, Week, Agenda) plus a room-by-date availability grid (tape chart). Create (staff-assisted/walk-in with ID capture, room assignment, promo, payment option), view detail, confirm, check-in (with ID capture and room-ready checks), change room, modify dates/guests, extend, early check-out, check-out, cancel (refund preview), mark no-show, print registration card and invoice, folio. Deep links: ?code=, ?new=1&guest=&phone=&room=, ?status=.
Guests (CRM) - Directory in Profiles/Cards/Table views, register, edit, VIP flag, notes/preferences, merge duplicates, archive instead of delete (blocked if the guest has an active stay), loyalty adjust with reason (logged), stay history, dining history, messages, feedback, walk-in check-in routed through ReservationService (single flow). Tier shown consistently with Section 7.7.
Housekeeping - Room turnover matrix, guest request queue (create, assign, start, done, delivered), priority override, bulk assign, status timeline per room, filters by floor/condition/priority/staff, printable daily assignment sheet.
Maintenance - Work orders CRUD, SLA and overdue, OOS with date range and relocation workflow, assignment to Personnel, notes/costs optional, history per room, reopen/resolve with housekeeping hand-off, deep link ?id=.
Orders (POS) - New order (table / in-room / takeaway) with per-line notes, edit/add items, fire to kitchen, split by item or equal split optional, discount (promo / senior-PWD), settlement (cash with tendered/change, card, e-wallet, room folio), void with reason, reprint receipt (BIR-style, one tax function), table linkage, deep link ?code=. Payment method must actually be stored and reflected in Payments.
Kitchen (KDS) - Per-station tickets, color-coded age timers (<10 min neutral, 10-20 amber, >20 red) updated in place without full re-render, new-ticket highlight (no sound required; a visual flash), recall, per-line done, cancel with reason, quick "86 this item", average prep time stat.
Tables - Floor plan CRUD (add/edit/disable tables and areas; the "Bar Lounge" filter currently has none), derived live status, reservation list with Confirm, Seat, Complete, Cancel, No-show, staff-created reservations, walk-in seating that opens a dine-in order, timeline of today's bookings per table.
Menu Management - Item CRUD, categories CRUD, 86 toggle, station, tags, duplicate-name validation, archive (never hard-delete items used in orders), [IMAGE: …] placeholder retained on public cards, bulk price update with preview, changes reflect instantly on the public menu and POS.
Messages - Two-pane inbox that keeps focus while typing, staff-initiated threads (?new=1&guest=), assign, resolve/reopen, quick replies, link to reservation, unread counts both ways.
Inquiries - Queue with ?ref=, in-app reply log plus the existing mailto: helper, canned responses, convert to reservation or thread, assignment, SLA indicator against CONFIG.responseTime.
Feedback - Moderation (publish/unpublish), reply, category analytics, trend by month, low-rating follow-up task, per-stay link.
Payments - Unified ledger of Room and POS payments with correct method filtering, OR search, reprint receipt, refund and void flows, pending bank transfers to confirm, deposit follow-up list, folio list with aging, daily cashier report (end-of-shift/Z-report) with cash expected vs counted, print/CSV.
Reports - Date presets plus custom range, correct metrics (Section 8.6) with realized vs on-the-books, charts (daily revenue, occupancy trend, revenue mix, payment-method mix, top dishes, source mix, cancellation/no-show rate, loyalty tier distribution) built as inline SVG, comparison with previous period, CSV and print-to-PDF, reconciliation panel.
Rooms - Inventory CRUD with floor and notes, derived status, bulk add by range, OOS toggle through the maintenance workflow (never bypass it), history, deep links ?room= and ?type=.
Room Types - CRUD, rate rules (weekend/seasonal), capacity, amenities, [IMAGE: …] placeholder retained, safe rate change (affects only future quotes), delete blocked with explanation, stable IDs.
Promotions - CRUD with valid-from/valid-to fields (currently missing in the UI), type percent|fixed|folio-credit, eligibility rules, usage tracking from PromoRedemption, status labels Scheduled/Active/Expired/Exhausted/Disabled, preview of the effect on a sample booking/bill, value limits (percent <= 100).
Personnel Directory (replaces "Staff & Admins") - Personnel CRUD (department, shift, phone, active, no passwords), tasks per person, safe deactivate/delete; plus My Account for the Superadmin (change name/email/password with hashing and strength rules).
Audit Log - Append-only list with actor type (Superadmin/Guest/System), entity deep link, before/after diff, date-range filter, export, optional hash chain for tamper evidence. Reset-demo is the only destructive action and is itself logged elsewhere (separate system event).
NEW: Hotel Settings (add to the Settings group) - Edit CONFIG values persistently (hotel details, hours, tax %, deposit %, cancellation days, loyalty tiers/rewards, policies, amenities, Wi-Fi); Demo Tools: reset to seed, load named scenarios (Busy Weekend, Check-out Day, Kitchen Rush, Maintenance Conflict), export/import full JSON backup.
10. GUEST-FACING SITE AND PORTAL
Public pages: home, rooms-deals, menu, about, contact, terms, privacy. Availability search must carry dates and guests through every link; capacity warnings; "Claim Offer" opens the booking with the promo preloaded and validated; table reservation form requires sign-in but preserves the entered data across login (existing intent mechanism, keep it and add expiry feedback).
Booking modal: one component for guest and staff modes. It must show the quote from PricingService, validate everything inline, never record unreceived money as paid (Section 5.1 #12), handle availability races gracefully, and finish with a confirmation that offers invoice download/print.
Guest Portal tabs: Current Stay, My Reservations, My Table Reservations (new), My Orders (new: status tracking New -> Preparing -> Ready -> Served), Requests (housekeeping/maintenance with status), Loyalty & Vouchers, Messages (unread badge), Profile (writes to the one canonical guest record; email change requires re-verification; name change keeps guestId).
Express check-out goes through ReservationService.checkOut. Late check-out request flow (guest requests, superadmin approves/declines, message sent automatically).
Concierge widget: works for visitors (anonymous thread tied to a visitor ID, clearly labeled) and guests; shows Wi-Fi only to guests with an active stay.
Login page: Sign In, Create Guest Account, Find Booking; real "Forgot password" (simulated email shown in a modal with a one-time token and expiry); account lockout after 5 failed attempts for 5 minutes; staff section of the login (superadmin) is the same form but routes by role.
11. UI/UX REQUIREMENTS (system-wide)
Build js/ui.js shared components, using existing classes: pageHeader(), kpiCard(), statusPill(status) (one mapping for all statuses), dataTable({columns, rows, sort, page, empty, exportCols}), filterBar(), confirmDialog() (Promise based, replaces native confirm), formField() with inline errors, emptyState(), skeleton rows while computing, tabs().
Remove repeated inline styles by promoting them to classes in site.css (use the existing .page-head, .kpi-card, add .kpi-grid, .toolbar, .split etc.). Fix the undefined tokens (--shadow-sm, --shadow-md), define .btn-secondary.is-active (and use .is-active consistently), and make responsive grids class-driven so they collapse at <= 900 px.
Preserve filter state, scroll position and focus across re-renders (render only the changed region or restore state).
Every action gives feedback: loading/disabled button state, success toast, error banner with a reason, and idempotent double-click protection.
Forms: label association, required, min/max, input types, PH mobile format helper, inline error text, first-error focus, Enter-to-submit, Escape-to-close modals (already present, keep focus trap).
Accessibility: visible :focus-visible, aria-live toasts, table scope, color is never the only status signal (pill text is already present, keep it), minimum 44 px touch targets on the KDS, respects prefers-reduced-motion (already present, keep).
Responsive checks at 360, 768, 1024 and 1440 px for every page. Admin sidebar becomes a drawer (verify the backdrop does not block clicks).
Consistent microcopy and Philippine formats: ₱, Oct 9, 2026, 12-hour times, +63 / 09 mobile numbers.
Print styles for invoice, folio, registration card, POS receipt, daily cashier report, housekeeping sheet (build on the existing print CSS).
Keep all [ICON: …] and [IMAGE: …] placeholders exactly as the convention in Section 3.
12. CROSS-MODULE INTEGRATION MATRIX (each row needs a test)
Event	Required effects
Reservation created	availability re-check, room held, guest ensured, folio opened, promo redemption, deposit/hold rules, notification, audit
Deposit paid	payment + OR, status Pending -> Confirmed, hold cleared, notification cleared
Check-in	ID captured, room Occupied, HK verified Clean, guest portal unlocks dining/housekeeping, welcome message
Dine-in order placed	table Occupied, KDS ticket(s), notification
Order served + paid	table Needs cleaning, payment/OR, revenue in Reports and Dashboard
Order charged to room	folio charge, linked to order, reversal on void
Check-out	balance 0 (or override), room Dirty + HK task, loyalty once, invoice, feedback invitation
Cancellation	policy refund + OR, room released, promo released, audit
Maintenance OOS	availability blocked for the date range, relocation of affected bookings
Maintenance resolved	room -> Dirty -> HK -> Clean -> sellable
Menu item 86'd	removed from public menu, POS, guest portal; existing orders unaffected
Promo disabled/expired	cannot be applied; past redemptions preserved
Feedback <= 2 stars	follow-up notification/task
Guest profile edit	single source updates admin CRM and portal; loyalty and reservations stay linked
13. SECURITY AND INTEGRITY (demo-appropriate but real)
Hash passwords with a bundled pure-JS SHA-256 (salted per user, iterated several thousand times in a loop, synchronous or chunked so the UI does not freeze). Do not rely on crypto.subtle (see 6a). Seed accounts ship with precomputed salt+hash constants; migrate legacy plaintext values on first login.
Constant-time compare, lockout after repeated failures, password policy (>= 8 chars with mixed types), idle timeout, safe ?next= handling (Section 5.1 #9).
Escape all user content via esc() before inserting HTML (audit every template, including values used inside inline onclick attributes; prefer event delegation with data-* attributes over string-built handlers, and fix names containing quotes).
Demo credentials panel (decision: keep it for the defense). It stays on the login page with one-click buttons for the Superadmin and a sample Guest, but only while CONFIG.demoLogins === true (default true), labeled "Demo accounts, for demonstration only". Hotel Settings has a "Hide demo logins" switch, and the docs tell the presenter to switch it off to show the "production" login. The Superadmin demo button must not be rendered at all when the flag is false (not merely hidden with CSS).
Write a short "Security notes" section in the docs explaining what a production deployment would do differently (server-side hashing, HTTP-only cookies, RBAC middleware, database transactions).
14. DOCUMENTATION DELIVERABLES (for the Systems Analysis and Design defense)

No course documents exist yet, so you create all of them from scratch, derived from the final code (not the other way round). Create a docs/ folder with Markdown plus Mermaid diagrams (or text-based diagrams) that match the final code. Because the team has extra time, produce every optional item in this prompt (rate rules, availability grid, statutory discounts, hash-chained audit log, cashier Z-report) and document each one:

System Overview and Scope (problem, objectives, users, assumptions, out-of-scope).
Requirements: functional (numbered FR-###) and non-functional, with priority.
Use case diagram and use case descriptions for Guest, Superadmin and System (timer jobs).
Context diagram and DFD Level 0 and Level 1 (reservation, check-in/out, folio and payments, restaurant/POS/kitchen, housekeeping/maintenance, communications, reporting).
ERD (from Section 6.2) and a data dictionary.
Class diagram (services and entities) and sequence diagrams for: online booking, check-in, in-room dining, check-out and payment, cancellation and refund.
State diagrams: reservation, room, order, table, maintenance ticket.
Business rules catalogue (BR-###, from Section 7) mapped to the code location that enforces each.
UI map and navigation flow, role/access matrix.
Test plan and traceability matrix (requirement -> test case -> result) plus the scenario script in Section 15.
Defense demo script (10-minute walkthrough in order) and a Known limitations / future work page.
15. TESTING AND ACCEPTANCE

Provide a console-runnable Tests.run() (or ?selftest=1) that executes pure logic tests (pricing, tax, cancellation, availability, table assignment, OR sequence, state machine, metrics reconciliation) and prints pass/fail. Then verify these end-to-end scenarios manually and list results in docs/:

Visitor browses, searches dates, picks a room, is asked to sign in, registers, and the booking resumes automatically with the promo applied.
Guest pays a card deposit (Luhn-validated), receives a unique OR and a confirmation; a second guest tries the same room/dates in another tab and is blocked.
Online booking with Cash deposit stays Pending with a hold timer; the hold expires and the room is released.
Superadmin (in a second tab, simultaneously) sees the booking appear live, checks the guest in (ID captured, room must be Clean), and fails correctly when the room is Dirty (Change Room works).
Checked-in guest orders in-room dining; the ticket shows up in the KDS at the right station(s); kitchen advances it; the folio charge appears; the guest sees status updates in My Orders.
Walk-in diners: table assigned best-fit, dine-in order, kitchen, settle with GCash, OR printed, table cycles Occupied -> Needs cleaning -> Free.
Maintenance marks a room OOS while a future booking exists; relocation dialog resolves it; availability updates on the public site.
Guest cancels inside and outside the free-cancellation window; refund amounts, OR numbers and audit entries are correct.
Checkout with unpaid balance is blocked, paid via the Payments terminal, completed; room becomes Dirty, HK task appears, loyalty points awarded once, invoice prints, feedback invite appears; guest submits a 2-star review, which creates a follow-up and stays unpublished until moderated.
Reports and Dashboard totals reconcile with the Payments ledger for any date range (shown in the reconciliation panel); CSV exports match on-screen values.
Guest tries to open an admin URL and gets Access Denied; a visitor is redirected to login and, after login as superadmin, to the original page; a malicious ?next= is rejected.
Refresh any page mid-flow: filters, tabs and session are preserved; an upgrade of schema version keeps all existing data.
16. WORK PLAN AND OUTPUT FORMAT

Cursor workflow: this file is saved in the repo as docs/MASTER_PROMPT.md. The persistent rules live in .cursor/rules/pupsj.mdc. Each phase is run with its own short prompt from PUPSJ_phase_prompts.md that points back to the relevant sections here. Start every phase in a fresh chat, reference @docs/MASTER_PROMPT.md and only the files that phase touches, and commit to git after each phase so you can roll back.

Work in these phases. At the end of each phase, stop and report: files changed, defects closed (by number from Section 5), anything deferred, and how to verify.

Phase 0 - Audit: read every file, confirm or refute each defect in Section 5 (cite file and function), list additional defects, and propose the final folder/file plan. Do not edit yet.
Phase 1 - Foundation: store + transactions + sequences + migrations, services skeleton, validators, event bus + cross-tab sync, auth (two roles, hashed passwords, sessionStorage, guards), PricingService, unified Payment, config persistence.
Phase 2 - Domain rules: reservation state machine, availability/assignment, folio, payments/OR, promos, restaurant/POS/kitchen/tables, housekeeping/maintenance, loyalty/vouchers, notifications, hold expiry jobs, metrics.
Phase 3 - Admin modules: implement Section 9 module by module (dashboard first, then reservations, guests, rooms/types, housekeeping, maintenance, orders/kitchen/tables/menu, messages/inquiries/feedback, payments/reports, promotions, personnel/account, audit, settings).
Phase 4 - Public site and Guest Portal: Section 10 plus the booking modal unification.
Phase 5 - UI/UX polish: Section 11 across all pages, responsive and print checks, cleanup of inline styles and duplicate code.
Phase 6 - Docs and tests: Section 14 and 15, final regression pass.

Output rules:

Provide complete file contents for every new or changed file (no "..." elisions inside code), grouped by phase and clearly titled with the file path.
Keep ES5/ES2020 browser-compatible vanilla JS, 'use strict', IIFE or namespaced modules, no globals beyond a small documented set.
Maintain a running CHANGELOG.md (what, why, defect number) and a docs/BUSINESS_RULES.md that cites the enforcing function for each rule.
If something is ambiguous, choose the behavior of a real PMS/POS, note the assumption in the changelog, and continue. Do not stop to ask unless a decision would delete data.
17. DEFINITION OF DONE
Every defect in Section 5 is fixed or explicitly justified.
No dead button/link/filter/tab in any page; every module in Section 9 satisfies its function list.
Guests cannot reach admin pages; admin and guest can run in separate tabs at the same time with live updates.
Money, rooms, tables and orders are consistent everywhere (the reconciliation panel and integration matrix pass).
Native confirm() and alert() are gone; all destructive actions use the app modal with audit entries.
All original [ICON: …], [IMAGE: …], [PLACEHOLDER: …] text is still present, and new UI follows the same convention.
docs/ is complete and matches the code; Tests.run() passes; the 12 scenarios in Section 15 pass.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-09T15:04:54+08:00.

The user's current state is as follows:
Active Document: c:\Users\reche\OneDrive\Documents\SAD_UI\index.html (LANGUAGE_HTML)
Cursor is on line: 1
Other open documents:
- c:\Users\reche\OneDrive\Documents\SAD_UI\index.html (LANGUAGE_HTML)
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Gemini 3.8 Flash (High). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>