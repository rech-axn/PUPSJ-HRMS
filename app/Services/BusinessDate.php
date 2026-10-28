<?php
namespace App\Services;
use App\Models\{Setting,PaymentCheckout};
class BusinessDate {
 public static function date(string $department):string {return Setting::firstOrCreate(['key'=>'business_date_'.$department],['value'=>['date'=>today()->toDateString()]])->value['date'];}
 public static function assertOpen(string $department):void {
  if(self::date($department)!==today()->toDateString())HotelService::fail('Reconcile and advance the '.$department.' business date before posting new transactions.');
 }
 public static function assertNoOrderCheckout(int $id):void {if(PaymentCheckout::where('restaurant_order_id',$id)->whereIn('status',['Creating','Pending','Review'])->exists())HotelService::fail('Reconcile the pending checkout before changing this order.');}
 public static function assertNoCheckout(int $id):void {
  if(PaymentCheckout::whereIn('status',['Creating','Pending','Review'])->get()->contains(fn($x)=>collect($x->allocations)->contains(fn($a)=>(int)$a['reservation_id']===$id)))HotelService::fail('A payment checkout is pending or needs review. Reconcile it before changing this folio.');
 }
}
