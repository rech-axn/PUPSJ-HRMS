<?php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use App\Models\{User,Room,RoomType,MenuItem};
use Database\Seeders\DatabaseSeeder;

class TeamInstallationTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_install_has_seed_data_and_rerunning_preserves_admin_credentials(): void
    {
        config(['hrms.admin_email'=>'developer@example.test','hrms.admin_password'=>'LocalSetupPass123!']);
        $this->seed(DatabaseSeeder::class);
        $admin=User::where('role','admin')->sole();
        $this->assertSame('developer@example.test',$admin->email);
        $this->assertTrue(Hash::check('LocalSetupPass123!',$admin->password));
        $hash=$admin->password;
        $this->assertSame(38,Room::count());
        $this->assertSame(4,RoomType::count());
        $this->assertSame(21,MenuItem::count());
        foreach(MenuItem::all() as $item)$this->assertFileExists(public_path($item->photo));
        config(['hrms.admin_password'=>'A-different-password']);
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseCount('users',1);
        $this->assertDatabaseCount('rooms',38);
        $this->assertDatabaseCount('menu_items',21);
        $this->assertSame($hash,$admin->fresh()->password);
    }

    public function test_mysql_local_setup_cannot_operate_on_the_testing_environment():void
    {
        $this->artisan('hrms:setup',['--create-database'=>true,'--no-interaction'=>true])
            ->expectsOutput('This setup command is for APP_ENV=local only.')
            ->assertFailed();
        $this->assertDatabaseCount('users',0);
    }

    public function test_shared_environment_example_matches_the_team_database():void
    {
        $example=file_get_contents(base_path('.env.example'));
        $this->assertStringContainsString('DB_CONNECTION=mysql',$example);
        $this->assertStringContainsString('DB_DATABASE=pupsj_hrms',$example);
        $this->assertMatchesRegularExpression('/^APP_KEY=\s*$/m',$example);
        $this->assertMatchesRegularExpression('/^HRMS_ADMIN_PASSWORD=\s*$/m',$example);
        $this->assertSame('sqlite',config('database.default'));
        $this->assertSame(':memory:',config('database.connections.sqlite.database'));
    }
}
