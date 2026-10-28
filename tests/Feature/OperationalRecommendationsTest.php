<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use App\Models\{User,Guest,RoomType,Room,Reservation,Setting,MenuItem};
use App\Services\{TrainingPolicy,RecommendedBooking,BillAcknowledgment,BusinessDate};
class OperationalRecommendationsTest extends TestCase {
 use RefreshDatabase;
 private User $admin;private Guest $guest;private RoomType $type;
 protected function setUp():void{parent::setUp();$this->admin=User::factory()->create(['role'=>'admin']);$this->actingAs($this->admin);$this->guest=Guest::create(['name'=>'Sample Guest','email'=>'sample@example.test']);$this->type=RoomType::create(['name'=>'Family Suite','rate'=>1000,'capacity'=>4,'extra_capacity'=>1,'extra_person_rate'=>800]);Room::create(['number'=>'301','room_type_id'=>$this->type->id]);Setting::create(['key'=>'training_policy','value'=>array_replace(TrainingPolicy::defaults(),['breakfast_buffet_rate'=>450,'advance_discount_percent'=>5,'require_bill_acknowledgment'=>true])]);}
 private function values(array $v=[]):array{return array_replace(['guest_id'=>$this->guest->id,'room_type_id'=>$this->type->id,'arrival'=>today()->toDateString(),'departure'=>today()->addDay()->toDateString(),'adults'=>4,'children'=>1,'breakfast'=>'None','breakfast_pax'=>0],$v);}
 private function book(array $v=[]):Reservation{return RecommendedBooking::create($this->values($v),$this->guest->id,true);}
 public function test_family_extra_and_buffet_prices_and_plated_rejection():void{
  $r=$this->book(['breakfast'=>'Buffet','breakfast_pax'=>5]);$this->assertEquals(4050,$r->amount);$this->assertEquals(800,$r->pricing['extra_guests']);$this->postJson('/api/quote',$this->values(['adults'=>6,'children'=>0]))->assertUnprocessable();$this->postJson('/api/reservations',$this->values(['breakfast'=>'Plated','breakfast_pax'=>1]))->assertUnprocessable();
 }
 public function test_full_advance_payment_awards_once_deposit_does_not():void{
  $r=$this->book(['adults'=>2,'children'=>0,'arrival'=>today()->addDays(8)->toDateString(),'departure'=>today()->addDays(9)->toDateString()]);$this->assertEquals(950,$r->pricing['advance_payment_due']);
  $v=['reference'=>(string)Str::uuid(),'posting_location'=>'Hotel','allocations'=>[['reservation_id'=>$r->id,'amount'=>500]]];$this->postJson('/api/payments/batch',$v)->assertOk();$this->assertEquals(1000,$r->fresh()->amount);
  $v['reference']=(string)Str::uuid();$v['allocations'][0]['amount']=450;$this->postJson('/api/payments/batch',$v)->assertOk();$this->postJson('/api/payments/batch',$v)->assertOk();$this->assertEquals(950,$r->fresh()->amount);$this->assertEquals(50,$r->fresh()->pricing['advance_discount_awarded']);$this->assertDatabaseCount('payments',2);
 }
 public function test_short_notice_and_promo_do_not_receive_advance_benefit():void{
  $p=TrainingPolicy::get();$p['promos']=[['code'=>'WELCOME10','label'=>'First stay','percent'=>10,'start'=>today()->toDateString(),'end'=>today()->addMonth()->toDateString(),'public'=>true,'first_time_only'=>true]];Setting::where('key','training_policy')->update(['value'=>$p]);
  $q=TrainingPolicy::quote($this->type,$this->values(['adults'=>2,'children'=>0]),1);$this->assertEquals(0,$q['advance_discount_percent']);$r=$this->book(['adults'=>2,'children'=>0,'promo_code'=>'WELCOME10','arrival'=>today()->addDays(8)->toDateString(),'departure'=>today()->addDays(9)->toDateString()]);$this->assertEquals(900,$r->amount);$this->assertEquals(0,$r->pricing['advance_discount_percent']);$this->postJson('/api/reservations',$this->values(['promo_code'=>'WELCOME10']))->assertUnprocessable();
 }
 public function test_staff_promotion_is_private_guest_bound_and_single_use():void{
  $o=$this->postJson('/api/promotions',['guest_id'=>$this->guest->id,'percent'=>5,'reason'=>'Training courtesy','end'=>today()->addWeek()->toDateString()])->assertOk()->json();$other=Guest::create(['name'=>'Other Guest','email'=>'other@example.test']);$this->postJson('/api/reservations',array_replace($this->values(),['guest_id'=>$other->id,'promo_code'=>$o['code']]))->assertUnprocessable();$this->book(['promo_code'=>$o['code']]);$this->postJson('/api/reservations',$this->values(['arrival'=>today()->addDays(2)->toDateString(),'departure'=>today()->addDays(3)->toDateString(),'promo_code'=>$o['code']]))->assertUnprocessable();
  auth()->logout();$this->getJson('/api/original/snapshot')->assertOk()->assertJsonCount(0,'data.policy.promos'); // Public catalogue must not leak private offers.
 }
 public function test_accessible_inventory_and_assignment_require_real_room_features():void{
  $this->postJson('/api/reservations',$this->values(['requires_accessible_room'=>true]))->assertUnprocessable();$room=Room::create(['number'=>'102','room_type_id'=>$this->type->id,'floor'=>1,'accessible_room'=>true,'accessible_bathroom'=>true]);$r=$this->book(['requires_accessible_room'=>true]);$wrong=Room::where('number','301')->first();$this->putJson('/api/reservations/'.$r->id.'/room',['room_id'=>$wrong->id])->assertUnprocessable();$this->putJson('/api/reservations/'.$r->id.'/room',['room_id'=>$room->id])->assertOk();$this->postJson('/api/reservations',$this->values(['requires_accessible_room'=>true]))->assertUnprocessable();
 }
 public function test_restaurant_bill_requires_acknowledgment_and_edits_invalidate_it():void{
  $m=MenuItem::create(['name'=>'Plated breakfast','category'=>'Breakfast','price'=>380]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->assertCreated()->json();$path='/api/orders/'.$o['id'];$v=['settlement'=>'Cash','cash_received'=>1000,'idempotency_key'=>(string)Str::uuid()];$this->postJson($path.'/settle',$v)->assertUnprocessable();$this->postJson('/api/bills/Restaurant/'.$o['id'].'/acknowledgment',['acknowledged_by'=>'Sample Guest','confirmed'=>true])->assertOk();$this->putJson($path,['items'=>[['menu_item_id'=>$m->id,'quantity'=>2]],'reason'=>'Add breakfast'])->assertOk();$this->postJson($path.'/settle',$v)->assertUnprocessable();$this->postJson('/api/bills/Restaurant/'.$o['id'].'/acknowledgment',['acknowledged_by'=>'Sample Guest','confirmed'=>true])->assertOk();$this->postJson($path.'/settle',$v)->assertOk();$this->assertDatabaseCount('bill_acknowledgments',2);
 }
 public function test_hotel_final_payment_requires_current_acknowledgment():void{
  $r=$this->book(['adults'=>2,'children'=>0]);$r->update(['status'=>'Checked-in']);$v=['reference'=>(string)Str::uuid(),'posting_location'=>'Hotel','allocations'=>[['reservation_id'=>$r->id,'amount'=>1000]]];$this->postJson('/api/payments/batch',$v)->assertUnprocessable();$this->postJson('/api/bills/Hotel/'.$r->id.'/acknowledgment',['acknowledged_by'=>'Sample Guest','confirmed'=>true])->assertOk();$this->postJson('/api/payments/batch',$v)->assertOk();$this->assertNotNull(BillAcknowledgment::current('Hotel',$r->id));
 }
 public function test_restaurant_audit_closes_only_its_own_date_and_restricts_roles():void{
  $hotel=BusinessDate::date('Hotel');$this->actingAs(User::factory()->create(['role'=>'restaurant']));$this->get('/pages/restaurant/night-audit.html')->assertOk();$this->getJson('/api/department-audit?department=Restaurant')->assertOk()->assertJsonPath('expected_cash',0);$this->getJson('/api/department-audit?department=Hotel')->assertForbidden();$this->postJson('/api/closing',['date'=>today()->toDateString(),'department'=>'Restaurant','counted_cash'=>0])->assertOk();$this->assertEquals($hotel,BusinessDate::date('Hotel'));$this->assertEquals(today()->addDay()->toDateString(),BusinessDate::date('Restaurant'));
 }
 public function test_approved_seed_is_idempotent_and_preserves_existing_bookings():void{
  $r=$this->book();$this->seed(\Database\Seeders\OperationalRecommendationsSeeder::class);$this->seed(\Database\Seeders\OperationalRecommendationsSeeder::class);$this->assertEquals(1800,$r->fresh()->amount);$this->assertEquals(450,TrainingPolicy::get()['breakfast_buffet_rate']);$this->assertEquals(4,$this->type->fresh()->capacity);$this->assertEquals(1,$this->type->fresh()->extra_capacity);$this->assertNotEmpty($this->type->fresh()->bed_size);$this->assertDatabaseCount('users',1);
 }
 public function test_advance_seven_day_boundary_and_unstacked_quote():void{
  foreach([6=>0,7=>5] as $days=>$expected){$q=TrainingPolicy::quote($this->type,$this->values(['adults'=>2,'children'=>0,'arrival'=>today()->addDays($days)->toDateString()]),1);$this->assertEquals($expected,$q['advance_discount_percent']);}
 }
 public function test_restaurant_gateway_requires_acknowledgment_before_creating_checkout():void{
  config(['paymongo.secret_key'=>'sk_test_fixture']);$m=MenuItem::create(['name'=>'Breakfast plate','category'=>'Breakfast','price'=>350]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->json();$this->postJson('/api/orders/'.$o['id'].'/checkout',['reference'=>(string)Str::uuid(),'method'=>'qrph'])->assertUnprocessable();$this->assertDatabaseCount('payment_checkouts',0);
 }
 public function test_hotel_pending_checkout_does_not_block_restaurant_closing():void{
  $r=$this->book();\App\Models\PaymentCheckout::create(['reference'=>(string)Str::uuid(),'created_by'=>$this->admin->id,'allocations'=>[['reservation_id'=>$r->id,'amount'=>100]],'amount_centavos'=>10000,'method'=>'qrph','status'=>'Pending']);$this->getJson('/api/department-audit?department=Restaurant')->assertOk()->assertJsonPath('pending_checkouts',0);$this->postJson('/api/closing',['date'=>today()->toDateString(),'department'=>'Restaurant','counted_cash'=>0])->assertOk();$this->postJson('/api/closing',['date'=>today()->toDateString(),'department'=>'Hotel','counted_cash'=>0])->assertUnprocessable();
 }
 public function test_policy_form_can_save_without_obsolete_plated_rate():void{
  $p=TrainingPolicy::get();unset($p['breakfast_plated_rate']);$this->postJson('/api/policy',$p)->assertOk()->assertJsonPath('breakfast_buffet_rate',450)->assertJsonPath('require_bill_acknowledgment',true);
 }
}
