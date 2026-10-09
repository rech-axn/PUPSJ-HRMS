/* ==========================================================================
   PUPSJ Hotel & Restaurant — Homepage Logic (home.js)
   Initializes booking bar dates, dynamically renders room cards from Data,
   populates config-driven amenities and contact details.
   ========================================================================== */
'use strict';

(function () {
  const T = today();
  const ciInput = $('ci');
  const coInput = $('co');
  const gsInput = $('gs');
  const bookingBar = $('homeBookingBar');

  // 1. Initialize Booking Bar Dates
  if (ciInput && coInput) {
    ciInput.min = T;
    ciInput.value = T;
    coInput.min = addDays(T, 1);
    coInput.value = addDays(T, 2);

    ciInput.onchange = () => {
      if (ciInput.value < T) ciInput.value = T;
      coInput.min = addDays(ciInput.value, 1);
      if (coInput.value <= ciInput.value) {
        coInput.value = addDays(ciInput.value, 1);
      }
      renderFeaturedRooms();
    };

    coInput.onchange = () => {
      renderFeaturedRooms();
    };

    if (gsInput) {
      gsInput.onchange = () => {
        renderFeaturedRooms();
      };
    }
  }

  if (bookingBar) {
    bookingBar.onsubmit = e => {
      e.preventDefault();
      const ci = ciInput ? ciInput.value : T;
      const co = coInput ? coInput.value : addDays(T, 1);
      const gs = gsInput ? gsInput.value : '2';
      location.href = `../rooms/rooms-deals.html?ci=${ci}&co=${co}&gs=${gs}#rooms`;
    };
  }

  // 2. Render Featured Rooms
  function renderFeaturedRooms() {
    const grid = $('homeRoomsGrid');
    if (!grid) return;

    const types = Data.getTypes();
    const ci = ciInput ? ciInput.value : T;
    const co = coInput ? coInput.value : addDays(T, 1);
    const gs = gsInput ? (+gsInput.value || 2) : 2;
    const nights = Math.max(1, dateDiff(ci, co));

    grid.innerHTML = types.map(t => {
      const free = Data.freeRooms(t.n, ci, co).length;
      const exceedsCapacity = gs > t.g;
      const isAvailable = free > 0 && !exceedsCapacity;
      const pricing = typeof calculateStayPricing === 'function'
        ? calculateStayPricing({ baseRate: t.r, nights })
        : { netTotal: t.r * nights };

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            ${imgPlaceholder(`${t.n} Room`, '16:9')}
            <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: baseline;">
              <h3 style="margin: 0;">${esc(t.n)}</h3>
              <span class="pill ${isAvailable ? 'pill--ok' : 'pill--bad'}">
                ${exceedsCapacity ? `Max ${t.g} Guests` : isAvailable ? `${free} Available` : 'Fully Booked'}
              </span>
            </div>
            <p class="text-sm" style="margin: 8px 0 12px; color: var(--ink-2);">${esc(t.desc || t.description || '')}</p>
            <div style="font-size: 13px; color: var(--ink-3); margin-bottom: 12px;">
              <b>Amenities:</b> ${Array.isArray(t.amenities) ? t.amenities.map(esc).join(' · ') : esc(t.amenities || '')}
            </div>
          </div>

          <div style="border-top: 1px solid var(--line); padding-top: 12px; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <div>
                <b style="font-size: 18px; color: var(--gold-ink);">${peso(t.r)}</b>
                <span class="text-sm">/ night</span>
              </div>
              <div class="text-sm" style="color: var(--ink-3);">
                Total: <b>${peso(pricing.netTotal)}</b> (${nights} night${nights > 1 ? 's' : ''})
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="../rooms/rooms-deals.html?ci=${ci}&co=${co}&type=${encodeURIComponent(t.n)}" class="btn-secondary btn-sm" style="flex: 1;">
                View Details
              </a>
              <button class="btn btn-sm" style="flex: 1;" ${isAvailable ? '' : 'disabled'} data-book-type="${esc(t.n)}">
                Reserve &rarr;
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to reserve buttons
    grid.querySelectorAll('[data-book-type]').forEach(btn => {
      btn.onclick = () => {
        const typeName = btn.dataset.bookType;
        const typeObj = types.find(t => t.n === typeName);
        const ci = ciInput ? ciInput.value : T;
        const co = coInput ? coInput.value : addDays(T, 1);
        const gs = gsInput ? (+gsInput.value || 2) : 2;
        openBookingModal(typeObj, ci, co, gs, '', renderFeaturedRooms);
      };
    });
  }

  // 3. Render Hotel Amenities from CONFIG
  function renderAmenities() {
    const grid = $('homeAmenitiesGrid');
    if (!grid) return;

    grid.innerHTML = CONFIG.amenities.map(a => `
      <div class="card card-sm">
        <span class="ic" data-icon="star-filled" style="margin-bottom: 6px;">[ICON: star-filled]</span>
        <b style="display: block; font-size: 15px; margin-bottom: 4px;">${esc(a.name)}</b>
        <p class="text-sm" style="margin: 0;">${esc(a.desc)}</p>
      </div>
    `).join('');
  }

  // 4. Fill Address & Contact Details
  if ($('homeAddressText')) $('homeAddressText').textContent = CONFIG.address;
  if ($('homeContactText')) $('homeContactText').innerHTML = `Tel: ${CONFIG.phones[0]}<br>Email: ${CONFIG.emails.general}`;

  // Run on load
  renderFeaturedRooms();
  renderAmenities();
})();
