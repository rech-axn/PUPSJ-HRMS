<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RestaurantOrder extends Model {protected $guarded=[];protected $casts=['pricing'=>'array'];public function items(){return $this->hasMany(OrderItem::class);} public function reservation(){return $this->belongsTo(Reservation::class);}}
