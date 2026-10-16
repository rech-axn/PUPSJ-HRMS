# PUPSJ Hotel & Restaurant Management System

Laravel 12 and MariaDB/MySQL training application with Guest, Hotel Staff, Restaurant Staff and Administrator workspaces. Blade screens use server sessions, authorization and shared database records. The localStorage prototype is archived outside the served application.

## Open locally

Run Apache and MySQL in XAMPP, then open http://localhost/PUPSJ-HRMS/public/ . The application root redirects to public. In another environment configure the web document root to the public directory.

Local administrator credentials remain in the workspace private `outputs/PUPSJ-HRMS local access.txt`. Fictional training-account credentials are in `outputs/PUPSJ-HRMS training accounts.txt`. These files are not deployed or committed.

## Features and configuration

See `docs/RECOMMENDATIONS_UPDATE.md` for implemented recommendations and remaining policy decisions. Set room capacities, extra-person fees, bed sizes, photos and accessibility in Room Types. Configure breakfast, deposits, promotions, approved training discounts, local tax, parking and reminders in Rates and Policies. Actual property values must be supplied; unconfirmed monetary policy values default to zero.

Book room types; Hotel Staff assign physical rooms at check-in. Restaurant POS is restricted to Restaurant Staff and Administrators. Statements include acknowledgment fields, while cash, deposits, group allocations and transfers retain audit history. Hotel and Restaurant business dates are reconciled and closed separately.

## PayMongo and email

Only PayMongo test keys are accepted. Set `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` in `.env`, run `php artisan config:clear`, and register a reachable HTTPS `/webhooks/paymongo` endpoint for checkout paid events. QR Ph and card options need account support. Signed callbacks, not redirects, update payment records. Account-level test transactions have not been run without credentials.

Email uses Laravel's local log by default. Configure SMTP for delivered confirmation letters. Confirmation records show Pending, Logged, Sent or Failed status. No real guest identities or live payment data are required for training.

## Local machine-learning chatbot

The chatbot is a trained multinomial Naive Bayes intent classifier with approved answer templates. Run `php artisan chatbot:train` after updating training examples. The small authored evaluation set is for development, not an independent research result. Unknown questions refer users to staff requests.

## Setup and verification

PHP 8.2+, Composer and MariaDB/MySQL are required. Run `composer install`, copy `.env.example` to `.env`, set database credentials, run `php artisan key:generate`, then `php artisan migrate --seed`. Set HRMS_ADMIN_EMAIL and HRMS_ADMIN_PASSWORD before the first seed. Existing users are preserved. Node.js (22.12 or newer) and npm build the frontend with Vite. After installing PHP dependencies, run `npm ci` and `npm run build`. Blade loads the compiled assets using `@vite`.

Run `php artisan test` for the isolated SQLite in-memory regression suite. Legacy kiosk/OCR and points tests are skipped because those routes and loyalty rules are retired in the revised active scope. Never use `migrate:fresh` on the working database.

Back up code and SQL before upgrades. Do not import client-side passwords or browser transaction records as trusted server data. Training statements are not certified tax invoices.


## Frontend development with Vite

Canonical frontend source is in `resources/js`, `resources/css` and `resources/assets`. Edit those files, not the old static copies under `public/js` or `public/css`. Page scripts are loaded as modules and staff code shares one module scope.

For live development, start Apache and MySQL in XAMPP, open the normal local application URL, and run these commands in the project folder:

```powershell
npm run dev
```

Alternatively run `php artisan serve` in a separate terminal and use its URL while MySQL remains running. Vite provides frontend updates; Laravel/Apache serves the application and APIs. The Vite URL on port 5173 is not the hotel application URL.

For a mock defense or normal XAMPP use:

```powershell
npm run build
```

Stop the Vite development server. The application then uses `public/build/manifest.json` and the hashed assets, without requiring Node to stay running. If an interrupted development session leaves `public/hot` pointing to a stopped local Vite server, remove that stale marker after confirming the dev server is stopped.
