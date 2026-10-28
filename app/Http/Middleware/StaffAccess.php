<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class StaffAccess {
 public function handle(Request $r, Closure $next, string $admin=''): mixed {
  abort_unless($r->user() && $r->user()->active && $r->user()->role !== 'guest',403);
  if($admin==='admin')abort_unless($r->user()->role==='admin',403);
  return $next($r);
 }
}
