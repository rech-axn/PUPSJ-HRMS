/* ==========================================================================
   PUPSJ Hotel & Restaurant — Core Library (core.js)
   Central configuration, utilities, debounced storage, modal, toast,
   formatting, CSV exports, and placeholder helpers.
   ========================================================================== */
'use strict';

// ─── Central Application Configuration (Neutral Copy, Single Source of Truth) ───
const CONFIG = {
  hotelName: 'PUPSJ Hotel & Restaurant',
  location: 'San Juan City',
  address: '223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City 1500, Metro Manila',
  phones: ['+63 2 7738 5071', '+63 2 8892 4100'],
  mobileConcierge: '+63 917 100 0001',
  emails: {
    general: 'info@pupsjhotel.com',
    concierge: 'concierge@pupsjhotel.com',
    reservations: 'reservations@pupsjhotel.com',
    billing: 'billing@pupsjhotel.com'
  },
  hours: {
    frontDesk: '24 Hours Daily',
    restaurant: '6:00 AM – 10:00 PM Daily',
    breakfast: '6:00 AM – 10:30 AM',
    lunch: '11:30 AM – 2:30 PM',
    dinner: '6:00 PM – 10:00 PM',
    checkIn: '2:00 PM',
    checkOut: '12:00 PM'
  },
  wifi: {
    network: 'PUPSJ-Guest-HighSpeed',
    password: 'Hospitality2026'
  },
  amenities: [
    { name: 'Rooftop Swimming Pool', desc: 'Outdoor heated pool with panoramic city views and deck loungers.' },
    { name: 'PUPSJ Restaurant & Lounge', desc: 'All-day dining blending regional specialties and international favorites.' },
    { name: 'Spa & Wellness Suite', desc: 'Signature massage and therapeutic treatments by appointment.' },
    { name: 'Fitness Studio', desc: 'Cardiovascular and strength equipment open 24 hours with guest key card.' },
    { name: 'Meeting & Banquet Spaces', desc: 'Flexible event rooms for conferences, seminars, and intimate gatherings.' },
    { name: 'Valet & Secure Garage Parking', desc: 'Complimentary 24-hour on-site parking for registered guests and diners.' }
  ],
  policies: [
    ['Check-In Time', 'From 2:00 PM (Front Desk registration and key card issuance)'],
    ['Check-Out Time', 'Until 12:00 PM (Complimentary late check-out subject to room availability)'],
    ['Guarantee Deposit', '50% room charge secures your booking with instant official tax receipt'],
    ['Cancellation Terms', 'Free cancellation up to 3 days before arrival; later cancellations retain the first night rate'],
    ['Payment Settlement', 'Credit cards, GCash, Maya, Bank wire transfer, and cash at Front Desk with official BIR invoice'],
    ['Prices & Levies', 'All posted accommodation and dining prices include 12% VAT and 10% service charge']
  ],
  tax: {
    vatPct: 12,
    svcPct: 10
  },
  depositPct: 50,
  freeCancelDays: 3,
  responseTime: 'within 2 hours during front desk hours',
  demoLogins: true,
  legal: {
    tin: '[PLACEHOLDER: TIN]',
    permit: '[PLACEHOLDER: BIR PERMIT]'
  },
  loyalty: {
    earnRate: 1, // 1 point per ₱100 spent
    silverNights: 5,
    goldNights: 12,
    platinumNights: 25,
    tiers: [
      { name: 'Member', minNights: 0, perks: ['Member booking rates', 'Digital concierge service'] },
      { name: 'Silver', minNights: 5, perks: ['Early check-in upon availability', 'Complimentary welcome beverage'] },
      { name: 'Gold', minNights: 12, perks: ['Late check-out until 2:00 PM', '10% dining discount', 'Room upgrade upon availability'] },
      { name: 'Platinum', minNights: 25, perks: ['Guaranteed late check-out', '15% dining discount', 'Priority booking support'] }
    ],
    rewards: [
      { id: 'RWD-1', name: '₱500 Dining Credit', points: 500, type: 'dining' },
      { id: 'RWD-2', name: 'Late Check-out (2:00 PM)', points: 400, type: 'checkout' },
      { id: 'RWD-3', name: 'Complimentary Breakfast Set', points: 650, type: 'breakfast' },
      { id: 'RWD-4', name: 'Spa Session Credit (₱1,000)', points: 1000, type: 'spa' }
    ]
  }
};

// ─── DOM Helpers ───
const $ = id => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ─── Sanitization & XSS Escaping ───
// Escapes &, <, >, ", ', and ` to protect all user-entered content
const esc = s => {
  if (s == null) return '';
  return String(s).replace(/[&<>"'`]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  }[c]));
};

// ─── Date & Timezone Utilities ───
// Calculates the correct local date string (YYYY-MM-DD), avoiding the UTC overnight date skew in Manila
const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const nowTime = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 5); // HH:MM
};

const nowISO = () => {
  return `${today()}T${nowTime()}`;
};

const addDays = (isoDate, n) => {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateDiff = (isoA, isoB) => {
  const a = new Date(isoA + 'T00:00:00');
  const b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 864e5);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const fmtDate = iso => {
  if (!iso || typeof iso !== 'string' || iso.length < 10) return '—';
  const m = +iso.slice(5, 7) - 1;
  const d = +iso.slice(8, 10);
  const y = iso.slice(0, 4);
  return `${MONTHS[m]} ${d}, ${y}`;
};

const fmtShortDate = iso => {
  if (!iso || typeof iso !== 'string' || iso.length < 10) return '—';
  const m = +iso.slice(5, 7) - 1;
  const d = +iso.slice(8, 10);
  return `${MONTHS[m]} ${d}`;
};

const fmtDateRange = (isoA, isoB) => {
  if (!isoA || !isoB) return '—';
  const aM = +isoA.slice(5, 7) - 1;
  const aD = +isoA.slice(8, 10);
  const bM = +isoB.slice(5, 7) - 1;
  const bD = +isoB.slice(8, 10);
  const aY = isoA.slice(0, 4);
  const bY = isoB.slice(0, 4);

  if (aY === bY) {
    if (aM === bM) return `${MONTHS[aM]} ${aD} – ${bD}, ${aY}`;
    return `${MONTHS[aM]} ${aD} – ${MONTHS[bM]} ${bD}, ${aY}`;
  }
  return `${MONTHS[aM]} ${aD}, ${aY} – ${MONTHS[bM]} ${bD}, ${bY}`;
};

// ─── Currency & Financial Utilities ───
const peso = amt => {
  const val = Math.round(+amt || 0);
  return '₱' + val.toLocaleString('en-US');
};

// Computes itemized tax components (12% VAT + 10% Service Charge inclusive)
const taxBreakdown = grossAmount => {
  const gross = Math.round(+grossAmount || 0);
  // BIR standard factor: Net * 1.10 (Service Charge) * 1.12 (VAT) = Net * 1.232
  const factor = 1.232;
  const net = Math.round(gross / factor);
  const svc = Math.round(net * 0.10);
  const vat = gross - net - svc;
  return { net, vat, svc, total: gross, factor };
};

// ─── Icon & Image Placeholder Helpers ───
const ico = (name, label) => {
  const mark = `<span class="ic" data-icon="${esc(name)}" aria-hidden="true">[ICON: ${esc(name)}]</span>`;
  return label ? `${mark} <span>${esc(label)}</span>` : mark;
};

const imgPlaceholder = (desc, ratio = '16:9') => {
  return `<div class="img-placeholder">[IMAGE: ${esc(desc)}, ${esc(ratio)}]</div>`;
};

// ─── LocalStorage Engine with Immediate Synchronous Persistence ───
const store = {
  get(key, defaultValue) {
    try {
      const data = localStorage.getItem('pupsj.' + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn('Storage read failed for', key, e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('pupsj.' + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write failed for', key, e);
      if (typeof toast === 'function') {
        toast('Storage quota exceeded. Please archive past records.', 'warn');
      }
    }
  },
  remove(key) {
    try {
      localStorage.removeItem('pupsj.' + key);
    } catch (e) {
      console.warn('Storage remove failed for', key, e);
    }
  },
  transaction(fn) {
    const snapshot = {};
    const touchedKeys = new Set();
    const originalSet = this.set.bind(this);
    const originalRemove = this.remove.bind(this);

    this.set = (key, val) => {
      if (!touchedKeys.has(key)) {
        snapshot[key] = this.get(key, null);
        touchedKeys.add(key);
      }
      originalSet(key, val);
    };
    this.remove = (key) => {
      if (!touchedKeys.has(key)) {
        snapshot[key] = this.get(key, null);
        touchedKeys.add(key);
      }
      originalRemove(key);
    };

    try {
      const res = fn();
      return res;
    } catch (err) {
      console.error('Transaction rollback triggered:', err);
      for (const key of touchedKeys) {
        if (snapshot[key] === null) {
          originalRemove(key);
        } else {
          originalSet(key, snapshot[key]);
        }
      }
      throw err;
    } finally {
      this.set = originalSet;
      this.remove = originalRemove;
    }
  }
};

// ─── Persistent Configuration Overrides ───
try {
  const savedCfg = store.get('config_overrides', null);
  if (savedCfg && typeof savedCfg === 'object') {
    for (const k of Object.keys(savedCfg)) {
      if (typeof savedCfg[k] === 'object' && !Array.isArray(savedCfg[k]) && savedCfg[k] !== null && CONFIG[k]) {
        Object.assign(CONFIG[k], savedCfg[k]);
      } else {
        CONFIG[k] = savedCfg[k];
      }
    }
  }
} catch (e) {
  console.warn('Failed to apply config overrides', e);
}

const saveConfigOverrides = (overrides) => {
  if (!overrides || typeof overrides !== 'object') return false;
  for (const k of Object.keys(overrides)) {
    if (typeof overrides[k] === 'object' && !Array.isArray(overrides[k]) && overrides[k] !== null && CONFIG[k]) {
      Object.assign(CONFIG[k], overrides[k]);
    } else {
      CONFIG[k] = overrides[k];
    }
  }
  store.set('config_overrides', overrides);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('pupsj:data-change', { detail: { entity: 'config', action: 'update' } }));
  }
  return true;
};

// ─── Modal Component ───
let _activeModalEl = null;
let _modalPrevFocusedEl = null;

const showModal = (title, bodyHtml, footerHtml = '', options = {}) => {
  // Synchronously destroy any existing modal to avoid duplicate element IDs
  const existingBackdrop = document.getElementById('appModalBackdrop');
  if (existingBackdrop) {
    if (existingBackdrop._keyHandler) {
      document.removeEventListener('keydown', existingBackdrop._keyHandler);
    }
    existingBackdrop.remove();
  }
  _activeModalEl = null;

  _modalPrevFocusedEl = document.activeElement;
  document.body.classList.add('has-modal');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'appModalBackdrop';

  const maxWidth = options.maxWidth ? `max-width:${options.maxWidth};` : '';
  const safeTitle = (typeof title === 'string' && !title.includes('<')) ? esc(title) : title;

  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="${maxWidth}">
      <div class="modal-header">
        <h3>${safeTitle}</h3>
        <button class="modal-close" id="modalCloseBtn" aria-label="Close dialog"><span class="ic" data-icon="close">[ICON: close]</span></button>
      </div>
      <div class="modal-body" id="modalBody">
        ${bodyHtml}
      </div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
  _activeModalEl = backdrop;

  // Trigger fade-in
  requestAnimationFrame(() => backdrop.classList.add('show'));

  // Close handlers
  const closeBtn = backdrop.querySelector('#modalCloseBtn');
  if (closeBtn) closeBtn.onclick = closeModal;

  backdrop.onclick = e => {
    if (e.target === backdrop) closeModal();
  };

  // Keyboard navigation & focus trap
  const focusables = backdrop.querySelectorAll('input, select, textarea, button, [tabindex="0"]');
  if (focusables.length) {
    focusables[0].focus();
  }

  const keyHandler = e => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'Tab') {
      const activeFocusables = backdrop.querySelectorAll('input, select, textarea, button, [tabindex="0"]');
      if (!activeFocusables.length) return;
      const first = activeFocusables[0];
      const last = activeFocusables[activeFocusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
  backdrop._keyHandler = keyHandler;
  document.addEventListener('keydown', keyHandler);

  backdrop._onClose = options.onClose;
  if (typeof options.onOpen === 'function') {
    options.onOpen(backdrop);
  }
};

const closeModal = () => {
  document.body.classList.remove('has-modal');
  const el = _activeModalEl || document.getElementById('appModalBackdrop');
  if (!el) return;
  _activeModalEl = null;

  if (typeof el._onClose === 'function') {
    try { el._onClose(); } catch (e) { console.warn(e); }
  }

  if (el._keyHandler) {
    document.removeEventListener('keydown', el._keyHandler);
  }

  el.classList.remove('show');
  el.remove();

  if (_modalPrevFocusedEl && typeof _modalPrevFocusedEl.focus === 'function') {
    _modalPrevFocusedEl.focus();
    _modalPrevFocusedEl = null;
  }
};

// ─── Promise-Based Accessible Confirm Dialog ───
const confirmDialog = (message, title = 'Confirm Action', options = {}) => {
  return new Promise(resolve => {
    let resolved = false;
    const confirmText = options.confirmText || 'Confirm';
    const cancelText = options.cancelText || 'Cancel';
    const btnClass = options.btnClass || (options.danger !== false ? 'btn-danger' : 'btn');

    const bodyHtml = `
      <div style="font-size: 14px; color: var(--ink-2); line-height: 1.6; padding: 6px 0;">
        ${esc(message)}
      </div>
    `;
    const footerHtml = `
      <button type="button" class="btn-secondary" id="confirmDialogCancelBtn">${esc(cancelText)}</button>
      <button type="button" class="${btnClass}" id="confirmDialogConfirmBtn">${esc(confirmText)}</button>
    `;

    showModal(title, bodyHtml, footerHtml, {
      maxWidth: options.maxWidth || '440px',
      onClose: () => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      },
      onOpen: modalEl => {
        const cancelBtn = modalEl.querySelector('#confirmDialogCancelBtn');
        const confirmBtn = modalEl.querySelector('#confirmDialogConfirmBtn');
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            if (!resolved) {
              resolved = true;
              closeModal();
              resolve(false);
            }
          };
        }
        if (confirmBtn) {
          confirmBtn.onclick = () => {
            if (!resolved) {
              resolved = true;
              closeModal();
              resolve(true);
            }
          };
          confirmBtn.focus();
        }
      }
    });
  });
};

// ─── Toast Component ───
let _toastTimer = null;

const toast = (message, type = 'info', duration = 2600) => {
  let toastType = 'info';
  let toastDuration = 2600;

  if (typeof type === 'number') {
    toastDuration = type;
  } else if (typeof type === 'string') {
    const norm = type.toLowerCase().trim();
    if (['ok', 'warn', 'bad', 'info'].includes(norm)) {
      toastType = norm;
    }
  }
  if (typeof duration === 'number') {
    toastDuration = duration;
  }

  let el = $('appToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'appToast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }

  clearTimeout(_toastTimer);
  el.className = `toast toast--${toastType}`;
  el.textContent = message;
  el.classList.add('show');

  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
  }, toastDuration);
};

// ─── CSV Export Utility (UTF-8 BOM, Blob Download, Anti-Formula Injection) ───
const exportCSV = (filename, columns, rows) => {
  const sanitizeCell = val => {
    if (val == null) return '""';
    let s = String(val);
    // Neutralize spreadsheet formula injection (=, +, -, @)
    if (/^[=+\-@]/.test(s)) {
      s = "'" + s;
    }
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headerLine = columns.map(c => {
    const title = typeof c === 'string' ? c : (c.header || c.label || c.name || c.title || '');
    return sanitizeCell(title);
  }).join(',');

  const rowLines = rows.map(r => {
    if (Array.isArray(r)) {
      return r.map(sanitizeCell).join(',');
    }
    return columns.map(col => {
      if (typeof col === 'string') return sanitizeCell(r[col]);
      if (typeof col.key === 'function') return sanitizeCell(col.key(r));
      const k = col.key || col.id || col.name;
      return sanitizeCell(r[k]);
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast(`Exported ${filename}`, 'ok');
};

// ─── Print / PDF Utility ───
const printDocument = () => {
  window.print();
};

// ─── Table Pagination Helper ───
const paginate = (items, page = 1, pageSize = 10) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);
  const endIndex = Math.min(startIndex + pageSize, total);

  return {
    items: pageItems,
    page: currentPage,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    // Aliases to seamlessly support all page scripts:
    startIdx: startIndex,
    endIdx: endIndex,
    totalItems: total,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  };
};

const renderPagination = (p, containerId, onPageChange) => {
  const c = $(containerId);
  if (!c) return;
  const totalCount = p.total ?? p.totalItems ?? 0;
  if (!totalCount) {
    c.innerHTML = '<div class="pagination"><span class="text-sm">No records found</span></div>';
    return;
  }

  const sIdx = (p.startIndex ?? p.startIdx ?? 0) + 1;
  const eIdx = p.endIndex ?? p.endIdx ?? totalCount;

  c.innerHTML = `
    <div class="pagination">
      <span class="text-sm">Showing ${sIdx}–${eIdx} of ${totalCount}</span>
      <div class="pagination-controls">
        <button class="btn-secondary btn-sm" id="${containerId}_prev" ${p.hasPrev ? '' : 'disabled'}>Previous</button>
        <span class="text-sm" style="padding: 0 8px;">Page ${p.page} of ${p.totalPages}</span>
        <button class="btn-secondary btn-sm" id="${containerId}_next" ${p.hasNext ? '' : 'disabled'}>Next</button>
      </div>
    </div>
  `;

  const prev = $(`${containerId}_prev`);
  const next = $(`${containerId}_next`);
  if (prev && p.hasPrev) prev.onclick = () => onPageChange(p.page - 1);
  if (next && p.hasNext) next.onclick = () => onPageChange(p.page + 1);
};

// ─── Single Canonical Stay Pricing Engine ───
const calculateStayPricing = ({ baseRate, nights, promo }) => {
  const nts = Math.max(1, Number(nights || 1));
  const rate = Number(baseRate || 3200);
  const baseTotal = nts * rate;
  let discount = 0;

  if (promo) {
    const pType = promo.type || 'percent';
    const pVal = Number(promo.value || 0);
    if (pType === 'percent') {
      discount = Math.round(baseTotal * (pVal / 100));
    } else if (pType === 'fixed' || pType === 'credit') {
      discount = Math.min(baseTotal, pVal);
    }
  }

  const netTotal = Math.max(0, baseTotal - discount);
  const depDue = Math.ceil(netTotal * (CONFIG.depositPct / 100));
  const balDue = netTotal - depDue;
  const taxes = taxBreakdown(netTotal);

  return {
    nights: nts,
    rate,
    baseTotal,
    discount,
    netTotal,
    depDue,
    balDue,
    taxes
  };
};

// ─── Auth Gate Pending Intent (sessionStorage, 30-min Expiry) ───
const INTENT_KEY = 'pupsj_pending_intent';
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

const savePendingIntent = intent => {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({
      ...intent,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Failed to save pending intent:', e);
  }
};

const getPendingIntent = () => {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.timestamp || (Date.now() - data.timestamp > INTENT_TTL_MS)) {
      sessionStorage.removeItem(INTENT_KEY);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

const clearPendingIntent = () => {
  try {
    sessionStorage.removeItem(INTENT_KEY);
  } catch (e) {}
};

// ─── Safe Return Target URL Validation (Anti Open-Redirect) ───
const WHITELISTED_PAGES = [
  'home.html', 'rooms-deals.html', 'menu.html', 'about.html', 'contact.html',
  'privacy.html', 'terms.html', 'guest-portal.html', 'guests.html',
  'dashboard.html', 'reservations.html', 'orders.html', 'kitchen.html',
  'tables.html', 'housekeeping.html', 'maintenance.html', 'payments.html',
  'reports.html', 'rooms.html', 'roomtypes.html', 'promotions.html',
  'employees.html', 'audit.html', 'menu-management.html', 'settings.html', 'messages.html', 'inquiries.html', 'feedback.html'
];

const validateReturnUrl = (url, defaultTarget = '../guest/guest-portal.html') => {
  if (typeof PUPSJ_Validators !== 'undefined' && PUPSJ_Validators.validateReturnUrl) {
    return PUPSJ_Validators.validateReturnUrl(url, defaultTarget);
  }
  if (!url || typeof url !== 'string') return defaultTarget;
  const clean = url.trim();
  if (clean.includes('\\')) return defaultTarget;
  if (/^(https?:|file:|javascript:|data:|blob:)/i.test(clean) || clean.startsWith('//')) return defaultTarget;
  try {
    const URLImpl = typeof URL !== 'undefined' ? URL : (typeof globalThis !== 'undefined' ? globalThis.URL : null);
    if (URLImpl) {
      const base = typeof location !== 'undefined' ? location.href : 'http://localhost/pages/main/home.html';
      const resolved = new URLImpl(clean, base);
      const filename = resolved.pathname.replace(/\\/g, '/').split('/').pop() || '';
      if (WHITELISTED_PAGES.includes(filename)) return clean;
    } else {
      const filename = clean.split('?')[0].split('#')[0].split('/').pop();
      if (WHITELISTED_PAGES.includes(filename)) return clean;
    }
  } catch (e) {
    return defaultTarget;
  }
  return defaultTarget;
};

// ─── Input Format Validators (PH Mobile, Email) ───
const isValidPhMobile = phone => {
  if (!phone) return false;
  const digits = String(phone).replace(/[\s\-().+]/g, '');
  // Accepts 09XXXXXXXXX (11 digits) or 639XXXXXXXXX (12 digits)
  return /^(09\d{9}|639\d{9})$/.test(digits);
};

const isValidEmail = email => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

// ─── Global Exposure for In-Line Handlers & Cross-File Modals ───
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  window.store = store;
  window.$ = $;
  window.$$ = $$;
  window.esc = esc;
  window.today = today;
  window.nowISO = nowISO;
  window.nowTime = nowTime;
  window.addDays = addDays;
  window.dateDiff = dateDiff;
  window.fmtDate = fmtDate;
  window.fmtShortDate = fmtShortDate;
  window.fmtDateRange = fmtDateRange;
  window.fmtRange = fmtDateRange;
  window.peso = peso;
  window.taxBreakdown = taxBreakdown;
  window.calculateStayPricing = calculateStayPricing;
  window.savePendingIntent = savePendingIntent;
  window.getPendingIntent = getPendingIntent;
  window.clearPendingIntent = clearPendingIntent;
  window.validateReturnUrl = validateReturnUrl;
  window.isValidPhMobile = isValidPhMobile;
  window.isValidEmail = isValidEmail;
  window.ico = ico;
  window.imgPlaceholder = imgPlaceholder;
  window.showModal = showModal;
  window.closeModal = closeModal;
  window.confirmDialog = confirmDialog;
  window.saveConfigOverrides = saveConfigOverrides;
  window.toast = toast;
  window.exportCSV = exportCSV;
  window.printDocument = printDocument;
  window.paginate = paginate;
  window.renderPagination = renderPagination;
}

