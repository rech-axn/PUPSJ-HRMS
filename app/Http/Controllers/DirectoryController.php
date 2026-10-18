<?php
namespace App\Http\Controllers;
use App\Models\{Guest,User,RoomType,Room,MenuItem,AuditEntry,Setting,Reservation};
use App\Services\HotelService as Hotel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
class DirectoryController extends Controller {
 private const TYPES=['guests'=>Guest::class,'room-types'=>RoomType::class,'rooms'=>Room::class,'menu'=>MenuItem::class,'employees'=>User::class,'tables'=>\App\Models\DiningTable::class];
 private function model(string $kind):string {abort_unless(isset(self::TYPES[$kind]),404);return self::TYPES[$kind];}
 private function access(Request $r,string $kind,bool $write):void {if($r->user()->role==='restaurant')abort_unless(!$write&&in_array($kind,['menu','tables']),403);if($r->user()->role==='housekeeping')abort_unless(!$write&&$kind==='rooms',403);if($write&&in_array($kind,['menu','tables']))abort_unless($r->user()->role==='admin',403);if($kind==='employees'||($write&&in_array($kind,['room-types','rooms'])))abort_unless($r->user()->role==='admin',403);}
 public function index(Request $r,string $kind){$this->access($r,$kind,false);$model=$this->model($kind);$b=$model::query();if($kind==='employees')$b->where('role','!=','guest');if($kind==='rooms')$b->with('type');if($kind==='guests'&&$r->boolean('in_house'))$b->whereIn('id',DB::table('reservation_occupants')->join('reservations','reservations.id','=','reservation_occupants.reservation_id')->where('reservations.status','Checked-in')->select('reservation_occupants.guest_id'));return $b->orderBy('id')->get();}
 public function save(Request $r,string $kind,?int $id=null){$this->access($r,$kind,true);$model=$this->model($kind);$record=$id?$model::findOrFail($id):new $model;
  if(in_array($kind,['guests','employees']))$r->merge(['email'=>$r->email?strtolower(trim($r->email)):null,'phone'=>AuthController::phone($r->phone)]);
  $rules=match($kind){
   'tables'=>['label'=>['required','string','max:30',Rule::unique('dining_tables')->ignore($id)],'capacity'=>'required|integer|min:1|max:50','status'=>'required|in:Available,Blocked'],
   'guests'=>['name'=>'required|string|max:180','email'=>'required|email|max:254','phone'=>['nullable','regex:/^\+639\d{9}$/'],'address'=>'nullable|string|max:1000','birth_date'=>'nullable|date|before:today'],
   'room-types'=>['name'=>['required','string','max:100',Rule::unique('room_types')->ignore($id)],'rate'=>'required|numeric|min:0.01|max:999999','capacity'=>'required|integer|min:1|max:20','points_per_night'=>'sometimes|integer|min:0|max:100000','description'=>'nullable|string|max:2000','photo'=>'nullable|url:http,https|max:255','bed_size'=>'nullable|string|max:150','extra_capacity'=>'sometimes|integer|min:0|max:1','extra_person_rate'=>'sometimes|numeric|min:0|max:99999','accessible_room'=>'sometimes|boolean','accessible_bathroom'=>'sometimes|boolean'],
   'rooms'=>['number'=>['required','string','max:20',Rule::unique('rooms')->ignore($id)],'room_type_id'=>'required|exists:room_types,id','housekeeping_status'=>'required|in:Clean,Dirty,Cleaning,Inspected','out_of_service'=>'required|boolean','floor'=>'sometimes|nullable|integer|min:1|max:99','accessible_room'=>'sometimes|boolean','accessible_bathroom'=>'sometimes|boolean'],
   'menu'=>['name'=>'required|string|max:180','category'=>'required|string|max:80','price'=>'required|numeric|min:0.01|max:999999','available'=>'required|boolean'],
   'employees'=>['name'=>'required|string|max:180','email'=>['required','email',Rule::unique('users')->ignore($id)],'phone'=>['nullable','regex:/^\+639\d{9}$/',Rule::unique('users')->ignore($id)],'password'=>($id?'nullable':'required').'|string|min:10','role'=>'required|in:admin,frontdesk,restaurant,housekeeping','active'=>'required|boolean']};
  $v=$r->validate($rules);return DB::transaction(function()use($kind,$record,$v,$id){
   if($kind==='employees'){if($record->id===auth()->id()&&(!$v['active']||$v['role']!=='admin'))Hotel::fail('You cannot disable or demote your current administrator account.');if(empty($v['password']))unset($v['password']);else $v['password']=Hash::make($v['password']);}
   if($kind==='guests'&&$id){$account=User::where('guest_id',$id)->lockForUpdate()->first();if($account){validator($v,['email'=>['required','email',Rule::unique('users')->ignore($account->id)],'phone'=>['required',Rule::unique('users')->ignore($account->id)]])->validate();$account->update(collect($v)->only(['name','email','phone'])->all());}}
   if($kind==='rooms'&&$id&&Reservation::where('room_id',$id)->where('status','Checked-in')->exists()&&($v['out_of_service']||$v['room_type_id']!=$record->room_type_id))Hotel::fail('Do not change availability or type of an occupied room.');
   if($kind==='tables'&&$id&&\App\Models\RestaurantOrder::where('dining_table_id',$id)->where('status','Open')->exists())Hotel::fail('Settle or void the open table order before changing this table.');$record->fill($v)->save();Hotel::audit($kind.'.saved',(string)$record->id);return $record;
  });
 }
 public function housekeeping(Request $r,Room $room){$v=$r->validate(['housekeeping_status'=>'required|in:Clean,Dirty,Cleaning,Inspected']);$room->update($v);Hotel::audit('room.housekeeping',(string)$room->id,$v);return $room;}
 public function profile(Request $r){$u=$r->user();$r->merge(['email'=>strtolower(trim((string)$r->email)),'phone'=>AuthController::phone($r->phone)]);$v=$r->validate(['name'=>'required|string|max:180','email'=>['required','email',Rule::unique('users')->ignore($u->id)],'phone'=>['required','regex:/^\+639\d{9}$/',Rule::unique('users')->ignore($u->id)]]);return DB::transaction(function()use($u,$v){$u->update($v);if($u->guest_id)Guest::findOrFail($u->guest_id)->update($v);return $u;});}
 public function audit(){return AuditEntry::orderByDesc('id')->limit(500)->get();}
 public function photo(Request $r,RoomType $type){$r->validate(['photo'=>'required|image|mimes:jpg,jpeg,png,webp|max:5120']);$name=bin2hex(random_bytes(16)).'.'.$r->file('photo')->extension();$r->file('photo')->move(public_path('uploads/rooms'),$name);$type->update(['photo'=>asset('uploads/rooms/'.$name)]);Hotel::audit('room-type.photo-uploaded',(string)$type->id);return $type;}
 public function settings(Request $r){if($r->isMethod('post')){$v=$r->validate(['hotelName'=>'required|string|max:100','address'=>'required|string|max:255','contactEmail'=>'required|email']);Setting::updateOrCreate(['key'=>'property'],['value'=>$v]);Hotel::audit('settings.updated','property');}return Setting::where('key','property')->first()?->value??['hotelName'=>'PUPSJ Hotel & Restaurant','address'=>'223 Ortega St., San Juan City','contactEmail'=>'reservations@pupsjhotel.com'];}
}
