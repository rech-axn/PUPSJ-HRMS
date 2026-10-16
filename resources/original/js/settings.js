/* ==========================================================================
   PUPSJ Hotel & Restaurant — Hotel Settings & System Tools (settings.js)
   Persistent configuration editor, BIR tax policy management, loyalty rules,
   named scenario switchers, and full JSON backup/restore.
   ========================================================================== */
'use strict';

(function () {
  let activeTab = 'general';

  function init() {
    const app = $('settingsApp');
    if (!app) return;

    // Check URL params for active tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['general', 'financial', 'loyalty', 'demo'].includes(tabParam)) {
      activeTab = tabParam;
    }

    renderApp();

    // Listen for cross-tab or internal updates
    window.addEventListener('pupsj:data-change', e => {
      if (e.detail && e.detail.entity === 'config') {
        renderApp();
      }
    });
  }

  function renderApp() {
    const app = $('settingsApp');
    if (!app) return;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">ADMINISTRATION</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Hotel Settings &amp; System Tools</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="../management/dashboard.html" class="btn-secondary btn-sm">
            <span class="ic" data-icon="dashboard">[ICON: dashboard]</span> Operations Dashboard
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs" style="margin-bottom: 24px;">
        <button class="tab-btn ${activeTab === 'general' ? 'active' : ''}" onclick="switchTab('general')">
          <span class="ic" data-icon="home">[ICON: home]</span> Property &amp; Operations
        </button>
        <button class="tab-btn ${activeTab === 'financial' ? 'active' : ''}" onclick="switchTab('financial')">
          <span class="ic" data-icon="wallet">[ICON: wallet]</span> Financial &amp; BIR Tax Policies
        </button>
        <button class="tab-btn ${activeTab === 'loyalty' ? 'active' : ''}" onclick="switchTab('loyalty')">
          <span class="ic" data-icon="award">[ICON: award]</span> Loyalty &amp; Guest Experience
        </button>
        <button class="tab-btn ${activeTab === 'demo' ? 'active' : ''}" onclick="switchTab('demo')">
          <span class="ic" data-icon="settings">[ICON: settings]</span> Demo Scenarios &amp; Data Tools
        </button>
      </div>

      <!-- Tab Content Area -->
      <div id="settingsTabContent">
        ${renderTabContent()}
      </div>
    `;

    bindTabEvents();
  }

  window.switchTab = function (tab) {
    activeTab = tab;
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
    renderApp();
  };

  function renderTabContent() {
    if (activeTab === 'general') return renderGeneralTab();
    if (activeTab === 'financial') return renderFinancialTab();
    if (activeTab === 'loyalty') return renderLoyaltyTab();
    if (activeTab === 'demo') return renderDemoTab();
    return '';
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 1: PROPERTY & OPERATIONS
  // ─────────────────────────────────────────────────────────────
  function renderGeneralTab() {
    return `
      <div class="card" style="padding: 24px; max-width: 900px;">
        <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">Hotel Identity &amp; Contact Details</h2>
        <p class="text-sm text-secondary" style="margin-bottom: 20px;">
          These details are published across the public guest portal, booking engine, guest invoices, and official receipts.
        </p>

        <form id="generalSettingsForm" onsubmit="return false;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="field">
              <label for="cfgHotelName">Hotel Name *</label>
              <input type="text" id="cfgHotelName" value="${esc(CONFIG.hotelName)}" required>
            </div>
            <div class="field">
              <label for="cfgLocation">City / Municipality *</label>
              <input type="text" id="cfgLocation" value="${esc(CONFIG.location)}" required>
            </div>
          </div>

          <div class="field" style="margin-bottom: 16px;">
            <label for="cfgAddress">Complete Street Address *</label>
            <input type="text" id="cfgAddress" value="${esc(CONFIG.address)}" required>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="field">
              <label for="cfgPhonePrimary">Primary Trunkline *</label>
              <input type="text" id="cfgPhonePrimary" value="${esc(CONFIG.phones?.[0] || '')}" required>
            </div>
            <div class="field">
              <label for="cfgPhoneSecondary">Secondary Line</label>
              <input type="text" id="cfgPhoneSecondary" value="${esc(CONFIG.phones?.[1] || '')}">
            </div>
            <div class="field">
              <label for="cfgMobileConcierge">Mobile Concierge Hotline *</label>
              <input type="text" id="cfgMobileConcierge" value="${esc(CONFIG.mobileConcierge)}" required>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="field">
              <label for="cfgEmailGeneral">General Inquiries</label>
              <input type="email" id="cfgEmailGeneral" value="${esc(CONFIG.emails?.general || '')}" required>
            </div>
            <div class="field">
              <label for="cfgEmailConcierge">Concierge Desk</label>
              <input type="email" id="cfgEmailConcierge" value="${esc(CONFIG.emails?.concierge || '')}" required>
            </div>
            <div class="field">
              <label for="cfgEmailReservations">Reservations</label>
              <input type="email" id="cfgEmailReservations" value="${esc(CONFIG.emails?.reservations || '')}" required>
            </div>
            <div class="field">
              <label for="cfgEmailBilling">Billing &amp; Cashier</label>
              <input type="email" id="cfgEmailBilling" value="${esc(CONFIG.emails?.billing || '')}" required>
            </div>
          </div>

          <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 20px; margin: 24px 0 12px 0; border-top: 1px solid var(--border); padding-top: 16px;">
            Operational Hours &amp; Guest Wi-Fi
          </h3>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="field">
              <label for="cfgHoursFrontDesk">Front Desk Hours</label>
              <input type="text" id="cfgHoursFrontDesk" value="${esc(CONFIG.hours?.frontDesk || '24 Hours Daily')}">
            </div>
            <div class="field">
              <label for="cfgHoursRestaurant">Restaurant &amp; Dining Hours</label>
              <input type="text" id="cfgHoursRestaurant" value="${esc(CONFIG.hours?.restaurant || '6:00 AM – 10:00 PM Daily')}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="field">
              <label for="cfgHoursCheckIn">Standard Check-In Time</label>
              <input type="text" id="cfgHoursCheckIn" value="${esc(CONFIG.hours?.checkIn || '2:00 PM')}">
            </div>
            <div class="field">
              <label for="cfgHoursCheckOut">Standard Check-Out Time</label>
              <input type="text" id="cfgHoursCheckOut" value="${esc(CONFIG.hours?.checkOut || '12:00 PM')}">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="field">
              <label for="cfgWifiNetwork">In-House Wi-Fi SSID</label>
              <input type="text" id="cfgWifiNetwork" value="${esc(CONFIG.wifi?.network || '')}">
            </div>
            <div class="field">
              <label for="cfgWifiPassword">Guest Wi-Fi Password</label>
              <input type="text" id="cfgWifiPassword" value="${esc(CONFIG.wifi?.password || '')}">
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button type="button" class="btn" id="btnSaveGeneralSettings">
              <span class="ic" data-icon="check">[ICON: check]</span> Save Property Details
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 2: FINANCIAL & BIR TAX POLICIES
  // ─────────────────────────────────────────────────────────────
  function renderFinancialTab() {
    const vat = CONFIG.tax?.vatPct || 12;
    const sc = CONFIG.tax?.svcPct || 10;
    const factor = (1 + vat / 100 + sc / 100).toFixed(3);
    const sampleQuote = PricingService.quote({
      roomType: 'Deluxe City View',
      baseRate: 4200,
      nights: 2,
      guestCount: 2
    });

    return `
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; align-items: flex-start; max-width: 1100px;">
        <div class="card" style="padding: 24px;">
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">BIR Taxation &amp; Reservation Policies</h2>
          <p class="text-sm text-secondary" style="margin-bottom: 20px;">
            Manage Philippine Bureau of Internal Revenue (BIR) statutory tax levies and booking guarantee requirements.
          </p>

          <form id="financialSettingsForm" onsubmit="return false;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div class="field">
                <label for="cfgVatPct">Value-Added Tax (VAT %)</label>
                <input type="number" id="cfgVatPct" value="${vat}" min="0" max="30" step="0.5" required>
                <span class="text-xs text-muted">Statutory PH standard: 12%</span>
              </div>
              <div class="field">
                <label for="cfgSvcPct">Service Charge (SC %)</label>
                <input type="number" id="cfgSvcPct" value="${sc}" min="0" max="25" step="0.5" required>
                <span class="text-xs text-muted">Hospitality industry standard: 10%</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div class="field">
                <label for="cfgDepositPct">Required Deposit Guarantee (%)</label>
                <input type="number" id="cfgDepositPct" value="${CONFIG.depositPct || 50}" min="10" max="100" step="5" required>
                <span class="text-xs text-muted">Pre-payment required to confirm stay</span>
              </div>
              <div class="field">
                <label for="cfgFreeCancelDays">Free Cancellation Threshold (Days)</label>
                <input type="number" id="cfgFreeCancelDays" value="${CONFIG.freeCancelDays || 3}" min="0" max="30" step="1" required>
                <span class="text-xs text-muted">Days prior to arrival for full refund</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div class="field">
                <label for="cfgLateCancelFeePct">Late Cancellation Deduction (%)</label>
                <input type="number" id="cfgLateCancelFeePct" value="${CONFIG.lateCancelFeePct || 30}" min="0" max="100" step="5" required>
                <span class="text-xs text-muted">Deducted when cancelled under ${CONFIG.freeCancelDays || 3} days</span>
              </div>
              <div class="field">
                <label for="cfgMaxPayAttempts">Max Payment Attempts</label>
                <input type="number" id="cfgMaxPayAttempts" value="${CONFIG.maxPayAttempts || 3}" min="1" max="10" step="1" required>
                <span class="text-xs text-muted">Attempts before releasing room hold</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div class="field">
                <label for="cfgHoldMinutes">Online Room Hold Duration (Minutes)</label>
                <input type="number" id="cfgHoldMinutes" value="${CONFIG.holdMinutes || 15}" min="5" max="60" step="1" required>
                <span class="text-xs text-muted">Standard hold window for card &amp; e-wallet</span>
              </div>
              <div class="field">
                <label for="cfgBankHoldMinutes">Bank Transfer Hold Duration (Minutes)</label>
                <input type="number" id="cfgBankHoldMinutes" value="${CONFIG.bankHoldMinutes || 30}" min="10" max="120" step="5" required>
                <span class="text-xs text-muted">Extended hold for QR Ph / online banking callback</span>
              </div>
            </div>

            <div class="field" style="margin-bottom: 16px;">
              <label for="cfgResponseTime">Customer Support Response SLA</label>
              <input type="text" id="cfgResponseTime" value="${esc(CONFIG.responseTime || 'within 2 hours during front desk hours')}">
            </div>

            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 18px; margin: 20px 0 10px 0; border-top: 1px solid var(--border); padding-top: 14px;">
              Statutory Invoicing &amp; Permit Tokens
            </h3>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div class="field">
                <label for="cfgTin">Taxpayer Identification Number (TIN)</label>
                <input type="text" id="cfgTin" value="${esc(CONFIG.legal?.tin || '[PLACEHOLDER: TIN]')}">
              </div>
              <div class="field">
                <label for="cfgPermit">BIR Cash Register Permit</label>
                <input type="text" id="cfgPermit" value="${esc(CONFIG.legal?.permit || '[PLACEHOLDER: BIR PERMIT]')}">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn" id="btnSaveFinancialSettings">
                <span class="ic" data-icon="check">[ICON: check]</span> Save Tax &amp; Booking Policies
              </button>
            </div>
          </form>
        </div>

        <!-- Live BIR Pricing Engine Preview -->
        <div>
          <div class="card" style="padding: 20px; border-left: 4px solid var(--gold);">
            <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--gold-ink); margin-bottom: 4px;">Live Calculation Model</div>
            <h3 style="font-size: 18px; margin: 0 0 12px 0;">BIR Tax Factor: <code>${factor}</code></h3>
            <p class="text-xs text-secondary" style="margin-bottom: 14px; line-height: 1.5;">
              In accordance with BIR Revenue Regulations, all posted room and dining tariffs are inclusive of VAT (12%) and Service Charge (10%).
            </p>

            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 12px; font-size: 13px;">
              <div style="font-weight: 600; margin-bottom: 6px;">Sample Stay Quote (2 Nights Deluxe):</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span class="text-secondary">Gross Amount (Posted):</span>
                <b>${peso(sampleQuote.total)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span class="text-secondary">Net Vatable Base (/ ${factor}):</span>
                <span>${peso(sampleQuote.vatableSales)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span class="text-secondary">VAT Amount (${vat}%):</span>
                <span>${peso(sampleQuote.vatAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span class="text-secondary">Service Charge (${sc}%):</span>
                <span>${peso(sampleQuote.serviceCharge)}</span>
              </div>
              <div style="border-top: 1px dashed var(--border); padding-top: 6px; display: flex; justify-content: space-between;">
                <span class="text-secondary">Required Deposit (${CONFIG.depositPct}%):</span>
                <b style="color: var(--gold-ink);">${peso(sampleQuote.depositRequired)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 3: LOYALTY & GUEST EXPERIENCE
  // ─────────────────────────────────────────────────────────────
  function renderLoyaltyTab() {
    const loyalty = CONFIG.loyalty || {};
    const tiers = loyalty.tiers || [];
    const rewards = loyalty.rewards || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 950px;">
        <div class="card" style="padding: 24px;">
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">Loyalty Program Configuration</h2>
          <p class="text-sm text-secondary" style="margin-bottom: 20px;">
            Configure completed room night thresholds, point accrual rates, and guest privilege tiers.
          </p>

          <form id="loyaltySettingsForm" onsubmit="return false;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div class="field">
                <label for="cfgEarnRate">Points per ₱100 Spent</label>
                <input type="number" id="cfgEarnRate" value="${loyalty.earnRate || 1}" min="1" max="10" step="1" required>
              </div>
              <div class="field">
                <label for="cfgSilverNights">Silver Min. Nights</label>
                <input type="number" id="cfgSilverNights" value="${loyalty.silverNights || 5}" min="1" max="50" step="1" required>
              </div>
              <div class="field">
                <label for="cfgGoldNights">Gold Min. Nights</label>
                <input type="number" id="cfgGoldNights" value="${loyalty.goldNights || 12}" min="2" max="100" step="1" required>
              </div>
              <div class="field">
                <label for="cfgPlatNights">Platinum Min. Nights</label>
                <input type="number" id="cfgPlatNights" value="${loyalty.platinumNights || 25}" min="5" max="200" step="1" required>
              </div>
            </div>

            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 18px; margin: 16px 0 12px 0;">Membership Tiers &amp; Entitlements</h3>
            <div class="table-wrap" style="margin-bottom: 20px;">
              <table>
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Qualifying Nights</th>
                    <th>Standard Privileges</th>
                  </tr>
                </thead>
                <tbody>
                  ${tiers.map(t => `
                    <tr>
                      <td><b>${esc(t.name)}</b></td>
                      <td>${t.minNights} nights</td>
                      <td>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                          ${(t.perks || []).map(p => `<span class="pill pill--muted" style="font-size: 11px;">${esc(p)}</span>`).join('')}
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 18px; margin: 16px 0 12px 0;">Redeemable Loyalty Rewards</h3>
            <div class="table-wrap" style="margin-bottom: 24px;">
              <table>
                <thead>
                  <tr>
                    <th>Reward ID</th>
                    <th>Reward Description</th>
                    <th>Points Cost</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  ${rewards.map(r => `
                    <tr>
                      <td><code>${esc(r.id)}</code></td>
                      <td><b>${esc(r.name)}</b></td>
                      <td><span class="pill pill--info">${r.points} pts</span></td>
                      <td>${esc(r.type)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn" id="btnSaveLoyaltySettings">
                <span class="ic" data-icon="check">[ICON: check]</span> Save Loyalty Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 4: DEMO SCENARIOS & SYSTEM TOOLS
  // ─────────────────────────────────────────────────────────────
  function renderDemoTab() {
    return `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 1000px;">
        <!-- Scenario Switchers Card -->
        <div class="card" style="padding: 24px;">
          <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 6px;">Pre-baked Defense Demonstration Scenarios</h2>
          <p class="text-sm text-secondary" style="margin-bottom: 20px;">
            Load instant, internally consistent domain states designed specifically for presentation and live defense rubrics.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
            <!-- Scenario 1: Busy Weekend -->
            <div class="card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="pill pill--ok">Occupancy 90%+</span>
                </div>
                <h3 style="font-size: 16px; margin: 0 0 6px 0;">Busy Weekend</h3>
                <p class="text-xs text-secondary" style="margin-bottom: 14px; line-height: 1.5;">
                  Simulates high weekend occupancy, full table bookings, arriving guests queue, and dining activity.
                </p>
              </div>
              <button type="button" class="btn btn-sm" onclick="loadScenario('busy-weekend')">
                <span class="ic" data-icon="play">[ICON: play]</span> Load Busy Weekend
              </button>
            </div>

            <!-- Scenario 2: Check-out Day -->
            <div class="card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="pill pill--info">Front Desk Rush</span>
                </div>
                <h3 style="font-size: 16px; margin: 0 0 6px 0;">Check-out Day</h3>
                <p class="text-xs text-secondary" style="margin-bottom: 14px; line-height: 1.5;">
                  Populates departures due today with outstanding incidental dining balances to demonstrate folio settlement.
                </p>
              </div>
              <button type="button" class="btn btn-sm" onclick="loadScenario('checkout-day')">
                <span class="ic" data-icon="play">[ICON: play]</span> Load Check-out Day
              </button>
            </div>

            <!-- Scenario 3: Dining Rush -->
            <div class="card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="pill pill--warn">POS Dining Rush</span>
                </div>
                <h3 style="font-size: 16px; margin: 0 0 6px 0;">Dining Rush</h3>
                <p class="text-xs text-secondary" style="margin-bottom: 14px; line-height: 1.5;">
                  Injects active dining tickets across dine-in tables and room service orders.
                </p>
              </div>
              <button type="button" class="btn btn-sm" onclick="loadScenario('kitchen-rush')">
                <span class="ic" data-icon="play">[ICON: play]</span> Load Dining Rush
              </button>
            </div>

            <!-- Scenario 4: Maintenance Conflict -->
            <div class="card" style="padding: 16px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="pill pill--bad">Relocation Alert</span>
                </div>
                <h3 style="font-size: 16px; margin: 0 0 6px 0;">Maintenance Conflict</h3>
                <p class="text-xs text-secondary" style="margin-bottom: 14px; line-height: 1.5;">
                  Creates an urgent OOS work order for Room 201 overlapping an incoming reservation to demo the Relocation Assistant.
                </p>
              </div>
              <button type="button" class="btn btn-sm" onclick="loadScenario('maintenance-conflict')">
                <span class="ic" data-icon="play">[ICON: play]</span> Load Conflict Demo
              </button>
            </div>
          </div>
        </div>

        <!-- System Backup & Reset Card -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <!-- JSON Backup & Restore -->
          <div class="card" style="padding: 20px;">
            <h3 style="font-size: 18px; margin: 0 0 8px 0;">System Backup &amp; Restore</h3>
            <p class="text-xs text-secondary" style="margin-bottom: 16px; line-height: 1.5;">
              Export all local state (reservations, folios, payments, orders, CRM, and settings) to a JSON file, or restore from a previously exported backup.
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn-secondary" id="btnExportBackup">
                <span class="ic" data-icon="download">[ICON: download]</span> Export Backup (JSON)
              </button>
              <label class="btn-secondary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <span class="ic" data-icon="upload">[ICON: upload]</span> Restore from File
                <input type="file" id="inputRestoreBackup" accept=".json" style="display: none;">
              </label>
            </div>
          </div>

          <!-- Factory Reset Demo Data -->
          <div class="card" style="padding: 20px; border-left: 4px solid var(--bad);">
            <h3 style="font-size: 18px; margin: 0 0 8px 0; color: var(--bad);">Factory Demo Reset</h3>
            <p class="text-xs text-secondary" style="margin-bottom: 16px; line-height: 1.5;">
              Wipe all operational changes, temporary orders, and guest transactions, and re-seed the system with fresh relative baseline dates.
            </p>
            <div>
              <button type="button" class="btn-danger" id="btnFactoryReset">
                <span class="ic" data-icon="trash">[ICON: trash]</span> Reset Demo to Seed State
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT BINDINGS & ACTIONS
  // ─────────────────────────────────────────────────────────────
  function bindTabEvents() {
    // Tab 1 Save
    const btnGen = $('btnSaveGeneralSettings');
    if (btnGen) {
      btnGen.onclick = () => {
        const overrides = {
          hotelName: $('cfgHotelName').value.trim() || CONFIG.hotelName,
          location: $('cfgLocation').value.trim() || CONFIG.location,
          address: $('cfgAddress').value.trim() || CONFIG.address,
          phones: [
            $('cfgPhonePrimary').value.trim() || CONFIG.phones[0],
            $('cfgPhoneSecondary').value.trim() || CONFIG.phones[1]
          ],
          mobileConcierge: $('cfgMobileConcierge').value.trim() || CONFIG.mobileConcierge,
          emails: {
            general: $('cfgEmailGeneral').value.trim(),
            concierge: $('cfgEmailConcierge').value.trim(),
            reservations: $('cfgEmailReservations').value.trim(),
            billing: $('cfgEmailBilling').value.trim()
          },
          hours: {
            ...CONFIG.hours,
            frontDesk: $('cfgHoursFrontDesk').value.trim(),
            restaurant: $('cfgHoursRestaurant').value.trim(),
            checkIn: $('cfgHoursCheckIn').value.trim(),
            checkOut: $('cfgHoursCheckOut').value.trim()
          },
          wifi: {
            network: $('cfgWifiNetwork').value.trim(),
            password: $('cfgWifiPassword').value.trim()
          }
        };

        saveConfigOverrides(overrides);
        Data.audit('Update Settings', 'Config', 'General', 'Saved updated property details & operating hours');
        toast('Property details updated successfully!', 'ok');
      };
    }

    // Tab 2 Save
    const btnFin = $('btnSaveFinancialSettings');
    if (btnFin) {
      btnFin.onclick = () => {
        const vat = parseFloat($('cfgVatPct').value) || 12;
        const sc = parseFloat($('cfgSvcPct').value) || 10;
        const dep = parseInt($('cfgDepositPct').value, 10) || 50;
        const freeCancel = parseInt($('cfgFreeCancelDays').value, 10) || 3;
        const lateCancel = parseFloat($('cfgLateCancelFeePct').value) || 30;
        const maxAttempts = parseInt($('cfgMaxPayAttempts').value, 10) || 3;
        const holdMins = parseInt($('cfgHoldMinutes').value, 10) || 15;
        const bankHoldMins = parseInt($('cfgBankHoldMinutes').value, 10) || 30;
        const respTime = $('cfgResponseTime').value.trim();
        const tin = $('cfgTin').value.trim();
        const permit = $('cfgPermit').value.trim();

        const overrides = {
          tax: { vatPct: vat, svcPct: sc },
          depositPct: dep,
          freeCancelDays: freeCancel,
          lateCancelFeePct: lateCancel,
          maxPayAttempts: maxAttempts,
          holdMinutes: holdMins,
          bankHoldMinutes: bankHoldMins,
          responseTime: respTime,
          legal: { tin: tin, permit: permit }
        };

        saveConfigOverrides(overrides);
        Data.audit('Update Settings', 'Config', 'Financial', `VAT: ${vat}%, SC: ${sc}%, Deposit: ${dep}%, Holds: ${holdMins}m, LateCancel: ${lateCancel}%`);
        toast('Financial & tax policies saved!', 'ok');
        renderApp();
      };
    }

    // Tab 3 Save
    const btnLoyalty = $('btnSaveLoyaltySettings');
    if (btnLoyalty) {
      btnLoyalty.onclick = () => {
        const earn = parseInt($('cfgEarnRate').value, 10) || 1;
        const silv = parseInt($('cfgSilverNights').value, 10) || 5;
        const gold = parseInt($('cfgGoldNights').value, 10) || 12;
        const plat = parseInt($('cfgPlatNights').value, 10) || 25;

        const curLoyalty = CONFIG.loyalty || {};
        const overrides = {
          loyalty: {
            ...curLoyalty,
            earnRate: earn,
            silverNights: silv,
            goldNights: gold,
            platinumNights: plat,
            tiers: (curLoyalty.tiers || []).map(t => {
              if (t.name === 'Silver') return { ...t, minNights: silv };
              if (t.name === 'Gold') return { ...t, minNights: gold };
              if (t.name === 'Platinum') return { ...t, minNights: plat };
              return t;
            })
          }
        };

        saveConfigOverrides(overrides);
        Data.audit('Update Settings', 'Config', 'Loyalty', `Loyalty nights updated: ${silv}/${gold}/${plat}`);
        toast('Loyalty tiers and points rules saved!', 'ok');
        renderApp();
      };
    }

    // Tab 4 Export Backup
    const btnExp = $('btnExportBackup');
    if (btnExp) {
      btnExp.onclick = () => {
        const backup = {
          version: '1.0',
          exportedAt: nowISO(),
          hotelName: CONFIG.hotelName,
          data: {}
        };
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('pupsj.') || key.startsWith('blade.'))) {
            backup.data[key] = localStorage.getItem(key);
          }
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pupsj-hotel-backup-${today()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('System backup downloaded successfully.', 'ok');
      };
    }

    // Tab 4 Restore Backup
    const inRestore = $('inputRestoreBackup');
    if (inRestore) {
      inRestore.onchange = e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async evt => {
          try {
            const parsed = JSON.parse(evt.target.result);
            if (!parsed.data || typeof parsed.data !== 'object') {
              throw new Error('Invalid backup file format. Missing data map.');
            }

            const ok = await confirmDialog(
              `Restore backup from ${esc(parsed.exportedAt || 'uploaded file')}? This will replace all current operational data.`,
              'Restore Backup File',
              { danger: true, confirmText: 'Proceed with Restore' }
            );
            if (!ok) return;

            // Wipe existing pupsj data
            Object.keys(localStorage)
              .filter(k => k.startsWith('pupsj.') || k.startsWith('blade.'))
              .forEach(k => localStorage.removeItem(k));

            // Restore keys
            Object.entries(parsed.data).forEach(([k, v]) => {
              localStorage.setItem(k, v);
            });

            toast('Backup restored successfully! Reloading…', 'ok');
            setTimeout(() => window.location.reload(), 600);
          } catch (err) {
            console.error('Failed to parse backup', err);
            toast('Failed to restore backup: Invalid JSON file.', 'bad');
          }
        };
        reader.readAsText(file);
      };
    }

    // Tab 4 Factory Reset
    const btnReset = $('btnFactoryReset');
    if (btnReset) {
      btnReset.onclick = async () => {
        const ok = await confirmDialog(
          'Are you sure you want to restore the clean baseline seed dataset? All temporary orders, reservations, and modified settings will be reset.',
          'Confirm Factory Demo Reset',
          { danger: true, confirmText: 'Yes, Restore Default Seeds' }
        );
        if (ok) {
          Data.resetDemoData();
          toast('System reset to default seeds. Reloading…', 'ok');
          setTimeout(() => window.location.reload(), 600);
        }
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCENARIO SWITCHERS LOGIC
  // ─────────────────────────────────────────────────────────────
  window.loadScenario = async function (scenario) {
    const ok = await confirmDialog(
      `Load the "${scenario.replace('-', ' ').toUpperCase()}" demonstration scenario? This will adjust active operational data to showcase this specific state.`,
      'Load Demo Scenario',
      { confirmText: 'Load Scenario' }
    );
    if (!ok) return;

    const t = today();
    const tmrw = addDays(t, 1);
    const dayAfter = addDays(t, 2);
    const yesterday = addDays(t, -1);

    if (scenario === 'busy-weekend') {
      // 1. Set multiple rooms to Occupied and Confirmed
      const res = Data.getReservations();
      const rooms = Data.getRooms();

      // Ensure at least 8 rooms have active reservations
      rooms.slice(0, 8).forEach((rm, idx) => {
        let existing = res.find(r => Number(r.n || r.rm) === Number(rm.n) && (r.st || r.s) === 'Checked-in');
        if (!existing) {
          const code = `HTL-BW${idx + 1}`;
          res.push({
            c: code,
            code: code,
            g: `Guest ${idx + 1} (Weekend Group)`,
            guest: `Guest ${idx + 1} (Weekend Group)`,
            t: rm.t,
            n: Number(rm.n),
            rm: Number(rm.n),
            ci: t,
            co: dayAfter,
            st: 'Checked-in',
            s: 'Checked-in',
            rt: 3800,
            rate: 3800,
            ad: 2,
            ch: 0,
            email: `weekend${idx + 1}@example.com`,
            phone: '+63 917 123 4567',
            source: 'Online',
            payments: [{ orNo: `OR-BW${idx + 1}`, amount: 3800, method: 'Credit Card', date: t }]
          });
        }
      });
      Data.saveReservations(res);

      // 2. Seated tables
      const tables = Data.getTables();
      tables.slice(0, 5).forEach(tbl => {
        tbl.status = 'Occupied';
      });
      Data.saveTables(tables);

      Data.audit('Load Scenario', 'System', 'busy-weekend', 'Loaded Busy Weekend demo scenario');
      Data.emit('scenario', 'load', 'busy-weekend');
      toast('Busy Weekend loaded! High room occupancy & seated tables active.', 'ok');
    }

    else if (scenario === 'checkout-day') {
      // Set multiple occupied rooms with checkOut = today and pending balances
      const res = Data.getReservations();
      const rooms = Data.getRooms();

      // Room 101, 102, 201 check out today
      const checkoutRooms = [101, 102, 201];
      checkoutRooms.forEach((rmNum, idx) => {
        let r = res.find(item => Number(item.n || item.rm) === rmNum);
        if (r) {
          r.st = 'Checked-in';
          r.s = 'Checked-in';
          r.co = t;
          r.o = t;
        } else {
          r = {
            c: `HTL-CO${rmNum}`,
            code: `HTL-CO${rmNum}`,
            g: `Departing Guest (Room ${rmNum})`,
            t: 'Deluxe City View',
            n: rmNum,
            rm: rmNum,
            ci: yesterday,
            co: t,
            st: 'Checked-in',
            s: 'Checked-in',
            rt: 4200,
            source: 'Online',
            payments: [{ orNo: `OR-CO${rmNum}`, amount: 2100, method: 'GCash', date: yesterday }]
          };
          res.push(r);
        }
        // Add incidental dining folio charge
        Data.addCharge(r.c, 'In-Room Dinner & Beverage', 1450 + (idx * 300), 'Dining');
      });

      Data.saveReservations(res);
      Data.audit('Load Scenario', 'System', 'checkout-day', 'Loaded Check-out Day departures scenario');
      Data.emit('scenario', 'load', 'checkout-day');
      toast('Check-out Day loaded! Folio balances ready for settlement.', 'ok');
    }

    else if (scenario === 'kitchen-rush') {
      // Staggered dining room orders
      const orders = Data.getOrders();
      const now = new Date();

      const createAgoTime = mins => {
        const d = new Date(now.getTime() - mins * 60000);
        return d.toTimeString().slice(0, 5);
      };

      const rushOrders = [
        {
          code: 'ORD-KR1',
          source: 'Dine-In',
          target: 'Table 2',
          station: 'Kitchen',
          status: 'New',
          time: createAgoTime(4),
          subtotal: 1150,
          total: 1150,
          billed: false,
          items: [
            { name: 'Crispy Pork Belly Kare-Kare', qty: 1, price: 680, station: 'Kitchen', note: 'Extra bagoong' },
            { name: 'Garlic Rice Platter', qty: 1, price: 180, station: 'Kitchen' }
          ]
        },
        {
          code: 'ORD-KR2',
          source: 'Room Service',
          target: 'Room 203',
          station: 'Kitchen',
          status: 'Preparing',
          time: createAgoTime(12), // Amber alert (>10 min)
          subtotal: 920,
          total: 920,
          billed: false,
          items: [
            { name: 'Truffle Mushroom Risotto', qty: 1, price: 540, station: 'Kitchen' },
            { name: 'Classic Caesar Salad', qty: 1, price: 380, station: 'Kitchen' }
          ]
        },
        {
          code: 'ORD-KR3',
          source: 'Dine-In',
          target: 'Table 5',
          station: 'Kitchen',
          status: 'Preparing',
          time: createAgoTime(24), // Red alert (>20 min)
          subtotal: 1480,
          total: 1480,
          billed: false,
          items: [
            { name: 'US Angus Ribeye Steak (300g)', qty: 1, price: 1480, station: 'Kitchen', note: 'Medium rare' }
          ]
        },
        {
          code: 'ORD-KR4',
          source: 'Main Dining',
          target: 'Table 8',
          station: 'Kitchen',
          status: 'Unpaid',
          payStatus: 'Unpaid',
          time: createAgoTime(8),
          subtotal: 320,
          total: 320,
          billed: false,
          items: [
            { name: 'Lemongrass Ginger Iced Tea', qty: 2, price: 160, station: 'Kitchen' }
          ]
        }
      ];

      // Add to orders without duplicate codes
      rushOrders.forEach(ro => {
        const idx = orders.findIndex(o => o.code === ro.code);
        if (idx !== -1) orders[idx] = ro;
        else orders.unshift(ro);
      });

      Data.saveOrders(orders);
      Data.audit('Load Scenario', 'System', 'kitchen-rush', 'Loaded Kitchen Rush with SLA alerts');
      Data.emit('orders', 'update');
      toast('Kitchen Rush loaded! Check KDS & Orders screen for live SLA age timers.', 'ok');
    }

    else if (scenario === 'maintenance-conflict') {
      // Emergency AC failure on Room 201 overlapping arrival HTL-201
      const res = Data.getReservations();
      let r201 = res.find(r => Number(r.n || r.rm) === 201);
      if (!r201) {
        r201 = {
          c: 'HTL-201',
          code: 'HTL-201',
          g: 'Ambassador Carlos Mendoza',
          t: 'Deluxe City View',
          n: 201,
          rm: 201,
          ci: t,
          co: dayAfter,
          st: 'Confirmed',
          s: 'Confirmed',
          rt: 4200,
          source: 'Online',
          payments: [{ orNo: 'OR-201', amount: 4200, method: 'Credit Card', date: t }]
        };
        res.push(r201);
        Data.saveReservations(res);
      } else {
        r201.st = 'Confirmed';
        r201.s = 'Confirmed';
        r201.ci = t;
        r201.co = dayAfter;
        Data.saveReservations(res);
      }

      // Add urgent OOS work order for Room 201
      const mx = Data.getMaintenance();
      const existingWO = mx.find(w => Number(w.room) === 201 && w.status === 'Open');
      if (!existingWO) {
        mx.unshift({
          id: 'WO-201-EMERGENCY',
          room: 201,
          title: 'HVAC Air Conditioning Failure — Compressor Locked',
          priority: 'Urgent',
          status: 'Open',
          outOfService: true,
          oos: true,
          startDate: t,
          endDate: dayAfter,
          reportedDate: t,
          reportedBy: 'Staff',
          assignedTo: 'Engr. Roberto Dizon',
          notes: 'Freon leak detected. Compressor requires overhaul. Room must remain Out of Service.'
        });
        Data.saveMaintenance(mx);
      }

      // Update room status
      const rooms = Data.getRooms();
      const rm = rooms.find(r => Number(r.n) === 201);
      if (rm) {
        rm.oos = true;
        rm.st = 'Out of Service';
        Data.saveRooms(rooms);
      }

      Data.audit('Load Scenario', 'System', 'maintenance-conflict', 'Injected Room 201 OOS conflict overlapping arrival HTL-201');
      Data.emit('maintenance', 'update');
      toast('Maintenance Conflict loaded! Room 201 OOS overlaps arrival HTL-201.', 'ok');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
