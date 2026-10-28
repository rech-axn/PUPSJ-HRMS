<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
 public function up(): void {
  Schema::table('room_types',function(Blueprint $t){
   $t->string('bed_size')->nullable(); $t->unsignedInteger('extra_capacity')->default(0);
   $t->decimal('extra_person_rate',12,2)->default(0); $t->boolean('accessible_room')->default(false);
   $t->boolean('accessible_bathroom')->default(false);
  });
  Schema::table('reservations',function(Blueprint $t){
   $t->foreignId('room_type_id')->nullable()->constrained()->restrictOnDelete();
   $t->unsignedInteger('adults')->default(1);$t->unsignedInteger('children')->default(0);
   $t->string('breakfast')->default('None');$t->unsignedInteger('breakfast_pax')->default(0);
   $t->string('source')->default('Online');$t->string('promo_code')->nullable();
   $t->json('pricing')->nullable();$t->string('company_name')->nullable();
   $t->string('discount_category')->default('None');$t->text('discount_verification')->nullable();
  });
  DB::table('reservations')->orderBy('id')->get()->each(function($r){DB::table('reservations')->where('id',$r->id)->update(['room_type_id'=>DB::table('rooms')->where('id',$r->room_id)->value('room_type_id'),'adults'=>$r->guest_count]);});
  Schema::table('reservations',fn(Blueprint $t)=>$t->unsignedBigInteger('room_id')->nullable()->change());
  Schema::table('payments',function(Blueprint $t){$t->string('batch_reference')->nullable()->index();$t->string('provider_reference')->nullable()->unique();$t->string('posting_location')->default('Hotel');});
  Schema::table('restaurant_orders',function(Blueprint $t){$t->string('service_status')->default('Recorded');$t->text('delivery_notes')->nullable();});
  Schema::create('dining_tables',function(Blueprint $t){$t->id();$t->string('label')->unique();$t->unsignedInteger('capacity');$t->string('status')->default('Available');$t->timestamps();});
  Schema::table('restaurant_orders',function(Blueprint $t){$t->foreignId('dining_table_id')->nullable()->constrained();$t->string('channel')->default('Dine-in');$t->foreignId('delivery_reservation_id')->nullable()->constrained('reservations');});
  Schema::create('payment_checkouts',function(Blueprint $t){$t->id();$t->uuid('reference')->unique();$t->foreignId('created_by')->constrained('users');$t->foreignId('restaurant_order_id')->nullable()->constrained();$t->json('allocations');$t->unsignedBigInteger('amount_centavos');$t->string('method');$t->string('provider_session')->nullable()->unique();$t->text('checkout_url')->nullable();$t->string('status')->default('Creating');$t->timestamps();});
  Schema::create('confirmation_letters',function(Blueprint $t){$t->id();$t->foreignId('reservation_id')->constrained();$t->string('email');$t->text('body');$t->string('status')->default('Pending');$t->timestamps();});
  Schema::create('business_closings',function(Blueprint $t){$t->id();$t->date('business_date');$t->string('department');$t->foreignId('closed_by')->constrained('users');$t->json('summary');$t->timestamps();$t->unique(['business_date','department']);});
  Schema::create('service_requests',function(Blueprint $t){$t->id();$t->foreignId('guest_id')->constrained();$t->string('department');$t->text('message');$t->string('status')->default('Open');$t->text('resolution')->nullable();$t->timestamps();});
 }
 public function down(): void {throw new RuntimeException('Restore a verified backup rather than dropping recommendation records.');}
};
