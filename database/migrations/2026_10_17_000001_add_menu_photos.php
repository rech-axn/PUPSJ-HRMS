<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::table('menu_items',function(Blueprint $t){$t->text('description')->nullable();$t->string('photo',1024)->nullable();$t->text('photo_credit')->nullable();$t->string('photo_source',1024)->nullable();$t->string('photo_license')->nullable();$t->string('photo_license_url',1024)->nullable();});}
 public function down():void {Schema::table('menu_items',fn(Blueprint $t)=>$t->dropColumn(['description','photo','photo_credit','photo_source','photo_license','photo_license_url']));}
};
