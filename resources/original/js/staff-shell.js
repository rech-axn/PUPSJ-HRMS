/* ==========================================================================
   PUPSJ Hotel & Restaurant — Staff Management Shell (staff-shell.js)
   Auth guard, RBAC permission matrix, sidebar navigation, responsive slide-out
   drawer, top bar with working global search, live notifications bell, and user menu.
   ========================================================================== */
'use strict';

(function () {
  // ─── 1. Auth Guard & Multi-Portal RBAC Matrix ───
  const normPath = location.pathname.replace(/\\/g, '/');
  const curFile = normPath.split('/').pop() || 'dashboard.html';

  const bodyPortal = (typeof document !== 'undefined' && document.body && document.body.dataset) ? document.body.dataset.portal : '';
  const isHotelPortal = normPath.includes('/hotel/') || bodyPortal === 'hotel';
  const isRestaurantPortal = normPath.includes('/restaurant/') || bodyPortal === 'restaurant';
  const isManagementPortal = normPath.includes('/management/') || normPath.includes('/rooms/') || bodyPortal === 'admin';

  let staffSession = typeof Data !== 'undefined' ? Data.getStaffSession() : null;
  if (staffSession && (staffSession.role === 'restaurant_receptionist' || staffSession.email === 'restaurant@pupsj.edu.ph' || (staffSession.name && staffSession.name.includes('Marco Valdez')))) {
    staffSession.name = 'Rechelle Cansila';
  }
  const guestSession = typeof Data !== 'undefined' ? Data.getGuestSession() : null;
  const isAuthPage = normPath.includes('login.html') || normPath.includes('guest-login.html');

  // Automatic demo session fallback if visiting portal pages directly without an active session
  if (!staffSession && !guestSession && !isAuthPage) {
    if (isHotelPortal) {
      staffSession = { id: 'STF-002', name: 'Maria Santos', email: 'hotel@pupsj.edu.ph', role: 'hotel_receptionist', department: 'Front Desk' };
    } else if (isRestaurantPortal) {
      staffSession = { id: 'STF-008', name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', role: 'restaurant_receptionist', department: 'Restaurant' };
    } else {
      staffSession = { id: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', role: 'superadmin', department: 'Management' };
    }
    if (typeof Data !== 'undefined' && Data.setStaffSession) {
      Data.setStaffSession(staffSession);
    }
  }

  // Guard Case B: Guest attempting to access Staff/Admin pages -> Access Denied card
  if (!staffSession && guestSession && !isAuthPage) {
    window.__PUPSJ_ACCESS_DENIED = true;
    document.addEventListener('DOMContentLoaded', () => {
      const mainApp = document.querySelector('.staff-content') || document.body;
      if (mainApp) {
        mainApp.innerHTML = `
          <div class="card access-denied" style="max-width: 520px; margin: 80px auto; text-align: center; padding: 40px; box-shadow: var(--shadow-md, 0 4px 12px rgba(30, 35, 43, 0.08));">
            <div style="font-size: 14px; font-weight: 600; color: var(--gold-ink); margin-bottom: 12px;">[PLACEHOLDER: Security Lock Icon - Insert lock SVG or security symbol here]</div>
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 8px;">Access Denied</h2>
            <p class="text-sm" style="color: var(--ink-2); margin-bottom: 24px;">
              Staff credentials required. You are currently signed in as a registered <b>Guest</b> (<em>${esc(guestSession.name)}</em>).
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <a href="../guest/guest-portal.html" class="btn">Return to Guest Portal</a>
              <button class="btn-secondary" onclick="Data.clearGuestSession(); location.href='../auth/login.html';">Switch Account</button>
            </div>
          </div>
        `;
      }
    });
    return;
  }

  const userRole = (staffSession && staffSession.role) || 'superadmin';

  // Guard Case C: Role Boundary Restrictions
  let isRoleAllowed = true;
  let denialMessage = '';
  let homeLink = '../management/dashboard.html';
  let homeLabel = 'Management Portal';

  if (userRole === 'hotel_receptionist') {
    homeLink = '../hotel/dashboard.html';
    homeLabel = 'Hotel Front Desk Portal';
    if (isRestaurantPortal || isManagementPortal) {
      isRoleAllowed = false;
      denialMessage = 'Hotel Receptionist accounts are restricted to the Hotel Front Desk Portal.';
    }
  } else if (userRole === 'restaurant_receptionist') {
    homeLink = '../restaurant/orders.html';
    homeLabel = 'Restaurant POS Portal';
    if (isHotelPortal || isManagementPortal) {
      isRoleAllowed = false;
      denialMessage = 'Restaurant Staff accounts are restricted to the Restaurant POS Portal.';
    }
  } else {
    // Superadmin has universal access across all portals
    isRoleAllowed = true;
  }

  if (!isRoleAllowed) {
    window.__PUPSJ_ACCESS_DENIED = true;
    document.addEventListener('DOMContentLoaded', () => {
      const mainApp = document.querySelector('.staff-content') || document.body;
      if (mainApp) {
        mainApp.innerHTML = `
          <div class="card access-denied" style="max-width: 540px; margin: 80px auto; text-align: center; padding: 40px; box-shadow: var(--shadow-md, 0 4px 12px rgba(30, 35, 43, 0.08));">
            <div style="font-size: 14px; font-weight: 600; color: var(--bad); margin-bottom: 12px;">[PLACEHOLDER: Access Restricted Icon - Insert restricted access shield SVG here]</div>
            <h2 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 8px;">Access Restricted</h2>
            <p class="text-sm" style="color: var(--ink-2); margin-bottom: 16px;">
              ${esc(denialMessage)}
            </p>
            <p class="text-xs text-muted" style="margin-bottom: 24px;">
              Your active role is <b>${esc(userRole)}</b>. Contact the Administrator for cross-department privileges.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <a href="${homeLink}" class="btn">Return to ${esc(homeLabel)}</a>
              <button class="btn-secondary" onclick="Data.clearStaffSession(); location.href='../auth/login.html';">Switch Account</button>
            </div>
          </div>
        `;
      }
    });
    return;
  }

  // ─── Sidebar Navigation Structure by Portal ───
  let NAV_SECTIONS = [];
  let brandTitle = 'PUPSJ Hotel & Restaurant';
  let brandSubtitle = 'Superadmin Portal';
  let brandHomeHref = '../management/dashboard.html';

  if (isHotelPortal) {
    brandTitle = 'PUPSJ Hotel';
    brandSubtitle = 'Front Desk Portal';
    brandHomeHref = '../hotel/dashboard.html';
    NAV_SECTIONS = [
      {
        items: [
          { label: 'Dashboard', icon: 'dashboard', href: '../hotel/dashboard.html', file: 'dashboard.html' }
        ]
      },
      {
        title: 'Front Desk',
        items: [
          { label: 'Reservations', icon: 'bed', href: '../hotel/reservations.html', file: 'reservations.html' },
          { label: 'Guests', icon: 'users', href: '../hotel/guests.html', file: 'guests.html' },
          { label: 'Housekeeping', icon: 'broom', href: '../hotel/housekeeping.html', file: 'housekeeping.html' },
          { label: 'Maintenance', icon: 'wrench', href: '../hotel/maintenance.html', file: 'maintenance.html' },
          { label: 'Night Audit', icon: 'history', href: '../hotel/night-audit.html', file: 'night-audit.html' }
        ]
      },
      {
        title: 'Billing & Reports',
        items: [
          { label: 'Folios & Payments', icon: 'wallet', href: '../hotel/payments.html', file: 'payments.html' },
          { label: 'Hotel Reports', icon: 'chart-bar', href: '../hotel/reports.html', file: 'reports.html' }
        ]
      },
      {
        title: 'Guest Inbox',
        items: [
          { label: 'Messages', icon: 'message', href: '../hotel/messages.html', file: 'messages.html', badge: 'unreadMessages' },
          { label: 'Inquiries', icon: 'mail', href: '../hotel/inquiries.html', file: 'inquiries.html', badge: 'newInquiries' }
        ]
      }
    ];
    if (userRole === 'superadmin') {
      NAV_SECTIONS.push({
        title: 'Admin Controls',
        items: [
          { label: 'Return to Admin', icon: 'shield', href: '../management/dashboard.html', file: 'management' },
          { label: 'Switch to Restaurant', icon: 'utensils', href: '../restaurant/orders.html', file: 'restaurant' }
        ]
      });
    }
  } else if (isRestaurantPortal) {
    brandTitle = 'PUPSJ Restaurant';
    brandSubtitle = 'Restaurant POS Portal';
    brandHomeHref = '../restaurant/orders.html';
    NAV_SECTIONS = [
      {
        title: 'Restaurant Operations',
        items: [
          { label: 'POS Orders', icon: 'tray', href: '../restaurant/orders.html', file: 'orders.html' },
          { label: 'Tables & Floor', icon: 'table', href: '../restaurant/tables.html', file: 'tables.html' },
          { label: 'Menu Availability', icon: 'utensils', href: '../restaurant/menu-availability.html', file: 'menu-availability.html' }
        ]
      },
      {
        title: 'Finance & Cashier',
        items: [
          { label: 'Restaurant Payments', icon: 'wallet', href: '../restaurant/payments.html', file: 'payments.html' },
          { label: 'Cashier Z-Reports', icon: 'chart-bar', href: '../restaurant/reports.html', file: 'reports.html' }
        ]
      }
    ];
    if (userRole === 'superadmin') {
      NAV_SECTIONS.push({
        title: 'Admin Controls',
        items: [
          { label: 'Return to Admin', icon: 'shield', href: '../management/dashboard.html', file: 'management' },
          { label: 'Switch to Hotel', icon: 'bed', href: '../hotel/dashboard.html', file: 'hotel' }
        ]
      });
    }
  } else {
    // Administrator Portal
    brandTitle = 'PUPSJ Hotel & Restaurant';
    brandSubtitle = 'Superadmin Portal';
    brandHomeHref = '../management/dashboard.html';
    NAV_SECTIONS = [
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
          { label: 'Maintenance', icon: 'wrench', href: '../management/maintenance.html', file: 'maintenance.html' },
          { label: 'Night Audit', icon: 'history', href: '../management/night-audit.html', file: 'night-audit.html' },
          { label: 'Approvals & Overrides', icon: 'shield', href: '../management/approvals.html', file: 'approvals.html', badge: 'pendingApprovals' }
        ]
      },
      {
        title: 'Restaurant',
        items: [
          { label: 'Orders', icon: 'tray', href: '../management/orders.html', file: 'orders.html' },
          { label: 'Tables', icon: 'table', href: '../management/tables.html', file: 'tables.html' },
          { label: 'Menu & Recipes', icon: 'utensils', href: '../management/menu-management.html', file: 'menu-management.html' }
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
          { label: 'Hotel Settings', icon: 'settings', href: '../management/settings.html', file: 'settings.html' },
          { label: 'Promotions', icon: 'tag', href: '../management/promotions.html', file: 'promotions.html' },
          { label: 'Personnel Directory', icon: 'shield', href: '../management/employees.html', file: 'employees.html' },
          { label: 'Audit Log', icon: 'history', href: '../management/audit.html', file: 'audit.html' }
        ]
      },
      {
        title: 'Role Portals View',
        items: [
          { label: 'Hotel Portal →', icon: 'bed', href: '../hotel/dashboard.html', file: 'hotel-view' },
          { label: 'Restaurant Portal →', icon: 'utensils', href: '../restaurant/orders.html', file: 'restaurant-view' }
        ]
      }
    ];
  }

  // ─── 2. Initialize Staff Layout ───
  function initStaffShell() {
    try {
      // If superadmin is supervising a receptionist portal, show supervision banner
      if (userRole === 'superadmin' && (isHotelPortal || isRestaurantPortal)) {
        if (!document.getElementById('adminSupervisionBanner')) {
          const banner = document.createElement('div');
          banner.id = 'adminSupervisionBanner';
          banner.style.cssText = 'background: #2D2517; color: #F5ECCF; padding: 6px 16px; font-size: 12px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; border-bottom: 1px solid #B8891A;';
          banner.innerHTML = `
            <span>[PLACEHOLDER: Admin Badge Icon - Insert administrator badge SVG here] <b>Viewing as Administrator</b>: ${isHotelPortal ? 'Hotel Front Desk Portal' : 'Restaurant POS Portal'}</span>
            <a href="../management/dashboard.html" style="color: #FFFFFF; font-weight: 600; text-decoration: underline;">Return to Management &rarr;</a>
          `;
          document.body.prepend(banner);
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

      // Build Sidebar
      const aside = document.querySelector('aside') || $('staffSidebar');
      if (aside) {
        aside.className = 'staff-sidebar';
        aside.id = 'staffSidebar';

        // Safe Live Badges
        let unreadMsgCount = 0;
        try {
          const threads = (typeof Data !== 'undefined' && Data.getThreads) ? Data.getThreads() : [];
          unreadMsgCount = (Array.isArray(threads) ? threads : []).filter(t => t && t.unreadStaff > 0 && t.status === 'Open').length;
        } catch (e) { console.warn('unreadMsgCount error', e); }

        let newInqCount = 0;
        try {
          const inqs = (typeof Data !== 'undefined' && Data.getInquiries) ? Data.getInquiries() : [];
          newInqCount = (Array.isArray(inqs) ? inqs : []).filter(i => i && i.status === 'New').length;
        } catch (e) { console.warn('newInqCount error', e); }

        let pendingApprovalCount = 0;
        try {
          if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.ApprovalService && PUPSJ_Services.ApprovalService.getPendingRequests) {
            pendingApprovalCount = PUPSJ_Services.ApprovalService.getPendingRequests().length;
          } else if (typeof store !== 'undefined') {
            pendingApprovalCount = (store.get('approvalRequests', []) || []).filter(r => r && r.status === 'Pending').length;
          }
        } catch (e) { console.warn('pendingApprovalCount error', e); }

        let navHtml = '';
        NAV_SECTIONS.forEach(sec => {
          if (sec.title) {
            navHtml += `<div class="staff-nav-heading">${esc(sec.title)}</div>`;
          }
          sec.items.forEach(it => {
            const isActive = curFile === it.file;
            let badgeHtml = '';
            if (it.badge === 'unreadMessages' && unreadMsgCount > 0) {
              badgeHtml = `<span class="staff-nav-badge">${unreadMsgCount}</span>`;
            } else if (it.badge === 'newInquiries' && newInqCount > 0) {
              badgeHtml = `<span class="staff-nav-badge">${newInqCount}</span>`;
            } else if (it.badge === 'pendingApprovals' && pendingApprovalCount > 0) {
              badgeHtml = `<span class="staff-nav-badge" style="background: var(--bad);">${pendingApprovalCount}</span>`;
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
          <a class="staff-sidebar-brand" href="${brandHomeHref}">
            <img src="../../assets/logo/pupsj-mark.png" alt="PUPSJ" style="width: 32px; height: 32px; display: inline-block; object-fit: contain;">
            <div>
              <h3 style="font-size: 17px; line-height: 1.1;">${esc(brandTitle)}</h3>
              <div style="font-size: 11px; color: var(--gold-ink); font-weight: 500;">${esc(brandSubtitle)}</div>
            </div>
          </a>
          <nav class="staff-nav" role="navigation">
            ${navHtml}
          </nav>
          <div class="staff-sidebar-footer">
            <div>PUPSJ HRMS v1.0</div>
            <div style="font-size: 11px; color: var(--ink-3); margin-top: 4px;">Signed in: <b>${esc(staffSession ? staffSession.name : userRole)}</b></div>
          </div>
        `;
      }

      // Build Top Bar
      const topBar = document.querySelector('.top') || document.querySelector('header') || $('staffTopbar');
      if (topBar) {
        topBar.className = 'staff-topbar';
        topBar.id = 'staffTopbar';

        const pageHeading = $('ttl') ? $('ttl').textContent : document.title.replace('PUPSJ Hotel – ', '').replace('PUPSJ Restaurant – ', '');
        const user = staffSession || { name: 'Staff Member', role: userRole };

        // Calculate live notifications safely
        let notifs = [];
        let seenIdSet = new Set();
        try {
          const portalKey = isHotelPortal ? 'hotel' : (isRestaurantPortal ? 'restaurant' : 'management');
          if (typeof Data !== 'undefined' && Data.getNotifications) {
            notifs = Data.getNotifications(portalKey) || [];
          }
          const seenIdList = (typeof store !== 'undefined' ? store.get('notifSeenIds', []) : []) || [];
          seenIdSet = new Set(Array.isArray(seenIdList) ? seenIdList : []);
        } catch (e) { console.warn('notifs error', e); }
        const unseenCount = (Array.isArray(notifs) ? notifs : []).filter(n => n && !seenIdSet.has(n.id)).length;

        // Build User Dropdown based on role
        let userMenuLinksHtml = '';
        if (userRole === 'superadmin') {
          userMenuLinksHtml += `
            <a href="../management/settings.html">
              <span class="ic" data-icon="settings">[ICON: settings]</span> Hotel Settings
            </a>
            <a href="../management/employees.html">
              <span class="ic" data-icon="shield">[ICON: shield]</span> Personnel Directory
            </a>
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
                ${notifs.length ? notifs.map(n => {
        const isUnread = !seenIdSet.has(n.id);
        return `
                    <a href="${n.url}" class="staff-notif-item" data-notif-id="${esc(n.id)}" style="${isUnread ? 'background: rgba(184, 137, 26, 0.05);' : ''}">
                      <div style="display: flex; align-items: flex-start; gap: 8px;">
                        ${isUnread ? '<span class="staff-notif-unread-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--gold-ink); margin-top: 5px; flex-shrink: 0;"></span>' : '<span style="display: inline-block; width: 7px; height: 7px; flex-shrink: 0;"></span>'}
                        <div style="flex: 1;">
                          <b style="${isUnread ? 'color: var(--ink);' : 'color: var(--ink-2);'}">${esc(n.title)}</b>
                          <div style="font-size: 12px; color: var(--ink-2); margin-top: 2px;">${esc(n.desc)}</div>
                          <div class="text-sm" style="color: var(--ink-3); margin-top: 2px;">${esc(n.time)}</div>
                        </div>
                      </div>
                    </a>
                  `;
      }).join('') : '<div style="padding: 16px; text-align: center; color: var(--ink-3); font-size: 13px;">No new alerts</div>'}
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

        // Mark individual notification as seen on click
        document.querySelectorAll('.staff-notif-item').forEach(el => {
          el.addEventListener('click', () => {
            const nid = el.dataset.notifId;
            if (nid) {
              const cur = store.get('notifSeenIds', []);
              if (!cur.includes(nid)) {
                cur.push(nid);
                store.set('notifSeenIds', cur.slice(-200));
              }
            }
          });
        });

        if (markSeenBtn) {
          markSeenBtn.onclick = e => {
            e.stopPropagation();
            const cur = new Set(store.get('notifSeenIds', []));
            notifs.forEach(n => cur.add(n.id));
            store.set('notifSeenIds', Array.from(cur).slice(-200));
            const badge = $('notifBadge');
            if (badge) badge.remove();
            document.querySelectorAll('.staff-notif-unread-dot').forEach(d => d.remove());
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
          window.location.replace('../auth/login.html');
        };
      }
    }

    // Build Staff Footer
    const foot = document.querySelector('footer');
    if (foot) {
      foot.className = 'staff-footer';
      const hotelName = (typeof CONFIG !== 'undefined' && CONFIG.hotelName) ? CONFIG.hotelName : 'PUPSJ Hotel & Restaurant';
      foot.innerHTML = `
        <div>&copy; 2026 ${esc(hotelName)} Management System.</div>
        <div>
          <a href="../main/privacy.html" style="margin-right: 12px;">Privacy Policy</a>
          <a href="../main/terms.html" style="margin-right: 12px;">Terms of Service</a>
          <a href="../main/contact.html">Support Desk</a>
        </div>
      `;
    }
    } catch (err) {
      console.error('Error during staff shell initialization:', err);
    }
  }

  let staffShellInitialized = false;
  function safeInitStaffShell() {
    if (staffShellInitialized) return;
    staffShellInitialized = true;
    initStaffShell();
  }

  // If aside or topbar is already in the DOM, initialize immediately without waiting
  if (document.getElementById('staffSidebar') || document.querySelector('aside')) {
    safeInitStaffShell();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInitStaffShell);
  } else {
    safeInitStaffShell();
  }
})();
