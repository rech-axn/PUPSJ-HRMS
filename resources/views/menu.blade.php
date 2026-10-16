@extends('layout')
@section('body')<header class="site-header"><nav class="hrms-nav"><a class="staff-brand" href="{{ url('/') }}">PUPSJ Hotel</a><a href="{{ url('/rooms') }}">Rooms</a><a href="{{ url('/guest') }}">My Account</a></nav></header><main class="container section"><h1>Restaurant Menu</h1><p class="text-muted">Please contact our staff to place an order.</p><div id="menuCatalog" class="hrms-grid"></div></main>@endsection

