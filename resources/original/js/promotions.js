/* ==========================================================================
   PUPSJ Hotel & Restaurant — Promotions & Special Offers (promotions.js)
   Full CRUD for room and restaurant discount codes, qualification rules,
   dual schema usage tracking (limit/usageLimit, used/usedCount), and status toggling.
   ========================================================================== */
'use strict';

(function () {
  let appliesFilter = '';
  let searchQuery = '';
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('promotionsApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function renderApp() {
    const app = $('promotionsApp');
    if (!app) return;

    const promos = Data.getPromos();
    const activeCount = promos.filter(p => p.active).length;
    const roomPromosCount = promos.filter(p => p.appliesTo === 'rooms' || p.appliesTo === 'both').length;
    const diningPromosCount = promos.filter(p => p.appliesTo === 'restaurant' || p.appliesTo === 'both').length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">MARKETING &amp; RATES</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Promotions &amp; Special Offers</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn" id="btnAddPromo">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Create Promo Code
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Configured Codes</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${promos.length}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Active Campaigns</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${activeCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Room Deals</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--info); margin-top: 4px;">${roomPromosCount}</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Dining Specials</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--warn); margin-top: 4px;">${diningPromosCount}</div>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="promoSearchInput">Search Offers</label>
            <input type="text" id="promoSearchInput" placeholder="Code, title, or keywords…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="promoAppliesFilter">Applies To</label>
            <select id="promoAppliesFilter">
              <option value="">All Applications</option>
              <option value="rooms" ${appliesFilter === 'rooms' ? 'selected' : ''}>Rooms Only</option>
              <option value="restaurant" ${appliesFilter === 'restaurant' ? 'selected' : ''}>Restaurant Dining Only</option>
              <option value="both" ${appliesFilter === 'both' ? 'selected' : ''}>Both Rooms &amp; Dining</option>
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetPromoFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Promos Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Promo Code</th>
                <th>Title &amp; Campaign</th>
                <th>Applies To</th>
                <th>Discount Value</th>
                <th>Qualification Rules</th>
                <th>Usage Limit</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="promosTableBody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('promoSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); renderTable(); };
    $('promoAppliesFilter').onchange = (e) => { appliesFilter = e.target.value; renderTable(); };

    $('btnResetPromoFilters').onclick = () => {
      searchQuery = '';
      appliesFilter = '';
      $('promoSearchInput').value = '';
      $('promoAppliesFilter').value = '';
      renderTable();
    };

    $('btnAddPromo').onclick = () => openAddPromoModal();
  }

  function getFilteredPromos() {
    const list = Data.getPromos();
    return list.filter(p => {
      if (appliesFilter && p.appliesTo !== appliesFilter && p.appliesTo !== 'both') return false;
      if (searchQuery) {
        const text = `${p.code} ${p.title} ${p.description || ''}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const tbody = $('promosTableBody');
    if (!tbody) return;

    const list = getFilteredPromos();
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No promotion codes found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      let valText = p.type === 'percent' ? `${p.value}% OFF` : (p.type === 'credit' ? `${peso(p.value)} Dining Credit` : `${peso(p.value)} OFF`);

      let rules = [];
      if (p.minNights) rules.push(`Min ${p.minNights} nights`);
      if (p.minSpend) rules.push(`Min spend ${peso(p.minSpend)}`);
      if (p.validFrom && p.validTo) rules.push(`${fmtDate(p.validFrom)} to ${fmtDate(p.validTo)}`);
      const rulesDisplay = rules.length > 0 ? rules.join(' &middot; ') : 'No restrictions';

      const limit = p.limit != null ? p.limit : (p.usageLimit != null ? p.usageLimit : 0);
      const used = p.used != null ? p.used : (p.usedCount != null ? p.usedCount : 0);
      const usageDisplay = limit > 0 ? `${used} / ${limit} redeemed` : `${used} redeemed (unlimited)`;

      return `
        <tr>
          <td>
            <b style="font-family: monospace; font-size: 14px; background: var(--surface-2); padding: 3px 6px; border-radius: var(--r); border: 1px solid var(--line);">${esc(p.code)}</b>
          </td>
          <td>
            <div style="font-weight: 600;">${esc(p.title)}</div>
            ${p.description ? `<div class="text-xs text-muted">${esc(p.description)}</div>` : ''}
          </td>
          <td>
            <span class="pill pill--info" style="font-size: 11px;">
              ${p.appliesTo === 'rooms' ? 'Rooms' : p.appliesTo === 'restaurant' ? 'Dining' : 'All Modules'}
            </span>
          </td>
          <td>
            <b style="color: var(--ok);">${valText}</b>
          </td>
          <td><div class="text-xs text-secondary">${rulesDisplay}</div></td>
          <td><div class="text-xs text-muted">${usageDisplay}</div></td>
          <td>
            <span class="pill ${p.active ? 'pill--ok' : 'pill--bad'}">
              ${p.active ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button type="button" class="btn-secondary btn-sm" onclick="togglePromoActive('${esc(p.code)}')">
                ${p.active ? 'Disable' : 'Enable'}
              </button>
              <button type="button" class="btn-secondary btn-sm" onclick="openEditPromoModal('${esc(p.code)}')">Edit</button>
              <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deletePromo('${esc(p.code)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.togglePromoActive = function (code) {
    const list = Data.getPromos();
    const item = list.find(p => p.code === code);
    if (!item) return;

    item.active = !item.active;
    Data.savePromos(list);
    Data.audit('Promo Status', 'promo', code, `Promo code ${code} set to ${item.active ? 'Active' : 'Disabled'}`);
    toast(`Promo ${code} is now ${item.active ? 'Active' : 'Disabled'}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  function openAddPromoModal() {
    const bodyHtml = `
      <form id="addPromoForm" style="font-size: 13px;" onsubmit="return false;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newPromoCode">Promotional Code (Uppercase) *</label>
            <input type="text" id="newPromoCode" required placeholder="e.g. SUMMER15" style="text-transform: uppercase;">
          </div>
          <div class="field">
            <label for="newPromoTitle">Campaign Title *</label>
            <input type="text" id="newPromoTitle" required placeholder="e.g. Summer Getaway Special">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newPromoApplies">Applies To *</label>
            <select id="newPromoApplies">
              <option value="rooms">Rooms Only</option>
              <option value="restaurant">Restaurant Dining Only</option>
              <option value="both">Both Rooms &amp; Dining</option>
            </select>
          </div>
          <div class="field">
            <label for="newPromoType">Discount Type *</label>
            <select id="newPromoType">
              <option value="percent">Percentage Discount (%)</option>
              <option value="fixed">Fixed Deduction (₱)</option>
              <option value="credit">Dining Credit (₱)</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newPromoValue">Discount Value *</label>
            <input type="number" id="newPromoValue" min="1" required placeholder="e.g. 15 for 15% or 500 for ₱500">
          </div>
          <div class="field">
            <label for="newPromoMinNights">Min Stay Nights (Rooms)</label>
            <input type="number" id="newPromoMinNights" min="0" value="0" placeholder="0 = no minimum">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newPromoMinSpend">Min Qualifying Spend (₱)</label>
            <input type="number" id="newPromoMinSpend" min="0" value="0" placeholder="0 = no minimum">
          </div>
          <div class="field">
            <label for="newPromoLimit">Total Usage Limit</label>
            <input type="number" id="newPromoLimit" min="0" value="0" placeholder="0 = unlimited">
          </div>
        </div>

        <div class="field">
          <label for="newPromoDesc">Campaign Description</label>
          <textarea id="newPromoDesc" rows="2" placeholder="Factual copy explaining offer eligibility…"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAddPromo">Create Promo</button>
      </div>
    `;

    showModal('Create Promotional Campaign', bodyHtml, footerHtml, { maxWidth: '520px' });

    $('btnSubmitAddPromo').onclick = () => {
      const code = ($('newPromoCode').value || '').trim().toUpperCase();
      const title = ($('newPromoTitle').value || '').trim();
      const appliesTo = $('newPromoApplies').value;
      const type = $('newPromoType').value;
      const value = parseFloat($('newPromoValue').value);
      const minNights = parseInt($('newPromoMinNights').value, 10) || 0;
      const minSpend = parseFloat($('newPromoMinSpend').value) || 0;
      const limit = parseInt($('newPromoLimit').value, 10) || 0;
      const desc = ($('newPromoDesc').value || '').trim();

      if (!code) { toast('Please enter promo code', 'warn'); return; }
      if (!title) { toast('Please enter campaign title', 'warn'); return; }
      if (isNaN(value) || value <= 0) { toast('Please enter valid discount value', 'warn'); return; }

      const list = Data.getPromos();
      if (list.some(p => p.code === code)) {
        toast(`Promo code "${code}" already exists!`, 'bad');
        return;
      }

      list.push({
        code,
        title,
        description: desc,
        appliesTo,
        type,
        value,
        minNights,
        minSpend,
        limit: limit,
        usageLimit: limit,
        used: 0,
        usedCount: 0,
        active: true
      });

      Data.savePromos(list);
      Data.audit('Create Promo', 'promo', code, `Created promo code ${code} (${type} ${value})`);
      toast(`Promo code ${code} created`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  window.openEditPromoModal = function (code) {
    const list = Data.getPromos();
    const item = list.find(p => p.code === code);
    if (!item) return;

    const limit = item.limit != null ? item.limit : (item.usageLimit != null ? item.usageLimit : 0);

    const bodyHtml = `
      <form id="editPromoForm" style="font-size: 13px;" onsubmit="return false;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Promotional Code</label>
            <input type="text" value="${esc(item.code)}" readonly>
          </div>
          <div class="field">
            <label for="editPromoTitle">Campaign Title *</label>
            <input type="text" id="editPromoTitle" value="${esc(item.title)}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editPromoApplies">Applies To</label>
            <select id="editPromoApplies">
              <option value="rooms" ${item.appliesTo === 'rooms' ? 'selected' : ''}>Rooms Only</option>
              <option value="restaurant" ${item.appliesTo === 'restaurant' ? 'selected' : ''}>Restaurant Dining Only</option>
              <option value="both" ${item.appliesTo === 'both' ? 'selected' : ''}>Both Rooms &amp; Dining</option>
            </select>
          </div>
          <div class="field">
            <label for="editPromoValue">Discount Value</label>
            <input type="number" id="editPromoValue" value="${item.value}" min="1" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editPromoMinNights">Min Stay Nights</label>
            <input type="number" id="editPromoMinNights" value="${item.minNights || 0}" min="0">
          </div>
          <div class="field">
            <label for="editPromoMinSpend">Min Spend (₱)</label>
            <input type="number" id="editPromoMinSpend" value="${item.minSpend || 0}" min="0">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editPromoLimit">Total Usage Limit</label>
            <input type="number" id="editPromoLimit" value="${limit}" min="0" placeholder="0 = unlimited">
          </div>
          <div class="field">
            <label for="editPromoType">Discount Type</label>
            <select id="editPromoType">
              <option value="percent" ${item.type === 'percent' ? 'selected' : ''}>Percentage (%)</option>
              <option value="fixed" ${item.type === 'fixed' ? 'selected' : ''}>Fixed Amount (₱)</option>
              <option value="credit" ${item.type === 'credit' ? 'selected' : ''}>Dining Credit (₱)</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="editPromoDesc">Description</label>
          <textarea id="editPromoDesc" rows="2">${esc(item.description || '')}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitEditPromo">Save Changes</button>
      </div>
    `;

    showModal(`Edit Promo &mdash; ${esc(item.code)}`, bodyHtml, footerHtml, { maxWidth: '520px' });

    $('btnSubmitEditPromo').onclick = () => {
      const title = ($('editPromoTitle').value || '').trim();
      const val = parseFloat($('editPromoValue').value);
      const newLimit = parseInt($('editPromoLimit').value, 10) || 0;

      if (!title || isNaN(val) || val <= 0) {
        toast('Please enter valid title and value', 'warn');
        return;
      }

      item.title = title;
      item.value = val;
      item.appliesTo = $('editPromoApplies').value;
      item.type = $('editPromoType').value;
      item.minNights = parseInt($('editPromoMinNights').value, 10) || 0;
      item.minSpend = parseFloat($('editPromoMinSpend').value) || 0;
      item.limit = newLimit;
      item.usageLimit = newLimit;
      item.description = ($('editPromoDesc').value || '').trim();

      Data.savePromos(list);
      Data.audit('Edit Promo', 'promo', item.code, `Updated promotion ${item.code}`);
      toast(`Promo ${item.code} updated`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  window.deletePromo = async function (code) {
    const ok = await confirmDialog(`Are you sure you want to delete promo code "${code}"?`, 'Delete Promo Code', { danger: true });
    if (ok) {
      let list = Data.getPromos();
      list = list.filter(p => p.code !== code);
      Data.savePromos(list);
      Data.audit('Delete Promo', 'promo', code, `Deleted promo code ${code}`);
      toast(`Promo ${code} deleted`, 'ok');
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    }
  };

  // Safe single initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('pupsj:data-change', () => {
    if (initialized) renderApp();
  });
})();
