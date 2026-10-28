@extends('layout')
@section('body')
<main class="container section"><div class="card"><h1>Payment Status</h1><p id="paymentStatus">Checking your test payment…</p><p>Returning here does not confirm payment. Your bill updates only after a verified PayMongo notification.</p><a class="btn-secondary" href="{{ url('/guest') }}">My Account</a><a class="btn-secondary" href="{{ url('/staff/payments') }}">Staff Payments</a></div></main>
@endsection

