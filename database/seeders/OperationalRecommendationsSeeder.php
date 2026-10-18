<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\{Setting,RoomType,Room};
use App\Services\TrainingPolicy;
class OperationalRecommendationsSeeder extends Seeder {
 public function run():void {DB::transaction(function(){
  if(Setting::where('key','recommendations_oct18_applied')->exists())return;
  $p=TrainingPolicy::get();$p=array_replace($p,['breakfast_buffet_rate'=>450,'advance_discount_percent'=>5,'advance_min_days'=>7,'require_bill_acknowledgment'=>true,'buffet_inclusions'=>['Garlic rice and steamed rice','Egg station','Beef tapa or chicken adobo (daily rotation)','Vegetable dish','Seasonal fruit and pastries','Coffee, tea, water and juice']]);
  if(!collect($p['promos'])->contains(fn($x)=>strtoupper($x['code'])==='WELCOME10'))$p['promos'][]=['code'=>'WELCOME10','label'=>'First stay: 10% off accommodation','percent'=>10,'start'=>today()->toDateString(),'end'=>today()->addYear()->toDateString(),'public'=>true,'first_time_only'=>true];
  Setting::updateOrCreate(['key'=>'training_policy'],['value'=>$p]);
  foreach([['Standard',2,0,'1 Queen bed (152 × 203 cm)'],['Deluxe City View',2,1,'2 Twin beds (each 99 × 191 cm); optional rollaway'],['Family Suite',4,1,'2 Queen beds (each 152 × 203 cm); optional rollaway'],['Executive Suite',3,1,'1 King bed (193 × 203 cm) and 1 single sofa bed; optional rollaway']] as [$name,$capacity,$extra,$bed]){
   $t=RoomType::where('name',$name)->first();if(!$t)continue;$t->update(['capacity'=>$capacity,'extra_capacity'=>$extra,'extra_person_rate'=>$extra?800:0,'bed_size'=>$bed,'description'=>"$name accommodation for $capacity included guests".($extra?', plus one paid extra guest.':'.'),'accessible_room'=>in_array($name,['Standard','Deluxe City View']),'accessible_bathroom'=>in_array($name,['Standard','Deluxe City View'])]);
  }
  foreach(Room::all() as $room){$accessible=in_array((string)$room->number,['101','102','201','202']);$room->update(['floor'=>ctype_digit((string)$room->number)?max(1,(int)floor((int)$room->number/100)):null,'accessible_room'=>$accessible,'accessible_bathroom'=>$accessible]);}
  Setting::create(['key'=>'recommendations_oct18_applied','value'=>['applied_at'=>now()->toIso8601String(),'scope'=>'Approved training defaults; existing bookings and business dates preserved.']]);
 });}
}
