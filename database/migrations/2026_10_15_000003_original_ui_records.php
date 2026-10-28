<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void {Schema::create('original_ui_records',function(Blueprint $t){$t->id();$t->string('entity',40);$t->string('record_key',100);$t->foreignId('owner_id')->nullable()->constrained('users');$t->json('data');$t->timestamps();$t->unique(['entity','record_key']);});}
 public function down():void {Schema::dropIfExists('original_ui_records');}
};
