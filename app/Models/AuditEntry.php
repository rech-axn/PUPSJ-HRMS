<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AuditEntry extends Model {protected $guarded=[];protected $casts=['details'=>'array'];}
