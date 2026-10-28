<?php
namespace App\Services;
use App\Models\Reservation;
use Illuminate\Support\Facades\{DB,Mail};
class ConfirmationService {
 public static function prepare(Reservation $r): void {
  $r->load('guest','type');$p=TrainingPolicy::get();
  $body="Dear {$r->guest->name},\n\nYour reservation {$r->code} is confirmed.\nRoom type: {$r->type->name}\nArrival: {$r->arrival}\nDeparture: {$r->departure}\nAdults: {$r->adults}; Children: {$r->children}\nBreakfast: {$r->breakfast} for {$r->breakfast_pax} guest(s) per night\nTotal: PHP ".number_format($r->amount,2)."\nRoom number will be assigned by Hotel Staff at check-in.\nSpecial requests: ".($r->requests?:'None')."\nSpecial requests are subject to availability and confirmation.\n\n{$p['confirmation_reminders']}\nParking capacity: {$p['parking_spaces']} spaces, subject to availability.\nOutside food: ".($p['outside_food_allowed']?'Allowed under property policy.':'Not permitted.')."\n\nThis is a training reservation using sample data.";
  foreach(($r->pricing['services']??[]) as $s)$body.="\nAdditional service: {$s['name']} x {$s['quantity']} for {$s['nights']} night(s): PHP ".number_format($s['amount'],2);
  $id=DB::table('confirmation_letters')->insertGetId(['reservation_id'=>$r->id,'email'=>$r->guest->email,'body'=>$body,'status'=>'Pending','created_at'=>now(),'updated_at'=>now()]);
  DB::afterCommit(function()use($r,$body,$id){try{Mail::raw($body,fn($m)=>$m->to($r->guest->email)->subject('Reservation Confirmation '.$r->code));DB::table('confirmation_letters')->where('id',$id)->update(['status'=>config('mail.default')==='smtp'?'Sent':'Logged','updated_at'=>now()]);}catch(\Throwable $e){DB::table('confirmation_letters')->where('id',$id)->update(['status'=>'Failed','updated_at'=>now()]);report($e);}});
 }
}
