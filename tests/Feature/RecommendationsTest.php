<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{Http,DB};
use Illuminate\Support\Str;
use App\Models\{User,Guest,RoomType,Room,Reservation,Payment,Setting,PaymentCheckout,MenuItem,RestaurantOrder};
use App\Services\{TrainingPolicy,IntentClassifier};
class RecommendationsTest extends TestCase {
 use RefreshDatabase;
 private User $admin;private Guest $guest;private RoomType $type;private Room $room;
 protected function setUp():void{parent::setUp();$this->admin=User::factory()->create(['role'=>'admin']);$this->guest=Guest::create(['name'=>'Sample Guest','email'=>'sample@example.test']);$this->type=RoomType::create(['name'=>'Family','rate'=>1000,'capacity'=>4,'extra_capacity'=>1,'extra_person_rate'=>200]);$this->room=Room::create(['number'=>'101','room_type_id'=>$this->type->id]);$this->actingAs($this->admin);}
 private function values(array $extra=[]):array{return [...['room_type_id'=>$this->type->id,'guest_id'=>$this->guest->id,'arrival'=>today()->toDateString(),'departure'=>today()->addDay()->toDateString(),'adults'=>2,'children'=>0,'breakfast'=>'None','breakfast_pax'=>0],...$extra];}
 private function book(array $extra=[]):array{return $this->postJson('/api/reservations',$this->values($extra))->assertCreated()->json();}
 public function test_booking_prices_children_extra_guest_breakfast_and_stores_unassigned_room():void{
  Setting::create(['key'=>'training_policy','value'=>[...TrainingPolicy::defaults(),'breakfast_buffet_rate'=>100]]);
  $r=$this->book(['adults'=>3,'children'=>2,'breakfast'=>'Buffet','breakfast_pax'=>5,'amount'=>1]);$this->assertNull($r['room_id']);$this->assertEquals(1700,$r['amount']);$this->assertDatabaseHas('confirmation_letters',['reservation_id'=>$r['id'],'email'=>'sample@example.test']);
 }
 public function test_capacity_dates_and_email_are_required():void{
  $this->postJson('/api/reservations',$this->values(['adults'=>6]))->assertUnprocessable();$this->guest->update(['email'=>null]);$this->postJson('/api/reservations',$this->values())->assertUnprocessable();
 }
 public function test_type_inventory_prevents_double_booking_and_room_assignment_is_staff_only():void{
  $r=$this->book();$this->postJson('/api/reservations',$this->values())->assertUnprocessable();$this->postJson('/api/reservations/'.$r['id'].'/check-in')->assertUnprocessable();$this->putJson('/api/reservations/'.$r['id'].'/room',['room_id'=>$this->room->id])->assertOk();$this->postJson('/api/reservations/'.$r['id'].'/check-in')->assertOk();
 }
 public function test_public_catalog_does_not_expose_room_numbers_or_private_promos():void{
  Setting::create(['key'=>'training_policy','value'=>[...TrainingPolicy::defaults(),'promos'=>[['code'=>'PRIVATE','label'=>'Secret','percent'=>5,'start'=>today()->toDateString(),'end'=>today()->addDay()->toDateString(),'public'=>false]]]]);auth()->logout();$this->getJson('/api/catalog')->assertOk()->assertJsonCount(0,'rooms')->assertJsonCount(0,'training_policy.promos');
 }
 public function test_frontdesk_cannot_use_pos_or_admin_settings():void{
  $this->actingAs(User::factory()->create(['role'=>'frontdesk']));$this->getJson('/api/orders')->assertForbidden();$this->get('/staff/orders')->assertForbidden();$this->getJson('/api/policy')->assertForbidden();
 }
 public function test_restaurant_cannot_access_hotel_finance_or_guest_directory():void{
  $r=$this->book();$this->actingAs(User::factory()->create(['role'=>'restaurant']));$this->getJson('/api/reservations/'.$r['id'].'/folio')->assertForbidden();$this->getJson('/api/directory/guests')->assertForbidden();$this->getJson('/api/reports')->assertOk()->assertJsonMissingPath('outstanding');
 }
 public function test_multiple_room_cash_payment_is_idempotent_and_transfer_is_not_new_cash():void{
  $a=$this->book(['arrival'=>today()->addDays(2)->toDateString(),'departure'=>today()->addDays(3)->toDateString()]);$b=$this->book(['arrival'=>today()->addDays(4)->toDateString(),'departure'=>today()->addDays(5)->toDateString()]);$v=['reference'=>(string)Str::uuid(),'posting_location'=>'Desk 1','allocations'=>[['reservation_id'=>$a['id'],'amount'=>500],['reservation_id'=>$b['id'],'amount'=>200]]];$this->postJson('/api/payments/batch',$v)->assertOk();$this->postJson('/api/payments/batch',$v)->assertOk();$this->assertDatabaseCount('payments',2);
  $this->postJson('/api/payments/transfer',['from'=>$a['id'],'to'=>$b['id'],'amount'=>100,'reason'=>'Same payer move','reference'=>(string)Str::uuid()])->assertOk();$this->getJson('/api/reports')->assertJsonPath('collections',700);$this->getJson('/api/reservations/'.$a['id'].'/folio')->assertJsonPath('paid',400);$this->getJson('/api/reservations/'.$b['id'].'/folio')->assertJsonPath('paid',300);
 }
 public function test_guest_discount_requires_staff_verification():void{
  $member=User::factory()->create(['guest_id'=>$this->guest->id,'role'=>'guest']);$this->actingAs($member)->postJson('/api/reservations',$this->values(['discount_category'=>'PWD','discount_verification'=>'self']))->assertUnprocessable();
 }
 public function test_cash_deposit_awards_advance_discount_once():void{
  Setting::create(['key'=>'training_policy','value'=>[...TrainingPolicy::defaults(),'advance_discount_percent'=>10]]);$r=$this->book();$v=['reference'=>(string)Str::uuid(),'posting_location'=>'Hotel','allocations'=>[['reservation_id'=>$r['id'],'amount'=>500]]];$this->postJson('/api/payments/batch',$v)->assertOk();$this->postJson('/api/payments/batch',$v)->assertOk();$this->assertEquals(900,Reservation::find($r['id'])->amount);
 }
 public function test_edit_and_void_only_unposted_restaurant_order():void{
  $m=MenuItem::create(['name'=>'Tea','category'=>'Drink','price'=>50]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>2]]])->assertCreated()->json();$this->putJson('/api/orders/'.$o['id'],['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]],'reason'=>'Remove extra item'])->assertOk()->assertJsonPath('amount',50);$this->postJson('/api/orders/'.$o['id'].'/void',['reason'=>'Guest cancelled'])->assertOk();$this->putJson('/api/orders/'.$o['id'],['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]],'reason'=>'Invalid'])->assertUnprocessable();
 }
 public function test_restaurant_closing_blocks_unpaid_orders_and_cash_variance():void{
  $m=MenuItem::create(['name'=>'Tea','category'=>'Drink','price'=>50]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->json();$v=['date'=>today()->toDateString(),'department'=>'Restaurant','counted_cash'=>0];$this->postJson('/api/closing',$v)->assertUnprocessable();$this->postJson('/api/orders/'.$o['id'].'/settle',['settlement'=>'Cash','cash_received'=>50,'idempotency_key'=>(string)Str::uuid()])->assertOk();$this->postJson('/api/closing',$v)->assertUnprocessable();$v['counted_cash']=50;$this->postJson('/api/closing',$v)->assertOk();$this->postJson('/api/closing',$v)->assertOk();$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->assertUnprocessable();$this->assertDatabaseCount('business_closings',1);
 }
 private function gateway():array{
  config(['paymongo.secret_key'=>'sk_test_fixture','paymongo.webhook_secret'=>'wh_fixture']);Http::preventStrayRequests();Http::fake(['api.paymongo.com/*'=>Http::response(['data'=>['id'=>'cs_fixture','attributes'=>['checkout_url'=>'https://checkout.paymongo.com/cs_fixture']]])]);$r=$this->book();$v=['reference'=>(string)Str::uuid(),'method'=>'qrph','allocations'=>[['reservation_id'=>$r['id'],'amount'=>500]]];$this->postJson('/api/paymongo/checkout',$v)->assertOk();return [$r,$v];
 }
 private function event(array $v,int $amount=50000,bool $live=false):array{return ['data'=>['type'=>'checkout_session.payment.paid','livemode'=>$live,'data'=>['id'=>'cs_fixture','attributes'=>['reference_number'=>$v['reference'],'payments'=>[['id'=>'pay_fixture','attributes'=>['status'=>'paid','currency'=>'PHP','amount'=>$amount]]]]]]];}
 private function notify(array $payload){$raw=json_encode($payload);$t=(string)time();$sig='t='.$t.',te='.hash_hmac('sha256',$t.'.'.$raw,'wh_fixture');return $this->call('POST','/webhooks/paymongo',[],[],[],['CONTENT_TYPE'=>'application/json','HTTP_ACCEPT'=>'application/json','HTTP_PAYMONGO_SIGNATURE'=>$sig],$raw);}
 public function test_paymongo_verified_payment_posts_once_and_pending_blocks_edits():void{
  [$r,$v]=$this->gateway();$this->postJson('/api/reservations/'.$r['id'].'/cancel')->assertUnprocessable();$this->postJson('/webhooks/paymongo',$this->event($v))->assertUnauthorized();$this->notify($this->event($v))->assertOk();$this->notify($this->event($v))->assertOk();$this->assertDatabaseCount('payments',1);$this->assertDatabaseHas('payment_checkouts',['status'=>'Paid']);$this->getJson('/api/reservations/'.$r['id'].'/folio')->assertJsonPath('paid',500);
 }
 public function test_gateway_rejects_live_events_and_mismatched_amount():void{[$r,$v]=$this->gateway();$this->notify($this->event($v,1))->assertUnprocessable();$this->notify($this->event($v,50000,true))->assertUnprocessable();$this->assertDatabaseCount('payments',0);}
 public function test_paymongo_disabled_without_test_keys_and_no_fake_paid_redirect():void{$r=$this->book();config(['paymongo.secret_key'=>'sk_live_not_allowed']);$this->postJson('/api/paymongo/checkout',['reference'=>(string)Str::uuid(),'method'=>'card','allocations'=>[['reservation_id'=>$r['id'],'amount'=>1]]])->assertStatus(503);$this->get('/payment-return')->assertOk();$this->assertDatabaseCount('payments',0);}
 public function test_chatbot_uses_model_and_unknown_question_handoff():void{
  $this->postJson('/api/chat',['message'=>'buffet breakfast cost'])->assertOk()->assertJsonPath('intent','breakfast');$this->postJson('/api/chat',['message'=>'qzxv xyzzy abcdef'])->assertOk()->assertJsonPath('handoff',true);$model=json_decode(file_get_contents(resource_path('chatbot/model.json')),true);$this->assertSame(78,$model['documents']);
 }
 public function test_statement_has_acknowledgement_and_no_certified_tax_claim():void{$r=$this->book();$this->get('/reservations/'.$r['id'].'/receipt')->assertOk()->assertSee('Acknowledged by')->assertSee('not proof of payment');}
 public function test_guest_request_ownership_and_department_isolation():void{
  $u=User::factory()->create(['role'=>'guest','guest_id'=>$this->guest->id]);$this->actingAs($u)->postJson('/api/requests',['department'=>'Restaurant','message'=>'Please follow up my order'])->assertOk();$this->actingAs(User::factory()->create(['role'=>'frontdesk']))->getJson('/api/requests')->assertJsonCount(0);$this->actingAs(User::factory()->create(['role'=>'restaurant']))->getJson('/api/requests')->assertJsonCount(1);
 }
 public function test_restaurant_tax_breakdown_and_receipt_are_snapshots():void{
  Setting::create(['key'=>'training_policy','value'=>[...TrainingPolicy::defaults(),'local_tax_percent'=>5]]);$m=MenuItem::create(['name'=>'Tea','category'=>'Drink','price'=>100]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->assertCreated()->assertJsonPath('amount',105)->json();$this->get('/orders/'.$o['id'].'/receipt')->assertOk()->assertSee('Configured local tax');$this->assertEquals(5,RestaurantOrder::find($o['id'])->pricing['local_tax']);
 }
 public function test_table_occupancy_and_room_service_have_separate_contexts():void{
  $t=\App\Models\DiningTable::create(['label'=>'T1','capacity'=>4]);$m=MenuItem::create(['name'=>'Tea','category'=>'Drink','price'=>50]);$v=['channel'=>'Dine-in','dining_table_id'=>$t->id,'items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]];$o=$this->postJson('/api/orders',$v)->assertCreated()->json();$this->postJson('/api/orders',$v)->assertUnprocessable();$this->postJson('/api/orders/'.$o['id'].'/void',['reason'=>'Cancel'])->assertOk();$this->assertSame('Available',$t->fresh()->status);$this->postJson('/api/orders',[...$v,'channel'=>'Room service'])->assertUnprocessable();
 }
 public function test_charge_reversal_retains_original_and_cannot_repeat():void{
  $r=$this->book();$this->putJson('/api/reservations/'.$r['id'].'/room',['room_id'=>$this->room->id])->assertOk();$this->postJson('/api/reservations/'.$r['id'].'/check-in')->assertOk();$c=$this->postJson('/api/reservations/'.$r['id'].'/charges',['description'=>'Extra towel','amount'=>100])->assertSuccessful()->json();$url='/api/reservations/'.$r['id'].'/charges/'.$c['id'].'/reverse';$this->postJson($url,['reason'=>'Posted in error'])->assertSuccessful();$this->postJson($url,['reason'=>'Retry'])->assertOk();$this->assertDatabaseCount('folio_charges',2);$this->getJson('/api/reservations/'.$r['id'].'/folio')->assertJsonPath('total',1000);
 }
 public function test_restaurant_paymongo_test_payment_posts_once():void{
  config(['paymongo.secret_key'=>'sk_test_fixture','paymongo.webhook_secret'=>'wh_fixture']);Http::preventStrayRequests();Http::fake(['api.paymongo.com/*'=>Http::response(['data'=>['id'=>'cs_fixture','attributes'=>['checkout_url'=>'https://checkout.paymongo.com/cs_fixture']]])]);$m=MenuItem::create(['name'=>'Tea','category'=>'Drink','price'=>50]);$o=$this->postJson('/api/orders',['items'=>[['menu_item_id'=>$m->id,'quantity'=>1]]])->assertCreated()->json();$v=['reference'=>(string)Str::uuid(),'method'=>'card'];$this->postJson('/api/orders/'.$o['id'].'/checkout',$v)->assertOk();$this->postJson('/api/orders/'.$o['id'].'/void',['reason'=>'Invalid while paying'])->assertUnprocessable();$this->notify($this->event($v,5000))->assertOk();$this->notify($this->event($v,5000))->assertOk();$this->assertDatabaseCount('payments',1);$this->assertSame('Settled',RestaurantOrder::find($o['id'])->status);
 }
}
