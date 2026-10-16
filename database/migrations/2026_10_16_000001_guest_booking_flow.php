<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::table('reservations',fn(Blueprint $t)=>$t->json('booking_details')->nullable());Schema::create('guest_booking_requests',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained();$t->uuid('reference')->unique();$t->string('payload_hash',64);$t->json('reservation_ids');$t->timestamps();});}
 public function down():void{Schema::dropIfExists('guest_booking_requests');Schema::table('reservations',fn(Blueprint $t)=>$t->dropColumn('booking_details'));}
};
