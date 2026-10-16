<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PUPSJ Restaurant &amp; Menu – PUPSJ Hotel &amp; Restaurant</title>
  <meta name="description" content="Explore dining menus, breakfast specialties, and reserve a dining table at PUPSJ Restaurant &amp; Lounge.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  
<meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css', 'resources/js/original/main/menu.js'])
</head>
<body>
  <!-- Public Top Navigation -->
  <header class="site-header">
    <nav id="siteNav"></nav>
  </header>

  <!-- Hero / Introduction -->
  <header class="site-section" style="background-color: var(--surface); border-bottom: 1px solid var(--line); padding: var(--s6) 0;">
    <div class="site-container" style="text-align: center; max-width: 760px;">
      <span class="site-section-tag">DINING &amp; GASTRONOMY</span>
      <h1>PUPSJ Restaurant &amp; Lounge</h1>
      <p style="margin: 12px 0 20px;">
        All-day dining celebrating seasonal ingredients, Filipino heritage recipes, and international classics.
        Open for breakfast, lunch, dinner, and late evening refreshments.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a class="btn" href="#reserve-table">Reserve a Table &darr;</a>
        <a class="btn-secondary" href="#menu-catalog">Browse Menus</a>
      </div>
    </div>
  </header>

  <main>
    <!-- Operating Hours Banner -->
    <div class="site-container" style="padding-top: var(--s5); padding-bottom: 0;">
      <div class="card" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; text-align: center; background-color: var(--surface-2);">
        <div>
          <span class="text-sm text-muted">Breakfast Hours</span>
          <div style="font-weight: 600; margin-top: 2px;" id="hoursBreakfast"></div>
        </div>
        <div>
          <span class="text-sm text-muted">Lunch Service</span>
          <div style="font-weight: 600; margin-top: 2px;" id="hoursLunch"></div>
        </div>
        <div>
          <span class="text-sm text-muted">Dinner Service</span>
          <div style="font-weight: 600; margin-top: 2px;" id="hoursDinner"></div>
        </div>
        <div>
          <span class="text-sm text-muted">Location &amp; Seating</span>
          <div style="font-weight: 600; margin-top: 2px;">Main Floor &amp; Garden Terrace</div>
        </div>
      </div>
    </div>

    <!-- Menu Catalog Section -->
    <section class="site-section" id="menu-catalog">
      <div class="site-container">
        <div class="site-section-header">
          <span class="site-section-tag">A LA CARTE &amp; SPECIALTIES</span>
          <h2>Our Dining Menu</h2>
          <p>Prices include 12% VAT and 10% service charge. In-room dining charges can be added to your stay folio.</p>
        </div>

        <!-- Category Tabs -->
        <div class="tabs" style="justify-content: center;" id="menuCategoryTabs">
          <button class="tab-btn active" data-cat="All">All Categories</button>
          <button class="tab-btn" data-cat="Breakfast">Breakfast</button>
          <button class="tab-btn" data-cat="Starters">Starters</button>
          <button class="tab-btn" data-cat="Mains">Mains</button>
          <button class="tab-btn" data-cat="Desserts">Desserts</button>
          <button class="tab-btn" data-cat="Drinks">Beverages</button>
        </div>

        <!-- Menu Grid -->
        <div class="grid-2" id="menuItemsGrid">
          <!-- Injected dynamically by menu.js from Data.getMenu() -->
        </div>
      </div>
    </section>

    <!-- Table Reservation Form Section -->
    <section class="site-section" id="reserve-table" style="background-color: var(--surface); border-top: 1px solid var(--line);">
      <div class="site-container" style="max-width: 680px;">
        <div class="site-section-header">
          <span class="site-section-tag">TABLE RESERVATION</span>
          <h2>Reserve Your Dining Table</h2>
          <p>Advance booking guarantees seating during peak breakfast, lunch, and dinner hours.</p>
        </div>

        <div class="card">
          <form id="tableReservationForm">
            <div class="field-row-2">
              <div class="field">
                <label for="trGuestName">Full Name *</label>
                <input type="text" id="trGuestName" placeholder="e.g. Maria Santos" required autocomplete="name">
              </div>
              <div class="field">
                <label for="trPhone">Mobile Number *</label>
                <input type="tel" id="trPhone" placeholder="+63 917 000 0000" required autocomplete="tel">
              </div>
            </div>

            <div class="field-row-3">
              <div class="field">
                <label for="trDate">Date *</label>
                <input type="date" id="trDate" required>
              </div>
              <div class="field">
                <label for="trTime">Preferred Time *</label>
                <select id="trTime" required>
                  <option value="07:00">7:00 AM (Breakfast)</option>
                  <option value="08:30">8:30 AM (Breakfast)</option>
                  <option value="12:00">12:00 PM (Lunch)</option>
                  <option value="13:00">1:00 PM (Lunch)</option>
                  <option value="18:30">6:30 PM (Dinner)</option>
                  <option value="19:30" selected>7:30 PM (Dinner)</option>
                  <option value="20:30">8:30 PM (Dinner)</option>
                </select>
              </div>
              <div class="field">
                <label for="trParty">Party Size</label>
                <select id="trParty" required>
                  <option value="1">1 Person</option>
                  <option value="2" selected>2 Persons</option>
                  <option value="3">3 Persons</option>
                  <option value="4">4 Persons</option>
                  <option value="5">5 Persons</option>
                  <option value="6">6 Persons</option>
                  <option value="8">8 Persons (Private Table)</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="trPromo">Dining Promo Code (Optional)</label>
              <input type="text" id="trPromo" placeholder="e.g. GOURMET25 or BRUNCH41" style="text-transform: uppercase;">
            </div>

            <div class="field">
              <label for="trNotes">Special Requests or Dietary Notes</label>
              <textarea id="trNotes" rows="2" placeholder="Anniversary celebration, window table, allergies, high chair…"></textarea>
            </div>

            <button type="submit" class="btn btn-block" style="margin-top: 12px;" id="btnSubmitTableRes">
              Confirm Table Reservation &rarr;
            </button>
          </form>
        </div>
      </div>
    </section>
  </main>

  <footer id="siteFooter"></footer>

  
  
  
  
  
  
  
</body>
</html>
