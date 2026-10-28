<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reserve Your Stay | PUPSJ Hotel & Restaurant</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
<script type="application/json" id="booking-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/booking.css','resources/js/guest-booking.js'])
</head><body class="booking-page"><header class="site-header"><nav id="siteNav"></nav></header>
<main class="bk-layout"><aside id="bookingSidebar" aria-label="Search and reservation summary"></aside><section class="bk-main"><ol class="bk-progress" aria-label="Booking progress" id="bookingProgress"></ol><div id="bookingError" class="bk-error" role="alert" hidden></div><div id="bookingContent" aria-live="polite"></div></section></main>
<footer id="siteFooter"></footer></body></html>
