# PUPSJ Hotel & Restaurant Management System

Laravel 12 / PHP 8.2+, MySQL or MariaDB, and Vite. **The team database name is `pupsj_hrms`.** Use simulated guest information and test payments.

## Requirements

- PHP 8.2+ and Composer 2. On Windows, XAMPP PHP/MySQL can be used; put `C:\xampp\php` on PATH.
- Node.js 22.12+ and npm. PHP needs PDO MySQL, mbstring, OpenSSL, fileinfo, and the extensions checked by Composer. PDO SQLite is also needed for the automated tests.
- MySQL/MariaDB running. No database dump is required for a fresh installation: migrations and seeders create the application tables, rooms, menu, and approved training defaults.
- Git. Run commands in the folder containing `artisan`, `composer.json` and `package.json`.

## First installation

```powershell
git clone --branch development https://github.com/rech-axn/PUPSJ-HRMS.git
cd PUPSJ-HRMS
composer install
```

Create your private environment file if Composer has not created it:

```powershell
Copy-Item .env.example .env
```

Run that copy command only when `.env` is missing; keep an existing environment file. Set these values inside `.env` (use your own local database password):

```dotenv
APP_ENV=local
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pupsj_hrms
DB_USERNAME=root
DB_PASSWORD=
HRMS_ADMIN_EMAIL=admin@pupsj.edu.ph
HRMS_ADMIN_PASSWORD=
```

Start MySQL/MariaDB, then run:

```powershell
composer setup
```

This installs PHP dependencies, creates `.env` only if missing, prepares writable directories, clears stale configuration, creates `pupsj_hrms` if missing, generates APP_KEY only if missing, runs pending migrations and seeders, installs the exact npm lockfile dependencies, and builds Vite assets. If a new administrator is needed, it asks for a local password (at least 10 characters). Alternatively set `HRMS_ADMIN_PASSWORD` privately in `.env` before running. Existing administrator passwords are not reset.

The database user needs CREATE privilege only when creating the database. If it does not have that privilege, create an empty database named `pupsj_hrms` through phpMyAdmin, then rerun. No `migrate:fresh`, database drop, or application-key replacement is part of this workflow.

## Run the application

For normal development:

```powershell
composer dev
```

Open **http://127.0.0.1:8000**. This starts the Laravel server, queue listener, and Vite together. Keep the terminal running; use Ctrl+C to stop. The Vite address on port 5173 serves frontend assets, not the application. The shared dev command does not depend on Laravel Pail/PCNTL, which causes problems on Windows.

For a demonstration using built assets:

```powershell
npm run build
php artisan serve
```

Only MySQL and the Laravel server must remain running. Stop any Vite server first. Remove `public/hot` only if it is a stale marker from a stopped Vite process.

### Optional XAMPP Apache setup

Place the project at `C:\xampp\htdocs\PUPSJ-HRMS`, start Apache and MySQL, set `APP_URL=http://localhost/PUPSJ-HRMS/public`, and run `php artisan config:clear`. Open **http://localhost/PUPSJ-HRMS/public/** after building assets. Use `npm run dev` only for live frontend edits. You do not need `php artisan serve` when using Apache. A configured virtual host should point directly to the project's `public` folder.

## After pulling changes

Save or commit your own changes first. On the shared development branch:

```powershell
git pull --ff-only origin development
composer install
php artisan config:clear
php artisan migrate
npm ci
npm run build
```

Read the PR for any explicit data-seeding step. Do not rerun all seeders automatically for every pull: although accounts are retained, the menu seeder refreshes seeded descriptions and photo metadata. For an intentional refresh, use `php artisan db:seed`. Team data is not synchronized by Git; an existing database transfer requires a separate authorized SQL export/import.

## Verify your installation

```powershell
composer check-platform-reqs
php artisan migrate:status
composer test
npm run build
```

Tests force an isolated SQLite in-memory database using `tests/bootstrap.php`; they do not use `pupsj_hrms`. Some retired kiosk/loyalty tests are intentionally skipped. Never run `migrate:fresh` against a developer's working database.

## Accounts and optional services

- Fresh setup creates an administrator using `HRMS_ADMIN_EMAIL` and your chosen password. Create other users through the administrator workspace. Credentials from another developer's private files are not required.
- Confirmation emails use `MAIL_MAILER=log` locally. Check `storage/logs/laravel.log`; configure SMTP separately for actual email delivery.
- PayMongo accepts **test keys only**. Leave its keys blank if you are not testing payments; see [the setup guide](docs/PAYMONGO_SETUP.md). Payment provider configuration is not required just to start the application.
- Hotel and Restaurant business dates close separately. Existing older open dates must be reconciled by authorized staff; installation does not close accounting dates automatically.
- The chatbot model is included. `php artisan chatbot:evaluate` runs the authored evaluation without retraining. See [the evaluation report](docs/CHATBOT_EVALUATION.md).

## Files to edit and commit

Canonical frontend source is in `resources/js`, `resources/css`, and `resources/assets`. Preserve the original theme and use Vite entry points. The old static folders remain for compatibility; do not edit them instead of the active source.

Commit `composer.lock`, `package-lock.json`, source, migrations, seed data and documentation. Do not commit `.env`, credentials, SQL dumps, `vendor`, `node_modules`, `public/build`, `public/hot`, runtime logs or cached configuration. `.env.example` contains placeholders only.
