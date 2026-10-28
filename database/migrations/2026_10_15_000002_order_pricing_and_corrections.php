<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {
  Schema::table('restaurant_orders',function(Blueprint $t){$t->json('pricing')->nullable();$t->string('discount_category')->default('None');$t->text('discount_verification')->nullable();});
  Schema::table('folio_charges',function(Blueprint $t){$t->unsignedBigInteger('reversal_of')->nullable()->unique();$t->foreign('reversal_of')->references('id')->on('folio_charges')->restrictOnDelete();});
 }
 public function down():void {throw new RuntimeException('Restore a verified backup to reverse financial schema changes.');}
};
