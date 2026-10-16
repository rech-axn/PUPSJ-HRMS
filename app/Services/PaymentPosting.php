<?php
namespace App\Services;
use App\Models\{Reservation,Payment};
use Illuminate\Support\Facades\DB;
class PaymentPosting {
 public static function lockAllocations(array $allocations): array {
  usort($allocations,fn($a,$b)=>$a['reservation_id']<=>$b['reservation_id']);$rows=[];$payer=null;
  foreach($allocations as $a){$r=Reservation::lockForUpdate()->findOrFail($a['reservation_id']);
   if($r->status==='Checked-out'||$r->status==='Cancelled')HotelService::fail('Select open confirmed or active folios.');
   if($payer!==null && $payer!==$r->payer_guest_id)HotelService::fail('Grouped payments require one shared payer.');$payer=$r->payer_guest_id;
   if(TrainingPolicy::cents($a['amount'])>TrainingPolicy::cents(HotelService::folio($r)['balance']))HotelService::fail('Allocation exceeds a folio balance.');
   $rows[]=[$r,$a];
  }return $rows;
 }
 public static function post(array $rows,string $method,string $reference,int $userId,string $location='Hotel',?string $provider=null):void {
  foreach($rows as [$r,$a]){
   $key=$reference.'-'.$r->id;if(Payment::where('idempotency_key',$key)->exists())continue;
   Payment::create(['reservation_id'=>$r->id,'receipt'=>'RCPT-'.strtoupper(bin2hex(random_bytes(6))),'amount'=>$a['amount'],'method'=>$method,'idempotency_key'=>$key,'batch_reference'=>$reference,'provider_reference'=>$provider?$provider.'-'.$r->id:null,'posting_location'=>$location,'created_by'=>$userId]);
   $pricing=$r->pricing;
   if($r->status==='Confirmed'&&$r->arrival>=today()->toDateString()&&is_array($pricing)&&empty($pricing['advance_discount_awarded'])&&($pricing['advance_discount_percent']??0)>0){
    $paid=HotelService::folio($r)['paid'];
    if($paid>=($pricing['deposit_due']??PHP_INT_MAX)){
     $base=max(0,($pricing['room']??0)+($pricing['extra_guests']??0)-($pricing['discount']??0));
     $discount=round($base*$pricing['advance_discount_percent']/100,2);
     $taxReduction=round($discount*($pricing['local_tax_percent']??0)/100,2);
     $pricing['advance_discount_awarded']=$discount;
     $pricing['local_tax']=round(($pricing['local_tax']??0)-$taxReduction,2);
     $pricing['total']=round($r->amount-$discount-$taxReduction,2);
     $r->update(['amount'=>$pricing['total'],'pricing'=>$pricing]);

    }
   }
   HotelService::audit('payment.posted',$r->code,['posted_by'=>$userId,'location'=>$location,'amount'=>$a['amount'],'batch'=>$reference,'provider'=>$provider]);
  }
 }
}
