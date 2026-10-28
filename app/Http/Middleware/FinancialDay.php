<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Setting;
use App\Services\BusinessDate;
class FinancialDay {
 public function handle(Request $q,Closure $next){
  if($q->isMethod('get')||!$q->user())return $next($q);
  $path=$q->path();$department=null;
  if(preg_match('#^api/orders(?:/|$)#',$path))$department='Restaurant';
  if(preg_match('#^api/(reservations|payments|paymongo/checkout)(?:/|$)#',$path))$department='Hotel';
  if(!$department)return $next($q);
  return DB::transaction(function()use($department,$q,$next){
   $departments=$department==='Restaurant'&&$q->input('settlement')==='Room'?['Hotel','Restaurant']:[$department];
   foreach($departments as $d){BusinessDate::date($d);Setting::where('key','business_date_'.$d)->lockForUpdate()->first();BusinessDate::assertOpen($d);}
   return $next($q);
  });
 }
}
