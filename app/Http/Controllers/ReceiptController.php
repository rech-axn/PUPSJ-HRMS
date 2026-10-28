<?php
namespace App\Http\Controllers;
use App\Models\Reservation;
use App\Services\HotelService;
use Illuminate\Http\Request;
class ReceiptController extends Controller {public function show(Request $q,Reservation $reservation){abort_unless($q->user()->role!=='guest'||$q->user()->guest_id===$reservation->guest_id,403);return view('receipt',HotelService::folio($reservation));}}
