<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Reservation extends Model {protected $guarded=[];protected $casts=['pricing'=>'array','booking_details'=>'array','room_type_id'=>'integer'];public function type(){return $this->belongsTo(RoomType::class,'room_type_id');}public function guest(){return $this->belongsTo(Guest::class);} public function room(){return $this->belongsTo(Room::class);} public function occupants(){return $this->belongsToMany(Guest::class,'reservation_occupants');} public function charges(){return $this->hasMany(FolioCharge::class);} public function payments(){return $this->hasMany(Payment::class);}}
