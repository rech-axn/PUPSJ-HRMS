<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\{Setting,Reservation,RestaurantOrder,Payment,PaymentCheckout};
use App\Services\{BillAcknowledgment,TrainingPolicy,BusinessDate,HotelService};
class OperationalRecommendationsController extends Controller {
 public function acknowledge(Request $q,string $type,int $id){
  abort_unless(in_array($type,['Hotel','Restaurant']),404);abort_unless($q->user()->role==='admin'||($type==='Hotel'&&$q->user()->role==='frontdesk')||($type==='Restaurant'&&$q->user()->role==='restaurant'),403);
  if($type==='Hotel')Reservation::findOrFail($id);else RestaurantOrder::findOrFail($id);
  if($q->isMethod('get'))return ['acknowledgment'=>BillAcknowledgment::current($type,$id)];
  $v=$q->validate(['acknowledged_by'=>'required|string|max:180','confirmed'=>'accepted']);
  return DB::transaction(function()use($type,$id,$v,$q){($type==='Hotel'?Reservation::class:RestaurantOrder::class)::whereKey($id)->lockForUpdate()->firstOrFail();return BillAcknowledgment::record($type,$id,$v['acknowledged_by'],$q->user()->id);});
 }
 public function promotions(Request $q){
  abort_unless(in_array($q->user()->role,['admin','frontdesk']),403);
  if($q->isMethod('get'))return TrainingPolicy::get()['promos'];
  $v=$q->validate(['guest_id'=>'required|exists:guests,id','percent'=>'required|numeric|min:1|max:'.($q->user()->role==='admin'?20:10),'end'=>'required|date|after_or_equal:today|before_or_equal:'.today()->addMonths(3)->toDateString(),'reason'=>'required|string|max:200']);
  return DB::transaction(function()use($q,$v){Setting::firstOrCreate(['key'=>'training_policy'],['value'=>TrainingPolicy::defaults()]);$setting=Setting::where('key','training_policy')->lockForUpdate()->first();$p=array_replace(TrainingPolicy::defaults(),$setting->value);$offer=['code'=>'STAFF-'.strtoupper(bin2hex(random_bytes(4))),'label'=>'Guest courtesy discount','percent'=>(float)$v['percent'],'start'=>today()->toDateString(),'end'=>$v['end'],'public'=>false,'guest_id'=>(int)$v['guest_id'],'single_use'=>true,'issued_by'=>$q->user()->id,'reason'=>$v['reason']];$p['promos'][]=$offer;$setting->update(['value'=>$p]);HotelService::audit('promotion.issued',$offer['code'],['guest_id'=>$v['guest_id'],'percent'=>$v['percent'],'reason'=>$v['reason']]);return $offer;});
 }
 public function auditSummary(Request $q){
  $department=$q->query('department','Restaurant');abort_unless(in_array($department,['Hotel','Restaurant']),422);abort_unless($q->user()->role==='admin'||($department==='Hotel'&&$q->user()->role==='frontdesk')||($department==='Restaurant'&&$q->user()->role==='restaurant'),403);
  $date=BusinessDate::date($department);$p=Payment::whereDate('created_at',$date)->when($department==='Restaurant',fn($b)=>$b->whereNotNull('restaurant_order_id'),fn($b)=>$b->whereNotNull('reservation_id'))->get();
  $pending=PaymentCheckout::whereIn('status',['Creating','Pending','Review'])->when($department==='Restaurant',fn($b)=>$b->whereNotNull('restaurant_order_id'),fn($b)=>$b->whereNull('restaurant_order_id'))->count();
  return ['department'=>$department,'date'=>$date,'expected_cash'=>round($p->where('method','Cash')->where('kind','Payment')->sum('amount')-$p->where('method','Cash')->where('kind','Refund')->sum('amount'),2),'collections'=>$p->where('kind','Payment')->sum('amount'),'refunds'=>$p->where('kind','Refund')->sum('amount'),'room_charges'=>$department==='Restaurant'?RestaurantOrder::whereDate('settled_at',$date)->where('settlement','Room')->sum('amount'):0,'open_orders'=>$department==='Restaurant'?RestaurantOrder::whereDate('created_at','<=',$date)->where('status','Open')->count():0,'pending_checkouts'=>$pending,'history'=>DB::table('business_closings')->where('department',$department)->latest('business_date')->limit(20)->get()];
 }
 public function paymentStatus(Request $q){abort_unless(in_array($q->user()->role,['admin','frontdesk','restaurant']),403);return ['test_only'=>true,'secret_key_configured'=>str_starts_with((string)config('paymongo.secret_key'),'sk_test_'),'webhook_configured'=>(bool)config('paymongo.webhook_secret'),'callback_url'=>url('/webhooks/paymongo'),'instructions'=>'Configure test keys privately in .env; register a public HTTPS test webhook. Never enter keys in chat or in a public form.'];}
}
