<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Services\{IntentClassifier,TrainingPolicy};
use App\Models\RoomType;
class ChatController extends Controller {
 public function answer(Request $q){$v=$q->validate(['message'=>'required|string|min:2|max:500']);$result=IntentClassifier::predict($v['message']);$p=TrainingPolicy::get();
  $answer=match($result['intent']){
   'breakfast'=>'Breakfast may be None, Buffet or Plated. Buffet: PHP '.number_format($p['breakfast_buffet_rate'],2).'; plated: PHP '.number_format($p['breakfast_plated_rate'],2).' per selected guest per night. Choose the number of breakfasts when booking.',
   'capacity'=>'Choose adults and children separately. Each room type shows included capacity, maximum extra guests and the extra-person rate. Children count toward occupancy.',
   'booking'=>'Choose stay dates and a room type, sign in, enter booking details and confirm. A room number is assigned by Hotel Staff at check-in. An email address is required for every booking channel.',
   'checkin'=>'Check-in starts at 2:00 PM and checkout is by 12:00 PM under the training policy. Hotel Staff verify your reservation and assign a ready room.',
   'payment'=>'Payments may be recorded as cash by authorized staff or made through PayMongo test checkout using QR Ph or debit/credit card. This is a training system; no live payments are enabled.',
   'deposit'=>'A deposit is optional. The configured deposit is '.$p['deposit_percent'].'% of the booking total. An advance-payment discount is '.$p['advance_discount_percent'].'% under the configured training policy. The remaining balance is shown on your folio.',
   'accessibility'=>'Accessible room and bathroom features are listed for each room type. Ask Hotel Staff to confirm the features needed before booking.',
   'parking'=>'The configured parking capacity is '.$p['parking_spaces'].' spaces. Spaces are subject to availability and are not guaranteed by a room reservation.',
   'food_policy'=>$p['outside_food_allowed']?'Outside food is allowed under the configured property policy.':'Outside food is not permitted under the configured property policy.',
   'requests'=>'Use Guest Requests to send a request to Hotel or Restaurant Staff. Special requests are subject to availability and confirmation.',
   'cancellation'=>'Open your own reservation to request a date change or cancellation. Eligibility and any cancellation charges are checked before saving. Contact Hotel Staff for help.',
   'restaurant'=>'Restaurant Staff handle orders, dining requests and room-service delivery. Eligible restaurant orders can be charged once to an active guest folio or paid directly.',
   'discount'=>'Public offers appear on the booking page; private promotions require a valid code. Senior and PWD discounts require authorized staff verification and follow configured approved policy.',
   default=>'I could not confidently match that question. Please contact Hotel or Restaurant Staff. Signed-in guests can send a request using the Guest Requests panel.',
  };
  return [...$result,'answer'=>$answer,'handoff'=>$result['intent']==='fallback'];
 }
}
