<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class RoleAccess {
 public function handle(Request $q,Closure $next,string ...$roles){
  abort_unless($q->user()&&$q->user()->active&&($q->user()->role==='admin'||in_array($q->user()->role,$roles)),403);
  return $next($q);
 }
}
