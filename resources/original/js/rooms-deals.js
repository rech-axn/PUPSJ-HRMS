/* ==========================================================================
   PUPSJ Hotel & Restaurant — Rooms & Deals Logic (rooms-deals.js)
   Parses URL parameters, live inventory search, stay total computation,
   data-driven featured room type, auto-scroll to ?type=, and active promotions rendering.
   ========================================================================== */
'use strict';

(function () {
  const T = today();
  const params = new URLSearchParams(window.location.search);

  const ciInput = $('rdCi');
  const coInput = $('rdCo');
  const gsInput = $('rdGs');
  const searchForm = $('rdSearchForm');
  const scopeFilter = $('dealScopeFilter');
  const paramType = params.get('type');

  // Initialize dates from URL or defaults
  const paramCi = params.get('ci') || T;
  const paramCo = params.get('co') || addDays(paramCi, 1);
  const paramGs = params.get('gs') || '2';

  if (ciInput && coInput) {
    ciInput.min = T;
    ciInput.value = paramCi >= T ? paramCi : T;
    coInput.min = addDays(ciInput.value, 1);
    coInput.value = paramCo > ciInput.value ? paramCo : addDays(ciInput.value, 1);
    if (gsInput) gsInput.value = paramGs;

    ciInput.onchange = () => {
      if (ciInput.value < T) ciInput.value = T;
      coInput.min = addDays(ciInput.value, 1);
      if (coInput.value <= ciInput.value) coInput.value = addDays(ciInput.value, 1);
      refresh();
    };

    coInput.onchange = refresh;
    if (gsInput) gsInput.onchange = refresh;
  }

  if (searchForm) {
    searchForm.onsubmit = e => {
      e.preventDefault();
      refresh();
    };
  }

  if (scopeFilter) {
    scopeFilter.onchange = renderDeals;
  }

  // 1. Render Rooms Grid
  function renderRooms() {
    const grid = $('rdRoomsGrid');
    const summary = $('rdStaySummary');
    if (!grid) return;

    const ci = ciInput ? ciInput.value : T;
    const co = coInput ? coInput.value : addDays(ci, 1);
    const gs = gsInput ? (+gsInput.value || 2) : 2;
    const nights = Math.max(1, dateDiff(ci, co));

    if (summary) {
      summary.textContent = `Showing rates for ${fmtDate(ci)} to ${fmtDate(co)} · ${nights} night${nights > 1 ? 's' : ''} · ${gs} guest${gs > 1 ? 's' : ''}`;
    }

    const types = Data.getTypes();
    grid.innerHTML = types.map(t => {
      const free = Data.freeRooms(t.n, ci, co).length;
      const exceedsCapacity = gs > t.g;
      const isAvailable = free > 0 && !exceedsCapacity;
      const stayPricing = typeof calculateStayPricing === 'function'
        ? calculateStayPricing({ baseRate: t.r, nights })
        : { netTotal: t.r * nights, depDue: Math.ceil(t.r * nights * 0.5) };
      const stayTotal = stayPricing.netTotal;
      const descText = t.desc || t.description || '';
      const amText = Array.isArray(t.amenities) ? t.amenities.map(esc).join(' · ') : esc(t.amenities || '');
      const reserveLabel = t.n.includes('Suite') ? `Reserve ${t.n}` : `Reserve ${t.n} Room`;

      return `
        <div class="card" data-room-type="${esc(t.n)}" style="display: flex; flex-direction: column; justify-content: space-between; transition: box-shadow 0.3s ease;">
          <div>
            ${imgPlaceholder(`${t.n} Suite`, '16:9')}
            <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: baseline;">
              <h3 style="margin: 0;">${esc(t.n)}</h3>
              <span class="pill ${isAvailable ? 'pill--ok' : 'pill--bad'}">
                ${exceedsCapacity ? `Max ${t.g} Guests` : isAvailable ? `${free} Available` : 'Unavailable'}
              </span>
            </div>
            <p class="text-sm" style="margin: 8px 0 10px; color: var(--ink-2);">${esc(descText)}</p>
            <div class="text-sm" style="color: var(--ink-3); margin-bottom: 12px;">
              <b>Amenities:</b> ${amText}
            </div>
          </div>

          <div style="border-top: 1px solid var(--line); padding-top: 12px; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
              <div>
                <b style="font-size: 19px; color: var(--gold-ink);">${peso(t.r)}</b>
                <span class="text-sm">/ night</span>
              </div>
              <div class="text-sm">
                Total stay: <b style="color: var(--ink);">${peso(stayTotal)}</b>
              </div>
            </div>
            <div class="text-sm" style="color: var(--ink-3); margin-bottom: 12px;">
              Includes ${CONFIG.tax.vatPct}% VAT and ${CONFIG.tax.svcPct}% service charge (${nights} nights, ${gs} guests)
            </div>
            <button class="btn btn-block" ${isAvailable ? '' : 'disabled'} data-reserve-type="${esc(t.n)}">
              ${isAvailable ? `${esc(reserveLabel)} &rarr;` : 'Unavailable for Selected Dates'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-reserve-type]').forEach(btn => {
      btn.onclick = () => {
        const typeName = btn.dataset.reserveType;
        const typeObj = types.find(t => t.n === typeName);
        openBookingModal(typeObj, ci, co, gs, '', refresh);
      };
    });

    // Highlight & scroll to room type if specified in URL using CSS.escape
    if (paramType) {
      const safeSelector = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(paramType) : paramType.replace(/["\\]/g, '\\$&');
      const match = grid.querySelector(`[data-room-type="${safeSelector}"]`);
      if (match) {
        setTimeout(() => {
          match.scrollIntoView({ behavior: 'smooth', block: 'center' });
          match.style.boxShadow = '0 0 0 3px var(--gold)';
          setTimeout(() => { match.style.boxShadow = ''; }, 3000);
        }, 200);
      }
    }
  }

  // 2. Render Data-Driven Featured Room Type
  function renderFeaturedRoom() {
    const container = $('featuredRoomContainer');
    if (!container) return;

    const types = Data.getTypes();
    const featured = [...types].sort((a, b) => b.r - a.r)[0];
    if (!featured) return;

    const ci = ciInput ? ciInput.value : T;
    const co = coInput ? coInput.value : addDays(ci, 1);
    const gs = gsInput ? (+gsInput.value || 2) : 2;
    const nights = Math.max(1, dateDiff(ci, co));
    const free = Data.freeRooms(featured.n, ci, co).length;
    const isFeatAvail = free > 0 && gs <= featured.g;
    const featPricing = typeof calculateStayPricing === 'function'
      ? calculateStayPricing({ baseRate: featured.r, nights })
      : { netTotal: featured.r * nights };

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <span class="site-section-tag">SIGNATURE ACCOMMODATION</span>
        <h2 style="margin-bottom: 20px;">Featured: ${esc(featured.n)}</h2>

        <div class="card grid-2" style="gap: 32px; align-items: center;">
          <div>
            ${imgPlaceholder(`${featured.n} Showcase`, '4:3')}
          </div>
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <span class="pill pill--ok">Signature Suite</span>
              <span class="pill pill--muted">Sleeps up to ${featured.g} Guests</span>
            </div>
            <h3 style="margin-bottom: 8px; font-size: 24px;">${esc(featured.n)}</h3>
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">${esc(featured.desc || featured.description || '')}</p>

            <div style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span class="text-sm">Nightly Rate:</span>
                <b style="font-size: 18px; color: var(--gold-ink);">${peso(featured.r)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                <span class="text-sm">Total (${nights} nights):</span>
                <b>${peso(featPricing.netTotal)}</b>
              </div>
            </div>

            <button class="btn btn-block" ${isFeatAvail ? '' : 'disabled'} id="btnFeaturedReserve">
              ${isFeatAvail ? 'Reserve Signature Suite &rarr;' : 'Sold Out for Selected Dates'}
            </button>
          </div>
        </div>
      </div>
    `;

    const featBtn = $('btnFeaturedReserve');
    if (featBtn && isFeatAvail) {
      featBtn.onclick = () => {
        openBookingModal(featured, ci, co, gs, '', refresh);
      };
    }
  }

  // 3. Render Promotions Store
  function renderDeals() {
    const grid = $('dealsGrid');
    const countEl = $('dealCountText');
    if (!grid) return;

    const scope = scopeFilter ? scopeFilter.value : '';
    const promos = Data.getPromos().filter(p => p.active && (!scope || p.appliesTo === 'both' || p.appliesTo === scope));

    if (countEl) {
      countEl.textContent = `Showing ${promos.length} active offer${promos.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = promos.map(p => {
      const discountLabel = p.type === 'percent'
        ? `${p.value}% Discount`
        : p.type === 'credit'
          ? `${peso(p.value)} Dining Credit`
          : `${peso(p.value)} Savings`;

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span class="pill pill--ok">${discountLabel}</span>
              <span class="pill pill--muted" style="text-transform: capitalize;">${esc(p.appliesTo)}</span>
            </div>
            <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: var(--gold-ink); margin-bottom: 4px;">
              PROMO: ${esc(p.code)}
            </div>
            <b style="font-size: 16px; display: block; margin-bottom: 6px;">${esc(p.title)}</b>
            <p class="text-sm" style="color: var(--ink-2); line-height: 1.5;">${esc(p.description || '')}</p>
          </div>

          <div style="border-top: 1px solid var(--line); padding-top: 12px; margin-top: 14px;">
            <div class="text-sm" style="color: var(--ink-3); margin-bottom: 10px;">
              ${p.minNights ? `Min. Stay: ${p.minNights} nights &middot; ` : ''}
              ${p.minSpend ? `Min. Spend: ${peso(p.minSpend)} &middot; ` : ''}
              ${p.validTo ? `Valid until ${fmtShortDate(p.validTo)}` : 'Ongoing Offer'}
            </div>
            <button class="btn-secondary btn-sm btn-block" data-claim-promo="${esc(p.code)}" data-scope="${esc(p.appliesTo)}">
              Claim Offer &rarr;
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-claim-promo]').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.claimPromo;
        const scope = btn.dataset.scope;
        if (scope === 'restaurant') {
          location.href = `../main/menu.html?promo=${encodeURIComponent(code)}#reserve-table`;
        } else {
          const types = Data.getTypes();
          const ci = ciInput ? ciInput.value : T;
          const co = coInput ? coInput.value : addDays(T, 1);
          const gs = gsInput ? (+gsInput.value || 2) : 2;
          const suitable = types.find(t => t.g >= gs && Data.freeRooms(t.n, ci, co).length > 0) || types.find(t => t.g >= gs) || types[0];
          openBookingModal(suitable, ci, co, gs, code, refresh);
        }
      };
    });
  }

  function refresh() {
    renderRooms();
    renderFeaturedRoom();
    renderDeals();
  }

  // Initial load
  refresh();
})();
