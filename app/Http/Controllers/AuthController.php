<?php
namespace App\Http\Controllers;
use App\Models\User;
use App\Models\Guest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
class AuthController extends Controller {
 public static function phone(?string $phone): ?string {if(!$phone)return null;$p=preg_replace('/\D/','',$phone);if(str_starts_with($p,'09'))$p='63'.substr($p,1);return '+'.$p;}
 public function login(Request $r){$v=$r->validate(['email'=>'required|email','password'=>'required|string']);$v['email']=strtolower(trim($v['email']));if(!Auth::attempt([...$v,'active'=>true]))throw ValidationException::withMessages(['email'=>'The credentials do not match an active account.']);$r->session()->regenerate();return $r->user();}
 public function register(Request $r){$r->merge(['email'=>strtolower(trim((string)$r->email)),'phone'=>self::phone($r->phone)]);$v=$r->validate(['name'=>'required|string|max:180','email'=>'required|email|max:254|unique:users','phone'=>['required','regex:/^\+639\d{9}$/','unique:users'],'password'=>'required|string|min:10|confirmed']);$u=DB::transaction(function()use($v){$g=Guest::create(collect($v)->only(['name','email','phone'])->all());return User::create([...$v,'guest_id'=>$g->id,'role'=>'guest','password'=>Hash::make($v['password'])]);});Auth::login($u);$r->session()->regenerate();return response()->json($u,201);}
 public function logout(Request $r){Auth::logout();$r->session()->invalidate();$r->session()->regenerateToken();return response()->json(['ok'=>true]);}
}
