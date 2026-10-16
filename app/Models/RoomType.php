<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RoomType extends Model {protected $guarded=[];protected $casts=['accessible_room'=>'boolean','accessible_bathroom'=>'boolean'];public function getPhotoAttribute($value){$path=config('property-media.rooms.'.strtolower($this->name).'.0');return $value?:($path?asset($path):null);}public function rooms(){return $this->hasMany(Room::class);}}
