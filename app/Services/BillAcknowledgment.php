<?php
namespace App\Services;
use App\Models\{Reservation,RestaurantOrder};
use Illuminate\Support\Facades\DB;
class BillAcknowledgment {
 public static function hash(string $type,int $id):string {
  if($type==='Hotel'){$r=Reservation::findOrFail($id);$f=HotelService::folio($r);$data=[$r->code,(string)$r->amount,$r->pricing,$f['charges']->map(fn($c)=>[$c->id,(string)$c->amount,$c->description])->all()];}
  else{$o=RestaurantOrder::with('items')->findOrFail($id);$data=[$o->code,(string)$o->amount,$o->items->map(fn($i)=>[$i->id,$i->name,$i->quantity,(string)$i->unit_price])->all()];}
  return hash('sha256',json_encode($data));
 }
 public static function current(string $type,int $id):?object {return DB::table('bill_acknowledgments')->where('bill_type',$type)->where('bill_id',$id)->where('bill_hash',self::hash($type,$id))->latest('id')->first();}
 public static function record(string $type,int $id,string $name,int $userId):object {
  $hash=self::hash($type,$id);$existing=self::current($type,$id);if($existing)return $existing;
  $key=DB::table('bill_acknowledgments')->insertGetId(['bill_type'=>$type,'bill_id'=>$id,'bill_hash'=>$hash,'acknowledged_by'=>$name,'recorded_by'=>$userId,'acknowledged_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);
  HotelService::audit('bill.acknowledged',$type.'-'.$id,['acknowledged_by'=>$name,'bill_hash'=>$hash]);return DB::table('bill_acknowledgments')->find($key);
 }
 public static function require(string $type,int $id):void {if((TrainingPolicy::get()['require_bill_acknowledgment']??false)&&!self::current($type,$id))HotelService::fail('Present the current Statement of Account and record guest acknowledgment before final settlement. Changed charges require a new acknowledgment.');}
}
