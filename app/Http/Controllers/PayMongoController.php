<?php
namespace App\Http\Controllers;
use App\Models\{PaymentCheckout,Reservation,Payment};
use App\Services\{TrainingPolicy as Policy,HotelService as Hotel,PaymentPosting};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB,Http};
class PayMongoController extends Controller {
 public function index(Request $q){$b=PaymentCheckout::orderByDesc('id');if($q->user()->role==='guest')$b->where('created_by',$q->user()->id);elseif($q->user()->role==='restaurant')$b->whereNotNull('restaurant_order_id');elseif($q->user()->role==='frontdesk')$b->whereNull('restaurant_order_id');else abort_unless($q->user()->role==='admin',403);return $b->limit(100)->get(['reference','status','checkout_url','amount_centavos','method','created_at']);}
 public function reconcile(Request $q,string $reference){
  $c=PaymentCheckout::where('reference',$reference)->firstOrFail();abort_unless($q->user()->role==='admin'||($q->user()->role==='frontdesk'&&!$c->restaurant_order_id)||($q->user()->role==='restaurant'&&$c->restaurant_order_id),403);
  abort_unless($c->provider_session,422,'No provider session ID exists. Check the PayMongo dashboard using the reference before resolving this case.');
  $key=config('paymongo.secret_key');abort_unless(str_starts_with($key,'sk_test_'),503,'Test key is not configured.');
  $response=Http::withBasicAuth($key,'')->acceptJson()->timeout(20)->get('https://api.paymongo.com/v2/checkout_sessions/'.rawurlencode($c->provider_session));abort_unless($response->successful(),502,'Provider could not confirm the checkout state.');
  $resource=$response->json('data');abort_unless(is_array($resource)&&($resource['id']??'')===$c->provider_session&&($resource['attributes']['livemode']??null)===false,422,'Invalid test checkout response.');
  $status=$resource['attributes']['status']??'';
  if(collect($resource['attributes']['payments']??[])->contains(fn($p)=>($p['attributes']['status']??'')==='paid')){
   $body=json_encode(['data'=>['type'=>'checkout_session.payment.paid','livemode'=>false,'data'=>$resource]]);$t=(string)time();$secret=config('paymongo.webhook_secret');abort_unless($secret,503,'Webhook secret is not configured.');$request=Request::create('/webhooks/paymongo','POST',[],[],[],['CONTENT_TYPE'=>'application/json','HTTP_PAYMONGO_SIGNATURE'=>'t='.$t.',te='.hash_hmac('sha256',$t.'.'.$body,$secret)],$body);return $this->webhook($request);
  }
  if(in_array($status,['expired','cancelled']))$c->update(['status'=>'Expired']);
  return $c->only('reference','status');
 }
 public function order(Request $q,\App\Models\RestaurantOrder $order){
  $key=config('paymongo.secret_key');abort_unless(str_starts_with($key,'sk_test_'),503,'PayMongo test keys are not configured.');
  $v=$q->validate(['reference'=>'required|uuid','method'=>'required|in:card,qrph']);
  $c=DB::transaction(function()use($q,$order,$v){$o=\App\Models\RestaurantOrder::lockForUpdate()->findOrFail($order->id);$existing=PaymentCheckout::where('reference',$v['reference'])->first();if($existing){abort_unless($existing->created_by===$q->user()->id&&$existing->restaurant_order_id===$o->id&&$existing->method===$v['method'],409);return $existing;}if($o->status!=='Open')Hotel::fail('Order is already settled.');\App\Services\BillAcknowledgment::require('Restaurant',$o->id);if(PaymentCheckout::where('restaurant_order_id',$o->id)->whereIn('status',['Creating','Pending','Review'])->exists())Hotel::fail('Resume or reconcile the existing checkout first.');return PaymentCheckout::create(['reference'=>$v['reference'],'created_by'=>$q->user()->id,'restaurant_order_id'=>$o->id,'allocations'=>[],'amount_centavos'=>Policy::cents($o->amount),'method'=>$v['method']]);});
  if($c->checkout_url)return $c->only('reference','status','checkout_url');if(!$c->wasRecentlyCreated)abort(409,'Reconcile checkout creation before retrying.');
  try{$response=Http::withBasicAuth($key,'')->acceptJson()->timeout(20)->post('https://api.paymongo.com/v2/checkout_sessions',['data'=>['attributes'=>['line_items'=>[['name'=>'Training restaurant bill','amount'=>$c->amount_centavos,'currency'=>'PHP','quantity'=>1]],'payment_method_types'=>[$c->method],'reference_number'=>$c->reference,'send_email_receipt'=>false,'success_url'=>url('/payment-return?reference='.$c->reference),'cancel_url'=>url('/payment-return?reference='.$c->reference)]]]);if(!$response->successful()){$c->update(['status'=>'Failed']);abort(502,'PayMongo rejected the checkout.');}$url=$response->json('data.attributes.checkout_url');abort_unless(is_string($url)&&parse_url($url,PHP_URL_HOST)==='checkout.paymongo.com'&&parse_url($url,PHP_URL_SCHEME)==='https',502);$c->update(['provider_session'=>$response->json('data.id'),'checkout_url'=>$url,'status'=>'Pending']);}catch(\Illuminate\Http\Client\ConnectionException $e){$c->update(['status'=>'Review']);abort(502,'Uncertain provider response; staff reconciliation required.');}
  return $c->only('reference','status','checkout_url');
 }
 public function create(Request $q){
  $key=config('paymongo.secret_key');abort_unless(str_starts_with($key,'sk_test_'),503,'PayMongo test checkout is not configured. Ask the administrator to add test keys.');
  $v=$q->validate(['reference'=>'required|uuid','method'=>'required|in:qrph,card','allocations'=>'required|array|min:1|max:20','allocations.*.reservation_id'=>'required|distinct|exists:reservations,id','allocations.*.amount'=>'required|numeric|min:0.01|max:9999999']);
  $checkout=DB::transaction(function()use($q,$v){
   $old=PaymentCheckout::where('reference',$v['reference'])->lockForUpdate()->first();
   if($old){abort_unless($old->created_by===$q->user()->id&&$old->method===$v['method']&&$old->allocations===$v['allocations'],409);return $old;}
   $rows=PaymentPosting::lockAllocations($v['allocations']);$total=0;
   foreach($rows as [$r,$a]){
    abort_unless(in_array($q->user()->role,['admin','frontdesk'])||($q->user()->role==='guest'&&$q->user()->guest_id===$r->guest_id),403);
    if(PaymentCheckout::whereIn('status',['Creating','Pending'])->get()->contains(fn($x)=>collect($x->allocations)->contains(fn($n)=>(int)$n['reservation_id']===$r->id)))Hotel::fail('This folio already has a pending checkout. Resume it or ask staff to reconcile it before starting another payment.');
    $total+=Policy::cents($a['amount']);
   }
   return PaymentCheckout::create(['reference'=>$v['reference'],'created_by'=>$q->user()->id,'allocations'=>$v['allocations'],'amount_centavos'=>$total,'method'=>$v['method']]);
  });
  if($checkout->checkout_url)return $checkout->only('reference','status','checkout_url');
  // An ambiguous provider timeout must not be retried as a new charge.
  if(!$checkout->wasRecentlyCreated)abort(409,'Checkout creation needs reconciliation. Do not repeat the payment.');
  try{
   $response=Http::withBasicAuth($key,'')->acceptJson()->timeout(20)->post('https://api.paymongo.com/v2/checkout_sessions',['data'=>['attributes'=>[
    'line_items'=>[['name'=>'Training hotel bill '.$checkout->reference,'amount'=>$checkout->amount_centavos,'currency'=>'PHP','quantity'=>1]],
    'payment_method_types'=>[$checkout->method], 'reference_number'=>$checkout->reference,'send_email_receipt'=>false,
    'success_url'=>url('/payment-return?reference='.$checkout->reference),'cancel_url'=>url('/payment-return?reference='.$checkout->reference),
    'metadata'=>['purpose'=>'campus_training'],
   ]]]);
   if(!$response->successful()){$checkout->update(['status'=>'Failed']);abort(502,'PayMongo could not create the test checkout. No local payment was recorded.');}
   $id=$response->json('data.id');$url=$response->json('data.attributes.checkout_url');
   abort_unless(is_string($id)&&is_string($url)&&parse_url($url,PHP_URL_HOST)==='checkout.paymongo.com'&&parse_url($url,PHP_URL_SCHEME)==='https',502,'Unexpected checkout response; staff reconciliation required.');
   $checkout->update(['provider_session'=>$id,'checkout_url'=>$url,'status'=>'Pending']);
  }catch(\Illuminate\Http\Client\ConnectionException $e){$checkout->update(['status'=>'Review']);abort(502,'Provider response was uncertain. Staff must reconcile this checkout before retrying.');}
  return $checkout->only('reference','status','checkout_url');
 }
 public function status(Request $q,string $reference){$c=PaymentCheckout::where('reference',$reference)->firstOrFail();abort_unless($c->created_by===$q->user()->id||$q->user()->role==='admin',403);return $c->only('reference','status','checkout_url');}
 public function webhook(Request $q){
  $secret=config('paymongo.webhook_secret');abort_unless($secret,503);
  $parts=[];foreach(explode(',',(string)$q->header('Paymongo-Signature')) as $part){$pair=explode('=',trim($part),2);if(count($pair)===2)$parts[$pair[0]]=$pair[1];}
  $t=$parts['t']??'';abort_unless(ctype_digit($t)&&abs(time()-(int)$t)<=300,401);
  abort_unless(hash_equals(hash_hmac('sha256',$t.'.'.$q->getContent(),$secret),$parts['te']??''),401);
  // Support documented v2 and legacy event envelopes, but never a live event.
  $e=$q->json()->all();$a=$e['data']['attributes']??$e['data']??[];
  if(($a['type']??'')!=='checkout_session.payment.paid')return ['received'=>true];
  $resource=$a['data']??[];$attr=$resource['attributes']??[];
  abort_unless(($a['livemode']??$attr['livemode']??null)===false,422,'Only test events are accepted.');
  return DB::transaction(function()use($resource,$attr){
   $c=PaymentCheckout::where('provider_session',$resource['id']??'')->lockForUpdate()->firstOrFail();
   if($c->status==='Paid')return ['received'=>true];
   abort_unless(($attr['reference_number']??'')===$c->reference,422);
   $paid=collect($attr['payments']??[])->first(fn($p)=>($p['attributes']['status']??'')==='paid');
   abort_unless($paid&&($paid['attributes']['currency']??'')==='PHP'&&(int)$paid['attributes']['amount']===$c->amount_centavos,422);
   if($c->restaurant_order_id){
    $o=\App\Models\RestaurantOrder::lockForUpdate()->findOrFail($c->restaurant_order_id);
    if($o->status!=='Open'||Policy::cents($o->amount)!==$c->amount_centavos){$c->update(['status'=>'Review']);return ['received'=>true,'review'=>true];}
    Payment::create(['restaurant_order_id'=>$o->id,'receipt'=>'RCPT-'.strtoupper(bin2hex(random_bytes(6))),'amount'=>$o->amount,'method'=>'PayMongo test '.$c->method,'idempotency_key'=>$c->reference,'batch_reference'=>$c->reference,'provider_reference'=>$paid['id'],'created_by'=>$c->created_by,'posting_location'=>'Restaurant PayMongo test']);
    $o->update(['status'=>'Settled','settlement'=>'PayMongo test '.$c->method,'settled_at'=>now()]);if($o->dining_table_id)\App\Models\DiningTable::whereKey($o->dining_table_id)->update(['status'=>'Available']);$c->update(['status'=>'Paid']);Hotel::audit('order.gateway-paid',$o->code,['amount'=>$o->amount,'posted_by'=>$c->created_by]);return ['received'=>true];
   }
   // A late successful charge is retained for reconciliation; it must not disappear or overpay a changed folio.
   try{$rows=PaymentPosting::lockAllocations($c->allocations);}catch(\Illuminate\Validation\ValidationException $e){$c->update(['status'=>'Review']);Hotel::audit('gateway.needs-review',$c->reference);return ['received'=>true,'review'=>true];}
   PaymentPosting::post($rows,'PayMongo test '.$c->method,$c->reference,$c->created_by,'PayMongo test',$paid['id']);
   $c->update(['status'=>'Paid']);return ['received'=>true];
  });
 }
}
