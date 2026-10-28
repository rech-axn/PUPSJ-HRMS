# PayMongo test setup for PUPSJ-HRMS

The application already creates hosted checkout sessions for **QR Ph** and **debit/credit cards**. Cash is recorded by staff. Bank transfer is no longer offered. Live keys and live webhook events are deliberately rejected in this training system.

1. Create or sign in to your PayMongo account. Complete the account requirements shown in its dashboard. Switch to **Test mode** and open **Settings → Developers** to obtain a test secret key (`sk_test_...`). Never put this key in browser JavaScript, Git, screenshots, or chat.
2. Set `PAYMONGO_SECRET_KEY` privately in the project `.env`. There is no browser field for secret keys.
3. For webhook testing, run the application on a public HTTPS test address, or use an HTTPS development tunnel intentionally. PayMongo cannot call `http://localhost/...` on your computer. Preserve the application base path when configuring a tunnel. Set `APP_URL` to the actual externally reachable base URL.
4. In the PayMongo test dashboard, register an enabled webhook at `<APP_URL>/webhooks/paymongo` and subscribe to **checkout_session.payment.paid**. Store its signing secret privately as `PAYMONGO_WEBHOOK_SECRET` in `.env`.
5. Run `C:\xampp\php\php.exe artisan config:clear` from the project folder. Restart your application server if its environment was already loaded. Use **Booking and payment tools → Check connection settings** to check configuration without exposing keys.
6. Make a sample reservation and select QR Ph or debit/credit card. The backend creates the checkout session and redirects to PayMongo's hosted page. Follow PayMongo's test-mode payment instructions; do not use real financial information for this laboratory system.
7. Check the webhook delivery and local payment record. The handler verifies the signature, test mode, session identity, currency, amount, and duplicate events. A success redirect alone never means paid. Retries must not create duplicate receipts.
8. Verify an unsuccessful/cancelled checkout, a duplicate paid webhook, and a restaurant payment separately. Resolve pending/review checkouts before closing the relevant department's business date. A dashboard sample event with an unknown session must be rejected by the application; use an actual application-created test session for the complete test.

**Current limitation:** no PayMongo account keys were supplied. The application integration is implemented and covered by mocked provider tests; a real PayMongo test checkout and public-webhook round trip still require account configuration. No public tunnel or live payment was enabled.

Official references, checked 18 October 2026:

- [Hosted Checkout quick start](https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start)
- [Webhook testing](https://docs.paymongo.com/docs/webhook-testing)

# Approved training prices and rules

Buffet breakfast is ₱450 per selected person per night, including children at the same training rate. It is an optional booking addition. Suggested daily selection: garlic/steamed rice, eggs, beef tapa or chicken adobo, vegetables, seasonal fruit, pastries, coffee, tea, water, and juice. This uses components familiar from the restaurant breakfast menu; it does **not** include every restaurant dish. Restaurant staff may rotate dishes. Plated in-room meals are separate restaurant orders at their listed prices, charged directly or once to an active folio.

Family Suite includes four guests and permits one extra at ₱800/night. Standard: two guests, one queen bed; Deluxe City View: two guests, two twins, one optional paid extra; Executive Suite: three guests, king and single sofa bed, one optional paid extra. These are editable training configurations, not measurements verified against a physical hotel. All adults and children count toward room capacity.

Rooms 101, 102, 201, and 202 are designated accessible training rooms with accessible bathrooms on floors 1–2. Booking checks this smaller inventory separately; the room number is assigned at arrival. Other rooms of the same type are not automatically accessible. The administrator can edit each room's actual flags and floor under Booking and payment tools.

WELCOME10 offers 10% off accommodation for the first non-cancelled booking. Staff may issue a private guest-bound code (default 5%, up to 10% front desk or 20% administrator), valid up to three months and usable for one booking. Full payment at least seven days before arrival earns 5% off accommodation; a deposit alone does not qualify. Benefits do not stack. Taxes, breakfast, and services are not discounted by these accommodation offers. The quoted full-payment amount already reflects an eligible advance benefit; the system awards it only after sufficient verified payment is posted. Existing historical booking prices were not rewritten.

Before final hotel settlement/checkout or restaurant settlement, staff present the current statement and record the guest/representative's acknowledgment. The system stores the name, staff ID, timestamp, and a fingerprint of current charges. Editing charges invalidates the acknowledgment. Printed statements retain a signature line; this is a staff-recorded acknowledgment, not a digital signature capture.

Restaurant Night Audit has a separate business date, cash reconciliation, room-charge total, pending checkout checks, and closing history. It does not post hotel accommodation charges or close the hotel date. Closing is an explicit staff action; deployment does not automatically close historical dates.
