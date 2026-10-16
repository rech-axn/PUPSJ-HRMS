<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Guest Portal &amp; Concierge – PUPSJ Hotel &amp; Restaurant</title>
  <meta name="description" content="Manage your reservations, view room folio, order in-room dining, request housekeeping, and check loyalty points.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  
  <style>
    .gp-wrapper {
      max-width: var(--container-max);
      margin: 0 auto;
      padding: var(--s6) var(--s5);
      min-height: calc(100vh - 160px);
    }
    .gp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--s5);
      flex-wrap: wrap;
      gap: 16px;
    }
  </style>
<meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css', 'resources/js/original/guest/guest-portal.js'])
</head>
<body>
  <!-- Public Top Navigation -->
  <header class="site-header">
    <nav id="siteNav"></nav>
  </header>

  <main class="gp-wrapper">
    <div class="gp-header">
      <div>
        <span class="site-section-tag">GUEST SERVICES &amp; DIGITAL CONCIERGE</span>
        <h1 id="gpWelcomeTitle" style="font-size: 32px; margin: 4px 0;">Guest Portal</h1>
        <div id="gpGuestMeta" class="text-sm" style="color: var(--ink-2);"></div>
      </div>
      <div id="gpHeaderActions" style="display: flex; gap: 10px;">
        <!-- Dynamic header actions (Book another room) -->
      </div>
    </div>

    <!-- Portal Navigation Tabs -->
    <div class="tabs" id="gpTabs">
      <button class="tab-btn active" data-tab="stay">
        <span class="ic" data-icon="key">[ICON: key]</span> Current Stay
      </button>
      <button class="tab-btn" data-tab="reservations">
        <span class="ic" data-icon="bed">[ICON: bed]</span> My Reservations
      </button>
      <button class="tab-btn" data-tab="tables">
        <span class="ic" data-icon="table">[ICON: table]</span> Table Reservations
      </button>
      <button class="tab-btn" data-tab="orders">
        <span class="ic" data-icon="tray">[ICON: tray]</span> In-Room &amp; Dining Orders
      </button>
      <button class="tab-btn" data-tab="requests">
        <span class="ic" data-icon="broom">[ICON: broom]</span> Service Requests
      </button>
      <button class="tab-btn" data-tab="loyalty">
        <span class="ic" data-icon="gift">[ICON: gift]</span> Loyalty &amp; Rewards
      </button>
      <button class="tab-btn" data-tab="messages">
        <span class="ic" data-icon="message">[ICON: message]</span> Messages <span id="gpMsgBadge"></span>
      </button>
      <button class="tab-btn" data-tab="profile">
        <span class="ic" data-icon="user">[ICON: user]</span> Profile
      </button>
    </div>

    <!-- Tab 1: Current Stay -->
    <section id="tabCurrentStay" class="gp-tab-content">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab 2: My Reservations -->
    <section id="tabMyReservations" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab: Table Reservations -->
    <section id="tabTableReservations" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab: In-Room & Dining Orders -->
    <section id="tabDiningOrders" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab: Service Requests -->
    <section id="tabServiceRequests" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab 3: Loyalty & Rewards -->
    <section id="tabLoyaltyRewards" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab 4: Messages -->
    <section id="tabMessages" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>

    <!-- Tab 5: Profile -->
    <section id="tabProfile" class="gp-tab-content" style="display: none;">
      <!-- Injected dynamically by guest-portal.js -->
    </section>
  </main>

  <footer id="siteFooter"></footer>

  
  
  
  
  
  
  
  
</body>
</html>