<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rooms &amp; Deals | PUPSJ Hotel &amp; Restaurant</title><meta name="description" content="Explore our rooms, photographs, amenities and nightly rates. Choose your room before planning your stay."><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css','resources/css/rooms-showcase.css','resources/js/rooms-showcase.js'])
</head><body class="rooms-showcase-page"><header class="site-header"><nav id="siteNav"></nav></header>
<main>
<header class="site-section rooms-showcase-intro page-intro"><div class="site-container"><span class="site-section-tag">A STAY MADE FOR YOU</span><h1>Rooms &amp; Deals</h1><p>Find a room that feels right for your stay. Explore the photos and amenities, then choose your dates when you book.</p></div></header>
<section class="site-container rooms-showcase-list" id="rooms" aria-label="Our rooms">
@forelse($originalBootstrap['data']['types'] as $type)
<article class="room-showcase" id="room-type-{{ $type['id'] }}">
 <div class="room-showcase-media" data-showcase-gallery="{{ $type['id'] }}">
 @if($type['photo'])<img src="{{ $type['photo'] }}" alt="{{ $type['n'] }}" loading="lazy">@else<div class="room-showcase-no-photo">Room photos coming soon</div>@endif
 </div>
 <div class="room-showcase-copy"><div class="room-showcase-summary"><span class="site-section-tag">YOUR ROOM, YOUR RETREAT</span><h2>{{ $type['n'] }}</h2><p class="room-showcase-description">{{ $type['desc'] ?: 'A comfortable room for a relaxing stay, with thoughtful everyday amenities.' }}</p>
 <ul class="room-showcase-highlights"><li>Up to {{ (int)$type['g'] + (int)($type['extra_capacity'] ?? 0) }} guests</li>@if($type['bed_size'])<li>{{ $type['bed_size'] }}</li>@endif<li>Wi-Fi, air conditioning and a private bathroom</li></ul>
 <p class="room-showcase-rate">From&nbsp;<strong>₱{{ number_format($type['r'],2) }}</strong><span> / night</span></p>
 <div class="room-showcase-actions"><a class="btn" data-showcase-book href="{{ url('/booking').'?'.http_build_query(['type'=>$type['n']]) }}">Book Now</a><button class="btn-secondary" type="button" data-showcase-details="details-{{ $type['id'] }}" aria-controls="details-{{ $type['id'] }}" aria-expanded="false">View More</button></div>
 </div><div class="room-showcase-details" id="details-{{ $type['id'] }}" aria-label="{{ $type['n'] }} details" aria-hidden="true" hidden inert><h3>Room amenities</h3><ul>@foreach($type['amenities'] ?? [] as $amenity)<li>{{ $amenity }}</li>@endforeach</ul>
 @if($type['accessible_room'])<p>Accessible rooms available on request (floors 1–2).</p>@endif @if($type['accessible_bathroom'])<p>Designated rooms include accessible bathrooms; availability is checked when booking.</p>@endif
 @if($type['extra_capacity'])<p>Includes {{ $type['g'] }} guests. Up to {{ $type['extra_capacity'] }} additional guest at ₱{{ number_format($type['extra_person_rate'],2) }} per night.</p>@endif
 <p>Choose room-only or include-breakfast (buffet) options when booking. Buffet: ₱{{ number_format($originalBootstrap["data"]["policy"]["breakfast_buffet_rate"],2) }} per person/night. Plated in-room meals are ordered and charged separately. Final prices and availability depend on your dates and guest count. Special requests are subject to availability.</p></div>
 </div>
</article>
@empty<p class="card">Room details are being updated. Please check again soon.</p>@endforelse
</section>
<section class="site-section rooms-showcase-offers" id="deals"><div class="site-container"><span class="site-section-tag">PLAN YOUR STAY</span><h2>Offers &amp; breakfast options</h2>
@forelse($originalBootstrap['data']['promos'] as $promo)
<div class="card"><h3>{{ $promo['label'] ?? $promo['name'] }}</h3><p>Use code <strong>{{ $promo['code'] }}</strong> when booking. Subject to offer dates and conditions.</p></div>
@empty<p>Choose your room above to explore available rates, breakfast options and additional services for your stay.</p>@endforelse
</div></section>
</main><footer id="siteFooter"></footer></body></html>


