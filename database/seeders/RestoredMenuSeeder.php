<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\MenuItem;
class RestoredMenuSeeder extends Seeder {
 public function run():void {
  $items=json_decode(file_get_contents(database_path('data/restored-menu.json')),true,512,JSON_THROW_ON_ERROR);
  DB::transaction(function()use($items){foreach($items as $item){
   $menu=MenuItem::firstOrCreate(['name'=>$item['name']],['category'=>$item['category'],'price'=>$item['price'],'available'=>$item['available']]);
   $updates=['description'=>$item['desc']?:$menu->description];
   foreach(['photo','photo_credit','photo_source','photo_license','photo_license_url'] as $field)if(array_key_exists($field,$item))$updates[$field]=$item[$field];
   $menu->update($updates);
  }});
 }
}
