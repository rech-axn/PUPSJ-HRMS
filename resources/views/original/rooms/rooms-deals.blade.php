<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rooms, Rates &amp; Offers – PUPSJ Hotel &amp; Restaurant</title>
  <meta name="description" content="Explore accommodations, current rates, and seasonal offers at PUPSJ Hotel &amp; Restaurant.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  
<meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css', 'resources/js/original/rooms/rooms-deals.js'])
</head>
<body>
  <!-- Public Top Navigation -->
  <header class="site-header">
    <nav id="siteNav"></nav>
  </header>

  <!-- Page Header & Availability Search -->
  <header class="site-section" style="background-color: var(--surface); border-bottom: 1px solid var(--line); padding: var(--s6) 0;">
    <div class="site-container" style="text-align: center;">
      <span class="site-section-tag">ACCOMMODATIONS &amp; PROMOTIONS</span>
      <h1>Rooms, Rates &amp; Special Offers</h1>
      <p style="max-width: 620px; margin: 8px auto 24px;">
        Select your arrival and departure dates to verify live availability and calculate the complete stay total.
      </p>

      <!-- Availability Search Bar -->
      <form class="booking-bar" id="rdSearchForm" style="margin: 0 auto; max-width: 920px;" aria-label="Search rooms and deals">
        <div class="field">
          <label for="rdCi">CHECK-IN DATE</label>
          <input type="date" id="rdCi" required>
        </div>
        <div class="field">
          <label for="rdCo">CHECK-OUT DATE</label>
          <input type="date" id="rdCo" required>
        </div>
        <div class="field">
          <label for="rdGs">GUESTS</label>
          <select id="rdGs">
            <option value="1">1 Guest</option>
            <option value="2" selected>2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
            <option value="5">5 Guests</option>
          </select>
        </div>
        <button class="btn btn-booking" type="submit" id="btnFilterRooms">
          Check Rates &amp; Availability &rsaquo;
        </button>
      </form>
    </div>
  </header>

  <main>
    <!-- Available Rooms Grid Section -->
    <section class="site-section" id="rooms">
      <div class="site-container">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="site-section-tag">LIVE HOTEL INVENTORY</span>
            <h2 style="margin: 0;">Available Accommodations</h2>
            <div id="rdStaySummary" class="text-sm" style="margin-top: 4px; color: var(--ink-2);"></div>
          </div>
          <div>
            <a class="btn-secondary btn-sm" href="#deals">
              View Special Offers &darr;
            </a>
          </div>
        </div>

        <div class="grid-2" id="rdRoomsGrid">
          <!-- Injected dynamically by rooms-deals.js -->
        </div>
      </div>
    </section>

    <!-- Data-Driven Featured Room Showcase -->
    <section class="site-section" id="featuredRoomSection" style="background-color: var(--surface); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);">
      <div class="site-container" id="featuredRoomContainer">
        <!-- Injected dynamically by rooms-deals.js -->
      </div>
    </section>

    <!-- Special Offers & Promotions Store Section -->
    <section class="site-section" id="deals">
      <div class="site-container">
        <div class="site-section-header">
          <span class="site-section-tag">SPECIAL OFFERS</span>
          <h2>Active Packages &amp; Promotions</h2>
          <p>Valid promo codes for rooms and dining. Apply these directly when booking.</p>
        </div>

        <!-- Filter Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <label for="dealScopeFilter" class="text-sm" style="font-weight: 600;">Category:</label>
            <select id="dealScopeFilter" class="field" style="height: 36px; margin: 0; width: 160px;">
              <option value="">All Offers</option>
              <option value="rooms">Room Discounts</option>
              <option value="restaurant">Dining Specials</option>
            </select>
          </div>
          <div class="text-sm text-muted" id="dealCountText"></div>
        </div>

        <div class="grid-3" id="dealsGrid">
          <!-- Injected dynamically by rooms-deals.js from Data.getPromos() -->
        </div>
      </div>
    </section>
  </main>

  <footer id="siteFooter"></footer>

  
  
  
  
  
  
  
  
</body>
</html>
