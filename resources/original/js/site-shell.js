/* ==========================================================================
   PUPSJ Hotel & Restaurant — Public Site Shell (site-shell.js)
   Renders top navigation, footer, concierge widget, and guest session menu.
   ========================================================================== */
'use strict';

  // Ensure In-Browser Test Runner (Tests.run) is available on all pages
  if (typeof Tests === 'undefined' && typeof document !== 'undefined') {
    const isRoot = !window.location.pathname.includes('/pages/');
    const isNested = window.location.pathname.includes('/management/') || window.location.pathname.includes('/guest/') || window.location.pathname.includes('/rooms/') || window.location.pathname.includes('/main/') || window.location.pathname.includes('/auth/');
    const testsScript = document.createElement('script');
    testsScript.src = isRoot ? 'js/tests.js' : (isNested ? '../../js/tests.js' : '../js/tests.js');
    document.head.appendChild(testsScript);
  }


(function () {
  // Determine relative root path from current page location
  const isPagesDir = location.pathname.includes('/pages/');
  const rootPath = isPagesDir ? '../../' : './';
  const pagesPath = isPagesDir ? '../' : 'pages/';

  // Current page filename for active nav highlighting
  const curFile = location.pathname.split('/').pop() || 'home.html';

  // ─── 1. Public Top Navigation Injection ───
  function initNav() {
    const navEl = $('siteNav') || $('sn') || document.querySelector('header.site-header') || document.querySelector('nav');
    if (!navEl) return;

    const guestSession = typeof Data !== 'undefined' ? Data.getGuestSession() : null;
    const staffSession = typeof Data !== 'undefined' ? Data.getStaffSession() : null;

    let authSectionHtml = '';

    if (guestSession && guestSession.name) {
      // Guest is signed in
      const guestNotifs = (typeof Data !== 'undefined' && Data.getGuestNotifications) ? Data.getGuestNotifications(guestSession) : [];
      const guestSeenList = store.get('guestNotifSeenIds', []);
      const guestSeenSet = new Set(Array.isArray(guestSeenList) ? guestSeenList : []);
      const unseenGuestCount = guestNotifs.filter(n => !guestSeenSet.has(n.id)).length;

      authSectionHtml = `
        <!-- Guest Notification Bell -->
        <div class="staff-notif-wrap" id="publicNotifWrap" style="display: inline-block;">
          <button class="staff-notif-btn" id="publicNotifBtn" type="button" aria-label="View guest notifications">
            <span class="ic" data-icon="bell">[ICON: bell]</span>
            ${unseenGuestCount > 0 ? `<span class="staff-notif-badge" id="publicNotifBadge">${unseenGuestCount}</span>` : ''}
          </button>
          <div class="staff-notif-dropdown" id="publicNotifDropdown" style="right: 0;">
            <div class="staff-notif-header">
              <b>Notifications (${guestNotifs.length})</b>
              <button class="btn-ghost btn-sm" id="btnMarkGuestNotifsSeen" style="font-size: 11px;">Mark all seen</button>
            </div>
            <div class="staff-notif-list" id="publicNotifList">
              ${guestNotifs.length ? guestNotifs.map(n => {
                const isUnread = !guestSeenSet.has(n.id);
                const targetUrl = n.url.startsWith('http') || n.url.includes('/') ? n.url : `${pagesPath}guest/${n.url}`;
                return `
                  <a href="${targetUrl}" class="staff-notif-item guest-notif-item" data-notif-id="${esc(n.id)}" style="${isUnread ? 'background: rgba(184, 137, 26, 0.05);' : ''}">
                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                      ${isUnread ? '<span class="guest-notif-unread-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--gold-ink); margin-top: 5px; flex-shrink: 0;"></span>' : '<span style="display: inline-block; width: 7px; height: 7px; flex-shrink: 0;"></span>'}
                      <div style="flex: 1;">
                        <b style="${isUnread ? 'color: var(--ink);' : 'color: var(--ink-2);'}">${esc(n.title)}</b>
                        <div style="font-size: 12px; color: var(--ink-2); margin-top: 2px;">${esc(n.desc)}</div>
                        <div class="text-sm" style="color: var(--ink-3); margin-top: 2px;">${esc(n.time)}</div>
                      </div>
                    </div>
                  </a>
                `;
              }).join('') : '<div style="padding: 16px; text-align: center; color: var(--ink-3); font-size: 13px;">No notifications</div>'}
            </div>
          </div>
        </div>

        <div class="staff-user-menu" id="publicUserMenu">
          <button class="staff-user-btn" id="publicUserBtn" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="ic" data-icon="user">[ICON: user]</span>
            <div>
              <div class="staff-user-name">${esc(guestSession.name)}</div>
              <div class="staff-user-role">${esc(guestSession.tier || 'Member')}</div>
            </div>
            <span class="ic" data-icon="chevron-down">[ICON: chevron-down]</span>
          </button>
          <div class="staff-user-dropdown" id="publicUserDropdown" role="menu">
            <a href="${pagesPath}guest/guest-portal.html" role="menuitem">
              <span class="ic" data-icon="key">[ICON: key]</span> Guest Portal
            </a>
            <a href="${pagesPath}guest/guest-portal.html#reservations" role="menuitem">
              <span class="ic" data-icon="bed">[ICON: bed]</span> My Reservations
            </a>
            <button type="button" id="publicSignOutBtn" role="menuitem">
              <span class="ic" data-icon="logout">[ICON: logout]</span> Sign Out
            </button>
          </div>
        </div>
      `;
    } else if (staffSession && staffSession.name) {
      // Staff member is signed in
      authSectionHtml = `
        <div class="staff-user-menu" id="publicUserMenu">
          <button class="staff-user-btn" id="publicUserBtn" type="button" aria-haspopup="true" aria-expanded="false">
            <span class="ic" data-icon="user">[ICON: user]</span>
            <div>
              <div class="staff-user-name">${esc(staffSession.name)}</div>
              <div class="staff-user-role">${esc(staffSession.role)}</div>
            </div>
            <span class="ic" data-icon="chevron-down">[ICON: chevron-down]</span>
          </button>
          <div class="staff-user-dropdown" id="publicUserDropdown" role="menu">
            <a href="${pagesPath}management/dashboard.html" role="menuitem">
              <span class="ic" data-icon="dashboard">[ICON: dashboard]</span> Staff Dashboard
            </a>
            <button type="button" id="publicSignOutBtn" role="menuitem">
              <span class="ic" data-icon="logout">[ICON: logout]</span> Sign Out
            </button>
          </div>
        </div>
      `;
    } else {
      // Visitor
      authSectionHtml = `
        <a class="btn-secondary btn-sm" href="${pagesPath}auth/login.html">
          <span class="ic" data-icon="user">[ICON: user]</span> Sign In
        </a>
      `;
    }

    const homeActive = curFile === 'home.html' || curFile === 'index.html' ? 'active' : '';
    const roomsActive = curFile === 'rooms-deals.html' ? 'active' : '';
    const menuActive = curFile === 'menu.html' ? 'active' : '';
    const aboutActive = curFile === 'about.html' ? 'active' : '';
    const contactActive = curFile === 'contact.html' ? 'active' : '';

    navEl.innerHTML = `
      <div class="site-nav-container">
        <a class="site-brand" href="${pagesPath}main/home.html">
          <img src="${rootPath}assets/logo/pupsj-mark.png" alt="PUPSJ" style="width: 32px; height: 32px; display: inline-block; object-fit: contain;">
          <span class="site-brand-name">${CONFIG.hotelName}</span>
        </a>

        <ul class="site-links" role="navigation">
          <li><a class="site-link ${homeActive}" href="${pagesPath}main/home.html">Home</a></li>
          <li><a class="site-link ${roomsActive}" href="${pagesPath}rooms/rooms-deals.html">Rooms &amp; Deals</a></li>
          <li><a class="site-link ${menuActive}" href="${pagesPath}main/menu.html">Restaurant</a></li>
          <li><a class="site-link ${aboutActive}" href="${pagesPath}main/about.html">About</a></li>
          <li><a class="site-link ${contactActive}" href="${pagesPath}main/contact.html">Contact</a></li>
        </ul>

        <div class="site-auth-btn" style="display: inline-flex; align-items: center; gap: 8px;">
          ${authSectionHtml}
          <button class="site-hamburger btn-ghost btn-sm" id="siteHamburgerBtn" type="button" aria-label="Toggle navigation menu">
            <span class="ic" data-icon="menu">[ICON: menu]</span>
          </button>
        </div>
      </div>
    `;

    // Mobile Hamburger Toggle
    const hamburgerBtn = $('siteHamburgerBtn');
    const linksList = navEl.querySelector('.site-links');
    if (hamburgerBtn && linksList) {
      hamburgerBtn.onclick = e => {
        e.stopPropagation();
        linksList.classList.toggle('open');
      };
      document.addEventListener('click', () => {
        linksList.classList.remove('open');
      });
    }

    // Dropdown toggle
    const userBtn = $('publicUserBtn');
    const dropdown = $('publicUserDropdown');
    if (userBtn && dropdown) {
      userBtn.onclick = e => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        userBtn.setAttribute('aria-expanded', !isOpen);
      };

      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
        userBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Guest Notification Bell Toggle
    const guestNotifBtn = $('publicNotifBtn');
    const guestNotifDropdown = $('publicNotifDropdown');
    const markGuestSeenBtn = $('btnMarkGuestNotifsSeen');
    if (guestNotifBtn && guestNotifDropdown) {
      guestNotifBtn.onclick = e => {
        e.stopPropagation();
        const isOpen = guestNotifDropdown.style.display === 'block';
        guestNotifDropdown.style.display = isOpen ? 'none' : 'block';
      };

      document.addEventListener('click', () => {
        guestNotifDropdown.style.display = 'none';
      });

      document.querySelectorAll('.guest-notif-item').forEach(el => {
        el.addEventListener('click', () => {
          const nid = el.dataset.notifId;
          if (nid) {
            const cur = store.get('guestNotifSeenIds', []);
            if (!cur.includes(nid)) {
              cur.push(nid);
              store.set('guestNotifSeenIds', cur.slice(-200));
            }
          }
        });
      });

      if (markGuestSeenBtn) {
        markGuestSeenBtn.onclick = e => {
          e.stopPropagation();
          const guestNotifs = (typeof Data !== 'undefined' && Data.getGuestNotifications) ? Data.getGuestNotifications(guestSession) : [];
          const cur = new Set(store.get('guestNotifSeenIds', []));
          guestNotifs.forEach(n => cur.add(n.id));
          store.set('guestNotifSeenIds', Array.from(cur).slice(-200));
          const badge = $('publicNotifBadge');
          if (badge) badge.remove();
          document.querySelectorAll('.guest-notif-unread-dot').forEach(d => d.remove());
          toast('All notifications marked as seen.', 'ok');
        };
      }
    }

    // Sign out button
    const signOutBtn = $('publicSignOutBtn');
    if (signOutBtn) {
      signOutBtn.onclick = () => {
        if (typeof Data !== 'undefined') {
          Data.clearGuestSession();
          Data.clearStaffSession();
        }
        location.reload();
      };
    }
  }

  // ─── 2. Public Footer Injection ───
  function initFooter() {
    const footEl = $('siteFooter') || $('sf') || document.querySelector('footer.site-footer');
    if (!footEl) return;

    footEl.className = 'site-footer';
    footEl.innerHTML = `
      <div class="site-footer-inner">
        <div class="site-footer-brand">
          <h4>${CONFIG.hotelName}</h4>
          <p>${CONFIG.address}</p>
          <p style="margin-top: 8px;">Tel: ${CONFIG.phones[0]}<br>Email: ${CONFIG.emails.general}</p>
        </div>

        <div class="site-footer-col">
          <h5>Accommodations</h5>
          <ul>
            <li><a href="${pagesPath}rooms/rooms-deals.html#rooms">Rooms &amp; Suites</a></li>
            <li><a href="${pagesPath}rooms/rooms-deals.html#deals">Special Offers</a></li>
            <li><a href="${pagesPath}guest/guest-portal.html">Guest Portal</a></li>
          </ul>
        </div>

        <div class="site-footer-col">
          <h5>Dining &amp; Services</h5>
          <ul>
            <li><a href="${pagesPath}main/menu.html">Restaurant &amp; Dining</a></li>
            <li><a href="${pagesPath}main/menu.html#reserve-table">Table Reservations</a></li>
            <li><a href="${pagesPath}main/home.html#amenities">Hotel Amenities</a></li>
          </ul>
        </div>

        <div class="site-footer-col">
          <h5>Information</h5>
          <ul>
            <li><a href="${pagesPath}main/about.html">About Us</a></li>
            <li><a href="${pagesPath}main/contact.html">Contact &amp; Location</a></li>
            <li><a href="${pagesPath}main/privacy.html">Privacy Policy</a></li>
            <li><a href="${pagesPath}main/terms.html">Terms of Service</a></li>
          </ul>
        </div>
      </div>

      <div class="site-footer-bottom">
        <div>&copy; 2026 ${CONFIG.hotelName}, San Juan City. All rights reserved.</div>
        <div>
          <a href="${pagesPath}main/privacy.html" style="margin-right: 16px;">Privacy</a>
          <a href="${pagesPath}main/terms.html" style="margin-right: 16px;">Terms</a>
          <a href="${pagesPath}auth/login.html">Staff &amp; Guest Sign In</a>
        </div>
      </div>
    `;
  }


  function hasActiveStay() {
    if (typeof Data === 'undefined') return false;
    const guestSession = Data.getGuestSession();
    if (!guestSession) return false;
    const resList = Data.getReservations();
    const email = (guestSession.email || '').toLowerCase();
    const phone = guestSession.phone || '';
    const guestId = guestSession.guestId || '';
    return resList.some(r => {
      const isGuest = (r.email && r.email.toLowerCase() === email) ||
                      ((r.ph || r.phone) && (r.ph || r.phone) === phone) ||
                      (r.guestId && r.guestId === guestId) ||
                      (r.g && r.g.toLowerCase() === (guestSession.name || '').toLowerCase());
      const isCheckedIn = (r.st === 'Checked-in' || r.s === 'Checked-in');
      return isGuest && isCheckedIn;
    });
  }

  // ─── 3. Floating Digital Concierge Widget ───
  function initConcierge() {
    if ($('conciergeWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'conciergeWidget';
    widget.className = 'concierge-widget';

    const guestSession = typeof Data !== 'undefined' ? Data.getGuestSession() : null;

    widget.innerHTML = `
      <button class="concierge-fab" id="conciergeFab" title="Digital Concierge" aria-label="Open digital concierge">
        <span class="ic" data-icon="concierge-bell">[ICON: concierge-bell]</span>
      </button>

      <div class="concierge-panel" id="conciergePanel" style="display: none;">
        <div class="concierge-header">
          <div>
            <h4 style="margin: 0; font-size: 15px;">Digital Concierge</h4>
            <small style="color: var(--ink-3);">PUPSJ Front Desk &amp; Guest Services</small>
          </div>
          <button class="modal-close" id="conciergeCloseBtn" aria-label="Close concierge"><span class="ic" data-icon="close">[ICON: close]</span></button>
        </div>

        <div class="concierge-messages" id="conciergeMessages">
          <div class="concierge-bubble concierge-bubble--bot">
            Welcome to PUPSJ Hotel &amp; Restaurant. How may we assist your stay today? Select a topic below or type your question:
            <div class="concierge-quick-links" id="conciergeFaqChips">
              <button class="concierge-quick-chip" data-faq="hours">Check-in / Out Hours</button>
              <button class="concierge-quick-chip" data-faq="wifi">Wi-Fi Details</button>
              <button class="concierge-quick-chip" data-faq="dining">Restaurant Hours</button>
              <button class="concierge-quick-chip" data-faq="deposit">Deposit &amp; Cancellation</button>
              <button class="concierge-quick-chip" data-faq="location">Location &amp; Valet</button>
            </div>
          </div>
        </div>

        <form class="concierge-input-bar" id="conciergeForm">
          <input type="text" id="conciergeInput" placeholder="Type a message to front desk…" autocomplete="off" style="height: 36px;">
          <button class="btn btn-sm" type="submit" id="conciergeSendBtn">Send</button>
        </form>
      </div>
    `;

    document.body.appendChild(widget);

    const fab = $('conciergeFab');
    const panel = $('conciergePanel');
    const closeBtn = $('conciergeCloseBtn');
    const form = $('conciergeForm');
    const input = $('conciergeInput');
    const msgContainer = $('conciergeMessages');

    fab.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
      if (panel.style.display === 'flex') input.focus();
    };

    closeBtn.onclick = () => {
      panel.style.display = 'none';
    };

    // FAQ Instant Answers
    const FAQ_RESPONSES = {
      hours: `Check-in starts at <b>${CONFIG.hours.checkIn}</b> and check-out is by <b>${CONFIG.hours.checkOut}</b>. Complimentary late check-out is subject to room availability upon request at the front desk.`,
      get wifi() {
        if (hasActiveStay()) {
          return `Complimentary high-speed Wi-Fi is active for your in-house stay.<br>Network: <b>${CONFIG.wifi.network}</b><br>Password: <b>${CONFIG.wifi.password}</b>`;
        }
        return 'High-speed guest Wi-Fi credentials are provided exclusively to in-house guests upon check-in registration at the Front Desk.';
      },
      dining: `PUPSJ Restaurant &amp; Lounge is open daily from <b>${CONFIG.hours.restaurant}</b>. Breakfast: ${CONFIG.hours.breakfast} · Lunch: ${CONFIG.hours.lunch} · Dinner: ${CONFIG.hours.dinner}. In-room dining can be ordered via your Guest Portal.`,
      deposit: `A <b>${CONFIG.depositPct}%</b> deposit is required to confirm room reservations. Free cancellation is permitted up to <b>${CONFIG.freeCancelDays} days</b> before arrival. Later cancellations retain the first night room rate.`,
      location: `Our address is <b>${CONFIG.address}</b>. Complimentary 24-hour valet parking and secure basement guest parking are available for all hotel guests and restaurant diners.`
    };

    const addMessage = (text, role = 'bot') => {
      const bubble = document.createElement('div');
      bubble.className = `concierge-bubble concierge-bubble--${role}`;
      bubble.innerHTML = text;
      msgContainer.appendChild(bubble);
      msgContainer.scrollTop = msgContainer.scrollHeight;
    };

    // Chip click handling
    const chipsContainer = $('conciergeFaqChips');
    if (chipsContainer) {
      chipsContainer.onclick = e => {
        const chip = e.target.closest('[data-faq]');
        if (!chip) return;
        const key = chip.dataset.faq;
        addMessage(chip.textContent, 'user');
        setTimeout(() => {
          addMessage(FAQ_RESPONSES[key] || 'Our front desk team will gladly assist you with that request.', 'bot');
        }, 200);
      };
    }

    // Message submission -> If custom question, creates thread in staff inbox!
    form.onsubmit = e => {
      e.preventDefault();
      const txt = input.value.trim();
      if (!txt) return;

      addMessage(esc(txt), 'user');
      input.value = '';

      // Check for simple keyword matches
      const lower = txt.toLowerCase();
      let matchedKey = null;
      if (lower.includes('wifi') || lower.includes('internet') || lower.includes('password')) matchedKey = 'wifi';
      else if (lower.includes('check in') || lower.includes('check out') || lower.includes('checkout') || lower.includes('time')) matchedKey = 'hours';
      else if (lower.includes('restaurant') || lower.includes('food') || lower.includes('dinner') || lower.includes('breakfast') || lower.includes('menu')) matchedKey = 'dining';
      else if (lower.includes('cancel') || lower.includes('deposit') || lower.includes('refund')) matchedKey = 'deposit';
      else if (lower.includes('where') || lower.includes('address') || lower.includes('location') || lower.includes('parking') || lower.includes('valet')) matchedKey = 'location';

      if (matchedKey) {
        setTimeout(() => {
          addMessage(FAQ_RESPONSES[matchedKey], 'bot');
        }, 300);
      } else {
        // Reuse existing open concierge thread for visitor/guest or create one
        let visitorId = sessionStorage.getItem('pupsj.visitorId');
        if (!visitorId) {
          visitorId = 'Visitor-' + Math.floor(1000 + Math.random() * 9000);
          sessionStorage.setItem('pupsj.visitorId', visitorId);
        }

        const guestName = (guestSession && guestSession.name) ? guestSession.name : (`Guest (${visitorId})`);
        const contact = (guestSession && guestSession.email) || visitorId;

        if (typeof Data !== 'undefined') {
          const threads = Data.getThreads();
          const existingThread = threads.find(t => t.status === 'Open' && (t.contact === contact || (guestSession && t.guestName && t.guestName.toLowerCase() === guestSession.name.toLowerCase())));
          if (existingThread) {
            Data.replyThread(existingThread.id, guestName, txt, 'guest');
          } else {
            Data.createThread('Online Concierge Inquiry', guestName, txt, '', contact);
          }
        }

        setTimeout(() => {
          addMessage(`Thank you, <b>${esc(guestName)}</b>. Your message has been sent to our on-duty front desk staff. A team member will review it and reply shortly.`, 'bot');
        }, 350);
      }
    };
  }

  // ─── Initialize Public Shell ───
  function run() {
    initNav();
    initFooter();
    initConcierge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
