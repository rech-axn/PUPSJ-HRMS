@extends('layout')
@section('body')
@php
$role=auth()->user()->role;
$all=['dashboard'=>'Dashboard','reservations'=>'Reservations','guests'=>'Guest Directory','housekeeping'=>'Housekeeping','orders'=>'Restaurant Orders','requests'=>'Guest Requests','folios'=>'Guest Folios','payments'=>'Payments','reports'=>'Reports','night-audit'=>'Night Audit','rooms'=>'Rooms','room-types'=>'Room Types','menu'=>'Menu','tables'=>'Dining Tables','employees'=>'Staff Accounts','policy'=>'Rates and Policies','settings'=>'Property Settings','audit'=>'Audit Log'];
$allowed=$role==='restaurant'?['dashboard','orders','tables','requests','reports','night-audit']:($role==='housekeeping'?['dashboard','housekeeping','requests']:['dashboard','reservations','guests','housekeeping','requests','folios','payments','reports','night-audit','rooms','room-types']);
@endphp
<div class="staff-layout"><aside class="staff-sidebar" id="staffSidebar"><a class="staff-brand" href="{{ url('/staff') }}">PUPSJ Hotel</a><p style="padding:0 18px">{{ $role==='restaurant'?'Restaurant Workspace':($role==='admin'?'Administrator': 'Hotel Workspace') }}</p><nav>
@foreach($all as $key=>$label)
@if($role==='admin'||in_array($key,$allowed))<a class="nav-link {{ $module===$key?'active':'' }}" href="{{ url('/staff/'.$key) }}">{{ $label }}</a>@endif
@endforeach
<a class="nav-link" href="{{ url('/') }}">Guest Website</a></nav></aside><div class="staff-main-wrap"><header class="staff-topbar"><button id="navToggle" class="btn-ghost" aria-label="Toggle navigation">Menu</button><span>{{ auth()->user()->name }}</span><button class="btn-secondary btn-sm" id="logout">Sign out</button></header><main class="staff-content" id="workspace" data-module="{{ $module }}"><h1>Loading...</h1></main></div></div>
@endsection

