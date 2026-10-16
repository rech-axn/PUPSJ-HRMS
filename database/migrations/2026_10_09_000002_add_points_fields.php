<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {public function up():void{Schema::table('room_types',fn(Blueprint $t)=>$t->unsignedInteger('points_per_night')->default(0));Schema::table('reservations',fn(Blueprint $t)=>$t->unsignedInteger('points_redeemed')->default(0));}public function down():void{Schema::table('room_types',fn(Blueprint $t)=>$t->dropColumn('points_per_night'));Schema::table('reservations',fn(Blueprint $t)=>$t->dropColumn('points_redeemed'));}};
