/* ==========================================================================
   PUPSJ Hotel & Restaurant — Room Types Management (roomtypes.js)
   Room categories CRUD, capacity, nightly rates, descriptions,
   amenities list, image placeholders, and reservation integrity protection.
   ========================================================================== */
'use strict';

(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('roomTypesApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function renderApp() {
    const app = $('roomTypesApp');
    if (!app) return;

    const types = Data.getTypes();
    const rooms = Data.getRooms();

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">SETTINGS &amp; CONFIGURATION</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Room Types &amp; Categories</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <a class="btn-secondary" href="rooms.html">
            <span class="ic" data-icon="key">[ICON: key]</span> View Room Inventory
          </a>
          <button type="button" class="btn" id="btnAddType">
            <span class="ic" data-icon="plus">[ICON: plus]</span> New Room Type
          </button>
        </div>
      </div>

      <!-- Categories Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
        ${types.map(t => {
          const roomCount = rooms.filter(r => r.t === t.n).length;
          const rawAmenities = t.amenities;
          const amenities = Array.isArray(rawAmenities)
            ? rawAmenities
            : (typeof rawAmenities === 'string' ? rawAmenities.split(',').map(s => s.trim()).filter(Boolean) : ['High-speed Wi-Fi', 'Air Conditioning', 'En-suite Bathroom', 'Smart TV']);
          const descriptionText = t.desc || t.description || 'Spacious and elegantly appointed accommodation designed for relaxation and comfort.';

          return `
            <div class="card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <!-- Image Placeholder Slot -->
                <div style="background: var(--surface-2); border: 1px dashed var(--line); border-radius: var(--r); height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 14px; text-align: center; padding: 10px;">
                  <span class="ic" data-icon="bed" style="font-size: 16px; margin-bottom: 4px;">[ICON: bed]</span>
                  <span class="text-xs text-muted">[IMAGE: ${esc(t.n)}, 16:9 ratio]</span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <div>
                    <h3 style="margin: 0; font-size: 18px; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink);">${esc(t.n)}</h3>
                    <div class="text-xs text-secondary" style="margin-top: 2px;">Sleeps up to ${t.g} guests &middot; ${roomCount} room(s) configured</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: 700; color: var(--gold);">${peso(t.r)}</div>
                    <div class="text-xs text-muted">per night</div>
                  </div>
                </div>

                <p class="text-sm text-secondary" style="margin: 10px 0 12px 0; line-height: 1.4;">
                  ${esc(descriptionText)}
                </p>

                <div style="margin-bottom: 14px;">
                  <span class="text-xs text-secondary" style="font-weight: 600;">Room Amenities:</span>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${amenities.map(a => `
                      <span class="pill pill--muted" style="font-size: 11px;">${esc(a)}</span>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 12px; margin-top: 10px;">
                <a class="text-xs" href="rooms.html?type=${encodeURIComponent(t.n)}" style="font-weight: 600;">
                  View ${roomCount} Room(s) &rarr;
                </a>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="btn-secondary btn-sm" onclick="openEditTypeModal('${esc(t.n)}')">Edit</button>
                  <button type="button" class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deleteRoomType('${esc(t.n)}')">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const btn = $('btnAddType');
    if (btn) btn.onclick = () => openAddTypeModal();
  }

  function openAddTypeModal() {
    const bodyHtml = `
      <form id="addTypeForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label for="newTypeName">Room Category Name *</label>
          <input type="text" id="newTypeName" required placeholder="e.g. Deluxe Garden Villa">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="newTypeRate">Nightly Rate (PHP) *</label>
            <input type="number" id="newTypeRate" min="500" required placeholder="e.g. 3500">
          </div>
          <div class="field">
            <label for="newTypeGuests">Max Guests Capacity *</label>
            <input type="number" id="newTypeGuests" min="1" max="10" value="2" required>
          </div>
        </div>
        <div class="field">
          <label for="newTypeDesc">Category Description</label>
          <textarea id="newTypeDesc" rows="3" placeholder="Neutral, factual description of room features and layout…"></textarea>
        </div>
        <div class="field">
          <label for="newTypeAmenities">Amenities (Comma-separated)</label>
          <input type="text" id="newTypeAmenities" value="Wi-Fi, Air Conditioning, Hot Shower, Smart TV, Work Desk" placeholder="Wi-Fi, Balcony, Mini Fridge…">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitAddType">Create Category</button>
      </div>
    `;

    showModal('New Room Category', bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitAddType').onclick = () => {
      const name = ($('newTypeName').value || '').trim();
      const rate = parseFloat($('newTypeRate').value);
      const guests = parseInt($('newTypeGuests').value, 10);
      const desc = ($('newTypeDesc').value || '').trim();
      const amRaw = ($('newTypeAmenities').value || '').trim();
      const amenities = amRaw ? amRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      if (!name) { toast('Please enter category name', 'warn'); return; }
      if (isNaN(rate) || rate <= 0) { toast('Please enter valid rate', 'warn'); return; }

      const types = Data.getTypes();
      if (types.some(t => t.n.toLowerCase() === name.toLowerCase())) {
        toast(`Category "${name}" already exists!`, 'bad');
        return;
      }

      types.push({
        id: `TYP-${types.length + 1}`,
        n: name,
        r: rate,
        g: guests || 2,
        desc: desc,
        description: desc,
        amenities: amenities
      });

      Data.saveTypes(types);
      Data.audit('Create Room Type', 'type', name, `Created room category ${name} with rate ${peso(rate)}`);
      toast(`Room type ${name} created`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  }

  window.openEditTypeModal = function (typeName) {
    const types = Data.getTypes();
    const item = types.find(t => t.n === typeName);
    if (!item) return;

    const rawAmenities = item.amenities;
    const amenitiesArr = Array.isArray(rawAmenities)
      ? rawAmenities
      : (typeof rawAmenities === 'string' ? rawAmenities.split(',').map(s => s.trim()).filter(Boolean) : []);

    const bodyHtml = `
      <form id="editTypeForm" style="font-size: 13px;" onsubmit="return false;">
        <div class="field">
          <label>Room Category Name</label>
          <input type="text" value="${esc(item.n)}" readonly>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label for="editTypeRate">Nightly Rate (PHP) *</label>
            <input type="number" id="editTypeRate" min="500" value="${item.r}" required>
          </div>
          <div class="field">
            <label for="editTypeGuests">Max Guests Capacity *</label>
            <input type="number" id="editTypeGuests" min="1" max="10" value="${item.g}" required>
          </div>
        </div>
        <div class="field">
          <label for="editTypeDesc">Category Description</label>
          <textarea id="editTypeDesc" rows="3">${esc(item.desc || item.description || '')}</textarea>
        </div>
        <div class="field">
          <label for="editTypeAmenities">Amenities (Comma-separated)</label>
          <input type="text" id="editTypeAmenities" value="${esc(amenitiesArr.join(', '))}">
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSubmitEditType">Save Changes</button>
      </div>
    `;

    showModal(`Edit Category &mdash; ${esc(item.n)}`, bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitEditType').onclick = () => {
      const rate = parseFloat($('editTypeRate').value);
      const guests = parseInt($('editTypeGuests').value, 10);
      const desc = ($('editTypeDesc').value || '').trim();
      const amRaw = ($('editTypeAmenities').value || '').trim();

      if (isNaN(rate) || rate <= 0) { toast('Please enter valid rate', 'warn'); return; }

      item.r = rate;
      item.g = guests || 2;
      item.desc = desc;
      item.description = desc;
      item.amenities = amRaw ? amRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      Data.saveTypes(types);
      Data.audit('Edit Room Type', 'type', item.n, `Updated room category ${item.n} details`);
      toast(`Category ${item.n} updated`, 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
  };

  window.deleteRoomType = function (typeName) {
    // Check reservations
    const reservations = Data.getReservations();
    const hasActiveRes = reservations.some(r => r.t === typeName && (r.st === 'Checked-in' || (r.st === 'Confirmed' && r.o >= today())));
    if (hasActiveRes) {
      toast(`Cannot delete "${typeName}": active or upcoming reservations exist for this room type`, 'bad');
      return;
    }

    // Check rooms
    const rooms = Data.getRooms();
    const roomsCount = rooms.filter(r => r.t === typeName).length;
    if (roomsCount > 0) {
      toast(`Cannot delete "${typeName}": ${roomsCount} room(s) in inventory are assigned to this type`, 'bad');
      return;
    }

    if (confirm(`Are you sure you want to delete category "${typeName}"?`)) {
      let types = Data.getTypes();
      types = types.filter(t => t.n !== typeName);
      Data.saveTypes(types);
      Data.audit('Delete Room Type', 'type', typeName, `Deleted room category ${typeName}`);
      toast(`Category "${typeName}" deleted`, 'ok');
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
