@extends('layout')
@section('body')<main class="container auth-container"><div class="card"><h1>Reset Password</h1><form id="resetForm" class="hrms-form"><input name="token" type="hidden" value="{{ $token }}"><label>Email<input name="email" type="email" value="{{ request('email') }}" required></label><label>New Password<input name="password" type="password" minlength="10" required></label><label>Confirm Password<input name="password_confirmation" type="password" minlength="10" required></label><button class="btn">Reset Password</button></form></div></main>@endsection

