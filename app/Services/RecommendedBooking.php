<?php
namespace App\Services;
use App\Models\{RoomType,Room,Reservation,Guest};
use Illuminate\Support\Facades\DB;
class RecommendedBooking {
 public static function available(RoomType $type,string $from,string $to,?int $except=null): bool {
  $stock=$type->rooms()->where('out_of_service',false)->count();
  // Count the peak overlapping nightly occupancy, not the sum of disjoint stays.
  for($day=\Carbon\Carbon::parse($from);$day->lt(\Carbon\Carbon::parse($to));$day->addDay()){
   $used=Reservation::where('room_type_id',$type->id)->when($except,fn($q)=>$q->where('id','!=',$except))->whereNotIn('status',['Cancelled','Checked-out'])->where('arrival','<=',$day->toDateString())->where('departure','>',$day->toDateString())->count();
   if($used>=$stock)return false;
  }return $stock>0;
 }
 public static function create(array $v,int $guestId,bool $staff): Reservation {return DB::transaction(function()use($v,$guestId,$staff){
  $type=RoomType::lockForUpdate()->findOrFail($v['room_type_id']);
  if(!filter_var(Guest::findOrFail($guestId)->email,FILTER_VALIDATE_EMAIL))HotelService::fail('A valid guest email is required for confirmation on every booking channel.');
  if(!self::available($type,$v['arrival'],$v['departure']))HotelService::fail('Room type is unavailable for these dates.');
  if(!$staff&&($v['discount_category']??'None')!=='None')HotelService::fail('Senior and PWD discounts require staff verification.');
  if(($v['discount_category']??'None')!=='None'&&empty($v['discount_verification']))HotelService::fail('Record the discount eligibility review, without storing ID images or numbers.');
  $nights=(int)\Carbon\Carbon::parse($v['arrival'])->diffInDays($v['departure']);$price=TrainingPolicy::quote($type,$v,$nights);
  $r=Reservation::create(['code'=>'HTL-'.strtoupper(bin2hex(random_bytes(5))),'guest_id'=>$guestId,'payer_guest_id'=>$staff?($v['payer_guest_id']??$guestId):$guestId,'room_type_id'=>$type->id,'room_id'=>null,'arrival'=>$v['arrival'],'departure'=>$v['departure'],'guest_count'=>$v['adults']+($v['children']??0),'adults'=>$v['adults'],'children'=>$v['children']??0,'breakfast'=>$v['breakfast']??'None','breakfast_pax'=>$v['breakfast_pax']??0,'amount'=>$price['total'],'pricing'=>$price,'booking_details'=>$v['booking_details']??null,'requests'=>$v['requests']??null,'source'=>$staff?($v['source']??'Walk-in'):'Online','promo_code'=>$v['promo_code']??null,'company_name'=>$v['company_name']??null,'discount_category'=>$v['discount_category']??'None','discount_verification'=>$v['discount_verification']??null]);
  $r->occupants()->sync($staff?($v['occupant_ids']??[$guestId]):[$guestId]);HotelService::audit('reservation.created',$r->code,['source'=>$r->source]);ConfirmationService::prepare($r);return $r->load('guest','type');
 });}
 public static function assign(Reservation $r,int $roomId): Reservation {return DB::transaction(function()use($r,$roomId){
  RoomType::lockForUpdate()->findOrFail($r->room_type_id);
  $r=Reservation::lockForUpdate()->findOrFail($r->id);$room=Room::lockForUpdate()->findOrFail($roomId);
  if($r->status!=='Confirmed'||$r->arrival>today()->toDateString()||$r->departure<=today()->toDateString())HotelService::fail('Assign rooms only for an eligible arriving reservation.');
  if($room->room_type_id!==$r->room_type_id||$room->out_of_service||!in_array($room->housekeeping_status,['Clean','Inspected']))HotelService::fail('Select a ready room of the reserved type.');
  if(Reservation::where('room_id',$roomId)->where('id','!=',$r->id)->whereNotIn('status',['Cancelled','Checked-out'])->where('arrival','<',$r->departure)->where('departure','>',$r->arrival)->exists())HotelService::fail('Room is already assigned for overlapping dates.');
  $r->update(['room_id'=>$roomId]);HotelService::audit('room.assigned',$r->code,['room'=>$room->number]);return $r;
 });}
}
