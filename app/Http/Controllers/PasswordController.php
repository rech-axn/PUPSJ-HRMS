<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
class PasswordController extends Controller {
 public function forgot(Request $r){$r->validate(['email'=>'required|email']);Password::sendResetLink(['email'=>strtolower(trim($r->email))]);return ['message'=>'If an account exists for that email, a reset link has been sent.'];}
 public function reset(Request $r){$v=$r->validate(['email'=>'required|email','token'=>'required|string','password'=>'required|min:10|confirmed']);$status=Password::reset($v,function($u,$password){$u->forceFill(['password'=>Hash::make($password),'remember_token'=>Str::random(60)])->save();\Illuminate\Support\Facades\DB::table('sessions')->where('user_id',$u->id)->delete();});abort_unless($status===Password::PASSWORD_RESET,422,__($status));return ['message'=>'Password updated. Please sign in.'];}
}
