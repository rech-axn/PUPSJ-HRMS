<?php
namespace Tests\Feature;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\RoomType;
class RoomsShowcaseTest extends TestCase {
 use RefreshDatabase;
 public function test_rooms_and_deals_shows_room_details_without_a_booking_form():void {
  $this->withoutVite();RoomType::create(['name'=>'Standard','rate'=>3200,'capacity'=>2,'description'=>'A comfortable room.']);
  $this->get('/pages/rooms/rooms-deals.html')->assertOk()->assertViewIs('rooms-showcase')->assertSee('Standard')->assertSee('Book Now')->assertSee('/booking?type=Standard',false)->assertDontSee('id="bookingSidebar"',false)->assertDontSee('type="date"',false);
 }
 public function test_booking_is_public_and_separate_from_the_room_showcase():void {
  $this->withoutVite();$this->get('/booking?type=Standard')->assertOk()->assertViewIs('booking')->assertSee('id="bookingSidebar"',false)->assertSee('id="bookingContent"',false)->assertDontSee('class="rooms-showcase-list"',false);
 }
}
