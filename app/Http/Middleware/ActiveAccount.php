<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class ActiveAccount {public function handle(Request $r,Closure $next){abort_if($r->user()&&!$r->user()->active,403,'This account is inactive.');return $next($r);}}
