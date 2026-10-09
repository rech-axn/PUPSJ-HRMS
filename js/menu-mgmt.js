/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff Menu Management (menu-mgmt.js)
   Full menu catalog CRUD, availability (86) toggles, category filtering,
   preparation stations (Kitchen vs Bar), and CSV export.
   ========================================================================== */
'use strict';

(function () {
  let catFilter = '';
  let availFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 12;

  const CATEGORIES = ['Breakfast', 'Starters', 'Mains', 'Desserts', 'Drinks'];

  function init() {
    renderApp();
  }

  function renderApp() {
    const app = $('menuMgmtApp');
    if (!app) return;

    const menu = Data.getMenu();
    const availableCount = menu.filter(m => m.available).length;
    const soldOutCount = menu.filter(m => !m.available).length;

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">RESTAURANT &amp; BAR</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Culinary Menu Catalog</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" id="btnExportMenuCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
          <button class="btn" id="btnAddMenuItem">
            <span class="ic" data-icon="plus">[ICON: plus]</span> Add Dish / Item
          </button>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Total Menu Offerings</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink); margin-top: 4px;">${menu.length}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">Active &amp; Orderable</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${availableCount}</div>
        </div>
        <div class="card" style="padding: 16px;">
          <div class="text-sm text-secondary">86'd (Sold Out)</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--bad); margin-top: 4px;">${soldOutCount}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px;">
            <label>Search Item</label>
            <input type="text" id="menuSearchInput" placeholder="Dish name, tag, category…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label>Category</label>
            <select id="menuCatFilter">
              <option value="">All Categories</option>
              ${CATEGORIES.map(c => `<option value="${c}" ${catFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 150px;">
            <label>Availability</label>
            <select id="menuAvailFilter">
              <option value="">All</option>
              <option value="yes" ${availFilter === 'yes' ? 'selected' : ''}>Available Only</option>
              <option value="no" ${availFilter === 'no' ? 'selected' : ''}>86'd / Unavailable Only</option>
            </select>
          </div>
          <div>
            <button class="btn-ghost" id="btnResetMenuFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Menu Items Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price (PHP)</th>
                <th>Station</th>
                <th>Dietary / Tags</th>
                <th>Availability</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="menuTableBody">
              <!-- Injected dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="menuPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('menuSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('menuCatFilter').onchange = (e) => { catFilter = e.target.value; page = 1; renderTable(); };
    $('menuAvailFilter').onchange = (e) => { availFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetMenuFilters').onclick = () => {
      searchQuery = '';
      catFilter = '';
      availFilter = '';
      $('menuSearchInput').value = '';
      $('menuCatFilter').value = '';
      $('menuAvailFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnExportMenuCSV').onclick = () => {
      const items = getFilteredMenu();
      const cols = [
        { header: 'ID', key: 'id' },
        { header: 'Item Name', key: 'name' },
        { header: 'Category', key: 'category' },
        { header: 'Price (PHP)', key: 'price' },
        { header: 'Station', key: 'station' },
        { header: 'Available', key: m => m.available ? 'Yes' : 'No' },
        { header: 'Description', key: 'description' }
      ];
      exportCSV(`PUPSJ_Restaurant_Menu_${today()}.csv`, cols, items);
    };

    $('btnAddMenuItem').onclick = () => openAddMenuModal();
  }

  function getFilteredMenu() {
    const list = Data.getMenu();
    return list.filter(m => {
      if (catFilter && m.category !== catFilter) return false;
      if (availFilter === 'yes' && !m.available) return false;
      if (availFilter === 'no' && m.available) return false;
      if (searchQuery) {
        const text = `${m.name} ${m.category} ${m.description || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderTable() {
    const tbody = $('menuTableBody');
    const pgnEl = $('menuPagination');
    if (!tbody) return;

    const list = getFilteredMenu();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No menu items found matching the current filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(m => {
      const description = m.desc || m.description || '';
      return `
        <tr>
          <td>
            <b>${esc(m.name)}</b>
            ${description ? `<div class="text-xs text-muted" style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(description)}</div>` : ''}
          </td>
          <td>${esc(m.category)}</td>
          <td><b>${peso(m.price)}</b></td>
          <td><span class="pill pill--muted" style="font-size: 11px;">${esc(m.station || 'Kitchen')}</span></td>
          <td>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${(m.tags || []).map(t => `<span class="pill pill--info" style="font-size: 10px;">${esc(t)}</span>`).join('')}
            </div>
          </td>
          <td>
            <span class="pill ${m.available ? 'pill--ok' : 'pill--bad'}">
              ${m.available ? 'Available' : '86\'d (Sold Out)'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button class="btn-secondary btn-sm" onclick="toggleMenuAvailability('${esc(m.id)}')">
                ${m.available ? '86 It' : 'Enable'}
              </button>
              <button class="btn-secondary btn-sm" onclick="openEditMenuModal('${esc(m.id)}')">Edit</button>
              <button class="btn-ghost btn-sm" style="color: var(--bad);" onclick="deleteMenuItem('${esc(m.id)}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${pgn.startIdx + 1}&ndash;${pgn.endIdx} of ${pgn.totalItems} items</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnMenuPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages}</span>
        <button class="btn-secondary btn-sm" ${page >= pgn.totalPages ? 'disabled' : ''} id="btnMenuNext">Next</button>
      </div>
    `;

    const prev = $('btnMenuPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnMenuNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  window.toggleMenuAvailability = function (id) {
    const list = Data.getMenu();
    const item = list.find(m => String(m.id) === String(id));
    if (!item) return;

    item.available = !item.available;
    Data.saveMenu(list);
    Data.audit('Menu Availability', 'menu', String(id), `Set "${item.name}" availability to ${item.available ? 'Available' : '86 Unavailable'}`);
    toast(`"${item.name}" is now ${item.available ? 'Available' : '86\'d (Sold out)'}`, 'ok');
    renderApp();
  };

  function openAddMenuModal() {
    const bodyHtml = `
      <form id="addMenuForm" style="font-size: 13px;">
        <div class="field">
          <label>Dish / Beverage Name *</label>
          <input type="text" id="newDishName" required placeholder="e.g. Crispy Pork Kare-Kare">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Menu Category *</label>
            <select id="newDishCategory">
              ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Price (PHP) *</label>
            <input type="number" id="newDishPrice" min="1" required placeholder="e.g. 480">
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Prep Station</label>
            <select id="newDishStation">
              <option value="Kitchen">Kitchen</option>
              <option value="Bar">Bar</option>
            </select>
          </div>
          <div class="field">
            <label>Tags (Comma-separated)</label>
            <input type="text" id="newDishTags" placeholder="e.g. Chef's Special, House Signature">
          </div>
        </div>
        <div class="field">
          <label>Description / Ingredients</label>
          <textarea id="newDishDesc" rows="2" placeholder="Factual culinary description…"></textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnSubmitAddDish">Save Dish</button>
      </div>
    `;

    showModal('Add Restaurant Offering', bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitAddDish').onclick = () => {
      const name = ($('newDishName').value || '').trim();
      const category = $('newDishCategory').value;
      const price = parseFloat($('newDishPrice').value);
      const station = $('newDishStation').value;
      const tagsRaw = ($('newDishTags').value || '').trim();
      const desc = ($('newDishDesc').value || '').trim();

      if (!name) { toast('Please enter dish name', 'warn'); return; }
      if (isNaN(price) || price <= 0) { toast('Please enter valid price', 'warn'); return; }

      const list = Data.getMenu();
      const nextId = Data.nextId('MNU-');

      list.push({
        id: nextId,
        name,
        category,
        price,
        station,
        desc,
        description: desc,
        tags: tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
        available: true
      });

      Data.saveMenu(list);
      Data.audit('Add Menu Item', 'menu', String(nextId), `Added dish "${name}" (${category}) at ${peso(price)}`);
      toast(`Dish "${name}" added to menu`, 'ok');
      closeModal();
      renderApp();
    };
  }

  window.openEditMenuModal = function (id) {
    const list = Data.getMenu();
    const item = list.find(m => String(m.id) === String(id));
    if (!item) return;

    const bodyHtml = `
      <form id="editMenuForm" style="font-size: 13px;">
        <div class="field">
          <label>Dish Name *</label>
          <input type="text" id="editDishName" value="${esc(item.name)}" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Menu Category *</label>
            <select id="editDishCategory">
              ${CATEGORIES.map(c => `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Price (PHP) *</label>
            <input type="number" id="editDishPrice" min="1" value="${item.price}" required>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="field">
            <label>Prep Station</label>
            <select id="editDishStation">
              <option value="Kitchen" ${item.station === 'Kitchen' ? 'selected' : ''}>Kitchen</option>
              <option value="Bar" ${item.station === 'Bar' ? 'selected' : ''}>Bar</option>
            </select>
          </div>
          <div class="field">
            <label>Tags (Comma-separated)</label>
            <input type="text" id="editDishTags" value="${esc((item.tags || []).join(', '))}">
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea id="editDishDesc" rows="2">${esc(item.desc || item.description || '')}</textarea>
        </div>
      </form>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" id="btnSubmitEditDish">Save Changes</button>
      </div>
    `;

    showModal(`Edit Dish &mdash; ${item.name}`, bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSubmitEditDish').onclick = () => {
      const name = ($('editDishName').value || '').trim();
      const category = $('editDishCategory').value;
      const price = parseFloat($('editDishPrice').value);
      const station = $('editDishStation').value;
      const tagsRaw = ($('editDishTags').value || '').trim();
      const desc = ($('editDishDesc').value || '').trim();

      if (!name) { toast('Please enter dish name', 'warn'); return; }
      if (isNaN(price) || price <= 0) { toast('Please enter valid price', 'warn'); return; }

      item.name = name;
      item.category = category;
      item.price = price;
      item.station = station;
      item.desc = desc;
      item.description = desc;
      item.tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      Data.saveMenu(list);
      Data.audit('Edit Menu Item', 'menu', String(item.id), `Updated dish "${name}"`);
      toast(`Dish "${name}" updated`, 'ok');
      closeModal();
      renderApp();
    };
  };

  window.deleteMenuItem = async function (id) {
    const list = Data.getMenu();
    const item = list.find(m => String(m.id) === String(id));
    if (!item) return;

    const ok = await confirmDialog(`Are you sure you want to delete "${item.name}" from the menu?`, 'Delete Menu Item', { danger: true });
    if (ok) {
      const idx = list.indexOf(item);
      if (idx !== -1) list.splice(idx, 1);
      Data.saveMenu(list);
      Data.audit('Delete Menu Item', 'menu', String(id), `Deleted dish "${item.name}"`);
      toast(`Dish deleted from menu`, 'ok');
      renderApp();
    }
  };

  // Auto-refresh on data change
  window.addEventListener('pupsj:data-change', () => {
    renderApp();
  });

  // Safe single initialization
  let initialized = false;
  function safeInit() {
    if (initialized) return;
    initialized = true;
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    safeInit();
  }
})();
