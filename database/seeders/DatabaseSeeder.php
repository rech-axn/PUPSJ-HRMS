<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\{User,RoomType,Room,MenuItem};
use Illuminate\Support\Facades\Hash;
class DatabaseSeeder extends Seeder {
 public function run(): void {
  if(!User::where('role','admin')->exists()){
   $password=env('HRMS_ADMIN_PASSWORD');if(!$password)throw new \RuntimeException('Set HRMS_ADMIN_PASSWORD before seeding an administrator.');
   User::create(['name'=>'System Administrator','email'=>env('HRMS_ADMIN_EMAIL','admin@pupsj.edu.ph'),'password'=>Hash::make($password),'role'=>'admin']);
  }
  foreach([['Standard',3200,2,101,10],['Deluxe City View',5800,3,201,12],['Family Suite',8900,5,301,10],['Executive Suite',12500,3,501,6]] as [$name,$rate,$capacity,$first,$count]){
   $type=RoomType::firstOrCreate(['name'=>$name],['rate'=>$rate,'capacity'=>$capacity,'points_per_night'=>(int)($rate/10),'description'=>$name.' accommodation for up to '.$capacity.' guests.']);
   for($n=$first;$n<$first+$count;$n++)Room::firstOrCreate(['number'=>(string)$n],['room_type_id'=>$type->id]);
  }
  for($i=1;$i<=8;$i++)\App\Models\DiningTable::firstOrCreate(['label'=>'Table '.$i],['capacity'=>4]);
  foreach([['Chicken Adobo','Main Course',240],['Grilled Fish','Main Course',280],['Vegetable Rice','Rice',120],['Iced Tea','Beverage',60]] as [$name,$category,$price])MenuItem::firstOrCreate(['name'=>$name],compact('category','price'));
 }
}
