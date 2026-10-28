<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Room extends Model {protected $guarded=[];protected $casts=['out_of_service'=>'boolean','accessible_room'=>'boolean','accessible_bathroom'=>'boolean','floor'=>'integer'];public function type(){return $this->belongsTo(RoomType::class,'room_type_id');}}
