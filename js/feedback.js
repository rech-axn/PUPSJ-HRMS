/* ==========================================================================
   PUPSJ Hotel & Restaurant — Guest Feedback & Reviews (feedback.js)
   Review moderations, ratings distribution, subcategory scores,
   "Publish on Website" toggle (syncing to About page), and staff replies.
   ========================================================================== */
'use strict';

(function () {
  let ratingFilter = '';
  let publishFilter = '';
  let searchQuery = '';
  let page = 1;
  const pageSize = 10;
  let initialized = false;

  function init() {
    if (initialized) return;
    const app = $('feedbackApp');
    if (!app) return;
    initialized = true;

    renderApp();
  }

  function getRating(f) {
    if (f.ratingOverall != null) return Number(f.ratingOverall);
    if (f.rating != null) return Number(f.rating);
    return 5;
  }

  function getGuest(f) {
    return f.guestName || f.guest || 'Anonymous Guest';
  }

  function getReply(f) {
    return f.staffReply || f.reply || '';
  }

  function getDate(f) {
    return f.created || f.date || today();
  }

  function getFilteredFeedback() {
    const list = Data.getFeedback();
    return list.filter(f => {
      const rating = getRating(f);
      const guest = getGuest(f);
      const reply = getReply(f);
      const dt = getDate(f);

      if (ratingFilter) {
        const rf = parseInt(ratingFilter, 10);
        if (rf === 2) {
          if (rating > 2) return false;
        } else {
          if (Math.floor(rating) !== rf) return false;
        }
      }

      if (publishFilter === 'published' && !f.published) return false;
      if (publishFilter === 'unpublished' && f.published) return false;

      if (searchQuery) {
        const text = `${guest} ${f.resCode || ''} ${f.comment || ''} ${reply}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    }).sort((a, b) => getDate(b).localeCompare(getDate(a)));
  }

  function renderApp() {
    const app = $('feedbackApp');
    if (!app) return;

    const allFeedback = Data.getFeedback();
    const totalCount = allFeedback.length;
    const avgScore = totalCount > 0 ? (allFeedback.reduce((sum, f) => sum + getRating(f), 0) / totalCount).toFixed(1) : '5.0';
    const publishedCount = allFeedback.filter(f => f.published).length;

    // Subcategory averages
    const calcCatAvg = (keyName, legacyKey) => {
      const scores = allFeedback.map(f => {
        if (f[keyName] != null) return Number(f[keyName]);
        if (f.categories && f.categories[legacyKey] != null) return Number(f.categories[legacyKey]);
        return null;
      }).filter(s => s != null);

      if (scores.length === 0) return '5.0';
      return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    };

    app.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <span class="site-section-tag">QUALITY &amp; REPUTATION</span>
          <h1 style="font-size: 28px; margin: 4px 0 0 0;">Guest Feedback &amp; Reviews</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-secondary" id="btnExportFeedbackCSV">
            <span class="ic" data-icon="download">[ICON: download]</span> Export CSV
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Overall Average Rating</div>
          <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 4px;">
            <span style="font-size: 32px; font-weight: 700; font-family: 'Cormorant Garamond', serif; color: var(--gold-ink);">${avgScore}</span>
            <span class="text-xs text-muted">/ 5.0</span>
          </div>
          <div class="text-xs text-muted">${totalCount} Verified Reviews</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Published on Public Site</div>
          <div style="font-size: 26px; font-weight: 600; font-family: 'Cormorant Garamond', serif; color: var(--ok); margin-top: 4px;">${publishedCount}</div>
          <div class="text-xs text-muted">Live on About Page</div>
        </div>
        <div class="card kpi-card" style="padding: 16px;">
          <div class="text-sm text-secondary">Category Scores</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; margin-top: 6px;">
            <div>Cleanliness: <b>${calcCatAvg('ratingCleanliness', 'cleanliness')}</b></div>
            <div>Staff: <b>${calcCatAvg('ratingStaff', 'staff')}</b></div>
            <div>Comfort: <b>${calcCatAvg('ratingComfort', 'comfort')}</b></div>
            <div>Dining: <b>${calcCatAvg('ratingDining', 'dining')}</b></div>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
          <div class="field" style="margin: 0; min-width: 220px; flex: 1;">
            <label for="fbSearchInput">Search Reviews</label>
            <input type="text" id="fbSearchInput" placeholder="Guest name, comment…" value="${esc(searchQuery)}">
          </div>
          <div class="field" style="margin: 0; min-width: 150px;">
            <label for="fbRatingFilter">Rating</label>
            <select id="fbRatingFilter">
              <option value="">All Ratings</option>
              <option value="5" ${ratingFilter === '5' ? 'selected' : ''}>5 Stars</option>
              <option value="4" ${ratingFilter === '4' ? 'selected' : ''}>4 Stars</option>
              <option value="3" ${ratingFilter === '3' ? 'selected' : ''}>3 Stars</option>
              <option value="2" ${ratingFilter === '2' ? 'selected' : ''}>2 Stars or below</option>
            </select>
          </div>
          <div class="field" style="margin: 0; min-width: 160px;">
            <label for="fbPublishFilter">Publish Status</label>
            <select id="fbPublishFilter">
              <option value="">All</option>
              <option value="published" ${publishFilter === 'published' ? 'selected' : ''}>Published Only</option>
              <option value="unpublished" ${publishFilter === 'unpublished' ? 'selected' : ''}>Internal Only</option>
            </select>
          </div>
          <div>
            <button type="button" class="btn-ghost" id="btnResetFbFilters" style="height: 40px;">Reset</button>
          </div>
        </div>
      </div>

      <!-- Reviews Table -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Stay Ref</th>
                <th>Score</th>
                <th>Category Breakdown</th>
                <th>Guest Comments</th>
                <th>Date</th>
                <th>Website Display</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="feedbackTableBody">
              <!-- Injected dynamically -->
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); font-size: 13px;" id="feedbackPagination">
        </div>
      </div>
    `;

    bindEvents();
    renderTable();
  }

  function bindEvents() {
    $('fbSearchInput').oninput = (e) => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; renderTable(); };
    $('fbRatingFilter').onchange = (e) => { ratingFilter = e.target.value; page = 1; renderTable(); };
    $('fbPublishFilter').onchange = (e) => { publishFilter = e.target.value; page = 1; renderTable(); };

    $('btnResetFbFilters').onclick = () => {
      searchQuery = '';
      ratingFilter = '';
      publishFilter = '';
      $('fbSearchInput').value = '';
      $('fbRatingFilter').value = '';
      $('fbPublishFilter').value = '';
      page = 1;
      renderTable();
    };

    $('btnExportFeedbackCSV').onclick = () => {
      const items = getFilteredFeedback();
      const cols = [
        { header: 'ID', key: 'id' },
        { header: 'Guest Name', key: f => getGuest(f) },
        { header: 'Reservation Code', key: 'resCode' },
        { header: 'Rating (out of 5)', key: f => getRating(f) },
        { header: 'Comment', key: 'comment' },
        { header: 'Staff Reply', key: f => getReply(f) },
        { header: 'Published', key: f => f.published ? 'Yes' : 'No' },
        { header: 'Date', key: f => getDate(f) }
      ];
      exportCSV(`PUPSJ_Guest_Feedback_${today()}.csv`, cols, items);
    };
  }

  function renderTable() {
    const tbody = $('feedbackTableBody');
    const pgnEl = $('feedbackPagination');
    if (!tbody) return;

    const list = getFilteredFeedback();
    const pgn = paginate(list, page, pageSize);
    page = pgn.page;

    if (pgn.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No reviews found matching current filters.</td></tr>`;
      pgnEl.innerHTML = `<span>Showing 0 of 0</span>`;
      return;
    }

    tbody.innerHTML = pgn.items.map(f => {
      const guest = getGuest(f);
      const rating = getRating(f);
      const reply = getReply(f);
      const dt = getDate(f);

      const clean = f.ratingCleanliness != null ? f.ratingCleanliness : (f.categories ? f.categories.cleanliness : 5);
      const staff = f.ratingStaff != null ? f.ratingStaff : (f.categories ? f.categories.staff : 5);
      const comf = f.ratingComfort != null ? f.ratingComfort : (f.categories ? f.categories.comfort : 5);
      const catText = `Clean: ${clean} &middot; Staff: ${staff} &middot; Comfort: ${comf}`;

      return `
        <tr>
          <td><b>${esc(guest)}</b></td>
          <td>
            ${f.resCode ? `<a href="reservations.html?code=${esc(f.resCode)}"><code>${esc(f.resCode)}</code></a>` : '<span class="text-muted text-xs">&mdash;</span>'}
          </td>
          <td>
            <div style="font-weight: 700; color: var(--gold-ink); font-size: 14px;">
              ${rating}.0 / 5
            </div>
          </td>
          <td><div class="text-xs text-secondary">${catText}</div></td>
          <td>
            <div style="max-width: 280px; font-size: 13px; line-height: 1.4;">
              ${esc(f.comment)}
            </div>
            ${reply ? `
              <div style="margin-top: 4px; padding: 4px 8px; background: var(--surface-2); border-left: 2px solid var(--gold); border-radius: var(--r); font-size: 11px;">
                <b>Staff Reply:</b> ${esc(reply)}
              </div>
            ` : ''}
          </td>
          <td><span class="text-xs text-muted">${fmtDate(dt.slice(0, 10))}</span></td>
          <td>
            <span class="pill ${f.published ? 'pill--ok' : 'pill--muted'}">
              ${f.published ? 'Published' : 'Hidden'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 4px;">
              <button type="button" class="btn-secondary btn-sm" onclick="togglePublishFeedback('${esc(f.id)}')">
                ${f.published ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" class="btn-secondary btn-sm" onclick="openReplyFeedbackModal('${esc(f.id)}')">Reply</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const startIdx = pgn.startIndex != null ? pgn.startIndex : (pgn.startIdx != null ? pgn.startIdx : 0);
    const endIdx = pgn.endIndex != null ? pgn.endIndex : (pgn.endIdx != null ? pgn.endIdx : 0);
    const totalItems = pgn.total != null ? pgn.total : (pgn.totalItems != null ? pgn.totalItems : 0);

    pgnEl.innerHTML = `
      <span class="text-secondary">Showing ${totalItems > 0 ? startIdx + 1 : 0}&ndash;${endIdx} of ${totalItems} reviews</span>
      <div style="display: flex; gap: 4px;">
        <button type="button" class="btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} id="btnFbPrev">Previous</button>
        <span style="padding: 4px 8px; font-weight: 500;">Page ${page} of ${pgn.totalPages || 1}</span>
        <button type="button" class="btn-secondary btn-sm" ${page >= (pgn.totalPages || 1) ? 'disabled' : ''} id="btnFbNext">Next</button>
      </div>
    `;

    const prev = $('btnFbPrev');
    if (prev) prev.onclick = () => { page--; renderTable(); };
    const next = $('btnFbNext');
    if (next) next.onclick = () => { page++; renderTable(); };
  }

  window.togglePublishFeedback = function (id) {
    const list = Data.getFeedback();
    const item = list.find(f => f.id === id);
    if (!item) return;

    item.published = !item.published;
    Data.saveFeedback(list);
    Data.audit('Feedback Publish', 'feedback', id, `${item.published ? 'Published' : 'Unpublished'} review by ${getGuest(item)}`);
    toast(`Review is now ${item.published ? 'Published on website' : 'Hidden from website'}`, 'ok');
    window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    renderApp();
  };

  window.openReplyFeedbackModal = function (id) {
    const list = Data.getFeedback();
    const item = list.find(f => f.id === id);
    if (!item) return;

    const guest = getGuest(item);
    const rating = getRating(item);
    const reply = getReply(item);

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="margin-bottom: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line);">
          <b>${esc(guest)}</b> &middot; Rating: <b>${rating}/5</b>
          <div style="margin-top: 4px; line-height: 1.4;">${esc(item.comment)}</div>
        </div>

        <div class="field">
          <label for="staffFeedbackReply">Official Staff Response</label>
          <textarea id="staffFeedbackReply" rows="3" placeholder="Thank the guest or provide clarification…">${esc(reply)}</textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn" id="btnSaveFbReply">Save Response</button>
      </div>
    `;

    showModal(`Respond to Feedback &mdash; ${esc(guest)}`, bodyHtml, footerHtml, { maxWidth: '480px' });

    $('btnSaveFbReply').onclick = () => {
      const resp = ($('staffFeedbackReply').value || '').trim();
      item.staffReply = resp;
      item.reply = resp;
      Data.saveFeedback(list);
      Data.audit('Feedback Reply', 'feedback', id, `Staff responded to review by ${guest}`);
      toast('Staff response saved', 'ok');
      closeModal();
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
      renderApp();
    };
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
