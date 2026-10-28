<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class PaymentCheckout extends Model {
 protected $guarded=[];
 protected $casts=['allocations'=>'array','amount_centavos'=>'integer'];
}
