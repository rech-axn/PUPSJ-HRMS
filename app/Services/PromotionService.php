<?php
namespace App\Services;
use App\Models\Reservation;
class PromotionService {
 public static function resolve(string $code,array $values):array {
  $promo=collect(TrainingPolicy::get()['promos'])->first(fn($p)=>strcasecmp($p['code'],$code)===0&&$p['start']<=today()->toDateString()&&$p['end']>=today()->toDateString());
  if(!$promo)HotelService::fail('Promo is invalid or outside its validity dates.');
  $guestId=$values['guest_id']??auth()->user()?->guest_id;
  if(!empty($promo['guest_id'])&&(int)$guestId!==(int)$promo['guest_id'])HotelService::fail('This staff-issued code belongs to a different guest.');
  $reference=$values['booking_details']['booking_reference']??null;
  $previous=$guestId?Reservation::where('guest_id',$guestId)->where('status','!=','Cancelled')->get():collect();
  $previous=$previous->reject(fn($r)=>$reference&&($r->booking_details['booking_reference']??null)===$reference);
  if(($promo['first_time_only']??false)&&$previous->isNotEmpty())HotelService::fail('WELCOME10 is for a guest’s first non-cancelled booking only.');
  if(($promo['single_use']??false)&&$previous->contains(fn($r)=>strcasecmp((string)$r->promo_code,$code)===0))HotelService::fail('This promotion has already been used.');
  return $promo;
 }
}
