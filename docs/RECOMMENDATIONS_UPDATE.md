# Practitioner and panel recommendations

## Application boundary

Laravel 12, Blade, PHP and MariaDB/MySQL replace the localStorage prototype. Four main actors remain Guest, Hotel Staff, Restaurant Staff and Administrator. The administrator has access to staff operations as described in the latest paper. Housekeeping is a Hotel Staff assignment. Restaurant POS is not available to front-desk accounts.

The original prototype files and SQL database were backed up before conversion. Prototype browser records are not automatically trusted or imported into server accounts or financial records.

## Implemented workflows

- Adults and children are recorded separately and both count toward capacity. Room types configure included capacity, zero or one extra guest and the extra-person rate. The suggested four-plus-one policy can be configured per room type rather than imposed on smaller rooms.
- Bed descriptions, room-type photos, accessible-room and accessible-bathroom fields are managed by administrators. Accessibility must reflect the actual training scenario; enabling a field does not establish physical compliance.
- Book a room type and allocate inventory across the full stay. Physical room numbers are not chosen or exposed through public availability. Hotel Staff assign a ready physical room on an eligible arrival date. Old bookings with room assignments retain their data.
- Optional None/Buffet/Plated breakfast, paid breakfast head count and per-night prices.
- Public promotions and private code-only accommodation discounts with validity dates. No stacking of senior/PWD and promo discounts.
- Optional deposit, remaining balance, and separately configured advance-payment benefit. The benefit is awarded once after qualifying pre-check-in payment; it can create a refundable credit if the guest paid the original full amount. All configured rates are training policy values, not statutory determinations.
- Required valid guest email on every booking channel, personalized confirmation records, reminders, room-assignment notice and special-request availability disclaimer. Local mail logging is the default; delivery requires SMTP configuration.
- Configurable parking capacity and outside-food policy. Parking is not automatically guaranteed by a room booking.
- Guest request submission, Hotel/Restaurant routing, progress and resolution history.
- Restaurant table inventory, orders, room-service destination, delivery status, unpaid item changes and voids with reasons. Posted/settled items cannot be silently edited.
- Cash collection, PayMongo test checkout for hotel bills and restaurant orders, one-payer allocation across multiple room folios, and traceable eligible deposit/credit transfers. Transfers are not new cash collections.
- Statement of account, separate payment references and acknowledgment signature field. Statements do not claim to be certified tax invoices or proof of payment. Company name is supported; source financial records are not removed for company bookings.
- Hotel and Restaurant business dates, cash-count reconciliation, unpaid restaurant and pending gateway checks, unique closing records, and next-date advancement. Posting to a day that has already closed is blocked. Accommodation is charged in full at booking in this implementation, so night audit must not post room-night charges again.
- Audit history records actor, amount and posting location/reference. Refunds and posted corrections must retain source history.

## PayMongo setup and limits

Only `sk_test_` API keys are accepted. Set PAYMONGO_SECRET_KEY and PAYMONGO_WEBHOOK_SECRET privately in `.env`, clear configuration cache, and register the publicly reachable HTTPS endpoint `/webhooks/paymongo` for checkout paid events in test mode. QR Ph and cards must be available on the test account.

Checkout creation uses server-derived amounts. Verified HMAC signatures, test-mode enforcement, amount/currency/session/reference matching and idempotent payment recording are implemented. A success redirect is never payment confirmation. Staff can inspect checkout history and request provider reconciliation; an ambiguous session without a provider ID requires dashboard investigation rather than a blind retry.

The integration is covered by mocked API and signed-webhook tests. It has not been exercised with the user's real PayMongo test account because no credentials were supplied. Complete the provider test checklist before claiming account-level integration works. Live payments are deliberately disabled.

Sources: https://docs.paymongo.com/docs/payment-channels-hosted-checkout and https://docs.paymongo.com/docs/developer-tools-webhook-setup-management

## Chatbot

The local classifier is multinomial Naive Bayes, trained by `php artisan chatbot:train`. It learns from 78 authored examples across 13 intents, while answers come from approved templates and configured policy. It does not read private guest financial records, alter bookings, or accept payment instructions. Uncertain questions refer the guest to the request panel or staff.

The 26-question authored evaluation set was used during development; its current result is recorded in `resources/chatbot/evaluation-report.json`. It is not a blind or independently validated benchmark. Obtain unseen questions from intended users and report intent accuracy, fallback rate, and wrong-answer rate before claiming classroom effectiveness. No actual classroom evaluation results are invented.

## Items requiring final policy or account decisions

- Actual breakfast, extra-person and advance-payment rates, promo conditions and parking capacity.
- Legally applicable senior/PWD and tax treatment, eligibility and document requirements. Defaults are zero until approved; do not claim a statutory computation from the configurable training percentages alone.
- Clarification of 'remove official tax folio for company reservation'. This version uses a training statement and retains company-linked financial history.
- Clarification of 'transient is staff assigned'. Walk-in registration and room assignment are staff actions.
- Delivered emails, PayMongo test credentials and HTTPS callback address.

## Verification

Use `php artisan test`. Tests run on an isolated SQLite in-memory database. Legacy kiosk/OCR and points tests are retained as skipped because those routes and loyalty discounts are outside the revised active flow. Do not use `migrate:fresh` against the working database.


## Vite frontend update

The active CSS, images and JavaScript now pass through Vite. Blade uses `@vite`, with the shared API and chatbot loaded before page-specific modules. Staff modules were combined into a shared scope to preserve their internal functions. Canonical source lives in resources; old static public JS/CSS copies are no longer referenced by active views.

Verified `npm ci`, `npm run build`, and `npm run dev` in the XAMPP project. Browser checks exercised the restaurant order form and chatbot in both Vite dev mode and built-asset mode without JS/API errors. The application is left in built-asset mode for normal XAMPP use. The Laravel regression suite remains at 45 passing active tests and five retired-flow skips.
