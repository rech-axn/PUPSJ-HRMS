@extends('layout')
@section('body')<header class="site-header"><nav class="hrms-nav"><a class="staff-brand" href="{{ url('/') }}">PUPSJ Hotel</a><a href="{{ url('/rooms') }}">Book a Stay</a><button class="btn-secondary" id="logout">Sign out</button></nav></header><main class="container section"><h1>My Account</h1><div id="guestProfile" class="card"></div><h2>My Reservations</h2><div id="guestReservations"></div><h2>Guest Requests</h2><div id="guestRequests" class="card"></div></main>@endsection

