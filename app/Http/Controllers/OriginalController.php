<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Services\OriginalSnapshot;
class OriginalController extends Controller {
 public function page(Request $q,string $area,string $page){
  $allowed=['auth','main','guest','hotel','restaurant','management','rooms'];abort_unless(in_array($area,$allowed)&&preg_match('/^[a-z-]+$/',$page),404);
  $role=$q->user()?->role;
  if(!in_array($area,['auth','main'])&&!($area==='rooms'&&$page==='rooms-deals')){
   if(!$role)return redirect(url('/login'));
   $valid=$role==='admin'||($area==='guest'&&$role==='guest')||($area==='hotel'&&in_array($role,['frontdesk','housekeeping']))||($area==='restaurant'&&$role==='restaurant');abort_unless($valid,403);
   if($role==='housekeeping')abort_unless(in_array($page,['housekeeping','messages','dashboard']),403);
  }
  if($area==='rooms'&&$page==='rooms-deals')return view('rooms-showcase',['originalBootstrap'=>OriginalSnapshot::make($q->user())]);
  abort_unless(view()->exists('original.'.$area.'.'.$page),404);
  return view('original.'.$area.'.'.$page,['originalBootstrap'=>OriginalSnapshot::make($q->user())]);
 }
 public function config(Request $q){abort_unless($q->user()?->role==='admin',403);$v=$q->validate(['config'=>'required|array']);abort_if(strlen(json_encode($v['config']))>20000,422);\App\Models\Setting::updateOrCreate(['key'=>'original_ui_config'],['value'=>$v['config']]);\App\Services\HotelService::audit('settings.updated','original-ui');return ['ok'=>true];}
 public function snapshot(Request $q){return OriginalSnapshot::make($q->user());}
 public function auxiliary(Request $q){
  $v=$q->validate(['entity'=>'required|in:threads,inquiries,maintenance,feedback,hkRequests,approvalRequests,tableRes,hkMetadata','record'=>'required|array','record.id'=>'required|string|max:100','record.subject'=>'sometimes|string|max:180','record.message'=>'sometimes|string|max:4000']);
  $entity=$v['entity'];$record=$v['record'];$role=$q->user()?->role;
  abort_unless($role||$entity==='inquiries',401);if($role==='restaurant')abort_unless(in_array($entity,['threads','tableRes']),403);
  if($role==='guest')abort_unless(in_array($entity,['threads','feedback','hkRequests','tableRes']),403);
  if(in_array($entity,['maintenance','approvalRequests','hkMetadata']))abort_unless(in_array($role,['admin','frontdesk','housekeeping']),403);
  if(strlen(json_encode($record))>30000)abort(422,'Record is too large.');
  return \Illuminate\Support\Facades\DB::transaction(function()use($q,$v,$entity,$record,$role){
   $b=\Illuminate\Support\Facades\DB::table('original_ui_records')->where('entity',$entity)->where('record_key',$record['id']);$old=$b->lockForUpdate()->first();
   if($old&&$role==='guest')abort_unless($old->owner_id===$q->user()->id,403);
   if($old&&!$role)abort(403);
   if($role==='guest'&&$entity==='threads'){ $prior=$old?json_decode($old->data,true):[];$messages=$record['messages']??[];$existing=$prior['messages']??[];abort_unless(array_slice($messages,0,count($existing))===$existing,422);foreach(array_slice($messages,count($existing)) as $message)abort_unless(($message['from']??'')==='Guest',422);}
   if($role==='guest'){$record['guestName']=$q->user()->name;$record['guestEmail']=$q->user()->email;$record['owner_id']=$q->user()->id;}
   $values=['data'=>json_encode($record),'updated_at'=>now()];
   if($old)$b->update($values);else \Illuminate\Support\Facades\DB::table('original_ui_records')->insert([...$values,'entity'=>$entity,'record_key'=>$record['id'],'owner_id'=>$q->user()?->id,'created_at'=>now()]);
   \App\Services\HotelService::audit('original.'.$entity.'.saved',$record['id']);return $record;
  });
 }
 public function remove(Request $q,string $kind,int $id){
  abort_unless($q->user()?->role==='admin',403);$map=['room-types'=>\App\Models\RoomType::class,'rooms'=>\App\Models\Room::class,'menu'=>\App\Models\MenuItem::class,'tables'=>\App\Models\DiningTable::class];abort_unless(isset($map[$kind]),404);
  try{$map[$kind]::findOrFail($id)->delete();}catch(\Illuminate\Database\QueryException $e){abort(422,'This record has history and cannot be deleted. Keep it or mark it unavailable.');}
  \App\Services\HotelService::audit($kind.'.deleted',(string)$id);return ['ok'=>true];
 }
}
