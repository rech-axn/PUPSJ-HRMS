# PUPSJ Hotel & Restaurant — Asset Icon System

All icons in the system are rendered via the unified `.ic` class and `data-icon="NAME"` attribute, bound directly to asset PNG images in `assets/icon/`:
`<span class="ic" data-icon="NAME" aria-hidden="true">[ICON: NAME]</span>` or the JavaScript helper `ico('NAME')`.

The brand mark is bound to `assets/logo/pupsj-mark.png`.

### Implementation Specification
- **Directory:** `assets/icon/*.png` (45 asset icon files, 24×24 px outline style)
- **Brand Logo:** `assets/logo/pupsj-mark.png`
- **CSS Engine:** In `css/site.css`, `.ic` renders the asset icon with `background-image: url('../assets/icon/NAME.png')` while visually hiding the fallback placeholder text.
- **Contextual Sizing:** Automatically sized per container (14px in buttons, 18px in navigation, 24px in hero chips).

---

### Placeholder Mapping & Usage Directory

| Icon Name | Category | Primary Usage Locations | Suggested Icon Graphic |
|---|---|---|---|
| `dashboard` | Navigation | Staff Sidebar: Dashboard | 4-square grid / dashboard meter |
| `bed` | Navigation / Domain | Staff Sidebar: Reservations, Room Types | Hotel bed outline |
| `users` | Operations | Staff Sidebar: Guests, Table Seating | Dual user silhouettes |
| `user` | Auth / Account | Top Bar User Menu, Guest Profile | Single user silhouette |
| `broom` | Operations | Staff Sidebar: Housekeeping, Room Turnover | Housekeeping broom / duster |
| `wrench` | Facilities | Staff Sidebar: Maintenance, Work Orders | Spanner / wrench |
| `utensils` | Restaurant | Staff Sidebar: Menu Management, Dining | Fork and knife crossed |
| `table` | Restaurant | Staff Sidebar: Tables, Floor Plan | Restaurant dining table |
| `tray` | Restaurant | Staff Sidebar: Orders POS, Room Service | Covered service cloche / tray |
| `kitchen` | Restaurant | Staff Sidebar: Kitchen Display (KDS) | Chef hat / cooktop burner |
| `receipt` | Finance | Payments Ledger, POS Billing | Paper transaction receipt |
| `wallet` | Finance | Staff Sidebar: Payments, Folio Summary | Bi-fold wallet |
| `chart-bar` | Reports | Staff Sidebar: Reports, Performance | Vertical bar chart |
| `chart-line` | Reports | Reports: Revenue over time | Trendline chart |
| `document` | Records | Reservations Ledger, Invoices | File document with lines |
| `key` | Rooms | Staff Sidebar: Rooms Inventory, Wi-Fi | Room key outline |
| `settings` | System | Operations Configuration | Cogwheel / gear |
| `bell` | Notifications | Staff Topbar: Live Notifications Bell | Notification alert bell |
| `search` | Utility | Staff Topbar: Global Search, Filter inputs | Magnifying glass |
| `mail` | Inbox | Staff Sidebar: Inquiries Queue, Contact form | Sealed postal envelope |
| `message` | Inbox | Staff Sidebar: Messages, Concierge Chat | Speech bubble |
| `star-filled` | Feedback | Guest Reviews (active score), About page | Solid 5-point star |
| `star-empty` | Feedback | Guest Reviews (unselected score) | Hollow/outline 5-point star |
| `calendar` | Booking | Check-in/out pickers, Reservations calendar | Date calendar with grid |
| `clock` | Operations | Check-in/out hours, Kitchen age timers | Clock face with hour/min hands |
| `phone` | Contact | Header, Contact page, Guest details | Telephone handset |
| `map-pin` | Location | Address details, Google Map block | Geographic location marker pin |
| `car` | Amenities | Hotel parking amenity card | Compact car outline |
| `wifi` | Amenities | Guest portal Wi-Fi credentials, Amenities | Wireless signal waves |
| `pool` | Amenities | Hotel amenities list | Water waves / pool ladder |
| `spa` | Amenities | Wellness amenities list | Lotus flower / wellness droplet |
| `dumbbell` | Amenities | Fitness center amenity | Barbell / dumbbell |
| `concierge-bell`| Service | Floating Concierge Widget trigger | Service counter call bell |
| `chevron-down` | Controls | Select inputs, Collapsible accordions | Downward arrow chevron |
| `chevron-right`| Controls | Table row navigation, Breadcrumbs | Right arrow chevron |
| `chevron-left` | Controls | Calendar pagination, Stepper back | Left arrow chevron |
| `close` | Modals | Modal dialog close, Toast dismissal | Cross mark (`X`) outline |
| `plus` | Actions | Add Reservation, Add Room, Add Dish | Plus / addition sign |
| `edit` | Actions | Edit Room, Edit Profile, Edit Menu | Pencil / notepad edit |
| `trash` | Actions | Delete Room, Delete Staff account | Wastebasket / trash bin |
| `print` | Utility | Official Tax Invoice, Reports PDF print | Office desktop printer |
| `download` | Utility | Export CSV buttons across all tables | Tray with downward arrow |
| `check` | Feedback | Success states, Order completed | Checkmark tick |
| `alert` | Feedback | Warning banners, Pending deposit alerts | Exclamation inside triangle |
| `info` | Feedback | Information tooltips, Demo notices | Letter 'i' inside circle |
| `logout` | Auth | Staff Topbar & Guest Portal Sign Out | Door with exit arrow |
| `tag` | Promotions | Staff Sidebar: Promotions & Deals | Price tag / promotional voucher |
| `gift` | Loyalty | Guest Portal: Loyalty Rewards | Gift box with ribbon |
| `shield` | Security | Staff Sidebar: Staff & Admins | Security badge / shield |
| `credit-card` | Payments | POS Terminal, Booking payment selector | Credit card outline |
| `qr-code` | Payments | Maya / GCash payment simulated modal | 2D QR matrix |
| `cash` | Payments | Front Desk cash payment method | Banknote bill |
| `bank` | Payments | Bank wire transfer payment option | Bank pillars façade |
| `menu` | Navigation | Mobile navigation drawer toggle (<900px) | 3-line hamburger menu |
| `eye` | Utility | View Details, Password peek | Eye outline |
| `filter` | Tables | Table filters, Category selection | Funnel filter outline |
| `sort` | Tables | Sortable table column headers | Dual ascending/descending arrows |
| `history` | Operations | Staff Sidebar: System Audit Log | Clock with counter-clockwise arrow |
| `home` | Navigation | Public Top Navigation: Home | Building / house roof |
| `refresh` | Actions | Reset Demo Data, Refresh KDS Board | Circular arrows loop |
| `external-link`| Navigation | Open Invoice in new print window | Box with diagonal outbound arrow |
| `more` | Controls | Additional row actions menu | Horizontal triple dots |
| `lock` | Security | Password input adornment | Padlock closed |
| `flag` | Operations | Housekeeping urgent priority marker | Flag on flagpole |
| `clipboard` | Settings | Staff Sidebar: Room Types | Clipboard with paper sheet |
| `inbox` | Operations | Messages & inquiries aggregation | Desktop inbox tray |
