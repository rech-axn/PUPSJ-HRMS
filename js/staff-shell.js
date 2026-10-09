/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff Management Shell (staff-shell.js)
   Auth guard, RBAC permission matrix, sidebar navigation, responsive slide-out
   drawer, top bar with working global search, live notifications bell, and user menu.
   ========================================================================== */
'use strict';

(function () {
  // ─── 1. Auth Guard & RBAC Matrix ───
  let staffSession = typeof Data !== 'undefined' ? Data.getStaffSession() : null;
  const guestSession = typeof Data !== 'undefined' ? Data.getGuestSession() : null;
  const isAuthPage = location.pathname.includes('guest-login.html');

  // Guard Case A: Unauthenticated Visitor -> Safe redirect to login with ?next=
  if (!staffSession && !guestSession && !isAuthPage) {
    const curPath = location.pathname.split('/').pop() || 'dashboard.html';
    const safeNext = typeof validateReturnUrl === 'function' ? validateReturnUrl(curPath) : curPath;
    window.location.replace('../auth/guest-login.html?next=' + encodeURIComponent(safeNext));
    return;
  }

  // Guard Case B: Guest attempting to access Admin pages -> Access Denied card
  if (!staffSession && guestSession && !isAuthPage) {
    window.__PUPSJ_ACCESS_DENIED = true;
    document.addEventListener('DOMContentLoaded', () => {
      const mainApp = document.querySelector('.staff-content') || document.body;
      if (mainApp) {
        mainApp.innerHTML = `
          <div class="card access-denied" style="max-width: 520px; margin: 80px auto; text-align: center; padding: 40px; box-shadow: var(--shadow-md, 0 4px 12px rgba(30, 35, 43, 0.08));">
            <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 8px;">Access Denied</h2>
            <p class="text-sm" style="color: var(--text-secondary); margin-bottom: 24px;">
              Superadmin privileges required. You are currently signed in as a registered <b>Guest</b> (<em>${esc(guestSession.name)}</em>).
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <a href="../guest/guest-portal.html" class="btn">Return to Guest Portal</a>
              <button class="btn-secondary" onclick="Data.clearGuestSession(); location.href='../auth/guest-login.html';">Switch Account</button>
            </div>
          </div>
        `;
      }
    });
    return;
  }

  // Current page filename for active nav highlighting
  const curFile = location.pathname.split('/').pop() || 'dashboard.html';
  const userRole = 'Superadmin';

  // ─── Sidebar Navigation Structure ───
  const NAV_SECTIONS = [
    {
      items: [
        { label: 'Dashboard', icon: 'dashboard', href: '../management/dashboard.html', file: 'dashboard.html' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Reservations', icon: 'bed', href: '../management/reservations.html', file: 'reservations.html' },
        { label: 'Guests', icon: 'users', href: '../management/guests.html', file: 'guests.html' },
        { label: 'Housekeeping', icon: 'broom', href: '../management/housekeeping.html', file: 'housekeeping.html' },
        { label: 'Maintenance', icon: 'wrench', href: '../management/maintenance.html', file: 'maintenance.html' }
      ]
    },
    {
      title: 'Restaurant',
      items: [
        { label: 'Orders', icon: 'tray', href: '../management/orders.html', file: 'orders.html' },
        { label: 'Kitchen', icon: 'kitchen', href: '../management/kitchen.html', file: 'kitchen.html' },
        { label: 'Tables', icon: 'table', href: '../management/tables.html', file: 'tables.html' },
        { label: 'Menu', icon: 'utensils', href: '../management/menu.html', file: 'menu.html' }
      ]
    },
    {
      title: 'Inbox',
      items: [
        { label: 'Messages', icon: 'message', href: '../management/messages.html', file: 'messages.html', badge: 'unreadMessages' },
        { label: 'Inquiries', icon: 'mail', href: '../management/inquiries.html', file: 'inquiries.html', badge: 'newInquiries' },
        { label: 'Feedback', icon: 'star-filled', href: '../management/feedback.html', file: 'feedback.html' }
      ]
    },
    {
      title: 'Finance',
      items: [
        { label: 'Payments', icon: 'wallet', href: '../management/payments.html', file: 'payments.html' },
        { label: 'Reports', icon: 'chart-bar', href: '../management/reports.html', file: 'reports.html' }
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'Rooms', icon: 'key', href: '../rooms/rooms.html', file: 'rooms.html' },
        { label: 'Room Types', icon: 'clipboard', href: '../rooms/roomtypes.html', file: 'roomtypes.html' },
        { label: 'Promotions', icon: 'tag', href: '../management/promotions.html', file: 'promotions.html' },
        { label: 'Staff & Admins', icon: 'shield', href: '../management/employees.html', file: 'employees.html' },
        { label: 'Audit Log', icon: 'history', href: '../management/audit.html', file: 'audit.html' }
      ]
    }
  ];

  // ─── 2. Initialize Staff Layout ───
  function initStaffShell() {
    // If access is restricted for this page, mount Access Denied card
    if (!isCurrentPageAllowed) {
      const mainEl = document.querySelector('.staff-content') || document.querySelector('main') || document.querySelector('.staff-main-wrap');
      if (mainEl) {
        mainEl.innerHTML = `
          <div class="card" style="max-width: 580px; margin: 48px auto; text-align: center; padding: 48px 32px; box-shadow: var(--shadow-md);">
            <div style="font-size: 48px; margin-bottom: 16px;"><span class="ic" data-icon="shield">[ICON: shield]</span></div>
            <h2 style="font-size: 24px; margin-bottom: 8px;">Access Restricted</h2>
            <p class="text-secondary" style="margin-bottom: 16px; font-size: 14px;">
              Your current staff account role (<b>${esc(userRole)}</b>) is not authorized to access the <code>${esc(curFile)}</code> module.
            </p>
            <p class="text-xs text-muted" style="margin-bottom: 24px;">
              Module permission managed under PUPSJ Role-Based Access Control matrix. Contact Management for role reassignment.
            </p>
            <div>
              <a href="../management/dashboard.html" class="btn">
                Return to Staff Dashboard &rarr;
              </a>
            </div>
          </div>
        `;
      }
    }

    // Inject mobile drawer backdrop
    let backdrop = $('staffDrawerBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'staffDrawerBackdrop';
      backdrop.className = 'modal-backdrop';
      backdrop.style.zIndex = '45';
      document.body.appendChild(backdrop);
    }

    // Build Sidebar (Filtered by RBAC)
    const aside = document.querySelector('aside') || $('staffSidebar');
    if (aside) {
      aside.className = 'staff-sidebar';
      aside.id = 'staffSidebar';

      // Live badges
      const unreadMsgCount = (Data.getThreads().filter(t => t.unreadStaff > 0 && t.status === 'Open')).length;
      const newInqCount = (Data.getInquiries().filter(i => i.status === 'New')).length;

      let navHtml = '';
      NAV_SECTIONS.forEach(sec => {
        // Filter items by user role permissions
        const permittedItems = sec.items.filter(it => isPermitted(it.file));
        if (!permittedItems.length) return;

        if (sec.title) {
          navHtml += `<div class="staff-nav-heading">${esc(sec.title)}</div>`;
        }
        permittedItems.forEach(it => {
          const isActive = curFile === it.file;
          let badgeHtml = '';
          if (it.badge === 'unreadMessages' && unreadMsgCount > 0) {
            badgeHtml = `<span class="staff-nav-badge">${unreadMsgCount}</span>`;
          } else if (it.badge === 'newInquiries' && newInqCount > 0) {
            badgeHtml = `<span class="staff-nav-badge">${newInqCount}</span>`;
          }

          navHtml += `
            <a href="${it.href}" class="staff-nav-item ${isActive ? 'active' : ''}">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="ic" data-icon="${it.icon}">[ICON: ${it.icon}]</span>
                <span>${esc(it.label)}</span>
              </span>
              ${badgeHtml}
            </a>
          `;
        });
      });

      aside.innerHTML = `
        <a class="staff-sidebar-brand" href="../management/dashboard.html">
          <img src="../../assets/logo/pupsj-mark.png" alt="PUPSJ" style="width: 28px; height: 28px; border-radius: 4px; display: inline-block; object-fit: contain;">
          <h3>PUPSJ Hotel</h3>
        </a>
        <nav class="staff-nav" role="navigation">
          ${navHtml}
        </nav>
        <div class="staff-sidebar-footer">
          <div>PUPSJ Management v2.0</div>
          <div style="font-size: 11px; color: var(--ink-3); margin-top: 4px;">Role: ${esc(userRole)}</div>
        </div>
      `;
    }

    // Build Top Bar
    const topBar = document.querySelector('.top') || $('staffTopbar');
    if (topBar) {
      topBar.className = 'staff-topbar';
      topBar.id = 'staffTopbar';

      const pageHeading = $('ttl') ? $('ttl').textContent : document.title.replace('PUPSJ Hotel – ', '');
      const user = staffSession || { name: 'Staff Member', role: 'Front Desk' };

      // Calculate live notifications
      const notifs = Data.getNotifications();
      const notifSeen = store.get('notifSeen', { count: 0, time: '' });
      const unseenCount = Math.max(0, notifs.length - (notifSeen.count || 0));

      // Build User Dropdown based on permissions
      let userMenuLinksHtml = '';
      if (isPermitted('employees.html')) {
        userMenuLinksHtml += `
          <a href="../management/employees.html">
            <span class="ic" data-icon="shield">[ICON: shield]</span> Staff Accounts
          </a>
        `;
      }
      if (isPermitted('audit.html')) {
        userMenuLinksHtml += `
          <a href="../management/audit.html">
            <span class="ic" data-icon="history">[ICON: history]</span> Audit Log
          </a>
        `;
      }
      userMenuLinksHtml += `
        <a href="../main/home.html" target="_blank">
          <span class="ic" data-icon="external-link">[ICON: external-link]</span> Public Site
        </a>
        <button type="button" id="staffLogoutBtn">
          <span class="ic" data-icon="logout">[ICON: logout]</span> Sign Out
        </button>
      `;

      topBar.innerHTML = `
        <div class="staff-topbar-left">
          <button class="staff-drawer-btn" id="staffDrawerBtn" type="button" aria-label="Toggle navigation drawer">
            <span class="ic" data-icon="menu">[ICON: menu]</span>
          </button>
          <h2 class="staff-topbar-title">${esc(pageHeading)}</h2>
        </div>

        <div class="staff-topbar-right">
          <!-- Global Search Input (Reachable & Responsive on Mobile) -->
          <div class="staff-search-wrap">
            <span class="staff-search-icon">
              <span class="ic" data-icon="search">[ICON: search]</span>
            </span>
            <input class="staff-search-input" id="globalSearchInput" placeholder="Search reservations, guests, rooms…" aria-label="Global search">
            <div class="staff-search-results" id="globalSearchResults" role="listbox"></div>
          </div>

          <!-- Notification Bell -->
          <div class="staff-notif-wrap" id="notifWrap">
            <button class="staff-notif-btn" id="notifBellBtn" aria-label="View notifications">
              <span class="ic" data-icon="bell">[ICON: bell]</span>
              ${unseenCount > 0 ? `<span class="staff-notif-badge" id="notifBadge">${unseenCount}</span>` : ''}
            </button>
            <div class="staff-notif-dropdown" id="notifDropdown">
              <div class="staff-notif-header">
                <b>Notifications (${notifs.length})</b>
                <button class="btn-ghost btn-sm" id="btnMarkNotifsSeen" style="font-size: 11px;">Mark all seen</button>
              </div>
              <div class="staff-notif-list" id="notifList">
                ${notifs.length ? notifs.map(n => `
                  <a href="${n.url}" class="staff-notif-item">
                    <b>${esc(n.title)}</b>
                    <div style="font-size: 12px; color: var(--ink-2); margin-top: 2px;">${esc(n.desc)}</div>
                    <div class="text-sm" style="color: var(--ink-3); margin-top: 2px;">${esc(n.time)}</div>
                  </a>
                `).join('') : '<div style="padding: 16px; text-align: center; color: var(--ink-3); font-size: 13px;">No new alerts</div>'}
              </div>
            </div>
          </div>


          <!-- Public Website Shortcut -->
          <a href="../main/home.html" class="btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; height: 32px;" title="View Customer Website">
            <span class="ic" data-icon="external-link">[ICON: external-link]</span>
            <span>Public Site &rarr;</span>
          </a>

          <!-- Staff User Menu -->
          <div class="staff-user-menu" id="staffUserMenu">
            <button class="staff-user-btn" id="staffUserBtn" aria-haspopup="true" aria-expanded="false">
              <span class="ic" data-icon="user">[ICON: user]</span>
              <div>
                <div class="staff-user-name">${esc(user.name)}</div>
                <div class="staff-user-role">${esc(user.role)}</div>
              </div>
              <span class="ic" data-icon="chevron-down">[ICON: chevron-down]</span>
            </button>
            <div class="staff-user-dropdown" id="staffUserDropdown">
              ${userMenuLinksHtml}
            </div>
          </div>
        </div>
      `;


      // ─── Setup Mobile Drawer Toggle ───
      const drawerBtn = $('staffDrawerBtn');
      const sidebar = $('staffSidebar');
      if (drawerBtn && sidebar && backdrop) {
        drawerBtn.onclick = () => {
          const isOpen = sidebar.classList.toggle('open');
          backdrop.classList.toggle('show', isOpen);
        };
        backdrop.onclick = () => {
          sidebar.classList.remove('open');
          backdrop.classList.remove('show');
        };
      }

      // ─── Setup User Menu Dropdown ───
      const userBtn = $('staffUserBtn');
      const userDropdown = $('staffUserDropdown');
      if (userBtn && userDropdown) {
        userBtn.onclick = e => {
          e.stopPropagation();
          const open = userDropdown.style.display === 'block';
          userDropdown.style.display = open ? 'none' : 'block';
          userBtn.setAttribute('aria-expanded', !open);
        };
        document.addEventListener('click', () => {
          userDropdown.style.display = 'none';
          userBtn.setAttribute('aria-expanded', 'false');
        });
      }

      // ─── Setup Notification Bell Dropdown ───
      const notifBtn = $('notifBellBtn');
      const notifDropdown = $('notifDropdown');
      const markSeenBtn = $('btnMarkNotifsSeen');
      if (notifBtn && notifDropdown) {
        notifBtn.onclick = e => {
          e.stopPropagation();
          const open = notifDropdown.style.display === 'block';
          notifDropdown.style.display = open ? 'none' : 'block';
        };
        document.addEventListener('click', () => {
          notifDropdown.style.display = 'none';
        });

        if (markSeenBtn) {
          markSeenBtn.onclick = e => {
            e.stopPropagation();
            store.set('notifSeen', { count: notifs.length, time: nowISO() });
            const badge = $('notifBadge');
            if (badge) badge.remove();
            toast('All notifications marked as seen.', 'ok');
          };
        }
      }

      // ─── Setup Global Search (Debounced 200ms) ───
      const searchInput = $('globalSearchInput');
      const searchResults = $('globalSearchResults');
      if (searchInput && searchResults) {
        let _searchTimer = null;
        const executeSearch = () => {
          const q = searchInput.value.toLowerCase().trim();
          if (!q) {
            searchResults.style.display = 'none';
            searchResults.innerHTML = '';
            return;
          }

          const resMatches = Data.getReservations().filter(r =>
            r.c.toLowerCase().includes(q) || r.g.toLowerCase().includes(q) || (r.ph && r.ph.includes(q))
          ).slice(0, 4);

          const roomMatches = Data.getRooms().filter(r =>
            String(r.n).includes(q) || r.t.toLowerCase().includes(q)
          ).slice(0, 3);

          const orderMatches = Data.getOrders().filter(o =>
            o.code.toLowerCase().includes(q) || (o.target && o.target.toLowerCase().includes(q))
          ).slice(0, 3);

          const threadMatches = Data.getThreads().filter(t =>
            (t.guestName && t.guestName.toLowerCase().includes(q)) || (t.subject && t.subject.toLowerCase().includes(q))
          ).slice(0, 3);

          let resultsHtml = '';

          if (resMatches.length) {
            resultsHtml += '<div class="staff-search-group-title">Reservations</div>';
            resMatches.forEach(r => {
              resultsHtml += `
                <a href="../management/reservations.html?code=${r.c}" class="staff-search-item">
                  <b>${esc(r.c)}</b> — ${esc(r.g)} (${esc(r.t)} · Room ${r.n})
                </a>
              `;
            });
          }

          if (roomMatches.length) {
            resultsHtml += '<div class="staff-search-group-title">Rooms</div>';
            roomMatches.forEach(r => {
              resultsHtml += `
                <a href="../rooms/rooms.html?room=${r.n}" class="staff-search-item">
                  Room <b>${r.n}</b> — ${esc(r.t)}
                </a>
              `;
            });
          }

          if (orderMatches.length) {
            resultsHtml += '<div class="staff-search-group-title">Restaurant Orders</div>';
            orderMatches.forEach(o => {
              resultsHtml += `
                <a href="../management/orders.html?code=${o.code}" class="staff-search-item">
                  <b>${esc(o.code)}</b> — ${esc(o.target)} (${peso(o.subtotal)})
                </a>
              `;
            });
          }

          if (threadMatches.length) {
            resultsHtml += '<div class="staff-search-group-title">Messages</div>';
            threadMatches.forEach(t => {
              resultsHtml += `
                <a href="../management/messages.html?id=${t.id}" class="staff-search-item">
                  <b>${esc(t.guestName)}</b>: ${esc(t.subject)}
                </a>
              `;
            });
          }

          if (!resultsHtml) {
            resultsHtml = '<div style="padding: 12px; font-size: 13px; color: var(--ink-3); text-align: center;">No matching records found.</div>';
          }

          searchResults.innerHTML = resultsHtml;
          searchResults.style.display = 'block';
        };

        searchInput.oninput = () => {
          clearTimeout(_searchTimer);
          _searchTimer = setTimeout(executeSearch, 200);
        };
        searchInput.onfocus = executeSearch;
        document.addEventListener('click', e => {
          if (!e.target.closest('.staff-search-wrap')) {
            searchResults.style.display = 'none';
          }
        });

        // Enter key opens first result
        searchInput.onkeydown = e => {
          if (e.key === 'Enter') {
            const firstItem = searchResults.querySelector('a.staff-search-item');
            if (firstItem) {
              location.href = firstItem.href;
            }
          }
        };
      }

      // ─── Setup Staff Logout ───
      const logoutBtn = $('staffLogoutBtn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          Data.audit('User signed out', 'Auth', staffSession.email, 'Manual staff sign out');
          Data.clearStaffSession();
          window.location.replace('../auth/guest-login.html');
        };
      }
    }

    // Build Staff Footer
    const foot = document.querySelector('footer');
    if (foot) {
      foot.className = 'staff-footer';
      foot.innerHTML = `
        <div>&copy; 2026 ${CONFIG.hotelName} Management System.</div>
        <div>
          <a href="../main/privacy.html" style="margin-right: 12px;">Privacy Policy</a>
          <a href="../main/terms.html" style="margin-right: 12px;">Terms of Service</a>
          <a href="../main/contact.html">Support Desk</a>
        </div>
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStaffShell);
  } else {
    initStaffShell();
  }
})();
