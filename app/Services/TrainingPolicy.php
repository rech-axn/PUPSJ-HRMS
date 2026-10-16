<?php
namespace App\Services;
use App\Models\Setting;
class TrainingPolicy {
 public static function restaurantPrice(float $subtotal,string $category='None',?string $verification=null):array {
  $p=self::get();if($category!=='None'&&!$verification)HotelService::fail('Record a staff eligibility review for the discount.');$rate=$category==='None'?0:(float)$p[strtolower($category).'_discount_percent'];$discount=round($subtotal*$rate/100,2);$tax=round(($subtotal-$discount)*(float)$p['local_tax_percent']/100,2);return ['subtotal'=>$subtotal,'discount'=>$discount,'local_tax'=>$tax,'local_tax_percent'=>$p['local_tax_percent'],'total'=>round($subtotal-$discount+$tax,2)];
 }
 public static function defaults(): array {return [
  'breakfast_buffet_rate'=>0,'breakfast_plated_rate'=>0,'deposit_percent'=>50,
  'advance_discount_percent'=>0,'senior_discount_percent'=>0,'pwd_discount_percent'=>0,
  'local_tax_percent'=>0,'parking_spaces'=>0,'outside_food_allowed'=>false,
  'confirmation_reminders'=>'Check-in from 2:00 PM; checkout by 12:00 PM. Special requests are subject to availability and confirmation.',
  'promos'=>[],
 ];}
 public static function get(): array {return array_replace(self::defaults(),Setting::where('key','training_policy')->first()?->value??[]);}
 public static function cents($n): int {return (int)round((float)$n*100,0,PHP_ROUND_HALF_UP);}
 public static function quote($type,array $v,int $nights): array {
  $p=self::get();$count=(int)$v['adults']+(int)($v['children']??0);
  if($count>$type->capacity+$type->extra_capacity)HotelService::fail('Party exceeds this room type capacity, including permitted extra guests.');
  $room=self::cents($type->rate)*$nights;
  $extra=max(0,$count-$type->capacity)*self::cents($type->extra_person_rate)*$nights;
  $breakfast=$v['breakfast']??'None';$pax=(int)($v['breakfast_pax']??0);
  if($pax>$count||($breakfast==='None'&&$pax>0)||($breakfast!=='None'&&$pax<1))HotelService::fail('Choose a valid breakfast guest count.');
  $food=self::cents($p['breakfast_'.strtolower($breakfast).'_rate']??0)*$pax*$nights;
  $category=$v['discount_category']??'None';$percent=0;$promo=null;
  if($category!=='None')$percent=(float)$p[strtolower($category).'_discount_percent'];
  if(!empty($v['promo_code'])){
   foreach($p['promos'] as $offer)if(strcasecmp($offer['code'],$v['promo_code'])===0 && $offer['start']<=today()->toDateString() && $offer['end']>=today()->toDateString())$promo=$offer;
   if(!$promo)HotelService::fail('Promo is invalid or outside its dates.');
   if($category!=='None')HotelService::fail('Select one verified discount or promotion; discounts do not stack.');
   $percent=(float)$promo['percent'];
  }
  $discount=(int)round(($room+$extra)*$percent/100);
  $services=0;$selected=[];foreach(($v['services']??[]) as $item){$offer=collect(Setting::where('key','booking_services')->first()?->value??[])->first(fn($s)=>(string)$s['id']===(string)$item['id']&&($s['active']??true));if(!$offer)HotelService::fail('A selected service is no longer available.');$amount=self::cents($offer['price'])*(int)$item['quantity']*$nights;$services+=$amount;$selected[]=['id'=>$offer['id'],'name'=>$offer['name'],'quantity'=>(int)$item['quantity'],'unit_price'=>(float)$offer['price'],'nights'=>$nights,'amount'=>$amount/100];}
  $tax=(int)round(($room+$extra-$discount+$food+$services)*(float)$p['local_tax_percent']/100);
  $total=$room+$extra-$discount+$food+$services+$tax;
  return ['services'=>$selected,'services_total'=>$services/100,'room'=>$room/100,'extra_guests'=>$extra/100,'breakfast'=>$food/100,'discount'=>$discount/100,'local_tax'=>$tax/100,'local_tax_percent'=>(float)$p['local_tax_percent'],'total'=>$total/100,'deposit_due'=>round($total*$p['deposit_percent']/100)/100,'advance_discount_percent'=>(float)$p['advance_discount_percent'],'advance_discount_awarded'=>0,'rate_snapshot'=>['room_rate'=>(float)$type->rate,'extra_rate'=>(float)$type->extra_person_rate,'breakfast_mode'=>$breakfast]];
 }
}
