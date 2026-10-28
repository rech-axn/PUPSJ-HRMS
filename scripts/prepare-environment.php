<?php
// Run before booting Laravel; never replace an existing developer environment.
chdir(dirname(__DIR__));
if (!is_file('.env') && !copy('.env.example', '.env')) {
    fwrite(STDERR, "Could not create .env. Copy .env.example manually.\n");
    exit(1);
}
foreach (['bootstrap/cache','storage/framework/cache/data','storage/framework/sessions','storage/framework/views','storage/logs'] as $dir) {
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        fwrite(STDERR, "Could not create required directory: $dir\n");
        exit(1);
    }
}
