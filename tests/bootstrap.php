<?php
// Isolate tests from any cached configuration belonging to the running application.
$testCache = __DIR__.'/cache/testing-config.php';
if (is_file($testCache)) {
    throw new RuntimeException('Remove the unexpected testing configuration cache before running tests.');
}
putenv('APP_CONFIG_CACHE='.$testCache);
$_ENV['APP_CONFIG_CACHE'] = $_SERVER['APP_CONFIG_CACHE'] = $testCache;
require dirname(__DIR__).'/vendor/autoload.php';
