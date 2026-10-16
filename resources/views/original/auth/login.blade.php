<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign In &amp; Account Access – PUPSJ Hotel &amp; Restaurant</title>
  <meta name="description" content="Sign in to your guest portal or staff management dashboard at PUPSJ Hotel &amp; Restaurant.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
  
  <style>
    .auth-wrapper {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--s6) var(--s4);
    }
    .auth-card {
      width: 100%;
      max-width: 500px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: var(--s5);
    }
    .demo-accounts-box {
      margin-top: var(--s5);
      padding: var(--s4);
      background-color: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: var(--r);
      font-size: 13px;
    }
    .demo-accounts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .demo-acc-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      padding: 9px 12px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r);
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
      transition: background-color 120ms ease, border-color 120ms ease, transform 100ms ease;
    }
    .demo-acc-btn:hover {
      background: var(--surface-2);
      border-color: var(--gold);
      transform: translateY(-1px);
    }
    .demo-acc-role {
      font-weight: 700;
      font-size: 12px;
      color: var(--ink);
      line-height: 1.25;
    }
    .demo-acc-cred {
      font-size: 11px;
      color: var(--ink-3);
      margin-top: 3px;
      line-height: 1.25;
      word-break: break-all;
    }
    @media (max-width: 480px) {
      .demo-accounts-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
<meta name="csrf-token" content="{{ csrf_token() }}"><meta name="hrms-base" content="{{ url('/') }}">
<script type="application/json" id="original-bootstrap">{!! json_encode($originalBootstrap, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
@vite(['resources/css/app.css', 'resources/js/original/auth/login.js'])
</head>
<body>
  <!-- Public Top Navigation -->
  <header class="site-header">
    <nav id="siteNav"></nav>
  </header>

  <main class="auth-wrapper">
    <div class="card auth-card">
      <div class="auth-header">
        <span class="site-section-tag" style="display: inline-flex; align-items: center; gap: 6px;"><img src="../../assets/logo/pupsj-mark.png" alt="PUPSJ" style="width: 22px; height: 22px; object-fit: contain;"> PUPSJ HRMS</span>
        <h2>Access Portal</h2>
        <p class="text-sm">Sign in to manage your reservation or access staff operations.</p>
      </div>

      <!-- Auth Tabs -->
      <div class="tabs" style="justify-content: center; margin-bottom: var(--s4);">
        <button class="tab-btn active" id="tabSignInBtn" data-target="panelSignIn">Sign In</button>
        <button class="tab-btn" id="tabRegisterBtn" data-target="panelRegister">Create Guest Account</button>
        <button class="tab-btn" id="tabLookupBtn" data-target="panelLookup">Find Booking</button>
      </div>

      <!-- Panel 1: Sign In (Staff & Guests) -->
      <div id="panelSignIn">
        <form id="signInForm">
          <div class="field">
            <label for="loginEmail">Email Address</label>
            <input type="email" id="loginEmail" placeholder="e.g. maria@pupsj.edu.ph" required autocomplete="email">
          </div>
          <div class="field">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" placeholder="Enter your password" required autocomplete="current-password">
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s4);">
            <button type="button" class="btn-ghost btn-sm" id="btnForgotPass" style="padding: 0;">Forgot password?</button>
          </div>
          <button type="submit" class="btn btn-block" id="btnSubmitSignIn">Sign In &rarr;</button>
        </form>

        <!-- Demo Accounts Box -->
        <div class="demo-accounts-box" id="demoAccountsBox">
          <div style="font-weight: 600; margin-bottom: 8px; color: var(--gold-ink); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            Demo Accounts (Four-Role):
          </div>
          <div class="demo-accounts-grid">
            <button type="button" class="demo-acc-btn" id="btnDemoAdmin">
              <span class="demo-acc-role">Superadmin</span>
              <span class="demo-acc-cred">admin@pupsj.edu.ph &middot; admin123</span>
            </button>
            <button type="button" class="demo-acc-btn" id="btnDemoHotel">
              <span class="demo-acc-role">Hotel Receptionist</span>
              <span class="demo-acc-cred">hotel@pupsj.edu.ph &middot; hotel123</span>
            </button>
            <button type="button" class="demo-acc-btn" id="btnDemoRestaurant">
              <span class="demo-acc-role">Restaurant Receptionist</span>
              <span class="demo-acc-cred">restaurant@pupsj.edu.ph &middot; restaurant123</span>
            </button>
            <button type="button" class="demo-acc-btn" id="btnDemoGuest">
              <span class="demo-acc-role">Registered Guest</span>
              <span class="demo-acc-cred">ana.delacruz@example.com &middot; password123</span>
            </button>
          </div>
          <div class="text-xs text-muted" style="margin-top: 10px; font-size: 11px; line-height: 1.4;">
            Role-Based Access: Superadmin governs property settings; Hotel Receptionist manages stays &amp; folios; Restaurant Receptionist controls POS &amp; dining orders; Guest accesses portal self-service.
          </div>
        </div>
      </div>

      <!-- Panel 2: Create Guest Account -->
      <div id="panelRegister" style="display: none;">
        <form id="registerForm">
          <div class="field">
            <label for="regName">Full Name</label>
            <input type="text" id="regName" placeholder="e.g. Juan Dela Cruz" required autocomplete="name">
          </div>
          <div class="field">
            <label for="regEmail">Email Address</label>
            <input type="email" id="regEmail" placeholder="juan@example.com" required autocomplete="email">
          </div>
          <div class="field">
            <label for="regPhone">Mobile Phone</label>
            <input type="tel" id="regPhone" placeholder="+63 917 000 0000" autocomplete="tel">
          </div>
          <div class="field">
            <label for="regPassword">Password (Min. 8 characters)</label>
            <input type="password" id="regPassword" minlength="8" placeholder="Create a password" required autocomplete="new-password">
            <span class="field-hint">Must be at least 8 characters long</span>
          </div>
          <button type="submit" class="btn btn-block" style="margin-top: var(--s3);">Create Guest Account</button>
        </form>
      </div>

      <!-- Panel 3: Find Booking -->
      <div id="panelLookup" style="display: none;">
        <form id="lookupForm">
          <div class="field">
            <label for="lookupCode">Confirmation Code</label>
            <input type="text" id="lookupCode" placeholder="e.g. HTL-2041" required style="text-transform: uppercase;">
            <span class="field-hint">Format: HTL-####</span>
          </div>
          <div class="field">
            <label for="lookupMatch">Guest Last Name OR Phone Number</label>
            <input type="text" id="lookupMatch" placeholder="e.g. Dela Cruz or +63 917 000 0001" required>
            <span class="field-hint">Must match the registered reservation details</span>
          </div>
          <button type="submit" class="btn btn-block" style="margin-top: var(--s3);">Find &amp; View Reservation</button>
        </form>
      </div>
    </div>
  </main>

  <footer id="siteFooter"></footer>

  
  
  
  
  
  
  
</body>
</html>
