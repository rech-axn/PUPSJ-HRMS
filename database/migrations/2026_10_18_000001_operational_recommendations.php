<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::table('rooms',function(Blueprint $t){$t->unsignedTinyInteger('floor')->nullable();$t->boolean('accessible_room')->default(false);$t->boolean('accessible_bathroom')->default(false);});
  Schema::table('reservations',fn(Blueprint $t)=>$t->boolean('requires_accessible_room')->default(false));
  Schema::create('bill_acknowledgments',function(Blueprint $t){$t->id();$t->string('bill_type',20);$t->unsignedBigInteger('bill_id');$t->string('bill_hash',64);$t->string('acknowledged_by',180);$t->foreignId('recorded_by')->constrained('users');$t->timestamp('acknowledged_at');$t->timestamps();$t->index(['bill_type','bill_id']);});
 }
 public function down():void {Schema::dropIfExists('bill_acknowledgments');Schema::table('reservations',fn(Blueprint $t)=>$t->dropColumn('requires_accessible_room'));Schema::table('rooms',fn(Blueprint $t)=>$t->dropColumn(['floor','accessible_room','accessible_bathroom']));}
};
