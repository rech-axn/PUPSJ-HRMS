/* ==========================================================================
   PUPSJ Hotel & Restaurant — About Page Logic (about.js)
   Renders real metric pillars from Data stores, config-driven hotel policies,
   and verified published guest reviews.
   ========================================================================== */
'use strict';

(function () {
  // 1. Render Real Metric Pillars from live Data
  const statsGrid = $('aboutStatsGrid');
  if (statsGrid) {
    const typeCount = Data.getTypes().length;
    const roomCount = Data.getRooms().length;
    const menuCount = Data.getMenu().length;
    const reviewCount = Data.getFeedback().filter(f => f.published).length;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-label">Room Categories</div>
        <div class="stat-card-num">${typeCount}</div>
        <div class="stat-card-sub">Distinct room designs</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Total Guest Rooms</div>
        <div class="stat-card-num">${roomCount}</div>
        <div class="stat-card-sub">Rooms across all floors</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Dining Specialties</div>
        <div class="stat-card-num">${menuCount}</div>
        <div class="stat-card-sub">Dishes &amp; beverages served</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Verified Reviews</div>
        <div class="stat-card-num">${reviewCount > 0 ? reviewCount : '—'}</div>
        <div class="stat-card-sub">${reviewCount > 0 ? 'Published guest ratings' : 'No reviews published yet'}</div>
      </div>
    `;
  }

  // 2. Render Policies from CONFIG
  const polList = $('aboutPoliciesList');
  if (polList) {
    polList.innerHTML = CONFIG.policies.map(p => `
      <li style="border-bottom: 1px solid var(--line); padding-bottom: 10px;">
        <b style="color: var(--ink); display: block; margin-bottom: 2px;">${esc(p[0])}</b>
        <span class="text-sm" style="color: var(--ink-2);">${esc(p[1])}</span>
      </li>
    `).join('');
  }

  // 3. Render Published Guest Reviews from Feedback Store
  const revGrid = $('aboutReviewsGrid');
  if (revGrid) {
    const publishedReviews = Data.getFeedback().filter(f => f.published);

    if (!publishedReviews.length) {
      revGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p class="empty-state-text">No reviews published yet. Be the first to share your experience after check-out!</p>
        </div>
      `;
      return;
    }

    revGrid.innerHTML = publishedReviews.map(r => `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
            <b style="font-size: 15px;">${esc(r.guest || r.guestName)}</b>
            <span style="font-weight: 600; font-size: 11px;">
              ${Array(r.rating || r.ratingOverall || 5).fill('<span class="ic" data-icon="star-filled">[ICON: star-filled]</span>').join('')}${Array(Math.max(0, 5 - (r.rating || r.ratingOverall || 5))).fill('<span class="ic" data-icon="star-empty">[ICON: star-empty]</span>').join('')}
            </span>
          </div>
          <div class="text-sm text-muted" style="margin-bottom: 10px;">
            Stayed in <b>${esc(r.roomType || 'Guest Suite')}</b> &middot; ${fmtDate(r.created)}
          </div>
          <p class="text-sm" style="color: var(--ink); line-height: 1.6; margin-bottom: 12px;">
            &ldquo;${esc(r.comment)}&rdquo;
          </p>
        </div>

        ${r.staffReply ? `
          <div style="background-color: var(--surface-2); padding: 10px 12px; border-radius: var(--r); border: 1px solid var(--line); font-size: 12px; margin-top: 8px;">
            <b>Hotel Management Reply:</b>
            <p style="margin: 2px 0 0; color: var(--ink-2);">${esc(r.staffReply)}</p>
          </div>
        ` : ''}
      </div>
    `).join('');
  }
})();
