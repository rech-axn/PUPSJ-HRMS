<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\{DB,Schema};
use PDO;
use Throwable;

class SetupLocal extends Command
{
    protected $signature = 'hrms:setup {--create-database : Create the configured MySQL database if missing} {--no-seed : Only run pending migrations}';
    protected $description = 'Prepare a local HRMS installation without resetting existing data or application keys';

    public function handle(): int
    {
        if (!app()->environment('local')) {
            $this->error('This setup command is for APP_ENV=local only.');
            return self::FAILURE;
        }
        if (!is_file(base_path('.env'))) {
            $this->error('Copy .env.example to .env and set your local database credentials first.');
            return self::FAILURE;
        }
        $connection = config('database.default');
        $c = config('database.connections.'.$connection);
        if (!in_array($connection, ['mysql', 'mariadb']) || ($c['database'] ?? '') !== 'pupsj_hrms' || !empty($c['url'])) {
            $this->error('Use DB_CONNECTION=mysql, DB_DATABASE=pupsj_hrms, and leave DB_URL unset for team setup.');
            return self::FAILURE;
        }
        try {
            if ($this->option('create-database')) {
                $dsn = !empty($c['unix_socket'])
                    ? 'mysql:unix_socket='.$c['unix_socket'].';charset=utf8mb4'
                    : 'mysql:host='.$c['host'].';port='.$c['port'].';charset=utf8mb4';
                $pdo = new PDO($dsn, $c['username'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $exists = $pdo->query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='pupsj_hrms'")->fetchColumn();
                if (!$exists) {
                    $pdo->exec('CREATE DATABASE `pupsj_hrms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
                    $this->info('Created pupsj_hrms.');
                }
            }
            DB::connection()->getPdo();
        } catch (Throwable $e) {
            $this->error('Cannot connect to pupsj_hrms. Start MySQL/MariaDB and check DB_HOST, DB_PORT, DB_USERNAME and DB_PASSWORD in .env.');
            $this->line('If the database does not exist, create pupsj_hrms in phpMyAdmin or rerun with --create-database using an account allowed to create databases.');
            return self::FAILURE;
        }
        if (!$this->option('no-seed')) {
            $hasAdmin = Schema::hasTable('users') && DB::table('users')->where('role', 'admin')->exists();
            if (!$hasAdmin) {
                if (!filter_var(config('hrms.admin_email'), FILTER_VALIDATE_EMAIL)) {
                    $this->error('Set a valid HRMS_ADMIN_EMAIL in .env.');
                    return self::FAILURE;
                }
                $password = (string) config('hrms.admin_password');
                if ($password === '' && $this->input->isInteractive()) {
                    $password = (string) $this->secret('Choose the initial local administrator password (at least 10 characters)');
                }
                if (strlen($password) < 10) {
                    $this->error('Set HRMS_ADMIN_PASSWORD in your private .env to at least 10 characters, or rerun interactively.');
                    return self::FAILURE;
                }
                config(['hrms.admin_password' => $password]);
            }
        }
        if (!config('app.key') && $this->call('key:generate', ['--force' => true]) !== self::SUCCESS) {
            return self::FAILURE;
        }
        if ($this->call('migrate', ['--force' => true]) !== self::SUCCESS) return self::FAILURE;
        if (!$this->option('no-seed') && $this->call('db:seed', ['--force' => true]) !== self::SUCCESS) return self::FAILURE;
        $this->info('Local database ready: pupsj_hrms. Existing accounts and records were retained.');
        $this->line('Frontend: npm ci && npm run build');
        $this->line('Start: composer dev (or php artisan serve with a completed frontend build).');
        return self::SUCCESS;
    }
}
