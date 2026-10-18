<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Database\Seeders\RestoredMenuSeeder;
use App\Models\MenuItem;
class RestoredMenuTest extends TestCase {
 use RefreshDatabase;
 public function test_menu_restoration_preserves_existing_prices_and_marks_generated_images():void {
  MenuItem::create(['name'=>'Chicken Adobo','category'=>'Main Course','price'=>299,'available'=>false,'photo_source'=>'https://example.test/old-stock-photo','photo_license'=>'Old license']);
  $this->seed(RestoredMenuSeeder::class);$this->seed(RestoredMenuSeeder::class);
  $this->assertDatabaseCount('menu_items',21);
  $adobo=MenuItem::where('name','Chicken Adobo')->firstOrFail();
  $this->assertEquals(299,$adobo->price);$this->assertFalse($adobo->available);
  foreach(MenuItem::all() as $dish){$this->assertFileExists(public_path($dish->photo));$this->assertSame('AI-generated',$dish->photo_credit);$this->assertNull($dish->photo_source);$this->assertNull($dish->photo_license);}
  $menu=$this->get('/api/catalog')->assertOk()->json('menu');$this->assertCount(20,$menu);
 }
}
