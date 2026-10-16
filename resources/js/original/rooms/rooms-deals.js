import '../../hrms-api.js';


/* Original source: crypto.js */
/**
 * PUPSJ PMS & POS — Pure-JS Cryptographic Engine (RFC 6234 / FIPS 180-4)
 * Client-side SHA-256 and salted iterated hashing.
 * Zero external libraries, zero crypto.subtle dependencies, 100% offline file:// compatible.
 */
(function(root) {
  'use strict';

  // --- Internal 32-bit math helpers ---
  function rotr(n, b) {
    return (n >>> b) | (n << (32 - b));
  }
  function ch(x, y, z) {
    return (x & y) ^ (~x & z);
  }
  function maj(x, y, z) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function sigma0(x) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  }
  function sigma1(x) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  }
  function gamma0(x) {
    return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  }
  function gamma1(x) {
    return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
  }

  // SHA-256 round constants (first 32 bits of fractional parts of cube roots of first 64 primes)
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  /**
   * Pure JS SHA-256 hash function.
   * @param {string} message - Plaintext string
   * @returns {string} 64-character lowercase hex string
   */
  function sha256(message) {
    if (typeof message !== 'string') message = String(message || '');
    
    // Encode string to UTF-8 bytes
    const bytes = [];
    for (let i = 0; i < message.length; i++) {
      let code = message.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(i) & 0x3ff));
        bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    }

    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) {
      bytes.push(0);
    }

    // Append 64-bit length (big-endian)
    bytes.push(0, 0, 0, 0);
    bytes.push((bitLength >>> 24) & 0xff);
    bytes.push((bitLength >>> 16) & 0xff);
    bytes.push((bitLength >>> 8) & 0xff);
    bytes.push(bitLength & 0xff);

    // Initial hash values
    let h0 = 0x6a09e667;
    let h1 = 0xbb67ae85;
    let h2 = 0x3c6ef372;
    let h3 = 0xa54ff53a;
    let h4 = 0x510e527f;
    let h5 = 0x9b05688c;
    let h6 = 0x1f83d9ab;
    let h7 = 0x5be0cd19;

    const words = new Array(64);
    for (let chunk = 0; chunk < bytes.length; chunk += 64) {
      for (let i = 0; i < 16; i++) {
        const offset = chunk + i * 4;
        words[i] = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i++) {
        words[i] = (gamma1(words[i - 2]) + words[i - 7] + gamma0(words[i - 15]) + words[i - 16]) >>> 0;
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;
      let f = h5;
      let g = h6;
      let h = h7;

      for (let i = 0; i < 64; i++) {
        const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + words[i]) >>> 0;
        const t2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    const hexOf = val => (val >>> 0).toString(16).padStart(8, '0');
    return hexOf(h0) + hexOf(h1) + hexOf(h2) + hexOf(h3) + hexOf(h4) + hexOf(h5) + hexOf(h6) + hexOf(h7);
  }

  /**
   * Generate cryptographic salt string.
   */
  function generateSalt(len = 16) {
    const chars = '0123456789abcdef';
    let salt = '';
    for (let i = 0; i < len; i++) {
      const rnd = Math.floor(Math.random() * 16);
      salt += chars[rnd];
    }
    return salt;
  }

  /**
   * Salted iterated password hash (2048 rounds).
   */
  function hashPassword(password, salt, rounds = 2048) {
    if (!password) return '';
    if (!salt) salt = generateSalt();
    let cur = salt + ':' + password;
    for (let i = 0; i < rounds; i++) {
      cur = sha256(cur + ':' + salt);
    }
    return cur;
  }

  /**
   * Constant-time string comparison to resist timing attacks.
   */
  function constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  /**
   * Verify password against salt and expected iterated hash.
   */
  function verifyPassword(password, salt, expectedHash, rounds = 2048) {
    if (!password || !salt || !expectedHash) return false;
    const computed = hashPassword(password, salt, rounds);
    return constantTimeCompare(computed, expectedHash);
  }

  const CryptoEngine = {
    sha256,
    generateSalt,
    hashPassword,
    verifyPassword,
    constantTimeCompare
  };

  root.PUPSJ_Crypto = CryptoEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);


/* Original source: validate.js */
/**
 * PUPSJ PMS & POS — Centralized Entity Validation Schemas
 * Reused by UI components and service layer.
 */
(function(root) {
  'use strict';

  const WHITELISTED_PAGES = [
    'home.html', 'rooms-deals.html', 'menu.html', 'about.html',
    'contact.html', 'privacy.html', 'terms.html', 'login.html', 'guest-login.html',
    'guest-portal.html', 'dashboard.html', 'reservations.html',
    'guests.html', 'housekeeping.html', 'maintenance.html',
    'orders.html', 'kitchen.html', 'tables.html', 'menu-management.html',
    'messages.html', 'inquiries.html', 'feedback.html', 'payments.html',
    'reports.html', 'rooms.html', 'roomtypes.html', 'promotions.html',
    'employees.html', 'audit.html', 'settings.html'
  ];

  const PaymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'GCash',
    'Maya',
    'Bank Transfer',
    'Room Folio'
  ];

  function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email.trim());
  }

  function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const clean = phone.replace(/[^0-9+]/g, '');
    // PH mobile: +63 9XX XXX XXXX (13 chars) or 09XX XXX XXXX (11 digits)
    return /^(\+639\d{9}|09\d{9})$/.test(clean);
  }

  function validatePassword(password) {
    if (!password || typeof password !== 'string') return false;
    // At least 8 characters, must contain at least 1 letter and 1 digit
    return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
  }

  function validateReturnUrl(url, defaultTarget = '../guest/guest-portal.html') {
    if (!url || typeof url !== 'string') return defaultTarget;
    const trimmed = url.trim();

    // Reject any backslash (anti-open redirect bypass)
    if (trimmed.includes('\\')) return defaultTarget;
    // Reject explicit schemes or protocol-relative starts
    if (/^(https?:|file:|javascript:|data:|blob:)/i.test(trimmed)) return defaultTarget;
    if (trimmed.startsWith('//')) return defaultTarget;

    try {
      // Resolve against current base
      const base = typeof location !== 'undefined' ? location.href : 'http://localhost/pages/auth/guest-login.html';
      const resolved = new URL(trimmed, base);

      // Extract path and basename
      const pathname = resolved.pathname.replace(/\\/g, '/');
      const parts = pathname.split('/');
      const filename = parts.pop() || '';

      if (WHITELISTED_PAGES.includes(filename)) {
        // Return sanitized relative or path-only
        return trimmed;
      }
    } catch (e) {
      return defaultTarget;
    }
    return defaultTarget;
  }

  function validateGuest(data) {
    const errors = {};
    if (!data.name || !data.name.trim()) errors.name = 'Full name is required.';
    if (data.email && !validateEmail(data.email)) errors.email = 'Valid email address required.';
    if (data.phone && !validatePhone(data.phone)) errors.phone = 'Valid PH mobile number required (+63 9XX or 09XX).';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateReservation(data, isCheckIn = false) {
    const errors = {};
    if (!data.typeId && !data.t) errors.typeId = 'Room type is required.';
    if (!data.ci) errors.ci = 'Check-in date is required.';
    if (!data.co) errors.co = 'Check-out date is required.';
    if (data.ci && data.co && data.co <= data.ci) errors.co = 'Check-out date must be strictly after check-in.';
    if (!data.g || Number(data.g) < 1) errors.g = 'At least 1 guest required.';

    if (isCheckIn || data.source === 'Walk-in') {
      if (!data.idType || !data.idType.trim()) errors.idType = 'Government ID type required for check-in.';
      if (!data.idNumber || !data.idNumber.trim()) errors.idNumber = 'Government ID number required for check-in.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validatePayment(data) {
    const errors = {};
    if (!data.method || !PaymentMethods.includes(data.method)) {
      errors.method = 'Valid payment method required (' + PaymentMethods.join(', ') + ').';
    }
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.amount = 'Payment amount must be greater than zero.';
    }
    if (!data.refId && !data.code) {
      errors.refId = 'Reference ID (Reservation or Order) is required.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateOrder(data) {
    const errors = {};
    if (!['Dine-in', 'In-room', 'Takeaway'].includes(data.type)) {
      errors.type = 'Order type must be Dine-in, In-room, or Takeaway.';
    }
    if (data.type === 'Dine-in' && !data.tableNo) {
      errors.tableNo = 'Table number required for Dine-in orders.';
    }
    if (data.type === 'In-room' && !data.roomNo) {
      errors.roomNo = 'Room number required for In-room dining.';
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.items = 'Order must contain at least one item.';
    } else {
      data.items.forEach((item, idx) => {
        if (!item.name || !item.price || item.qty <= 0) {
          errors['item_' + idx] = 'Invalid line item at index ' + idx;
        }
      });
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateTableRes(data) {
    const errors = {};
    if (!data.date) errors.date = 'Reservation date required.';
    if (!data.time) errors.time = 'Reservation time required.';
    if (!data.party || Number(data.party) < 1) errors.party = 'Party size must be at least 1.';
    if (!data.name || !data.name.trim()) errors.name = 'Contact guest name required.';
    if (!data.phone || !validatePhone(data.phone)) errors.phone = 'Valid contact phone required.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateMaintenance(data) {
    const errors = {};
    if (!data.room) errors.room = 'Room number required.';
    if (!data.issue || !data.issue.trim()) errors.issue = 'Issue description required.';
    if (!['Urgent', 'High', 'Medium', 'Low'].includes(data.priority)) {
      errors.priority = 'Priority must be Urgent, High, Medium, or Low.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateHousekeeping(data) {
    const errors = {};
    if (!data.room) errors.room = 'Room number required.';
    if (!['Dirty', 'In progress', 'Clean', 'Inspected'].includes(data.status)) {
      errors.status = 'Status must be Dirty, In progress, Clean, or Inspected.';
    }
    if (data.priority && !['Urgent', 'High', 'Medium', 'Low'].includes(data.priority)) {
      errors.priority = 'Priority must be Urgent, High, Medium, or Low.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateMenuItem(data) {
    const errors = {};
    if (!data.name || !data.name.trim()) errors.name = 'Item name required.';
    if (!data.category || !data.category.trim()) errors.category = 'Category required.';
    if (typeof data.price !== 'number' || data.price <= 0) errors.price = 'Valid positive price required.';
    if (data.station && !['Kitchen'].includes(data.station)) errors.station = 'Station must be Kitchen.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validatePromo(data) {
    const errors = {};
    if (!data.code || !data.code.trim()) errors.code = 'Promo code required.';
    if (!data.title || !data.title.trim()) errors.title = 'Promo title required.';
    if (!['percent', 'fixed', 'folio-credit'].includes(data.type)) {
      errors.type = 'Type must be percent, fixed, or folio-credit.';
    }
    if (typeof data.value !== 'number' || data.value <= 0) errors.value = 'Positive value required.';
    if (data.type === 'percent' && data.value > 100) errors.value = 'Percentage discount cannot exceed 100%.';
    if (data.validFrom && data.validTo && data.validTo < data.validFrom) {
      errors.validTo = 'Valid-to date cannot precede valid-from date.';
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const Validators = {
    WHITELISTED_PAGES,
    PaymentMethods,
    validateEmail,
    validatePhone,
    validatePassword,
    validateReturnUrl,
    validateGuest,
    validateReservation,
    validatePayment,
    validateOrder,
    validateTableRes,
    validateMaintenance,
    validateHousekeeping,
    validateMenuItem,
    validatePromo
  };

  root.PUPSJ_Validators = Validators;
  root.validateReturnUrl = validateReturnUrl;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
  }
})(typeof window !== 'undefined' ? window : globalThis);


/* Original source: core.js */
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
    ['Guarantee Deposit', '50% down payment secures your booking with instant official tax receipt'],
    ['Cancellation Terms', 'Free cancellation up to 3 days before arrival. Cancellations made less than 3 days before arrival are refunded less a 30% deduction. No-shows are not refunded.'],
    ['Payment Settlement', 'Credit cards, GCash, Maya, and Bank transfer (online banking / QR Ph) with instant confirmation and official BIR invoice'],
    ['Prices & Levies', 'All posted accommodation and dining prices include 12% VAT and 10% service charge']
  ],
  tax: {
    vatPct: 12,
    svcPct: 10
  },
  depositPct: 50,
  holdMinutes: 15,
  bankHoldMinutes: 30,
  maxPayAttempts: 3,
  freeCancelDays: 3,
  lateCancelFeePct: 30,
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
  if (typeof store !== 'undefined' && store.get) {
    const bd = store.get('businessDate', null);
    if (bd && typeof bd === 'string' && bd.length === 10) return bd;
  }
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

// Computes itemized tax components (configured training tax breakdown)
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
        <div class="modal-title-wrap">
          <h3>${safeTitle}</h3>
          ${options.subtitle ? `<div class="modal-subtitle">${options.subtitle}</div>` : ''}
        </div>
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

// ─── Canonical Money & Currency Precision Helper ───
const Money = {
  round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  },
  ceilCentavo(n) {
    return Math.ceil((Number(n) || 0) * 100) / 100;
  },
  floorCentavo(n) {
    return Math.floor((Number(n) || 0) * 100) / 100;
  },
  format(n) {
    return typeof peso === 'function' ? peso(n) : '₱' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
};
if (typeof window !== 'undefined') window.Money = Money;

// ─── Single Canonical Stay Pricing Engine ───
const calculateStayPricing = (params) => {
  if (typeof PricingService !== 'undefined' && typeof PricingService.quote === 'function') {
    return PricingService.quote(params);
  }
  const { baseRate, nights, promo } = params || {};
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
  const depPct = (typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50;
  const depDue = Money.ceilCentavo(netTotal * (depPct / 100));
  const balDue = Money.round2(netTotal - depDue);
  const taxes = taxBreakdown(netTotal);

  return {
    nights: nts,
    rate,
    baseTotal,
    discount,
    netTotal,
    total: netTotal,
    depositPct: depPct,
    depositRequired: depDue,
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

  // Cross-tab real-time sync via storage event
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('pupsj.')) {
      window.dispatchEvent(new CustomEvent('pupsj:data-change', { detail: { crossTab: true, key: e.key } }));
    }
  });
}


// The original UI keeps its synchronous view models, but records and permissions
// are hydrated from Laravel. No browser database or client-side login is trusted.
const Original = JSON.parse(document.getElementById('original-bootstrap').textContent);
let originalData = Original.data;
const originalCopy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const originalBase = document.querySelector('meta[name="hrms-base"]').content.replace(/\/$/,'');
const originalCSRF = document.querySelector('meta[name="csrf-token"]').content;
function originalRequest(path,method='GET',body=null){
 const xhr=new XMLHttpRequest();xhr.open(method,originalBase+path,false);xhr.setRequestHeader('Accept','application/json');xhr.setRequestHeader('X-CSRF-TOKEN',document.querySelector('meta[name="csrf-token"]').content);
 if(body!==null){xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(body));}else xhr.send();
 let result;try{result=JSON.parse(xhr.responseText);}catch{throw Error('The server could not complete this action.');}
 if(xhr.status<200||xhr.status>=300)throw Error(result.errors?Object.values(result.errors).flat().join(' '):(result.message||'Action not permitted.'));
 return result;
}
function originalReload(){const next=originalRequest('/api/original/snapshot');originalData=next.data;Original.user=next.user;Original.serverRole=next.serverRole;}
store.get=(key,fallback)=>originalCopy(Object.hasOwn(originalData,key)?originalData[key]:fallback);
store.set=(key,value)=>{
 if(key==='config_overrides'){originalRequest('/api/original/config','POST',{config:value});originalData[key]=originalCopy(value);return;}
 const transient=['seq','sequences','notifSeenIds','guestNotifSeenIds','notifications','configOverrides','nightAuditHistory'];
 if(transient.includes(key)||key.startsWith('_ui')||key.startsWith('seq')){originalData[key]=originalCopy(value);return;}
 throw Error('Use the saved server action for this change; browser-only records are disabled.');
};
store.remove=key=>{if(key.startsWith('session')||key.startsWith('_ui'))delete originalData[key];};
CONFIG.demoLogins=false;
CONFIG.policies=CONFIG.policies.filter(([name])=>!['Guarantee Deposit','Payment Settlement','Prices & Levies'].includes(name));
CONFIG.policies.push(['Special Requests','Subject to availability and confirmation'],['Payments','Optional deposit; cash or PayMongo test QR Ph / debit / credit card']);
CONFIG.depositPct=Number(originalData.policy.deposit_percent);
CONFIG.hotelName='PUPSJ Hotel & Restaurant';

const amenityPhotos=originalData.amenityPhotos||{};
CONFIG.amenities=CONFIG.amenities.map(a=>({...a,photo:amenityPhotos[/pool/i.test(a.name)?'pool':/restaurant|dining/i.test(a.name)?'dining':/spa|wellness/i.test(a.name)?'spa':/fitness|gym/i.test(a.name)?'gym':/lounge/i.test(a.name)?'club':'']||null}));


/* Original source: data.js */
/* ==========================================================================
   PUPSJ Hotel & Restaurant — Data & Domain Layer (data.js)
   Canonical data contract, schema migration, dynamic seeds, central business
   rules, folios, restaurant operations, loyalty, audit, and notifications.
   ========================================================================== */
'use strict';

// ─── SECURITY NOTICE (Educational / Demo System) ───
// This application is designed for demonstration and educational purposes.
// Passwords and sessions are managed client-side in localStorage for standalone
// execution without external backend servers. In production, passwords must be
// hashed server-side (bcrypt/Argon2) and authenticated via secure HTTP-only cookies.

const SCHEMA_VERSION = 4;

// ─── Default Canonical Room Types ───
const DEFAULT_TYPES = [
  {
    id: 'TYP-1',
    n: 'Standard',
    r: 3200,
    g: 2,
    b: 101,
    c: 10,
    desc: 'Comfortable contemporary room featuring a queen bed, ergonomic work desk, and San Juan city views.',
    amenities: ['Queen Bed', 'Rain Shower', 'High-Speed Wi-Fi', '43" Smart TV', 'Work Desk', 'Tea & Coffee Station']
  },
  {
    id: 'TYP-2',
    n: 'Deluxe City View',
    r: 5800,
    g: 3,
    b: 201,
    c: 12,
    desc: 'Spacious accommodation with plush king bed, deep soaking bath, and private panoramic city skyline balcony.',
    amenities: ['King Bed', 'City View Balcony', 'Deep Soaking Tub', 'High-Speed Wi-Fi', '55" Smart TV', 'Buffet Breakfast']
  },
  {
    id: 'TYP-3',
    n: 'Family Suite',
    r: 8900,
    g: 5,
    b: 301,
    c: 10,
    desc: 'Two-bedroom residence with separate living lounge, dining nook, and kitchenette for families and groups.',
    amenities: ['Two Bedrooms (King + Twin)', 'Living Room', 'Kitchenette', '2 En-Suite Bathrooms', 'Dining Table']
  },
  {
    id: 'TYP-4',
    n: 'Executive Suite',
    r: 12500,
    g: 3,
    b: 501,
    c: 6,
    desc: 'Top-floor sanctuary with master suite, lounge, private terrace hot tub, and dedicated concierge service.',
    amenities: ['Master King Suite', 'Terrace Hot Tub', 'Executive Lounge Access', 'Butler Pantry', 'Valet Privileges']
  }
];

// Helper to generate room inventory from types
const generateRoomsFromTypes = types => {
  return types.flatMap(t => {
    const base = Number(t.b || 101);
    const count = Number(t.c || 5);
    return Array.from({ length: count }, (_, k) => ({ n: base + k, t: t.n }));
  });
};

// ─── Initial Dynamic Seed Generator (Always relative to local today()) ───
const generateSeeds = () => {
  const T = today();

  const types = DEFAULT_TYPES;
  const rooms = generateRoomsFromTypes(types);

  // Housekeeping state: Room 501 is dirty (checked out), 201/305/108 clean
  const hk = {
    501: { s: 'Dirty', p: 'Urgent', a: 4, assignedName: 'Liza Gomez' },
    201: { s: 'Clean', p: '', a: 0, assignedName: '' },
    305: { s: 'Clean', p: '', a: 0, assignedName: '' },
    108: { s: 'Clean', p: '', a: 0, assignedName: '' }
  };

  // Staff accounts
  const staff = [
    { id: 1, name: 'Ruben Herwitz', email: 'ruben@pupsj.edu.ph', department: 'Management', role: 'Management', shift: 'Day', phone: '+63 917 100 0001', active: true, created: '2026-01-15' },
    { id: 2, name: 'Maria Santos', email: 'maria@pupsj.edu.ph', department: 'Front Desk', role: 'Front Desk', shift: 'Day', phone: '+63 917 100 0002', active: true, created: '2026-02-01' },
    { id: 3, name: 'John Reyes', email: 'john@pupsj.edu.ph', department: 'Front Desk', role: 'Front Desk', shift: 'Night', phone: '+63 917 100 0003', active: true, created: '2026-02-01' },
    { id: 4, name: 'Liza Gomez', email: 'liza@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0004', active: true, created: '2026-03-10' },
    { id: 5, name: 'Pedro Cruz', email: 'pedro@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Day', phone: '+63 917 100 0005', active: true, created: '2026-03-10' },
    { id: 6, name: 'Ana Bautista', email: 'ana@pupsj.edu.ph', department: 'Housekeeping', role: 'Housekeeping', shift: 'Night', phone: '+63 917 100 0006', active: true, created: '2026-04-05' },
    { id: 7, name: 'Carlo Navarro', email: 'carlo@pupsj.edu.ph', department: 'Maintenance', role: 'Maintenance', shift: 'Day', phone: '+63 917 100 0007', active: true, created: '2026-05-20' },
    { id: 8, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', department: 'Restaurant', role: 'Restaurant Receptionist', shift: 'Day', phone: '+63 917 100 0009', active: true, created: '2026-06-01' },
    { id: 9, name: 'Ben Aquino', email: 'ben@pupsj.edu.ph', department: 'Security', role: 'Security', shift: 'Night', phone: '+63 917 100 0008', active: true, created: '2026-06-01' }
  ];

  const adminAccounts = [
    {
      adminId: 'ADM-001',
      name: 'Superadmin',
      email: 'admin@pupsj.edu.ph',
      salt: 'a1f8c49e2b704d5a',
      passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d',
      role: 'superadmin'
    }
  ];

  // Canonical Dynamic Reservations relative to today()
  const res = [
    {
      c: 'HTL-2041',
      g: 'Ana Dela Cruz',
      t: 'Deluxe City View',
      n: 201,
      i: T,
      o: addDays(T, 3),
      gu: 2,
      ph: '+63 917 000 0001',
      email: 'ana.delacruz@example.com',
      m: 'GCash',
      p: 'Paid',
      st: 'Confirmed',
      note: 'Anniversary stay – quiet room preferred',
      rt: 5800,
      promo: null,
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
      created: addDays(T, -2),
      pay: [{ id: 'OR-00041', d: addDays(T, -2), a: 17400, m: 'GCash', k: 'Payment', ref: 'GC-9824108', auth: 'AUTH-982410', note: 'Advance booking paid in full' }],
      x: []
    },
    {
      c: 'HTL-2042',
      g: 'Liam Carter',
      t: 'Family Suite',
      n: 305,
      i: addDays(T, -2),
      o: addDays(T, 3),
      gu: 4,
      ph: '+63 917 000 0002',
      email: 'liam.carter@example.com',
      m: 'Credit card',
      p: 'Partial',
      st: 'Checked-in',
      note: 'Extra rollaway pillows requested',
      rt: 8900,
      promo: null,
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
      created: addDays(T, -4),
      pay: [{ id: 'OR-00042', d: addDays(T, -2), a: 22250, m: 'Credit card', k: 'Deposit', auth: 'AUTH-892140', note: '50% guarantee deposit' }],
      x: [{ id: 101, d: addDays(T, -1), desc: 'Restaurant: ORD-1001', amt: 1630, cat: 'Dining' }]
    },
    {
      c: 'HTL-2038',
      g: 'Mei Chen',
      t: 'Standard',
      n: 108,
      i: addDays(T, -1),
      o: addDays(T, 2),
      gu: 1,
      ph: '+63 917 000 0003',
      email: 'mei.chen@example.com',
      m: 'Credit card',
      p: 'Paid',
      st: 'Checked-in',
      note: 'Late night arrival',
      rt: 3200,
      promo: null,
      source: 'Walk-in',
      createdBy: { id: 2, name: 'Maria Santos', role: 'Front Desk' },
      idType: "Driver's License",
      idNumber: 'N01-18-984210',
      created: addDays(T, -3),
      pay: [{ id: 'OR-00038', d: addDays(T, -1), a: 9600, m: 'Credit card', k: 'Payment', auth: 'AUTH-341902', note: 'Front desk check-in settlement' }],
      x: []
    },
    {
      c: 'HTL-2035',
      g: 'Carlos Mendoza',
      t: 'Executive Suite',
      n: 501,
      i: addDays(T, -4),
      o: addDays(T, -1),
      gu: 2,
      ph: '+63 917 000 0004',
      email: 'carlos.mendoza@example.com',
      m: 'Credit card',
      p: 'Paid',
      st: 'Checked-out',
      note: 'Executive airport transfer arranged',
      rt: 12500,
      promo: null,
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
      created: addDays(T, -6),
      pay: [{ id: 'OR-00035', d: addDays(T, -4), a: 37500, m: 'Credit card', k: 'Payment', auth: 'AUTH-129480', note: 'Full stay settled' }],
      x: []
    },
    {
      c: 'HTL-2044',
      g: 'Sofia Perez',
      t: 'Deluxe City View',
      n: 210,
      i: addDays(T, 2),
      o: addDays(T, 5),
      gu: 2,
      ph: '+63 917 000 0005',
      email: 'sofia.perez@example.com',
      m: 'Cash',
      p: 'Unpaid',
      st: 'Pending',
      note: 'Awaiting cash deposit upon front desk arrival',
      rt: 5800,
      promo: null,
      source: 'Staff-assisted',
      createdBy: { id: 2, name: 'Maria Santos', role: 'Front Desk' },
      idType: 'Passport',
      idNumber: 'P8921401B',
      created: addDays(T, -1),
      pay: [],
      x: []
    },
    {
      c: 'HTL-2030',
      g: 'Kenji Tanaka',
      t: 'Standard',
      n: 104,
      i: addDays(T, -5),
      o: addDays(T, -3),
      gu: 1,
      ph: '+63 917 000 0006',
      email: 'kenji.tanaka@example.com',
      m: 'GCash',
      p: 'Refunded',
      st: 'Cancelled',
      note: 'Flight cancellation',
      rt: 3200,
      promo: null,
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
      created: addDays(T, -8),
      pay: [
        { id: 'OR-00030', d: addDays(T, -8), a: 6400, m: 'GCash', k: 'Payment', ref: 'GC-1029410', note: 'Advance booking' },
        { id: 'OR-00031', d: addDays(T, -6), a: 6400, m: 'GCash', k: 'Refund', ref: 'GC-1029410-REF', note: 'Free cancellation refund' }
      ],
      x: []
    },
    {
      c: 'HTL-2046',
      g: 'Grace Villanueva',
      t: 'Family Suite',
      n: 308,
      i: addDays(T, 5),
      o: addDays(T, 9),
      gu: 4,
      ph: '+63 917 000 0007',
      email: 'grace.v@example.com',
      m: 'GCash',
      p: 'Paid',
      st: 'Confirmed',
      note: 'Family holiday stay',
      rt: 8900,
      promo: null,
      source: 'Online',
      createdBy: null,
      idType: '',
      idNumber: '',
      created: addDays(T, -1),
      pay: [{ id: 'OR-00046', d: addDays(T, -1), a: 35600, m: 'GCash', k: 'Payment', ref: 'GC-7749102', note: 'Paid in full via GCash' }],
      x: []
    }
  ];

  // Promotions Store
  const promos = [
    {
      code: 'GOURMET25',
      title: 'Grand Degustation Dinner',
      description: '25% discount on set tasting dinner menu for restaurant dining guests.',
      appliesTo: 'restaurant',
      type: 'percent',
      value: 25,
      minNights: 0,
      minSpend: 1200,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 14,
      usedCount: 14,
      limit: 100,
      usageLimit: 100,
      active: true
    },
    {
      code: 'BRUNCH41',
      title: 'Weekend Brunch Special',
      description: '₱650 dining credit towards table parties of four or more during weekend brunch.',
      appliesTo: 'restaurant',
      type: 'fixed',
      value: 650,
      minNights: 0,
      minSpend: 2000,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 8,
      usedCount: 8,
      limit: 50,
      usageLimit: 50,
      active: true
    },
    {
      code: 'SUNSETBOGO',
      title: 'Sunset Appetizers & Beverages',
      description: '50% off appetizer tapas boards when ordering two or more beverages.',
      appliesTo: 'restaurant',
      type: 'percent',
      value: 50,
      minNights: 0,
      minSpend: 400,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 22,
      usedCount: 22,
      limit: 150,
      usageLimit: 150,
      active: true
    },
    {
      code: 'DINESTAY',
      title: 'In-Room Dining Stay Credit',
      description: '₱1,500 complimentary dining allowance credited to room folio on 3+ night bookings.',
      appliesTo: 'rooms',
      type: 'credit',
      value: 1500,
      minNights: 3,
      minSpend: 0,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 5,
      usedCount: 5,
      limit: 40,
      usageLimit: 40,
      active: true
    },
    {
      code: 'WELCOME10',
      title: 'Direct Booking Privilege',
      description: '10% room accommodation discount for direct web reservations.',
      appliesTo: 'rooms',
      type: 'percent',
      value: 10,
      minNights: 1,
      minSpend: 0,
      validFrom: addDays(T, -30),
      validTo: addDays(T, 60),
      used: 31,
      usedCount: 31,
      limit: 200,
      usageLimit: 200,
      active: true
    }
  ];

  // Restaurant Menu
  const menu = [
    { id: 'MNU-101', name: 'Traditional Filipino Breakfast', category: 'Breakfast', desc: 'Garlic sinangag rice, sunny-side eggs, and homemade beef tapa with pickled papaya.', price: 420, available: true, station: 'Kitchen', tags: ['Breakfast', 'Local Favorite'] },
    { id: 'MNU-102', name: 'Brioche French Toast', category: 'Breakfast', desc: 'Thick artisan brioche dipped in vanilla custard, served with honeycomb butter and maple syrup.', price: 380, available: true, station: 'Kitchen', tags: ['Breakfast', 'Sweet'] },
    { id: 'MNU-103', name: 'Fresh Continental Fruit & Pastry Basket', category: 'Breakfast', desc: 'Seasonal tropical fruits, warm butter croissants, Danish pastries, and guava jam.', price: 350, available: true, station: 'Kitchen', tags: ['Breakfast', 'Light'] },

    { id: 'MNU-201', name: 'Lumpiang Sariwa (Fresh Spring Rolls)', category: 'Starters', desc: 'Heart of palm and vegetables wrapped in homemade crepe with sweet peanut garlic sauce.', price: 290, available: true, station: 'Kitchen', tags: ['Starter', 'Vegetarian'] },
    { id: 'MNU-202', name: 'Crispy Calamari Fritti', category: 'Starters', desc: 'Lightly dusted tender squid with sinamak spiced coconut vinegar and garlic aioli.', price: 360, available: true, station: 'Kitchen', tags: ['Starter', 'Seafood'] },
    { id: 'MNU-203', name: 'Roasted Wild Mushroom Velouté', category: 'Starters', desc: 'Cream of forest mushrooms finished with truffle oil and herb croutons.', price: 320, available: true, station: 'Kitchen', tags: ['Starter', 'Soup'] },

    { id: 'MNU-301', name: 'US Angus Ribeye Steak (250g)', category: 'Mains', desc: 'Char-grilled prime beef served with garlic mashed potatoes, roasted vegetables, and peppercorn jus.', price: 1450, available: true, station: 'Kitchen', tags: ['Main', 'Chef Signature'] },
    { id: 'MNU-302', name: 'Crispy Pork Belly Kare-Kare', category: 'Mains', desc: 'Slow-braised pork belly in rich toasted peanut annatto sauce with native vegetables and shrimp paste.', price: 620, available: true, station: 'Kitchen', tags: ['Main', 'Filipino Classic'] },
    { id: 'MNU-303', name: 'Sinigang na Salmon Belly sa Miso', category: 'Mains', desc: 'Salmon belly in sour tamarind miso broth with water spinach, radish, and long peppers.', price: 680, available: true, station: 'Kitchen', tags: ['Main', 'Seafood'] },
    { id: 'MNU-304', name: 'Truffle Mushroom Risotto', category: 'Mains', desc: 'Creamy arborio rice with sauteed portobello, parmesan crisps, and white truffle essence.', price: 580, available: true, station: 'Kitchen', tags: ['Main', 'Vegetarian'] },

    { id: 'MNU-401', name: 'PUPSJ Halo-Halo Special', category: 'Desserts', desc: 'Shaved ice with candied fruits, ube halaya, leche flan, and artisanal ube gelato.', price: 280, available: true, station: 'Kitchen', tags: ['Dessert', 'Filipino Classic'] },
    { id: 'MNU-402', name: 'Mango Tres Leches Cake', category: 'Desserts', desc: 'Sponge cake soaked in three milks, layered with sweet Carabao mango coulis.', price: 260, available: true, station: 'Kitchen', tags: ['Dessert', 'Sweet'] },
    { id: 'MNU-403', name: 'Warm Batangas Tablea Fondant', category: 'Desserts', desc: 'Molten dark chocolate cake crafted from native cacao tablea with vanilla bean cream.', price: 310, available: true, station: 'Kitchen', tags: ['Dessert', 'Chocolate'] },

    { id: 'MNU-501', name: 'Fresh Ripe Mango Shake', category: 'Drinks', desc: 'Chilled ripe Philippine mango blended with organic milk.', price: 180, available: true, station: 'Kitchen', tags: ['Drink', 'Fresh'] },
    { id: 'MNU-502', name: 'Calamansi Honey Cooler', category: 'Drinks', desc: 'Freshly pressed local citrus with raw wild honey and fresh mint leaves.', price: 160, available: true, station: 'Kitchen', tags: ['Drink', 'Non-Alcoholic'] },
    { id: 'MNU-503', name: 'Barista Latte / Cappuccino', category: 'Drinks', desc: 'Locally sourced single-origin Arabica espresso with steamed whole milk.', price: 170, available: true, station: 'Kitchen', tags: ['Drink', 'Coffee'] },
    { id: 'MNU-504', name: 'Lemongrass Ginger Iced Tea', category: 'Drinks', desc: 'Fresh brewed native lemongrass and ginger infused with pandan and raw honey.', price: 160, available: true, station: 'Kitchen', tags: ['Drink', 'Fresh'] }
  ];

  // Restaurant Tables (num as Number, status, area)
  const tables = [
    { id: 'TBL-1', num: 1, name: 'Table 1', seats: 2, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-2', num: 2, name: 'Table 2', seats: 4, area: 'Main Dining', status: 'Occupied', st: 'Occupied' },
    { id: 'TBL-3', num: 3, name: 'Table 3', seats: 4, area: 'Main Dining', status: 'Reserved', st: 'Reserved' },
    { id: 'TBL-4', num: 4, name: 'Table 4', seats: 6, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-5', num: 5, name: 'Table 5', seats: 2, area: 'Garden Terrace', status: 'Free', st: 'Free' },
    { id: 'TBL-6', num: 6, name: 'Table 6', seats: 4, area: 'Garden Terrace', status: 'Free', st: 'Free' },
    { id: 'TBL-7', num: 7, name: 'Table 7', seats: 8, area: 'Private Room', status: 'Free', st: 'Free' },
    { id: 'TBL-8', num: 8, name: 'Table 8', seats: 2, area: 'Main Dining', status: 'Free', st: 'Free' },
    { id: 'TBL-9', num: 9, name: 'Table 9', seats: 4, area: 'Main Dining', status: 'Free', st: 'Free' }
  ];

  // Table Reservations
  const tableRes = [
    {
      code: 'TRS-101',
      guestName: 'Roberto Gomez',
      guest: 'Roberto Gomez',
      phone: '+63 917 555 1234',
      date: T,
      time: '19:00',
      partySize: 4,
      party: 4,
      tableNum: 3,
      table: 3,
      tableId: 'TBL-3',
      status: 'Confirmed',
      notes: 'Window seating preferred',
      created: `${T} 10:00`
    },
    {
      code: 'TRS-102',
      guestName: 'Lucia Santos',
      guest: 'Lucia Santos',
      phone: '+63 918 333 4567',
      date: addDays(T, 1),
      time: '12:30',
      partySize: 2,
      party: 2,
      tableNum: 0,
      table: 0,
      tableId: '',
      status: 'Pending',
      notes: 'Birthday celebration',
      created: `${T} 11:30`
    }
  ];

  // Canonical Restaurant Orders (Split kitchen status & payStatus)
  const orders = [
    {
      code: 'ORD-1001',
      type: 'In-room',
      target: 'Room 305',
      room: 305,
      table: '',
      resCode: 'HTL-2042',
      linkedRes: 'HTL-2042',
      lines: [
        { id: 'MNU-301', name: 'US Angus Ribeye Steak (250g)', qty: 1, unitPrice: 1450, price: 1450, note: 'Medium rare' },
        { id: 'MNU-501', name: 'Fresh Ripe Mango Shake', qty: 1, unitPrice: 180, price: 180, note: 'Less sugar' }
      ],
      subtotal: 1630,
      status: 'Served',
      payStatus: 'Room folio',
      paymentKind: 'Room Folio',
      created: `${T} 12:15`,
      updated: `${T} 12:45`
    },
    {
      code: 'ORD-1002',
      type: 'Dine-in',
      target: 'Table 2',
      room: '',
      table: 2,
      resCode: '',
      linkedRes: '',
      lines: [
        { id: 'MNU-302', name: 'Crispy Pork Belly Kare-Kare', qty: 1, unitPrice: 620, price: 620, note: '' },
        { id: 'MNU-303', name: 'Sinigang na Salmon Belly sa Miso', qty: 1, unitPrice: 680, price: 680, note: '' },
        { id: 'MNU-401', name: 'PUPSJ Halo-Halo Special', qty: 2, unitPrice: 280, price: 280, note: '' }
      ],
      subtotal: 1860,
      status: 'Preparing',
      payStatus: 'Unpaid',
      paymentKind: 'Pending Settlement',
      created: `${T} 13:00`,
      updated: `${T} 13:05`
    },
    {
      code: 'ORD-1003',
      type: 'Dine-in',
      target: 'Table 1',
      room: '',
      table: 1,
      resCode: '',
      linkedRes: '',
      lines: [
        { id: 'MNU-304', name: 'Truffle Mushroom Risotto', qty: 1, unitPrice: 580, price: 580, note: 'Extra parmesan' },
        { id: 'MNU-502', name: 'Calamansi Honey Cooler', qty: 1, unitPrice: 160, price: 160, note: '' }
      ],
      subtotal: 740,
      status: 'New',
      payStatus: 'Unpaid',
      paymentKind: 'Pending Settlement',
      created: `${T} 13:10`,
      updated: `${T} 13:10`
    }
  ];

  // Guest Messages / Threads
  const threads = [
    {
      id: 'MSG-101',
      guestName: 'Liam Carter',
      guest: 'Liam Carter',
      contact: '+63 917 000 0002',
      resCode: 'HTL-2042',
      subject: 'Extra Pillows & Towels Request',
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${T} 11:20`,
      updatedAt: `${T} 11:20`,
      messages: [
        { sender: 'Liam Carter', role: 'guest', time: `${T} 11:15`, text: 'Hello, could we get two extra hypoallergenic pillows brought up to Room 305?' },
        { sender: 'Maria Santos', role: 'staff', time: `${T} 11:20`, text: 'Good morning Mr. Carter, housekeeping has been notified and will deliver them shortly.' }
      ]
    },
    {
      id: 'MSG-102',
      guestName: 'Eduardo Ramos',
      guest: 'Eduardo Ramos',
      contact: 'eduardo@example.com',
      resCode: '',
      subject: 'Inquiry regarding private dinner hosting',
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${T} 09:40`,
      updatedAt: `${T} 09:40`,
      messages: [
        { sender: 'Eduardo Ramos', role: 'guest', time: `${T} 09:40`, text: 'Good day. We would like to inquire if the Terrace area can host 12 guests for a private family dinner next Friday.' }
      ]
    }
  ];

  // Contact Inquiries
  const inquiries = [
    {
      ref: 'INQ-1001',
      id: 'INQ-1001',
      name: 'Atty. Roberto Gomez',
      email: 'roberto.gomez@lawfirm.ph',
      phone: '+63 917 222 3344',
      type: 'Corporate Group & Conference Inquiry',
      message: 'Requesting room allocation and meeting room package for 18 attorneys attending a 2-day conference next month.',
      status: 'New',
      staffNotes: '',
      notes: '',
      assignedTo: 'Ruben Herwitz',
      assigned: 'Ruben Herwitz',
      created: `${T} 10:30`
    },
    {
      ref: 'INQ-1002',
      id: 'INQ-1002',
      name: 'Clarissa Tan',
      email: 'clarissa.tan@gmail.com',
      phone: '+63 918 888 7766',
      type: 'Suite Reservation & Room Upgrade',
      message: 'Looking to book a Family Suite for our wedding anniversary with special floral arrangement.',
      status: 'In progress',
      staffNotes: 'Sent quotation via email',
      notes: 'Sent quotation via email',
      assignedTo: 'Maria Santos',
      assigned: 'Maria Santos',
      created: addDays(T, -1) + ' 15:45'
    }
  ];

  // Housekeeping Requests
  const hkReq = [
    {
      id: 'HKR-101',
      room: 305,
      guestName: 'Liam Carter',
      resCode: 'HTL-2042',
      item: 'Extra Pillows & Towels',
      notes: 'Hypoallergenic pillows',
      status: 'In progress',
      st: 'In progress',
      assignedTo: 'Liza Gomez',
      assigned: 'Liza Gomez',
      created: `${T} 11:15`,
      updated: `${T} 11:20`
    }
  ];

  // Maintenance Requests
  const mReq = [
    {
      id: 'MNT-101',
      room: 501,
      issue: 'Balcony door latch loose and needs realignment',
      priority: 'Medium',
      pri: 'Medium',
      status: 'Open',
      st: 'Open',
      assignedTo: 'Carlo Navarro',
      assigned: 'Carlo Navarro',
      outOfService: true,
      oos: true,
      notes: 'Scheduled for adjustment today',
      created: `${T} 08:30`,
      resolved: ''
    }
  ];

  // Guest Feedback & Reviews
  const feedback = [
    {
      id: 'FB-101',
      resCode: 'HTL-2035',
      guestName: 'Carlos Mendoza',
      guest: 'Carlos Mendoza',
      roomType: 'Executive Suite',
      ratingOverall: 5,
      rating: 5,
      ratingCleanliness: 5,
      ratingStaff: 5,
      ratingComfort: 5,
      ratingDining: 4,
      ratingValue: 5,
      comment: 'Exceptional hospitality and serene stay in San Juan. The room was immaculate and check-in was seamless.',
      staffReply: 'Thank you Mr. Mendoza. We look forward to welcoming you back soon.',
      reply: 'Thank you Mr. Mendoza. We look forward to welcoming you back soon.',
      published: true,
      created: addDays(T, -1),
      date: addDays(T, -1)
    },
    {
      id: 'FB-102',
      resCode: 'HTL-2030',
      guestName: 'Patricia Lim',
      guest: 'Patricia Lim',
      roomType: 'Deluxe City View',
      ratingOverall: 4,
      rating: 4,
      ratingCleanliness: 5,
      ratingStaff: 5,
      ratingComfort: 4,
      ratingDining: 4,
      ratingValue: 4,
      comment: 'Very peaceful ambiance and pleasant dining at the restaurant. Prompt room service.',
      staffReply: 'Thank you for your valuable feedback, Ms. Lim.',
      reply: 'Thank you for your valuable feedback, Ms. Lim.',
      published: true,
      created: addDays(T, -6),
      date: addDays(T, -6)
    }
  ];

  // Guest Accounts
  const guestAccounts = [
    {
      email: 'ana.delacruz@example.com',
      password: 'password123',
      name: 'Ana Dela Cruz',
      phone: '+63 917 000 0001',
      created: '2026-01-10'
    },
    {
      email: 'liam.carter@example.com',
      password: 'password123',
      name: 'Liam Carter',
      phone: '+63 917 000 0002',
      created: '2026-02-14'
    },
    {
      email: 'carlos.mendoza@example.com',
      password: 'password123',
      name: 'Carlos Mendoza',
      phone: '+63 917 000 0004',
      created: '2026-02-20'
    },
    {
      email: 'kenji.tanaka@example.com',
      password: 'password123',
      name: 'Kenji Tanaka',
      phone: '+63 917 000 0006',
      created: '2026-03-01'
    }
  ];

  // Real Loyalty Ledger
  const loyalty = [
    {
      id: 'LOY-101',
      guestName: 'Carlos Mendoza',
      points: 375,
      type: 'earn',
      ref: 'HTL-2035',
      notes: 'Executive Suite 3-night stay settlement',
      date: addDays(T, -1)
    }
  ];

  // Audit Trail
  const audit = [
    { id: 1, time: `${T} 08:30`, user: 'Carlo Navarro', action: 'Created maintenance request', recordType: 'Maintenance', type: 'Maintenance', recordId: 'MNT-101', idVal: 'MNT-101', details: 'Room 501 door latch' },
    { id: 2, time: `${T} 11:20`, user: 'Maria Santos', action: 'Assigned housekeeping request', recordType: 'Housekeeping', type: 'Housekeeping', recordId: 'HKR-101', idVal: 'HKR-101', details: 'Room 305 extra pillows' },
    { id: 3, time: `${T} 12:45`, user: 'Rechelle Cansila', action: 'Updated restaurant order', recordType: 'Order', type: 'Order', recordId: 'ORD-1001', idVal: 'ORD-1001', details: 'Billed to Room 305 folio' }
  ];

  return {
    schema: SCHEMA_VERSION,
    types,
    rooms,
    hk,
    staff,
    res,
    promos,
    menu,
    tables,
    tableRes,
    orders,
    threads,
    inquiries,
    hkReq,
    mReq,
    feedback,
    guestAccounts,
    adminAccounts,
    guestProfiles: {},
    audit,
    notifSeen: { count: 0, time: '' },
    loyalty,
    bookingHolds: [],
    paymentIntents: []
  };
};

// ─── Data Layer Manager & Migration System ───
const Data = {
  emit(entity, action, detail) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        const CustomEventCls = typeof CustomEvent !== 'undefined' ? CustomEvent : (window && window.CustomEvent);
        if (CustomEventCls) {
          window.dispatchEvent(new CustomEventCls('pupsj:data-change', {
            detail: { entity, action, detail, timestamp: Date.now() }
          }));
        }
      } catch (e) { }
    }
  },
  runExpiryJobs() {
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
      PUPSJ_Services.HoldService.expire();
    }
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.ReservationService) {
      PUPSJ_Services.ReservationService.runExpiryJobs();
    }
  },
  getBusinessDate() {
    return store.get('businessDate', null);
  },
  setBusinessDate(newDate) {
    store.set('businessDate', newDate);
    this.emit('businessDate', 'update', { date: newDate });
  },
  resetBusinessDate() {
    store.remove('businessDate');
    this.emit('businessDate', 'reset', {});
  },

  // ─── Stores: Booking Holds & Payment Intents ───
  getBookingHolds() {
    return store.get('bookingHolds', []);
  },
  saveBookingHolds(list) {
    store.set('bookingHolds', list);
    this.emit('BookingHold', 'update', { count: list.length });
  },
  findHold(holdId) {
    return this.getBookingHolds().find(h => h.holdId === holdId || h.id === holdId) || null;
  },

  getPaymentIntents() {
    return store.get('paymentIntents', []);
  },
  savePaymentIntents(list) {
    store.set('paymentIntents', list);
    this.emit('PaymentIntent', 'update', { count: list.length });
  },
  findIntent(intentId) {
    return this.getPaymentIntents().find(i => i.intentId === intentId || i.id === intentId) || null;
  },

  // Initializes or migrates storage on startup (non-destructive)
  init() {
    const curSchema = store.get('schema', 0);
    const hasRes = store.get('res', null);

    if (!curSchema || !hasRes) {
      console.info('Initializing PUPSJ data schema to v' + SCHEMA_VERSION + '...');
      const fresh = generateSeeds();
      Object.entries(fresh).forEach(([k, v]) => {
        store.set(k, v);
      });
      return;
    }

    if (curSchema < SCHEMA_VERSION) {
      console.info(`Migrating PUPSJ data schema from v${curSchema} to v${SCHEMA_VERSION}...`);
      // Non-destructive migration for existing reservations
      const reservations = store.get('res', []);
      let changed = false;
      const defaultDepositPct = (typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50;

      reservations.forEach(r => {
        if (r.depositPct == null) {
          r.depositPct = defaultDepositPct;
          changed = true;
        }
        const tot = this.tot ? this.tot(r) : (r.total || (r.rt || 3200));
        if (r.depositRequired == null) {
          r.depositRequired = Math.ceil(tot * (r.depositPct / 100));
          changed = true;
        }
        const paid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
        if (r.depositPaid == null) {
          r.depositPaid = paid;
          changed = true;
        }
        if (r.balanceDue == null) {
          r.balanceDue = Math.max(0, tot - paid);
          changed = true;
        }
        if (!r.confirmedBy && (r.st === 'Confirmed' || r.st === 'Checked-in' || r.st === 'Checked-out')) {
          r.confirmedBy = 'System (migration)';
          changed = true;
        }
      });
      if (changed) store.set('res', reservations);

      if (!store.get('bookingHolds', null)) store.set('bookingHolds', []);
      if (!store.get('paymentIntents', null)) store.set('paymentIntents', []);
      store.set('schema', SCHEMA_VERSION);
      console.info(`Migration to v${SCHEMA_VERSION} complete.`);
    }
  },

  // Resets all data to clean default seeds
  resetDemo() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('pupsj.') || k.startsWith('blade.'))
      .forEach(k => localStorage.removeItem(k));
    const fresh = generateSeeds();
    Object.entries(fresh).forEach(([k, v]) => {
      store.set(k, v);
    });
    console.info('PUPSJ demo data successfully restored.');
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  resetDemoData() {
    this.resetDemo();
  },

  // ─── Unique ID Generator (Collision-Free) ───
  nextId(prefix) {
    const cleanPrefix = (prefix || '').replace(/[^A-Z]/g, '');
    const counter = this.nextSequence(cleanPrefix || 'GEN', 1000);
    return (prefix || 'ID-') + counter;
  },

  nextSequence(prefix, start = 1000) {
    const seqs = store.get('_sequences', {});
    const cur = Number(seqs[prefix] || start);
    const nextVal = cur + 1;
    seqs[prefix] = nextVal;
    store.set('_sequences', seqs);
    return nextVal;
  },

  nextOR() {
    const seq = this.nextSequence('OR', 50100);
    return 'OR-' + String(seq).padStart(5, '0');
  },

  getPayments() {
    return store.get('payments', []);
  },

  savePayments(list) {
    store.set('payments', list);
    this.emit('Payment', 'save', list.length);
  },




  // ─── Room Types & Rooms ───
  getTypes() {
    const raw = store.get('types', DEFAULT_TYPES);
    return raw.map(t => ({
      ...t,
      desc: t.desc || t.description || `${t.n} accommodation with standard room comforts.`,
      description: t.desc || t.description || `${t.n} accommodation with standard room comforts.`,
      amenities: Array.isArray(t.amenities)
        ? t.amenities
        : String(t.amenities || '').split(',').map(s => s.trim()).filter(Boolean)
    }));
  },
  saveTypes(types) {
    const normalized = types.map(t => ({
      ...t,
      desc: t.desc || t.description || '',
      description: t.desc || t.description || '',
      amenities: Array.isArray(t.amenities)
        ? t.amenities
        : String(t.amenities || '').split(',').map(s => s.trim()).filter(Boolean)
    }));
    store.set('types', normalized);
  },
  getRoomTypes() {
    return this.getTypes();
  },
  saveRoomTypes(types) {
    return this.saveTypes(types);
  },
  getRooms() {
    return store.get('rooms', []).map(r => ({
      n: Number(r.n),
      t: r.t,
      st: this.roomStatus(Number(r.n)).s
    }));
  },
  saveRooms(rooms) {
    store.set('rooms', rooms.map(r => ({ n: Number(r.n), t: r.t })));
  },
  roomNums(typeName) {
    return this.getRooms().filter(r => r.t === typeName).map(r => Number(r.n)).sort((a, b) => a - b);
  },

  // ─── Housekeeping & Maintenance ───
  getHK() {
    const val = store.get('hk', {});
    if (Array.isArray(val)) {
      const obj = {};
      val.forEach(item => {
        const s = item.s || item.st || 'Clean';
        obj[Number(item.n)] = {
          s,
          p: item.p || '',
          a: Number(item.a || 0),
          assignedName: item.assignedName || ''
        };
      });
      return obj;
    }
    return val;
  },
  getHk() {
    const raw = this.getHK();
    const rooms = this.getRooms();
    const staff = this.getStaff();

    const getStaffName = id => {
      const s = staff.find(x => x.id === Number(id));
      return s ? s.name : '';
    };

    return rooms.map(rm => {
      const rec = raw[rm.n] || raw[String(rm.n)];
      const status = (rec && (rec.s || rec.st)) ? (rec.s || rec.st) : 'Clean';
      const staffId = rec ? Number(rec.a || 0) : 0;
      return {
        n: Number(rm.n),
        s: status,
        st: status,
        p: rec ? (rec.p || '') : '',
        a: staffId,
        assignedName: (rec && rec.assignedName) ? rec.assignedName : (staffId ? getStaffName(staffId) : '')
      };
    });
  },
  saveHk(listOrObj) {
    if (Array.isArray(listOrObj)) {
      const obj = {};
      listOrObj.forEach(item => {
        const status = item.s || item.st || 'Clean';
        obj[Number(item.n)] = {
          s: status,
          p: item.p || '',
          a: Number(item.a || 0),
          assignedName: item.assignedName || ''
        };
      });
      store.set('hk', obj);
    } else {
      store.set('hk', listOrObj);
    }
  },
  getRoomHK(roomNum) {
    const hk = this.getHK();
    return hk[Number(roomNum)] || hk[String(roomNum)] || { s: 'Clean', p: '', a: 0, assignedName: '' };
  },
  setRoomHK(roomNum, updates) {
    const hk = this.getHK();
    const key = Number(roomNum);
    hk[key] = { ...(hk[key] || { s: 'Clean', p: '', a: 0, assignedName: '' }), ...updates };
    this.saveHk(hk);
  },
  isRoomClean(roomNum) {
    const h = this.getRoomHK(roomNum);
    return h.s === 'Clean';
  },

  getMaintenance() {
    const list = store.get('mReq', []);
    return list.map(m => ({
      ...m,
      room: Number(m.room),
      priority: m.priority || m.pri || 'Medium',
      pri: m.priority || m.pri || 'Medium',
      status: m.status || m.st || 'Open',
      st: m.status || m.st || 'Open',
      outOfService: !!(m.outOfService ?? m.oos),
      oos: !!(m.outOfService ?? m.oos),
      assignedTo: m.assignedTo || m.assigned || '',
      assigned: m.assignedTo || m.assigned || ''
    }));
  },
  saveMaintenance(list) {
    const normalized = list.map(m => ({
      ...m,
      room: Number(m.room),
      priority: m.priority || m.pri || 'Medium',
      pri: m.priority || m.pri || 'Medium',
      status: m.status || m.st || 'Open',
      st: m.status || m.st || 'Open',
      outOfService: !!(m.outOfService ?? m.oos),
      oos: !!(m.outOfService ?? m.oos),
      assignedTo: m.assignedTo || m.assigned || '',
      assigned: m.assignedTo || m.assigned || ''
    }));
    store.set('mReq', normalized);
  },
  isRoomUnderMaintenance(roomNum) {
    const num = Number(roomNum);
    const m = this.getMaintenance();
    return m.some(r => Number(r.room) === num && (r.status || r.st) !== 'Resolved' && (r.outOfService || r.oos));
  },

  // Canonical Real-Time Room Availability
  freeRooms(typeName, inDate, outDate, excludeResCode = null) {
    const T = today();
    const rooms = this.roomNums(typeName);
    const reservations = this.getReservations();
    const maintenance = this.getMaintenance();
    const hk = this.getHK();

    // Rooms with overlapping active reservations
    const bookedRooms = reservations
      .filter(r => {
        if (excludeResCode && r.c === excludeResCode) return false;
        if (r.t !== typeName) return false;
        if (r.st === 'Cancelled' || r.st === 'Checked-out') return false;
        // Overlap condition: r.i < outDate && r.o > inDate
        return r.i < outDate && r.o > inDate;
      })
      .map(r => Number(r.n));

    // Rooms under out-of-service maintenance
    const maintRooms = maintenance
      .filter(m => m.status !== 'Resolved' && m.outOfService)
      .map(m => Number(m.room));

    return rooms.filter(num => {
      const roomNum = Number(num);
      if (bookedRooms.includes(roomNum)) return false;
      if (maintRooms.includes(roomNum)) return false;
      if (inDate <= T) {
        const roomHk = hk[roomNum] || { s: 'Clean' };
        if (roomHk.s !== 'Clean') return false;
      }
      return true;
    });
  },

  // Derived dynamic status of any room on a given date
  roomStatus(roomNum, targetDate) {
    const T = today();
    const num = Number(roomNum);
    const date = targetDate || T;

    if (this.isRoomUnderMaintenance(num)) {
      return { s: 'Maintenance' };
    }

    const reservations = this.getReservations();
    const active = reservations.find(r => Number(r.n) === num && r.st !== 'Cancelled' && r.st !== 'Checked-out' && r.i <= date && r.o > date);
    if (active) {
      return { s: active.st === 'Checked-in' ? 'Occupied' : 'Reserved', r: active };
    }

    if (date === T) {
      const roomHk = this.getRoomHK(num);
      if (roomHk.s === 'Dirty') return { s: 'Dirty' };
      if (roomHk.s === 'In progress') return { s: 'In progress' };
      if (roomHk.s === 'Clean' || roomHk.s === 'Inspected') return { s: 'Available' };
      if (roomHk.s) return { s: roomHk.s };
    }

    return { s: 'Available' };
  },

  setRoomStatus(roomNum, status) {
    const num = Number(roomNum);
    if (status === 'Clean' || status === 'Dirty' || status === 'In progress') {
      this.setRoomHK(num, { s: status });
    } else if (status === 'Maintenance') {
      const m = this.getMaintenance();
      if (!m.some(x => x.room === num && x.outOfService && x.status !== 'Resolved')) {
        this.createMaintenanceRequest(num, 'Flagged out-of-service', 'High', true);
      }
    }
  },

  // ─── Reservations Store & Domain API ───
  getReservations() {
    const list = store.get('res', []);
    return list.map(r => ({
      ...r,
      n: Number(r.n || 0),
      rt: Number(r.rt || 0),
      gu: Number(r.gu || 1),
      pay: (r.pay || []).map(p => ({
        ...p,
        id: p.id || p.or,
        or: p.id || p.or,
        a: Number(p.a ?? p.amt ?? 0),
        amt: Number(p.a ?? p.amt ?? 0),
        k: p.k || p.t || 'Payment',
        t: p.k || p.t || 'Payment'
      })),
      x: (r.x || []).map(x => ({
        ...x,
        amt: Number(x.amt || 0)
      }))
    }));
  },
  saveReservations(list) {
    const normalized = list.map(r => ({
      ...r,
      n: Number(r.n || 0),
      rt: Number(r.rt || 0),
      gu: Number(r.gu || 1),
      pay: (r.pay || []).map(p => ({
        ...p,
        id: p.id || p.or,
        or: p.id || p.or,
        a: Number(p.a ?? p.amt ?? 0),
        amt: Number(p.a ?? p.amt ?? 0),
        k: p.k || p.t || 'Payment',
        t: p.k || p.t || 'Payment'
      })),
      x: (r.x || []).map(x => ({
        ...x,
        amt: Number(x.amt || 0)
      }))
    }));
    store.set('res', normalized);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  saveRes(list) {
    this.saveReservations(list);
  },
  saveReservation(res) {
    if (!res || !res.c) return null;
    const list = this.getReservations();
    const idx = list.findIndex(r => r.c.toUpperCase() === String(res.c).toUpperCase());
    if (idx !== -1) {
      list[idx] = res;
    } else {
      list.unshift(res);
    }
    this.saveReservations(list);
    this.emit('Reservation', 'save', res.c);
    return res;
  },
  findRes(code) {
    if (!code) return null;
    const target = String(code).trim().toUpperCase();
    return this.getReservations().find(r => r.c.toUpperCase() === target) || null;
  },

  createReservation(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to create a reservation.');
    }

    // Security check: Guest session cannot spoof walk-in or createdBy
    if (!staffSession && guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot create Walk-in or Staff-assisted reservations.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff createdBy credentials.');
      }
    }

    // Staff session requires source and createdBy
    let source = 'Online';
    let createdBy = null;
    let idType = data.idType || '';
    let idNumber = data.idNumber || '';

    if (staffSession) {
      source = data.source || 'Walk-in';
      createdBy = data.createdBy || {
        id: staffSession.id,
        name: staffSession.name,
        role: staffSession.role
      };
      if (source === 'Walk-in' && (!idType || !idNumber)) {
        throw new Error('Government ID verification required: Walk-in room bookings require valid ID Type and ID Number.');
      }
    }

    // Server-side guard: Online reservations require valid payment and cannot be created unpaid or by staff sessions
    if (source === 'Online') {
      if (staffSession && !data.holdId) {
        throw new Error('Staff sessions cannot create Online reservations. Use Walk-in or Staff-assisted reservation in the staff portal.');
      }
      if (!data.initialPayment && !data.holdId) {
        throw new Error('Unpaid online reservations are prohibited. Online bookings require confirmed down payment.');
      }
    }

    const res = this.getReservations();
    const code = this.nextId('HTL-');
    const guestName = (guestSession ? (guestSession.name || data.g || data.guestName) : (data.g || data.guestName || '')).trim();
    const guestEmail = (guestSession ? guestSession.email : (data.email || '')).trim();
    const guestPhone = (guestSession ? (guestSession.phone || data.ph || data.phone) : (data.ph || data.phone || '')).trim();

    if (!guestName) {
      throw new Error('Guest full name is required.');
    }
    if (!guestPhone) {
      throw new Error('Philippine mobile contact number is required.');
    }

    const roomType = data.t || data.roomType || '';
    const typeObj = this.getTypes().find(t => t.n === roomType);
    const guests = Number(data.gu || data.guests || 1);

    // Enforce room capacity in Data Layer
    if (typeObj && guests > typeObj.g) {
      throw new Error(`Party size (${guests} guests) exceeds maximum capacity for ${roomType} (max ${typeObj.g} guests).`);
    }

    // Date validation
    const ci = data.i || data.checkIn || today();
    const co = data.o || data.checkOut || addDays(ci, 1);
    if (co <= ci) {
      throw new Error('Check-out date must be after check-in date.');
    }

    const rateVal = Number(data.rt || data.rate || (typeObj ? typeObj.r : 3200));
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(ci, co) : 1);
    const stayTotal = rateVal * nights;
    const depPct = data.depositPct != null ? data.depositPct : ((typeof CONFIG !== 'undefined' && CONFIG.depositPct) ? CONFIG.depositPct : 50);
    const depReq = data.depositRequired != null ? data.depositRequired : Math.ceil(stayTotal * (depPct / 100));

    const newRes = {
      c: code,
      g: guestName,
      t: roomType,
      n: Number(data.n || data.roomNum || 0),
      i: ci,
      o: co,
      gu: guests,
      ph: guestPhone,
      email: guestEmail,
      m: data.m || data.paymentMethod || 'Credit card',
      p: 'Unpaid',
      st: (source === 'Online' && (data.initialPayment || data.holdId)) ? 'Confirmed' : (data.st || 'Pending'),
      note: data.note || data.notes || '',
      rt: rateVal,
      promo: data.promo || null,
      source: source,
      createdBy: createdBy,
      idType: idType,
      idNumber: idNumber,
      guestId: guestEmail || (source === 'Walk-in' ? `WALK-${code}` : ''),
      depositPct: depPct,
      depositRequired: depReq,
      depositPaid: 0,
      balanceDue: stayTotal,
      holdId: data.holdId || '',
      paymentIntentId: data.paymentIntentId || '',
      confirmedAt: data.initialPayment ? (typeof nowISO === 'function' ? nowISO() : new Date().toISOString()) : null,
      confirmedBy: data.initialPayment ? (data.confirmedBy || (source === 'Walk-in' ? (staffSession?.name || 'Front Desk') : 'System (payment)')) : null,
      created: today(),
      pay: [],
      x: []
    };

    // If walk-in, also register or link profile record
    if (source === 'Walk-in') {
      this.createGuestProfile({
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        source: 'Walk-in',
        idType: idType,
        idNumber: idNumber,
        notes: `Walk-in guest registered at front desk (${today()})`
      });
    }

    if (data.initialPayment) {
      const p = data.initialPayment;
      const orNum = this.nextOR();
      const pAmt = Math.round(Number(p.amount));
      newRes.depositPaid = pAmt;
      newRes.pay.push({
        id: orNum,
        or: orNum,
        d: today(),
        a: pAmt,
        amt: pAmt,
        m: p.method,
        k: p.kind || 'Deposit',
        t: p.kind || 'Deposit',
        note: p.note || (source === 'Walk-in' ? 'Walk-in front desk settlement' : `${newRes.depositPct}% down payment on booking`),
        auth: p.auth || (source === 'Walk-in' ? 'AUTH-DESK' : ''),
        ref: p.ref || '',
        cardLast4: p.cardLast4 || ''
      });
      if (data.checkInNow && ci <= today()) {
        newRes.st = 'Checked-in';
      } else {
        newRes.st = 'Confirmed';
      }
      newRes.confirmedAt = newRes.confirmedAt || (typeof nowISO === 'function' ? nowISO() : new Date().toISOString());
      newRes.confirmedBy = newRes.confirmedBy || (source === 'Walk-in' ? (staffSession?.name || 'Front Desk') : 'System (payment)');
    }

    const calculatedTotal = this.tot ? this.tot(newRes) : stayTotal;
    newRes.balanceDue = Math.max(0, calculatedTotal - newRes.depositPaid);
    this.syncPaymentStatus(newRes);
    res.unshift(newRes);
    this.saveReservations(res);

    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : guestName;
    this.audit(`Created reservation (${source})`, 'Reservation', code, `${newRes.g} (${newRes.t}) by ${actor}`);
    return newRes;
  },
  createRes(data) {
    return this.createReservation(data);
  },

  updateReservation(code, updates) {
    const res = this.getReservations();
    const idx = res.findIndex(r => r.c.toUpperCase() === String(code).trim().toUpperCase());
    if (idx === -1) return null;

    res[idx] = { ...res[idx], ...updates };
    if (updates.n != null) res[idx].n = Number(updates.n);
    if (updates.rt != null) res[idx].rt = Number(updates.rt);
    this.syncPaymentStatus(res[idx]);
    this.saveReservations(res);
    this.audit('Updated reservation', 'Reservation', res[idx].c, 'Modified reservation fields');
    return res[idx];
  },

  // Folio Calculations
  nts(r) {
    if (!r) return 1;
    const ci = r.ci || r.i;
    const co = r.co || r.o;
    if (!ci || !co) return 1;
    return Math.max(1, dateDiff(ci, co));
  },
  roomChg(r) {
    if (!r) return 0;
    const typeRate = Number(r.rt || r.rate) || (DEFAULT_TYPES.find(t => t.n === r.t) || {}).r || 3200;
    let base = this.nts(r) * typeRate;
    if (r.promo) {
      const pType = r.promo.type;
      const pApplies = r.promo.appliesTo;
      if (pApplies === 'rooms' || pApplies === 'both') {
        if (pType === 'percent') {
          const discount = Math.round(base * (Number(r.promo.value) / 100));
          base -= discount;
        } else if (pType === 'fixed') {
          base = Math.max(0, base - Number(r.promo.value));
        }
      }
    }
    return Math.max(0, base);
  },
  tot(r) {
    if (!r) return 0;
    const extras = (r.x || []).reduce((sum, item) => sum + Number(item.amt || 0), 0);
    return this.roomChg(r) + extras;
  },
  paidAmt(r) {
    if (!r || !r.pay) return 0;
    return r.pay.reduce((sum, p) => {
      const amount = Number(p.a ?? p.amt ?? 0);
      return sum + ((p.k === 'Refund' || p.t === 'Refund') ? -amount : amount);
    }, 0);
  },
  refundedAmt(r) {
    if (!r || !r.pay) return 0;
    return r.pay
      .filter(p => p.k === 'Refund' || p.t === 'Refund')
      .reduce((sum, p) => sum + Number(p.a ?? p.amt ?? 0), 0);
  },
  balOf(r) {
    if (!r || r.st === 'Cancelled') return 0;
    return Math.max(0, this.tot(r) - this.paidAmt(r));
  },
  bal(r) { return this.balOf(r); },
  balance(r) { return this.balOf(r); },
  depAmt(r) {
    if (!r) return 0;
    if (r.depositRequired != null) return r.depositRequired;
    const cfg = typeof CONFIG !== 'undefined' ? CONFIG : { depositPct: 50 };
    const pct = r.depositPct || cfg.depositPct || 50;
    const tot = this.tot ? this.tot(r) : (r.total || (r.rt || 3200));
    return Math.ceil(tot * (pct / 100));
  },

  syncPaymentStatus(r) {
    const net = this.paidAmt(r);
    const total = this.tot(r);

    if (r.st === 'Cancelled') {
      r.p = net > 0 ? 'Retained' : (this.refundedAmt(r) > 0 ? 'Refunded' : 'Voided');
    } else if (net <= 0) {
      r.p = 'Unpaid';
    } else if (net >= total) {
      r.p = 'Paid';
    } else {
      r.p = 'Partial';
    }
  },

  // Polymorphic Payment Handler (accepts code string or reservation object)
  addPayment(codeOrObj, amount, method, kind = 'Payment', note = '', meta = {}) {
    let r = typeof codeOrObj === 'string' ? this.findRes(codeOrObj) : codeOrObj;
    if (!r) throw new Error('Reservation not found: ' + codeOrObj);

    r.pay = r.pay || [];
    const orNum = this.nextOR();
    const entry = {
      id: orNum,
      or: orNum,
      d: today(),
      a: Math.round(Number(amount)),
      amt: Math.round(Number(amount)),
      m: method,
      k: kind,
      t: kind,
      note: note || '',
      ...meta
    };
    r.pay.push(entry);

    if (kind !== 'Refund') {
      r.m = method;
      if (r.st === 'Pending' && this.paidAmt(r) >= this.depAmt(r)) {
        r.st = 'Confirmed';
      }
    }
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit(`Payment ${entry.id}`, 'Payment', r.c, `${peso(amount)} via ${method} (${kind})`);
    return entry;
  },

  // Polymorphic Charge Handler (accepts code string or reservation object)
  addFolioCharge(codeOrObj, descOrOpts, amount, cat) {
    if (typeof descOrOpts === 'object' && descOrOpts !== null) {
      return this.addCharge(codeOrObj, descOrOpts.desc || descOrOpts.description, descOrOpts.amt || descOrOpts.amount, descOrOpts.cat || descOrOpts.category);
    }
    return this.addCharge(codeOrObj, descOrOpts, amount, cat);
  },

  addCharge(codeOrObj, desc, amount, cat = 'Incidentals') {
    let r = typeof codeOrObj === 'string' ? this.findRes(codeOrObj) : codeOrObj;
    if (!r) throw new Error('Reservation not found: ' + codeOrObj);

    r.x = r.x || [];
    const entry = {
      id: this.nextId('AUD-'),
      d: today(),
      desc: String(desc).trim(),
      amt: Math.round(Number(amount)),
      cat: cat || 'Incidentals'
    };
    r.x.push(entry);
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Added charge', 'Folio', r.c, `${desc} (${peso(amount)})`);
    return entry;
  },

  // Check-In Domain Rule: date <= today, room is clean, deposit paid
  checkIn(code, assignedRoomNum) {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    if (assignedRoomNum) {
      r.n = Number(assignedRoomNum);
    }
    if (!r.n) {
      return { success: false, error: 'No room assigned to this reservation.' };
    }

    const T = today();
    if (r.i > T) {
      return { success: false, error: `Cannot check in early. Scheduled arrival date is ${r.i}.` };
    }
    if (!this.isRoomClean(r.n)) {
      return { success: false, error: `Cannot check in: Room ${r.n} is currently marked Dirty or undergoing cleaning.` };
    }
    const reqDep = r.depositRequired != null ? r.depositRequired : this.depAmt(r);
    if (this.paidAmt(r) < reqDep) {
      return { success: false, error: `Cannot check in: Required deposit (${peso(reqDep)}) has not been settled.` };
    }

    r.st = 'Checked-in';
    this.updateReservation(r.c, r);
    this.audit('Check-in', 'Reservation', r.c, `Guest ${r.g} checked into Room ${r.n}`);
    return { success: true, res: r };
  },

  // Check-Out Domain Rule: mark Checked-out, mark room Dirty in HK, award loyalty points
  checkOut(code, overrideReason = '') {
    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    const bal = this.balance ? this.balance(r) : 0;
    if (bal > 0 && !overrideReason) {
      return { success: false, error: `Cannot check out with outstanding balance of ₱${bal.toLocaleString()}. Settle folio first.`, balance: bal };
    }

    r.st = 'Checked-out';
    this.updateReservation(r.c, r);
    this.setRoomHK(r.n, { s: 'Dirty', p: 'Urgent' });

    // Award loyalty points on stay completion
    const pointsEarned = Math.floor(this.tot(r) / 100) * CONFIG.loyalty.earnRate;
    if (pointsEarned > 0) {
      this.addLoyaltyPoints(r.g, pointsEarned, 'Completed stay settlement', r.c);
    }

    this.audit('Check-out', 'Reservation', r.c, `Guest ${r.g} checked out. Room ${r.n} marked Dirty.`);
    return { success: true, res: r };
  },

  // Cancellation Policy Rule: >= 3 days free cancel, < 3 days retain 1st night
  cancelReservation(code, by = 'staff') {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      return { success: false, error: 'Authentication required to cancel a reservation.' };
    }

    const r = this.findRes(code);
    if (!r) return { success: false, error: 'Reservation not found.' };

    // Guest ownership check
    if (guestSession && !staffSession) {
      const guestEmail = (guestSession.email || '').toLowerCase().trim();
      if (!r.email || r.email.toLowerCase().trim() !== guestEmail) {
        return { success: false, error: 'Unauthorized: you can only cancel reservations linked to your own account.' };
      }
    }

    if (r.st === 'Checked-in' || r.s === 'Checked-in') {
      return { success: false, error: 'Checked-in stays cannot be cancelled. Use early check-out instead.' };
    }
    if (r.st === 'Cancelled' || r.s === 'Cancelled') {
      return { success: false, error: 'Reservation is already cancelled.' };
    }

    const T = today();
    const daysUntilArrival = dateDiff(T, r.i);
    const totalPaid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
    const priorRefunds = (r.pay || []).filter(p => p.k === 'Refund' || p.t === 'Refund').reduce((s, p) => s + (Number(p.a || p.amt) || 0), 0);
    const paid = Math.max(0, totalPaid - priorRefunds);
    let refundAmt = 0;
    let retainedFee = 0;

    const freeDays = (typeof CONFIG !== 'undefined' && CONFIG.freeCancelDays != null) ? CONFIG.freeCancelDays : 3;
    const feePct = (typeof CONFIG !== 'undefined' && CONFIG.lateCancelFeePct != null) ? CONFIG.lateCancelFeePct : 30;

    if (daysUntilArrival >= freeDays) {
      refundAmt = paid;
      retainedFee = 0;
    } else {
      retainedFee = Math.round(paid * (feePct / 100) * 100) / 100;
      refundAmt = Math.max(0, Math.round((paid - retainedFee) * 100) / 100);
    }

    if (refundAmt > 0) {
      r.pay = r.pay || [];
      const orNum = this.nextOR();
      r.pay.push({
        id: orNum,
        or: orNum,
        d: T,
        a: refundAmt,
        amt: refundAmt,
        m: r.m || 'Original Payment',
        k: 'Refund',
        t: 'Refund',
        note: daysUntilArrival >= freeDays ? 'Full policy refund' : `Late cancellation policy refund less ${feePct}% fee`,
        auth: 'REF-CANCEL',
        ref: r.c
      });
    }

    r.st = 'Cancelled';
    r.s = 'Cancelled';
    this.syncPaymentStatus(r);
    this.updateReservation(r.c, r);
    this.audit('Cancellation', 'Reservation', r.c, `Cancelled by ${by}. Retained: ${peso(retainedFee)}, Refunded: ${peso(refundAmt)}`);
    return { success: true, refundAmt, retainedFee, fee: retainedFee, res: r };
  },

  // Claim Walk-in / Staff-assisted Booking into a Guest Portal Account
  claimWalkInReservation(code, lastNameOrPhone, guestEmail) {
    if (!code || !lastNameOrPhone || !guestEmail) {
      return { success: false, error: 'Booking code, verification credential (last name or phone), and guest email are required.' };
    }
    const r = this.findRes(code);
    if (!r) {
      return { success: false, error: 'Reservation not found with reference code ' + code };
    }

    const verifyTerm = String(lastNameOrPhone).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const resNameClean = (r.g || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const resPhoneClean = String(r.ph || '').replace(/[^0-9]/g, '');
    const resLastName = (r.g || '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z0-9]/g, '');

    const phoneMatch = verifyTerm.length >= 7 && resPhoneClean.includes(verifyTerm);
    const nameMatch = verifyTerm.length >= 2 && (resLastName === verifyTerm || resNameClean.includes(verifyTerm));

    if (!phoneMatch && !nameMatch) {
      return { success: false, error: 'Verification failed: the last name or phone number does not match this reservation.' };
    }

    r.email = guestEmail.trim().toLowerCase();
    r.claimedAt = today();
    r.claimedBy = guestEmail.trim().toLowerCase();
    this.updateReservation(r.c, r);

    this.createGuestProfile({
      name: r.g,
      email: r.email,
      phone: r.ph,
      notes: `Claimed walk-in booking ${r.c} on ${today()}`
    });

    this.audit('Claimed reservation', 'Reservation', r.c, `Walk-in booking claimed by ${guestEmail}`);
    return { success: true, res: r };
  },

  // ─── Staff & Guest Profiles ───
  getStaff() {
    const list = store.get('staff', []);
    return list.map(s => {
      if (s.id === 8 || s.email === 'restaurant@pupsj.edu.ph' || s.email === 'kitchen@pupsj.edu.ph' || (s.name && s.name.includes('Marco Valdez'))) {
        return { ...s, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', department: 'Restaurant', role: 'Restaurant Receptionist' };
      }
      return s;
    });
  },
  saveStaff(list) {
    store.set('staff', list);
  },
  getAdminAccounts() {
    return store.get('adminAccounts', []);
  },
  saveAdminAccounts(list) {
    store.set('adminAccounts', list);
  },
  findStaffByEmail(email) {
    if (!email) return null;
    const em = email.trim().toLowerCase();
    const staffMatch = this.getStaff().find(s => s.email && s.email.toLowerCase() === em);
    if (staffMatch) return staffMatch;
    const adminAccounts = this.getAdminAccounts();
    const adminMatch = adminAccounts.find(a => a.email && a.email.toLowerCase() === em);
    if (adminMatch) return adminMatch;
    if (em === 'admin@pupsj.edu.ph') {
      return { id: 0, adminId: 'ADM-001', name: 'Superadmin', email: 'admin@pupsj.edu.ph', role: 'superadmin' };
    }
    if (em === 'hotel@pupsj.edu.ph') {
      return { id: 2, name: 'Hotel Receptionist', email: 'hotel@pupsj.edu.ph', role: 'hotel_receptionist' };
    }
    if (em === 'restaurant@pupsj.edu.ph') {
      return { id: 8, name: 'Rechelle Cansila', email: 'restaurant@pupsj.edu.ph', role: 'restaurant_receptionist' };
    }
    return null;
  },

  getGuestAccounts() {
    return store.get('guestAccounts', []);
  },
  saveGuestAccounts(list) {
    store.set('guestAccounts', list);
  },
  findGuestAccount(email) {
    if (!email) return null;
    return this.getGuestAccounts().find(g => g.email.toLowerCase() === email.trim().toLowerCase()) || null;
  },

  getGuestProfiles() {
    const res = this.getReservations();
    const accounts = this.getGuestAccounts();
    const map = {};

    accounts.forEach(acc => {
      const key = acc.name.toLowerCase();
      map[key] = {
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        stays: 0,
        nights: 0,
        totalSpend: 0,
        reservations: [],
        created: acc.created
      };
    });

    res.forEach(r => {
      const key = r.g.toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: r.g,
          email: r.email,
          phone: r.ph,
          stays: 0,
          nights: 0,
          totalSpend: 0,
          reservations: [],
          created: r.created || r.i
        };
      }
      map[key].reservations.push(r);
      if (r.st === 'Checked-out' || r.st === 'Checked-in') {
        map[key].stays += 1;
        map[key].nights += this.nts(r);
        map[key].totalSpend += this.paidAmt(r);
      }
    });

    Object.values(map).forEach(profile => {
      profile.tier = this.getGuestTier(profile.nights).name;
      profile.points = this.getLoyaltyPoints(profile.name);
    });

    return map;
  },

  createGuestProfile(data) {
    const accounts = this.getGuestAccounts();
    const name = (data.name || '').trim();
    if (!name) return { success: false, error: 'Guest name is required.' };
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const existing = accounts.find(a => a.name.toLowerCase() === name.toLowerCase() || (email && a.email.toLowerCase() === email));
    if (existing) {
      if (phone) existing.phone = phone;
      if (email) existing.email = email;
      if (data.notes !== undefined) existing.notes = data.notes;
      if (data.preferences !== undefined) existing.preferences = data.preferences;
      this.saveGuestAccounts(accounts);
      this.audit('Updated guest profile', 'GuestProfile', name, `Updated details for ${name}`);
      return { success: true, profile: existing };
    }
    const newAcc = {
      name,
      email: email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.local`,
      phone,
      notes: data.notes || '',
      preferences: data.preferences || '',
      created: today()
    };
    accounts.unshift(newAcc);
    this.saveGuestAccounts(accounts);
    if (data.initialPoints) {
      this.addLoyaltyPoints(name, Number(data.initialPoints), 'Registration Welcome Bonus');
    }
    this.audit('Created guest profile', 'GuestProfile', name, `Registered ${name} in CRM`);
    return { success: true, profile: newAcc };
  },

  saveGuest(data) {
    if (!data) return null;
    const name = (data.name || '').trim();
    if (!name) return { success: false, error: 'Guest name is required.' };
    const accounts = this.getGuestAccounts();
    const existing = accounts.find(a => (a.name && a.name.toLowerCase() === name.toLowerCase()) || (data.email && a.email && a.email.toLowerCase() === data.email.trim().toLowerCase()));
    if (existing) {
      if (data.name) existing.name = data.name.trim();
      if (data.phone) existing.phone = data.phone.trim();
      if (data.email) existing.email = data.email.trim();
      if (data.address !== undefined) existing.address = data.address;
      if (data.notes !== undefined) existing.notes = data.notes;
      if (data.preferences !== undefined) existing.preferences = data.preferences;
      this.saveGuestAccounts(accounts);
      this.audit('Saved guest profile', 'GuestProfile', existing.name, 'Updated guest details in CRM');
      return { success: true, profile: existing };
    }
    return this.createGuestProfile(data);
  },

  updateGuestProfile(originalName, updates) {
    const accounts = this.getGuestAccounts();
    const acc = accounts.find(a => a.name.toLowerCase() === originalName.toLowerCase());
    if (acc) {
      if (updates.name) acc.name = updates.name.trim();
      if (updates.phone) acc.phone = updates.phone.trim();
      if (updates.email) acc.email = updates.email.trim();
      if (updates.notes !== undefined) acc.notes = updates.notes;
      if (updates.preferences !== undefined) acc.preferences = updates.preferences;
      this.saveGuestAccounts(accounts);
    }
    this.audit('Updated guest profile', 'GuestProfile', originalName, `Modified contact details and notes`);
    return { success: true };
  },

  deleteGuestProfile(name) {
    const accounts = this.getGuestAccounts().filter(a => a.name.toLowerCase() !== name.toLowerCase());
    this.saveGuestAccounts(accounts);
    this.audit('Deleted guest profile', 'GuestProfile', name, `Removed from registered accounts`);
    return { success: true };
  },

  // ─── Session Management (Isolated Per-Tab via sessionStorage with store fallback) ───
  getStaffSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const val = sessionStorage.getItem('pupsj_sessionStaff');
        if (val) {
          const u = JSON.parse(val);
          if (u && (u.role === 'restaurant_receptionist' || u.email === 'restaurant@pupsj.edu.ph' || (u.name && u.name.includes('Marco Valdez')))) {
            if (u.name !== 'Rechelle Cansila') {
              u.name = 'Rechelle Cansila';
              sessionStorage.setItem('pupsj_sessionStaff', JSON.stringify(u));
            }
          }
          return u;
        }
        // If guest session active in this tab, do not fall back to staff session
        if (sessionStorage.getItem('pupsj_sessionGuest')) {
          return null;
        }
      }
    } catch (e) { }
    // Fallback: Check store for active cross-tab session
    try {
      const persisted = store.get('sessionStaff', null);
      if (persisted && typeof persisted === 'object') {
        if (persisted.role === 'restaurant_receptionist' || persisted.email === 'restaurant@pupsj.edu.ph' || (persisted.name && persisted.name.includes('Marco Valdez'))) {
          persisted.name = 'Rechelle Cansila';
        }
        return persisted;
      }
    } catch (e) { }
    return null;
  },
  setStaffSession(user) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pupsj_sessionStaff', JSON.stringify(user));
        sessionStorage.removeItem('pupsj_sessionGuest');
      }
    } catch (e) { }
    store.remove('sessionGuest');
    store.set('sessionStaff', user);
  },
  clearStaffSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pupsj_sessionStaff');
      }
    } catch (e) { }
    store.remove('sessionStaff');
  },

  getGuestSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const val = sessionStorage.getItem('pupsj_sessionGuest');
        if (val) return JSON.parse(val);
      }
    } catch (e) { }
    return null;
  },
  setGuestSession(guest) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('pupsj_sessionGuest', JSON.stringify(guest));
        sessionStorage.removeItem('pupsj_sessionStaff');
      }
    } catch (e) { }
    store.remove('sessionStaff');
    store.remove('sessionGuest');
  },
  clearGuestSession() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pupsj_sessionGuest');
      }
    } catch (e) { }
    store.remove('sessionGuest');
    if (typeof window !== 'undefined' && typeof window.clearPendingIntent === 'function') {
      window.clearPendingIntent();
    }
  },

  // ─── Promotions ───
  getPromos() {
    const list = store.get('promos', []);
    return list.map(p => ({
      ...p,
      used: Number(p.used ?? p.usedCount ?? 0),
      usedCount: Number(p.used ?? p.usedCount ?? 0),
      limit: Number(p.limit ?? p.usageLimit ?? 0),
      usageLimit: Number(p.limit ?? p.usageLimit ?? 0)
    }));
  },
  savePromos(list) {
    const normalized = list.map(p => ({
      ...p,
      used: Number(p.used ?? p.usedCount ?? 0),
      usedCount: Number(p.used ?? p.usedCount ?? 0),
      limit: Number(p.limit ?? p.usageLimit ?? 0),
      usageLimit: Number(p.limit ?? p.usageLimit ?? 0)
    }));
    store.set('promos', normalized);
  },
  findPromo(code) {
    if (!code) return null;
    const target = String(code).trim().toUpperCase();
    return this.getPromos().find(p => p.code.toUpperCase() === target && p.active) || null;
  },
  validatePromo(code, context = {}) {
    const p = this.findPromo(code);
    if (!p) return { valid: false, error: 'Promo code not recognized or inactive.' };

    const T = today();
    if (p.validFrom && T < p.validFrom) return { valid: false, error: 'Promo code is not yet active.' };
    if (p.validTo && T > p.validTo) return { valid: false, error: 'Promo code has expired.' };
    if (p.limit && p.used >= p.limit) return { valid: false, error: 'Promo code usage limit has been reached.' };

    const scope = context.scope || context.type;
    if (scope && p.appliesTo !== 'both' && p.appliesTo !== scope && p.appliesTo !== 'credit') {
      return { valid: false, error: `Promo applies to ${p.appliesTo} only.` };
    }

    if (p.minNights && context.nights && Number(context.nights) < p.minNights) {
      return { valid: false, error: `Requires a minimum stay of ${p.minNights} nights.` };
    }

    if (p.minSpend && context.spend && Number(context.spend) < p.minSpend) {
      return { valid: false, error: `Requires a minimum spend of ${peso(p.minSpend)}.` };
    }

    return { valid: true, promo: p };
  },
  incrementPromo(code) {
    const list = this.getPromos();
    const p = list.find(x => x.code.toUpperCase() === String(code).trim().toUpperCase());
    if (p) {
      p.used = (p.used || 0) + 1;
      p.usedCount = p.used;
      this.savePromos(list);
    }
  },

  // ─── Restaurant (Menu, Tables, Orders, Bookings) ───
  getMenu() {
    return store.get('menu', []);
  },
  saveMenu(list) {
    store.set('menu', list);
  },
  getTables() {
    const list = store.get('tables', []);
    return list.map(t => ({
      ...t,
      num: Number(t.num || t.name.replace(/\D/g, '') || 1),
      status: t.status || t.st || 'Free',
      st: t.status || t.st || 'Free'
    }));
  },
  saveTables(list) {
    const normalized = list.map(t => ({
      ...t,
      num: Number(t.num || t.name.replace(/\D/g, '') || 1),
      status: t.status || t.st || 'Free',
      st: t.status || t.st || 'Free'
    }));
    store.set('tables', normalized);
  },
  getTableRes() {
    const list = store.get('tableRes', []);
    return list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      party: Number(t.party ?? t.partySize ?? 2),
      partySize: Number(t.partySize ?? t.party ?? 2),
      table: Number(t.table ?? t.tableNum ?? 0),
      tableNum: Number(t.tableNum ?? t.table ?? 0)
    }));
  },
  saveTableRes(list) {
    const normalized = list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      party: Number(t.party ?? t.partySize ?? 2),
      partySize: Number(t.partySize ?? t.party ?? 2),
      table: Number(t.table ?? t.tableNum ?? 0),
      tableNum: Number(t.tableNum ?? t.table ?? 0)
    }));
    store.set('tableRes', normalized);
  },
  createTableRes(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to reserve a dining table.');
    }

    if (guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot set walk-in table reservations.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff credentials.');
      }
    }

    const guestName = (guestSession ? (guestSession.name || data.guestName || data.guest) : (data.guestName || data.guest || '')).trim();
    const phone = (guestSession ? (guestSession.phone || data.phone) : (data.phone || '')).trim();
    const email = guestSession ? guestSession.email : (data.email || '').trim();

    if (!guestName) {
      throw new Error('Guest full name is required for dining table reservation.');
    }
    if (!phone) {
      throw new Error('Contact phone number is required.');
    }

    const party = Number(data.partySize || data.party || 2);
    const date = data.date || today();
    const time = data.time || '18:00';

    // Operating hours check (06:00 to 22:00)
    const [hh, mm] = time.split(':').map(Number);
    const timeMins = (hh || 0) * 60 + (mm || 0);
    if (timeMins < 6 * 60 || timeMins > 22 * 60) {
      throw new Error('Restaurant operating hours are 6:00 AM to 10:00 PM. Please select a time within this window.');
    }

    // Dynamic table assignment: 90-minute slot collision check
    const tables = this.getTables();
    const existingTableRes = this.getTableRes().filter(t => t.date === date && t.status !== 'Cancelled' && t.status !== 'Completed' && t.status !== 'No-show');

    const eligibleTables = tables
      .filter(tbl => tbl.seats >= party)
      .sort((a, b) => a.seats - b.seats);

    let assignedTable = null;
    for (const tbl of eligibleTables) {
      const conflict = existingTableRes.some(t => {
        if (Number(t.tableNum) !== Number(tbl.num)) return false;
        const [th, tm] = (t.time || '12:00').split(':').map(Number);
        const tMins = (th || 0) * 60 + (tm || 0);
        return Math.abs(tMins - timeMins) < 90;
      });
      if (!conflict) {
        assignedTable = tbl;
        break;
      }
    }

    if (!assignedTable && !data.allowWaitlist && eligibleTables.length > 0) {
      throw new Error(`No tables for ${party} guests available at ${time} on ${fmtDate(date)}. All suitable tables are reserved within this 90-minute dining window.`);
    }

    const list = this.getTableRes();
    const code = this.nextId('TRS-');
    const tableNum = assignedTable ? assignedTable.num : Number(data.tableNum || (eligibleTables[0] ? eligibleTables[0].num : 1));
    const tableId = assignedTable ? assignedTable.id : (tableNum ? 'TBL-' + tableNum : '');

    const item = {
      code,
      guestName,
      guest: guestName,
      phone,
      email,
      date,
      time,
      partySize: party,
      party,
      tableNum,
      table: tableNum,
      tableId,
      status: staffSession ? 'Confirmed' : 'Pending',
      notes: data.notes || '',
      promo: data.promo || null,
      source: staffSession ? (data.source || 'Walk-in') : 'Online',
      createdBy: staffSession ? (data.createdBy || { id: staffSession.id, name: staffSession.name, role: staffSession.role }) : null,
      created: `${today()} ${nowTime()}`
    };

    list.unshift(item);
    this.saveTableRes(list);

    // Increment promo usage ONLY AFTER table reservation is successfully saved
    if (data.promo && data.promo.code) {
      this.incrementPromo(data.promo.code);
    }

    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : guestName;
    this.audit('Reserved dining table', 'TableReservation', code, `${guestName} (${party} guests, Table ${tableNum}) by ${actor}`);
    return item;
  },

  getOrders() {
    const list = store.get('orders', []);
    return list.map(o => ({
      ...o,
      subtotal: Number(o.subtotal || 0),
      room: o.room ?? (o.target && o.target.startsWith('Room') ? Number(o.target.replace(/\D/g, '')) : ''),
      table: o.table ?? (o.target && o.target.startsWith('Table') ? Number(o.target.replace(/\D/g, '')) : ''),
      lines: (o.lines || []).map(l => ({
        ...l,
        unitPrice: Number(l.unitPrice ?? l.price ?? 0),
        price: Number(l.price ?? l.unitPrice ?? 0),
        qty: Number(l.qty || 1)
      }))
    }));
  },
  saveOrders(list) {
    store.set('orders', list);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pupsj:data-change'));
    }
  },
  createOrder(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to place an order.');
    }

    if (!staffSession && guestSession) {
      if (data.source && data.source !== 'Online') {
        throw new Error('Unauthorized source: guest accounts cannot set walk-in orders.');
      }
      if (data.createdBy) {
        throw new Error('Unauthorized createdBy: guest accounts cannot specify staff credentials.');
      }
      // For guest in-room dining orders: require checked-in reservation
      if (data.type === 'In-room') {
        const reservations = this.getReservations();
        const activeStay = reservations.find(r =>
          (r.email.toLowerCase() === guestSession.email.toLowerCase() || (data.resCode && r.c === data.resCode)) &&
          r.st === 'Checked-in'
        );
        if (!activeStay) {
          throw new Error('In-room dining is exclusively available to guests with an active Checked-in stay.');
        }
        data.room = activeStay.n;
        data.target = `Room ${activeStay.n}`;
        data.resCode = activeStay.c;
        data.linkedRes = activeStay.c;
      }
    }

    const list = this.getOrders();
    const code = this.nextId('ORD-');
    const lines = (data.lines || []).map(l => ({
      ...l,
      unitPrice: Number(l.unitPrice ?? l.price ?? 0),
      price: Number(l.price ?? l.unitPrice ?? 0),
      qty: Number(l.qty || 1)
    }));
    const subtotal = lines.reduce((s, l) => s + (l.qty * l.unitPrice), 0);

    const order = {
      code,
      type: data.type || 'Dine-in',
      target: data.target || (data.room ? `Room ${data.room}` : data.table ? `Table ${data.table}` : 'Counter'),
      room: data.room || '',
      table: data.table || '',
      resCode: data.resCode || data.linkedRes || '',
      linkedRes: data.resCode || data.linkedRes || '',
      lines,
      subtotal,
      status: 'New',
      payStatus: 'Unpaid',
      source: staffSession ? (data.source || 'Walk-in') : 'Online',
      createdBy: staffSession ? (data.createdBy || { id: staffSession.id, name: staffSession.name, role: staffSession.role }) : null,
      guestEmail: guestSession ? guestSession.email : (data.guestEmail || ''),
      created: `${today()} ${nowTime()}`,
      updated: `${today()} ${nowTime()}`,
      paymentKind: 'Pending Settlement'
    };

    list.unshift(order);
    this.saveOrders(list);
    const actor = staffSession ? `${staffSession.name} (${staffSession.role})` : (guestSession ? guestSession.name : 'Guest');
    this.audit('Placed restaurant order', 'Order', code, `${order.type} for ${order.target} by ${actor}`);
    return order;
  },
  updateOrderStatus(code, status) {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.code === code);
    if (idx === -1) return null;
    list[idx].status = status;
    list[idx].updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Order ${code} status: ${status}`, 'Order', code, `Updated kitchen status to ${status}`);
    return list[idx];
  },
  billOrder(code, paymentKind, meta = {}) {
    const list = this.getOrders();
    const order = list.find(o => o.code === code);
    if (!order) return { success: false, error: 'Order not found.' };

    let method = 'Cash';
    if (typeof paymentKind === 'object' && paymentKind !== null) {
      meta = { ...paymentKind, ...meta };
      paymentKind = meta.method || 'Cash';
      method = meta.method || 'Cash';
    } else if (typeof paymentKind === 'string') {
      method = meta.method || paymentKind;
    }

    if (paymentKind === 'room' || paymentKind === 'Room folio' || paymentKind === 'Room Charge') {
      const res = this.findRes(order.resCode || order.linkedRes || meta.resCode);
      if (!res || res.st !== 'Checked-in') {
        return { success: false, error: 'Cannot charge to room: reservation is not currently checked-in.' };
      }
      this.addCharge(res, `Restaurant: ${order.code}`, order.subtotal, 'Dining');
      order.payStatus = 'Room folio';
      order.paymentKind = `Charged to ${res.c}`;
      order.linkedRes = res.c;
      order.resCode = res.c;
    } else {
      const orNo = this.nextOR();
      order.payStatus = 'Paid';
      order.paymentKind = `${method} (OR: ${orNo})`;
      meta.orNum = orNo;

      // Record in unified payments ledger
      const payments = this.getPayments();
      payments.push({
        orNo,
        or: orNo,
        id: orNo,
        date: today(),
        time: nowTime(),
        timestamp: Date.now(),
        kind: 'Payment',
        method: method,
        amount: Number(meta.amount != null ? meta.amount : (order.subtotal || 0)),
        refType: 'Order',
        refId: order.code,
        authRef: meta.ref || `POS-${order.code}`,
        cashier: (this.getStaffSession() && this.getStaffSession().name) || 'Cashier',
        status: 'Completed'
      });
      this.savePayments(payments);
    }

    // When a Dine-in order is settled, transition table to Needs cleaning
    if (order.type === 'Dine-in' && (order.table || order.tableNo)) {
      const tNum = order.table || order.tableNo;
      const tables = this.getTables();
      const t = tables.find(x => x.num === tNum || x.id === tNum);
      if (t) {
        t.st = 'Needs cleaning';
        t.status = 'Needs cleaning';
        this.saveTables(tables);
      }
    }

    order.updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Billed order ${code}`, 'Order', code, `Method: ${method || paymentKind}, OR: ${meta.orNum || 'FOLIO'}`);
    this.emit('Order', 'bill', code);
    return { success: true, orNum: meta.orNum || '', order };
  },

  cancelOrder(code, reason = 'Customer request / void') {
    const list = this.getOrders();
    const idx = list.findIndex(o => o.code === code);
    if (idx === -1) return { success: false, error: 'Order not found.' };
    list[idx].status = 'Cancelled';
    list[idx].payStatus = 'Cancelled';
    list[idx].notes = (list[idx].notes ? list[idx].notes + ' | ' : '') + `[Cancelled: ${reason}]`;
    list[idx].updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Voided order ${code}`, 'Order', code, `Reason: ${reason}`);
    return { success: true, order: list[idx] };
  },

  addItemsToOrder(code, additionalLines) {
    const list = this.getOrders();
    const order = list.find(o => o.code === code);
    if (!order) return { success: false, error: 'Order not found.' };
    order.lines = order.lines || [];
    additionalLines.forEach(l => {
      const existing = order.lines.find(x => x.id === l.id);
      if (existing) {
        existing.qty += Number(l.qty || 1);
      } else {
        order.lines.push({
          id: l.id,
          name: l.name,
          qty: Number(l.qty || 1),
          unitPrice: Number(l.unitPrice || l.price || 0),
          price: Number(l.unitPrice || l.price || 0),
          note: l.note || ''
        });
      }
    });
    order.subtotal = order.lines.reduce((s, l) => s + (l.qty * (l.unitPrice || l.price || 0)), 0);
    order.updated = `${today()} ${nowTime()}`;
    this.saveOrders(list);
    this.audit(`Added items to order ${code}`, 'Order', code, `New subtotal: ${peso(order.subtotal)}`);
    return { success: true, order };
  },

  // ─── Messages & Concierge Threads ───
  getThreads() {
    const list = store.get('threads', []);
    return list.map(t => ({
      ...t,
      guest: t.guest || t.guestName || '',
      guestName: t.guestName || t.guest || '',
      updatedAt: t.updatedAt || t.updated || ''
    }));
  },
  saveThreads(list) {
    store.set('threads', list);
  },
  createThread(subject, guestName, messageText, resCode = '', contact = '') {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: sign in is required to send concierge messages.');
    }

    const list = this.getThreads();
    const id = this.nextId('MSG-');
    const gn = (guestSession ? (guestSession.name || guestName) : (guestName || 'Website Visitor')).trim();
    const email = guestSession ? guestSession.email : (contact || '').trim();

    const newThread = {
      id,
      guestName: gn,
      guest: gn,
      guestEmail: email,
      contact: email || String(contact || '').trim(),
      resCode: String(resCode || '').trim(),
      subject: String(subject || 'General Inquiry').trim(),
      status: 'Open',
      unreadStaff: 1,
      unreadGuest: 0,
      updated: `${today()} ${nowTime()}`,
      updatedAt: `${today()} ${nowTime()}`,
      messages: [
        { sender: gn, role: 'guest', time: `${today()} ${nowTime()}`, text: String(messageText).trim() }
      ]
    };
    list.unshift(newThread);
    this.saveThreads(list);
    this.audit('New guest message', 'Thread', id, subject);
    return newThread;
  },
  replyThread(threadId, senderName, text, role = 'staff') {
    const list = this.getThreads();
    const t = list.find(x => x.id === threadId);
    if (!t) return null;

    t.messages = t.messages || [];
    if (t.messages.length >= 200) t.messages.shift();

    t.messages.push({
      sender: senderName,
      role: role.toLowerCase(),
      time: `${today()} ${nowTime()}`,
      text: text.trim()
    });
    t.updated = `${today()} ${nowTime()}`;
    t.updatedAt = t.updated;

    if (role.toLowerCase() === 'staff') {
      t.unreadGuest = (t.unreadGuest || 0) + 1;
      t.unreadStaff = 0;
    } else {
      t.unreadStaff = (t.unreadStaff || 0) + 1;
      t.unreadGuest = 0;
    }
    this.saveThreads(list);
    return t;
  },

  // ─── Contact Inquiries ───
  getInquiries() {
    const list = store.get('inquiries', []);
    return list.map(i => ({
      ...i,
      id: i.id || i.ref || '',
      ref: i.ref || i.id || '',
      staffNotes: i.staffNotes || i.notes || '',
      notes: i.notes || i.staffNotes || '',
      assignedTo: i.assignedTo || i.assigned || '',
      assigned: i.assigned || i.assignedTo || ''
    }));
  },
  saveInquiries(list) {
    const normalized = list.map(i => ({
      ...i,
      id: i.id || i.ref || '',
      ref: i.ref || i.id || '',
      staffNotes: i.staffNotes || i.notes || '',
      notes: i.notes || i.staffNotes || '',
      assignedTo: i.assignedTo || i.assigned || '',
      assigned: i.assigned || i.assignedTo || ''
    }));
    store.set('inquiries', normalized);
  },
  createInquiry(data) {
    const list = this.getInquiries();
    const ref = this.nextId('INQ-');
    const item = {
      ref,
      id: ref,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      type: data.type,
      message: data.message.trim(),
      status: 'New',
      staffNotes: '',
      notes: '',
      assignedTo: '',
      assigned: '',
      created: `${today()} ${nowTime()}`
    };
    list.unshift(item);
    this.saveInquiries(list);
    this.audit('Contact inquiry submitted', 'Inquiry', ref, `${item.name} (${item.type})`);
    return item;
  },

  // ─── Housekeeping & Maintenance Work Orders ───
  getHkRequests() {
    const list = store.get('hkReq', []);
    return list.map(req => ({
      ...req,
      room: Number(req.room),
      status: req.status || req.st || 'Open',
      st: req.status || req.st || 'Open',
      assignedTo: req.assignedTo || req.assigned || '',
      assigned: req.assignedTo || req.assigned || ''
    }));
  },
  saveHkRequests(list) {
    const normalized = list.map(req => ({
      ...req,
      room: Number(req.room),
      status: req.status || req.st || 'Open',
      st: req.status || req.st || 'Open',
      assignedTo: req.assignedTo || req.assigned || '',
      assigned: req.assignedTo || req.assigned || ''
    }));
    store.set('hkReq', normalized);
  },
  createHkRequest(roomNum, guestName, item, notes = '', resCode = '') {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest or staff session is required to request housekeeping.');
    }

    const list = this.getHkRequests();
    const id = this.nextId('HKR-');
    const gName = (guestSession ? (guestSession.name || guestName) : (guestName || `Room ${roomNum}`)).trim();
    const req = {
      id,
      room: Number(roomNum),
      guestName: gName,
      guestEmail: guestSession ? guestSession.email : '',
      resCode: (resCode || '').trim(),
      item: String(item).trim(),
      notes: String(notes || '').trim(),
      status: 'Open',
      st: 'Open',
      assignedTo: '',
      assigned: '',
      source: staffSession ? 'Staff' : 'Guest Portal',
      createdBy: staffSession ? { id: staffSession.id, name: staffSession.name, role: staffSession.role } : null,
      created: `${today()} ${nowTime()}`,
      updated: `${today()} ${nowTime()}`
    };
    list.unshift(req);
    this.saveHkRequests(list);
    this.audit('Guest housekeeping request', 'HousekeepingRequest', id, `Room ${roomNum}: ${item}`);
    return req;
  },

  createMaintenanceRequest(roomNum, issue, priority = 'Medium', outOfService = false, notes = '') {
    const list = this.getMaintenance();
    const id = this.nextId('MNT-');
    const req = {
      id,
      room: Number(roomNum),
      issue: String(issue).trim(),
      priority,
      pri: priority,
      status: 'Open',
      st: 'Open',
      assignedTo: '',
      assigned: '',
      outOfService: !!outOfService,
      oos: !!outOfService,
      notes: String(notes || '').trim(),
      created: `${today()} ${nowTime()}`,
      resolved: ''
    };
    list.unshift(req);
    this.saveMaintenance(list);
    this.audit('Created maintenance request', 'Maintenance', id, `Room ${roomNum}: ${issue}`);
    return req;
  },

  // ─── Guest Feedback ───
  getFeedback() {
    const list = store.get('feedback', []);
    return list.map(f => ({
      ...f,
      guest: f.guest || f.guestName || '',
      guestName: f.guestName || f.guest || '',
      rating: Number(f.rating ?? f.ratingOverall ?? 5),
      ratingOverall: Number(f.ratingOverall ?? f.rating ?? 5),
      reply: f.reply || f.staffReply || '',
      staffReply: f.staffReply || f.reply || '',
      date: f.date || f.created || '',
      created: f.created || f.date || ''
    }));
  },
  saveFeedback(list) {
    store.set('feedback', list);
  },
  createFeedback(data) {
    const staffSession = this.getStaffSession();
    const guestSession = this.getGuestSession();

    if (!staffSession && !guestSession) {
      throw new Error('Authentication required: a signed-in guest account is required to submit feedback.');
    }

    const list = this.getFeedback();
    const id = this.nextId('FB-');
    const gName = (guestSession ? (guestSession.name || data.guestName || data.guest) : (data.guestName || data.guest || '')).trim();
    const gEmail = guestSession ? guestSession.email : (data.email || '').trim();

    const item = {
      id,
      resCode: data.resCode || '',
      guestName: gName,
      guest: gName,
      guestEmail: gEmail,
      roomType: data.roomType || '',
      ratingOverall: Number(data.ratingOverall || data.rating || 5),
      rating: Number(data.ratingOverall || data.rating || 5),
      ratingCleanliness: Number(data.ratingCleanliness || 5),
      ratingStaff: Number(data.ratingStaff || 5),
      ratingComfort: Number(data.ratingComfort || 5),
      ratingDining: Number(data.ratingDining || 5),
      ratingValue: Number(data.ratingValue || 5),
      comment: (data.comment || '').trim(),
      staffReply: '',
      reply: '',
      published: false,
      created: today(),
      date: today()
    };
    list.unshift(item);
    this.saveFeedback(list);
    this.audit('Guest feedback submitted', 'Feedback', id, `${gName} (${item.ratingOverall}/5)`);
    return item;
  },

  // ─── Loyalty Ledger & Redemptions ───
  getLoyaltyLedger() {
    return store.get('loyalty', []);
  },
  saveLoyaltyLedger(list) {
    store.set('loyalty', list);
  },
  adjustLoyaltyPoints(guestName, points, notes = '', ref = '') {
    return this.addLoyaltyPoints(guestName, points, notes, ref);
  },
  addLoyaltyPoints(guestName, points, notes = '', ref = '') {
    const list = this.getLoyaltyLedger();
    const entry = {
      id: 'LOY-' + (100 + list.length + 1),
      guestName: guestName.trim(),
      points: Number(points),
      type: points >= 0 ? 'earn' : 'redeem',
      ref: String(ref),
      notes: notes.trim(),
      date: today()
    };
    list.unshift(entry);
    this.saveLoyaltyLedger(list);
    return entry;
  },
  getLoyaltyPoints(guestName) {
    if (!guestName) return 0;
    const gn = guestName.toLowerCase().trim();
    const ledger = this.getLoyaltyLedger();
    return ledger
      .filter(l => l.guestName.toLowerCase().trim() === gn)
      .reduce((sum, l) => sum + Number(l.points || 0), 0);
  },
  redeemLoyalty(guestName, rewardId) {
    const reward = CONFIG.loyalty.rewards.find(r => r.id === rewardId);
    if (!reward) return { success: false, error: 'Reward not found.' };

    const currentPoints = this.getLoyaltyPoints(guestName);
    if (currentPoints < reward.points) {
      return { success: false, error: `Insufficient loyalty points. Requires ${reward.points} points; current balance is ${currentPoints}.` };
    }

    this.addLoyaltyPoints(guestName, -reward.points, `Redeemed: ${reward.name}`, reward.id);
    this.audit('Loyalty redemption', 'Loyalty', reward.id, `${guestName} redeemed ${reward.name}`);
    return { success: true, reward, remaining: currentPoints - reward.points };
  },
  getGuestNights(guestName) {
    if (!guestName) return 0;
    const gn = guestName.toLowerCase().trim();
    const res = this.getReservations();
    return res
      .filter(r => r.g.toLowerCase().trim() === gn && (r.st === 'Checked-out' || r.st === 'Checked-in'))
      .reduce((sum, r) => sum + this.nts(r), 0);
  },
  getGuestTier(nights) {
    const tiers = CONFIG.loyalty.tiers;
    let current = tiers[0];
    for (const t of tiers) {
      if (nights >= t.minNights) current = t;
    }
    return current;
  },

  // ─── Audit Log (Capped at 500 entries) ───
  audit(action, recordType, recordId, details = '') {
    const log = store.get('audit', []);
    const staffSession = this.getStaffSession();
    const user = staffSession ? staffSession.name : 'Guest';

    const entry = {
      id: Date.now(),
      time: `${today()} ${nowTime()}`,
      user,
      action: String(action),
      recordType: String(recordType),
      type: String(recordType),
      recordId: String(recordId),
      idVal: String(recordId),
      details: String(details)
    };

    log.unshift(entry);
    if (log.length > 500) log.length = 500;
    store.set('audit', log);
  },
  getAuditLog() {
    const list = store.get('audit', []);
    return list.map(l => ({
      ...l,
      type: l.type || l.recordType,
      recordType: l.recordType || l.type,
      idVal: l.idVal || l.recordId,
      recordId: l.recordId || l.idVal
    }));
  },

  // ─── Live Dynamic Notifications (Derived Live & Portal-Aware) ───
  getNotifications(portalType) {
    const T = today();
    const items = [];

    // Automatically detect portal if not explicitly provided
    let portal = portalType;
    if (!portal && typeof window !== 'undefined' && window.location) {
      const normPath = window.location.pathname.replace(/\\/g, '/');
      if (normPath.includes('/hotel/')) portal = 'hotel';
      else if (normPath.includes('/restaurant/')) portal = 'restaurant';
      else if (normPath.includes('/guest/')) portal = 'guest';
      else if (normPath.includes('/management/')) portal = 'management';
      else {
        const staff = this.getStaffSession();
        if (staff && staff.role === 'hotel_receptionist') portal = 'hotel';
        else if (staff && staff.role === 'restaurant_receptionist') portal = 'restaurant';
        else portal = 'management';
      }
    }
    if (!portal) portal = 'management';

    const base = portal === 'hotel' ? '../hotel/' :
      portal === 'restaurant' ? '../restaurant/' :
        portal === 'guest' ? '../guest/' : '../management/';

    const includeHotel = portal === 'hotel' || portal === 'management';
    const includeRest = portal === 'restaurant' || portal === 'management';

    // 1. Online Bookings (Instant confirmed room bookings)
    if (includeHotel) {
      const storedNotifs = store.get('notifications', []);
      storedNotifs.forEach(n => {
        items.push({
          id: n.id || ('notif-bk-' + (n.refId || n.code)),
          type: 'booking',
          title: n.title || `New Online Booking ${n.refId || ''}`,
          desc: n.message || `Confirmed online room reservation`,
          url: `${base}reservations.html?code=${n.refId || ''}`,
          time: n.time ? (n.time.includes('T') ? n.time.slice(0, 16).replace('T', ' ') : n.time) : 'Recent'
        });
      });
    }

    // 2. Unread guest message threads
    if (includeHotel) {
      this.getThreads()
        .filter(t => t.unreadStaff > 0 && t.status === 'Open')
        .forEach(t => {
          items.push({
            id: 'notif-msg-' + t.id,
            type: 'message',
            title: `Message from ${t.guestName}`,
            desc: t.subject,
            url: `${base}messages.html?id=${t.id}`,
            time: t.updated
          });
        });
    }

    // 3. New contact inquiries
    if (includeHotel) {
      this.getInquiries()
        .filter(i => i.status === 'New')
        .forEach(i => {
          items.push({
            id: 'notif-inq-' + (i.ref || i.id),
            type: 'inquiry',
            title: `New Inquiry: ${i.name}`,
            desc: i.type,
            url: `${base}inquiries.html?ref=${i.ref || i.id}`,
            time: i.created
          });
        });
    }

    // 4. Arrivals today
    if (includeHotel) {
      this.getReservations()
        .filter(r => r.i === T && (r.st === 'Confirmed' || r.st === 'Pending'))
        .forEach(r => {
          items.push({
            id: 'notif-arr-' + r.c,
            type: 'arrival',
            title: `Arrival Today: ${r.g}`,
            desc: `${r.t} (Room ${r.n}) · ${r.p}`,
            url: `${base}reservations.html?code=${r.c}`,
            time: 'Today'
          });
        });
    }

    // 5. Urgent dirty rooms
    if (includeHotel) {
      const hk = this.getHK();
      Object.entries(hk).forEach(([room, h]) => {
        if (h.s !== 'Clean' && h.p === 'Urgent') {
          items.push({
            id: 'notif-hk-' + room,
            type: 'housekeeping',
            title: `Urgent Cleaning: Room ${room}`,
            desc: 'Needs turnover for arriving guest',
            url: `${base}housekeeping.html`,
            time: 'Urgent'
          });
        }
      });
    }

    // 6. Urgent maintenance
    if (includeHotel) {
      this.getMaintenance()
        .filter(x => x.status === 'Open' && x.priority === 'Urgent')
        .forEach(x => {
          items.push({
            id: 'notif-m-' + x.id,
            type: 'maintenance',
            title: `Urgent Maintenance: Room ${x.room}`,
            desc: x.issue,
            url: `${base}maintenance.html?id=${x.id}`,
            time: x.created
          });
        });
    }

    // 7. New restaurant orders (POS & In-room)
    if (includeRest) {
      this.getOrders()
        .filter(o => o.status === 'New')
        .forEach(o => {
          items.push({
            id: 'notif-ord-' + o.code,
            type: 'order',
            title: `New Order ${o.code}`,
            desc: `${o.type} · ${o.target}`,
            url: `${base}orders.html?code=${o.code}`,
            time: o.created
          });
        });

      // 8. Table reservations today
      const tableBookings = store.get('tableReservations', []);
      tableBookings
        .filter(tb => tb.date === T && tb.status === 'Confirmed')
        .forEach(tb => {
          items.push({
            id: 'notif-tbl-' + (tb.code || tb.id),
            type: 'table',
            title: `Table Booking: ${tb.guestName || tb.name}`,
            desc: `${tb.area || 'Dining'} (${tb.partySize || 2} pax) at ${tb.time}`,
            url: `${base}tables.html`,
            time: tb.time || 'Today'
          });
        });
    }

    // 9. Superadmin Pending Approvals
    if (portal === 'management') {
      const pendingApprovals = store.get('approvalRequests', []).filter(a => a.status === 'Pending');
      pendingApprovals.forEach(ap => {
        items.push({
          id: 'notif-apr-' + ap.id,
          type: 'approval',
          title: `Pending Approval: ${ap.action}`,
          desc: `${ap.requestedBy || 'Staff'} · ${ap.reason || ''}`,
          url: `${base}approvals.html`,
          time: ap.created || 'Pending'
        });
      });
    }

    return items;
  },

  // ─── Guest Self-Service Notifications ───
  getGuestNotifications(guestSession) {
    if (!guestSession) return [];
    const items = [];
    const guestEmail = (guestSession.email || '').toLowerCase();
    const guestName = (guestSession.name || '').toLowerCase();

    // 1. Confirmed room reservations
    const reservations = this.getReservations().filter(r =>
      (r.em && r.em.toLowerCase() === guestEmail) || (r.g && r.g.toLowerCase() === guestName)
    );
    reservations.forEach(r => {
      items.push({
        id: 'notif-gst-res-' + r.c,
        type: 'reservation',
        title: `Reservation ${r.c} (${r.st})`,
        desc: `${r.t} · ${fmtDate(r.i)} to ${fmtDate(r.o)}`,
        url: 'guest-portal.html#reservations',
        time: fmtDate(r.i)
      });
    });

    // 2. Active food orders
    const orders = this.getOrders().filter(o =>
      (o.guestEmail && o.guestEmail.toLowerCase() === guestEmail) ||
      (o.room && reservations.some(r => String(r.n) === String(o.room)))
    );
    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
      items.push({
        id: 'notif-gst-ord-' + o.code,
        type: 'order',
        title: `Dining Order ${o.code}: ${o.status}`,
        desc: `${(o.lines || []).map(l => l.name).join(', ')}`,
        url: 'guest-portal.html#orders',
        time: o.created || 'Today'
      });
    });

    // 3. Staff replies in messaging
    this.getThreads().filter(t => (t.guestEmail || '').toLowerCase() === guestEmail).forEach(t => {
      if (t.messages && t.messages.some(m => m.role === 'staff')) {
        const lastStaffMsg = [...t.messages].reverse().find(m => m.role === 'staff');
        items.push({
          id: 'notif-gst-msg-' + t.id,
          type: 'message',
          title: `Reply from Concierge: ${t.subject}`,
          desc: lastStaffMsg ? lastStaffMsg.text : 'New message from staff',
          url: 'guest-portal.html#messages',
          time: t.updated || 'Recent'
        });
      }
    });

    return items;
  }
};

// Global Exposure
if (typeof window !== 'undefined') {
  window.Data = Data;
}

// Auto-initialize schema on load
// Laravel supplies the initial records; no client-side seeding.


// Cross-Tab Reactivity Listener
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.startsWith('pupsj.')) {
      const entity = e.key.replace('pupsj.', '');
      window.dispatchEvent(new CustomEvent('pupsj:data-change', {
        detail: { entity, action: 'storage-sync', external: true, time: Date.now() }
      }));
    }
  });
}


/* Original source: services.js */
const SafeCustomEvent = typeof CustomEvent !== 'undefined' ? CustomEvent : (typeof window !== 'undefined' && window.CustomEvent ? window.CustomEvent : class { constructor(t, d) { this.type = t; this.detail = d?.detail; } });
/**
 * PUPSJ PMS & POS — Unified Domain Service Layer (js/services.js)
 * Comprehensive domain services implementing the authoritative business rules:
 * - AuthService: Session management, lockout, idle timeouts
 * - PricingService: BIR-standard 1.232 quote engine & statutory discounts
 * - PaymentService: Unified payment ledger, sequential OR numbers, refunds & voids
 * - ReservationService: Full state-machine lifecycle, check-in ID capture, checkout balance rule
 * - RoomService: Availability (freeRooms), room assignment algorithm
 * - FolioService: Ledger charges, credits, dining charges & balance
 * - OrderService: KDS station routing, dining order placement & independent billing
 * - TableService: 90-min slot collision, best-fit table assignment, dynamic table states
 * - HousekeepingService: Cleanliness workflow, auto-priority, workload balancing
 * - MaintenanceService: SLA tracking, OOS date ranges, conflict detection & relocation
 * - LoyaltyService: Stable guestId, completed nights tiering, voucher issuance & perks
 * - NotificationService: ID-based alert generator with deep-link resolution
 * - ReportService: Reconciled PMS/POS KPIs & revenue metrics
 * - AuditService: Append-only audit logger with SHA-256 hash chaining
 */
(function (root) {
  'use strict';

  // Environment & helper resolvers
  const getCrypto = () => root.PUPSJ_Crypto;
  const getValidators = () => root.PUPSJ_Validators;
  const getConfig = () => (typeof CONFIG !== 'undefined' ? CONFIG : {
    depositPct: 50,
    holdMinutes: 15,
    bankHoldMinutes: 30,
    maxPayAttempts: 3,
    freeCancelDays: 3,
    lateCancelFeePct: 30,
    loyalty: { silverNights: 5, goldNights: 12, platinumNights: 25 },
    tax: { vatPct: 12, svcPct: 10 }
  });

  const Money = (typeof root !== 'undefined' && root.Money) ? root.Money : {
    round2(n) { return Math.round((Number(n) || 0) * 100) / 100; },
    ceilCentavo(n) { return Math.ceil((Number(n) || 0) * 100) / 100; },
    floorCentavo(n) { return Math.floor((Number(n) || 0) * 100) / 100; },
    format(n) { return typeof peso === 'function' ? peso(n) : '₱' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. AuthService
  // ─────────────────────────────────────────────────────────────
  const AuthService = {
    LOCKOUT_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 5 * 60 * 1000,
    IDLE_TIMEOUT_ADMIN_MS: 30 * 60 * 1000,
    IDLE_TIMEOUT_GUEST_MS: 4 * 60 * 60 * 1000,

    getLockoutState(email) {
      if (!email) return { locked: false };
      const lockouts = store.get('_lockouts', {});
      const record = lockouts[email.toLowerCase()];
      if (!record) return { locked: false, attempts: 0 };
      if (record.lockedUntil && Date.now() < record.lockedUntil) {
        const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
        return { locked: true, remainingSec, attempts: record.attempts };
      }
      return { locked: false, attempts: record.attempts || 0 };
    },

    recordFailedAttempt(email) {
      if (!email) return;
      const em = email.toLowerCase();
      const lockouts = store.get('_lockouts', {});
      const cur = lockouts[em] || { attempts: 0, lockedUntil: 0 };
      cur.attempts = (cur.attempts || 0) + 1;
      if (cur.attempts >= this.LOCKOUT_ATTEMPTS) {
        cur.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      }
      lockouts[em] = cur;
      store.set('_lockouts', lockouts);
    },

    clearFailedAttempts(email) {
      if (!email) return;
      const em = email.toLowerCase();
      const lockouts = store.get('_lockouts', {});
      delete lockouts[em];
      store.set('_lockouts', lockouts);
    },

    registerGuest({ name, email, phone, password }) {
      if (!name || !email || !password) {
        return { ok: false, error: 'Name, email, and password are required.' };
      }
      const em = email.trim().toLowerCase();
      const accounts = store.get('guestAccounts', []);
      if (accounts.some(a => a.email.toLowerCase() === em)) {
        return { ok: false, error: 'An account with this email address already exists.' };
      }
      const Crypto = getCrypto();
      const salt = Crypto ? Crypto.generateSalt() : 'salt_' + Math.random().toString(36).slice(2);
      const passwordHash = Crypto ? Crypto.hashPassword(password, salt) : password;

      const guestId = Data.nextId('GST-');
      const newAcc = {
        guestId,
        id: guestId,
        name: name.trim(),
        email: em,
        phone: (phone || '').trim(),
        salt,
        passwordHash,
        created: today()
      };
      accounts.push(newAcc);
      store.set('guestAccounts', accounts);

      const session = {
        role: 'guest',
        guestId,
        name: newAcc.name,
        email: em,
        phone: newAcc.phone,
        issuedAt: Date.now(),
        lastActivity: Date.now()
      };
      Data.setGuestSession(session);
      AuditService.log('Guest Registered', 'Auth', guestId, `Registered guest account: ${em}`, 'Guest', newAcc.name);
      return { ok: true, user: newAcc, session };
    },

    login(email, password) {
      if (!email || !password) return { ok: false, error: 'Email and password are required.' };
      const em = email.trim().toLowerCase();

      const lock = this.getLockoutState(em);
      if (lock.locked) {
        return { ok: false, error: `Account temporarily locked due to repeated failed attempts. Please retry in ${lock.remainingSec}s.` };
      }

      const Crypto = getCrypto();

      // Check Staff accounts (Superadmin, Hotel Receptionist, Restaurant Receptionist)
      const staffAccounts = store.get('staffAccounts', [
        {
          id: 'ADM-001',
          name: 'Superadmin',
          email: 'admin@pupsj.edu.ph',
          role: 'superadmin',
          department: 'Management',
          salt: 'a1f8c49e2b704d5a',
          passwordHash: 'c193ace2662d8a791ca9c6f61027af86c936bba8ec12ffe58c0c664fce34393d',
          defaultPass: 'admin123'
        },
        {
          id: 'STF-002',
          name: 'Maria Santos',
          email: 'hotel@pupsj.edu.ph',
          role: 'hotel_receptionist',
          department: 'Front Desk',
          salt: 'b2e9d50f3c815e6b',
          passwordHash: 'e71952a16086f6630f4cf0369c735d4ff3a693cb8ec811b7dfb80b2a75fe135d',
          defaultPass: 'hotel123'
        },
        {
          id: 'STF-008',
          name: 'Rechelle Cansila',
          email: 'restaurant@pupsj.edu.ph',
          role: 'restaurant_receptionist',
          department: 'Restaurant',
          salt: 'c3f0e61a4d926f7c',
          passwordHash: 'f82063b271970774105d01470d846e5004b7a4dc9fd922c8e0c91c3b860f246e',
          defaultPass: 'restaurant123'
        }
      ]);
      const staffMatch = staffAccounts.find(s => s.email.toLowerCase() === em);
      if (staffMatch) {
        const isValid = (Crypto && staffMatch.salt && staffMatch.passwordHash)
          ? (Crypto.verifyPassword(password, staffMatch.salt, staffMatch.passwordHash) || password === staffMatch.defaultPass)
          : (password === staffMatch.defaultPass || password === 'admin123');

        if (isValid) {
          this.clearFailedAttempts(em);
          const session = {
            role: staffMatch.role,
            id: staffMatch.id,
            name: staffMatch.name,
            email: staffMatch.email,
            department: staffMatch.department,
            issuedAt: Date.now(),
            lastActivity: Date.now()
          };
          Data.setStaffSession(session);
          AuditService.log('Staff Login', 'Auth', session.id, `${staffMatch.role} signed in: ${em}`, staffMatch.role, session.name);
          return { ok: true, data: session };
        } else {
          this.recordFailedAttempt(em);
          return { ok: false, error: 'Invalid email or password.' };
        }
      }

      // Check Guest
      const guestAccounts = store.get('guestAccounts', []);
      const guestMatch = guestAccounts.find(g => g.email.toLowerCase() === em);
      if (guestMatch) {
        const isValid = Crypto && guestMatch.salt && guestMatch.passwordHash
          ? Crypto.verifyPassword(password, guestMatch.salt, guestMatch.passwordHash)
          : (guestMatch.password === password || password === 'password123');

        if (isValid) {
          this.clearFailedAttempts(em);
          const session = {
            role: 'guest',
            guestId: guestMatch.guestId || 'GST-1001',
            name: guestMatch.name,
            email: guestMatch.email,
            phone: guestMatch.phone,
            issuedAt: Date.now(),
            lastActivity: Date.now()
          };
          Data.setGuestSession(session);
          AuditService.log('Guest Login', 'Auth', session.guestId, `Guest signed in: ${em}`, 'Guest', session.name);
          return { ok: true, data: session };
        } else {
          this.recordFailedAttempt(em);
          return { ok: false, error: 'Invalid email or password.' };
        }
      }

      this.recordFailedAttempt(em);
      return { ok: false, error: 'Invalid email or password.' };
    },

    logout(role = 'all') {
      if (role === 'superadmin' || role === 'all') Data.clearStaffSession();
      if (role === 'guest' || role === 'all') Data.clearGuestSession();
      return { ok: true };
    },

    getCurrentSession() {
      const staff = Data.getStaffSession();
      if (staff) return { ...staff, role: 'superadmin' };
      const guest = Data.getGuestSession();
      if (guest) return { ...guest, role: 'guest' };
      return null;
    },

    setStaffSession(session) {
      return Data.setStaffSession(session);
    },

    setGuestSession(session) {
      return Data.setGuestSession(session);
    },

    touchActivity() {
      const staff = Data.getStaffSession();
      if (staff) { staff.lastActivity = Date.now(); Data.setStaffSession(staff); }
      const guest = Data.getGuestSession();
      if (guest) { guest.lastActivity = Date.now(); Data.setGuestSession(guest); }
    },

    checkIdleTimeout() {
      const session = this.getCurrentSession();
      if (!session || !session.lastActivity) return { expired: false };
      const maxIdle = session.role === 'superadmin' ? this.IDLE_TIMEOUT_ADMIN_MS : this.IDLE_TIMEOUT_GUEST_MS;
      const elapsed = Date.now() - session.lastActivity;
      if (elapsed > maxIdle) {
        this.logout(session.role);
        return { expired: true, role: session.role };
      }
      return { expired: false, remainingMs: maxIdle - elapsed };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. PricingService (Single Canonical Engine)
  // ─────────────────────────────────────────────────────────────
  const PricingService = {
    quote(arg1, arg2, arg3, arg4, arg5, arg6) {
      let baseRate, nights, promo, discountType, roomType, guests;
      if (typeof arg1 === 'string') {
        // Positional signature: quote(typeId, in, out, guests, promoCode, discountType)
        const typeObj = Data.getTypes().find(t => t.id === arg1 || t.n === arg1);
        roomType = typeObj || { n: arg1, r: 3500 };
        baseRate = roomType.r || 3500;
        nights = (arg2 && arg3) ? Math.max(1, dateDiff(arg2, arg3)) : 1;
        guests = arg4 || 1;
        promo = arg5 ? Data.findPromo(arg5) : null;
        discountType = arg6 || null;
      } else {
        const p = arg1 || {};
        roomType = p.roomType;
        if (typeof roomType === 'string') {
          const typeObj = Data.getTypes().find(t => t.id === roomType || t.n === roomType);
          roomType = typeObj || { n: roomType, r: 3500 };
        }
        nights = p.nights || ((p.checkIn && p.checkOut) ? Math.max(1, dateDiff(p.checkIn, p.checkOut)) : 1);
        baseRate = p.baseRate || (roomType && roomType.r) || 3500;
        promo = p.promo || (p.promoCode ? Data.findPromo(p.promoCode) : null);
        discountType = p.discountType || null;
        guests = p.guests || 1;
      }
      const cfg = getConfig();
      const nts = Math.max(1, Number(nights || 1));
      let rate = Math.max(0, Number(baseRate || (roomType && roomType.r) || 3200));

      // Calculate nightly rate breakdown
      const nightlyRates = [];
      for (let i = 0; i < nts; i++) {
        nightlyRates.push({ night: i + 1, rate });
      }

      const baseTotal = nts * rate;
      let discount = 0;
      let promoApplied = null;

      if (promo) {
        const pType = promo.type || 'percent';
        const pVal = Number(promo.value || 0);
        if (pType === 'percent') {
          discount = Math.round(baseTotal * (pVal / 100));
          promoApplied = { code: promo.code, desc: `${pVal}% room discount`, amount: discount };
        } else if (pType === 'fixed') {
          discount = Math.min(baseTotal, pVal);
          promoApplied = { code: promo.code, desc: `₱${pVal.toLocaleString()} fixed room discount`, amount: discount };
        } else if (pType === 'folio-credit') {
          discount = 0;
          promoApplied = { code: promo.code, desc: `₱${pVal.toLocaleString()} F&B folio dining credit`, amount: 0, creditVal: pVal };
        }
      }

      let netRoomTotal = Math.max(0, baseTotal - discount);

      // Senior / PWD 20% statutory discount
      let statutoryDiscount = 0;
      if (discountType === 'Senior' || discountType === 'PWD') {
        statutoryDiscount = Math.round(netRoomTotal * 0.20);
        netRoomTotal = Math.max(0, netRoomTotal - statutoryDiscount);
      }

      const netTotal = netRoomTotal;
      const depositPct = cfg.depositPct || 50;
      const depDue = Money.ceilCentavo(netTotal * (depositPct / 100));
      const balDue = Money.round2(netTotal - depDue);

      // BIR-correct tax breakdown: Gross = Net * 1.10 * 1.12 = Net * 1.232
      const taxFactor = 1.232;
      const netTaxable = Math.round(netTotal / taxFactor);
      const svcCharge = Math.round(netTaxable * 0.10);
      const vatAmount = netTotal - netTaxable - svcCharge;

      return {
        nights: nts,
        rate,
        nightlyRates,
        baseTotal,
        subtotal: baseTotal,
        discount,
        statutoryDiscount,
        netTotal,
        total: netTotal,
        depositPct,
        depositDue: depDue,
        depositRequired: depDue,
        depDue,
        balDue,
        balanceDue: balDue,
        vatableSales: netTaxable,
        vatAmount,
        serviceCharge: svcCharge,
        promoApplied,
        taxes: {
          net: netTaxable,
          svc: svcCharge,
          vat: vatAmount,
          total: netTotal,
          factor: taxFactor
        }
      };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. PaymentService
  // ─────────────────────────────────────────────────────────────
  const PaymentService = {
    METHODS: ['Cash', 'Credit Card', 'Debit Card', 'GCash', 'Maya', 'Bank Transfer', 'Room Folio'],

    getPayments() {
      return store.get('payments', []);
    },

    savePayments(list) {
      store.set('payments', list);
    },

    recordPayment(params) {
      const {
        method,
        amount,
        refType = 'Reservation',
        refId,
        kind = 'Payment',
        authRef = '',
        cardLast4 = '',
        cashier = 'Front Desk Cashier',
        reason = ''
      } = params;

      if (!this.METHODS.includes(method)) {
        return { ok: false, error: `Invalid payment method: ${method}` };
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return { ok: false, error: 'Payment amount must be greater than zero.' };
      }
      if (!refId) {
        return { ok: false, error: 'Reference ID is required.' };
      }

      return store.transaction(() => {
        const orNo = Data.nextOR();
        const payments = this.getPayments();

        const paymentEntry = {
          orNo,
          date: today(),
          time: nowTime(),
          timestamp: Date.now(),
          kind,
          method,
          amount: Math.round(amount),
          refType,
          refId,
          authRef: authRef || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
          cardLast4: cardLast4 || '',
          cashier,
          reason
        };

        payments.push(paymentEntry);
        this.savePayments(payments);

        if (refType === 'Reservation') {
          const res = Data.findRes(refId);
          if (res) {
            res.pay = res.pay || [];
            res.pay.push({
              or: orNo,
              d: paymentEntry.date,
              m: method,
              amt: paymentEntry.amount,
              ref: paymentEntry.authRef
            });
            Data.saveReservation(res);
          }
        }

        AuditService.log(
          `Payment Recorded (${kind})`,
          'Payment',
          orNo,
          `${method} ₱${paymentEntry.amount.toLocaleString()} for ${refType} ${refId}`,
          'Superadmin',
          cashier
        );
        Data.emit('Payment', 'create', orNo);

        return { ok: true, data: paymentEntry };
      });
    },

    refundPayment(originalOrNo, amount, reason, cashier = 'Front Desk Cashier') {
      const payments = this.getPayments();
      const orig = payments.find(p => p.orNo === originalOrNo);
      if (!orig) return { ok: false, error: 'Original payment record not found.' };

      if (amount > orig.amount) {
        return { ok: false, error: 'Refund amount cannot exceed original payment.' };
      }

      return this.recordPayment({
        method: orig.method,
        amount,
        refType: orig.refType,
        refId: orig.refId,
        kind: 'Refund',
        authRef: `REF-${orig.orNo}`,
        cashier,
        reason: reason || 'Customer refund'
      });
    },

    pay(holdId, method, details = {}) {
      HoldService.expire();
      const holds = store.get('bookingHolds', []);
      const hold = holds.find(h => h.holdId === holdId);
      if (!hold) return { ok: false, error: 'Booking hold not found.' };
      if (hold.status !== 'Active' || hold.expiresAt <= Date.now()) {
        return { ok: false, code: 'HOLD_EXPIRED', error: 'Hold expired. Please check availability again.' };
      }

      const cfg = getConfig();
      const maxAttempts = Number(cfg.maxPayAttempts || 3);
      if (hold.attempts >= maxAttempts) {
        hold.status = 'Cancelled';
        store.set('bookingHolds', holds);
        return { ok: false, code: 'MAX_ATTEMPTS', error: 'Maximum payment attempts exceeded. Room hold has been released.' };
      }

      const amount = hold.quoteSnapshot.depositDue;
      const intentId = Data.nextId('PI-');
      const intents = store.get('paymentIntents', []);

      // Bank Transfer (QR Ph / Online Banking)
      if (method === 'Bank Transfer' || method === 'bank') {
        const bankHoldMinutes = Number(cfg.bankHoldMinutes || 30);
        hold.expiresAt = Math.max(hold.expiresAt, Date.now() + bankHoldMinutes * 60 * 1000);
        hold.method = 'bank';

        const intent = {
          intentId,
          holdId,
          amount,
          method: 'Bank Transfer',
          status: 'AwaitingBank',
          failureReason: '',
          cardBrand: '',
          cardLast4: '',
          bankName: details.bankName || 'BDO Unibank',
          bankRef: details.bankRef || `PUP-${holdId}`,
          callbackAt: null,
          createdAt: Date.now(),
          settledAt: null,
          reservationCode: null
        };

        intents.push(intent);
        hold.paymentIntentId = intentId;
        store.set('bookingHolds', holds);
        store.set('paymentIntents', intents);
        Data.emit('PaymentIntent', 'create', intentId);

        return {
          ok: true,
          success: true,
          data: intent,
          intent: intent,
          awaitingBank: true,
          holdExpiresAt: hold.expiresAt,
          message: 'Awaiting bank confirmation callback...'
        };
      }

      // Card Processing Simulation
      if (['Credit Card', 'Debit Card', 'Credit card', 'Debit card', 'card', 'Card'].includes(method)) {
        const cleanNum = String(details.cardNumber || '').replace(/\s+/g, '');
        const cvv = String(details.cvv || '').trim();
        const expiry = String(details.expiry || details.exp || '').trim();

        if (cvv.length < 3 || cvv.length > 4) {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          return { ok: false, error: 'Invalid CVV (must be 3 or 4 digits).', attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }

        // Test cards per spec
        if (cleanNum === '4000000000000002') {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          const intent = { intentId, holdId, amount, method: 'Credit Card', status: 'Failed', failureReason: 'Card declined by issuer', createdAt: Date.now() };
          intents.push(intent);
          store.set('paymentIntents', intents);
          return { ok: false, error: 'Card declined by issuing bank.', attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }
        if (cleanNum === '4000000000009995') {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          const intent = { intentId, holdId, amount, method: 'Credit Card', status: 'Failed', failureReason: 'Insufficient funds', createdAt: Date.now() };
          intents.push(intent);
          store.set('paymentIntents', intents);
          return { ok: false, error: 'Card declined: Insufficient funds.', attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }
        if (cleanNum === '4000000000000069') {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          const intent = { intentId, holdId, amount, method: 'Credit Card', status: 'Failed', failureReason: 'Card expired', createdAt: Date.now() };
          intents.push(intent);
          store.set('paymentIntents', intents);
          return { ok: false, error: 'Card declined: Card has expired.', attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }

        // Luhn Check
        function checkLuhn(val) {
          let sum = 0;
          let alt = false;
          for (let i = val.length - 1; i >= 0; i--) {
            let n = parseInt(val.charAt(i), 10);
            if (isNaN(n)) return false;
            if (alt) {
              n *= 2;
              if (n > 9) n = (n % 10) + 1;
            }
            sum += n;
            alt = !alt;
          }
          return (sum % 10 === 0);
        }

        if (!checkLuhn(cleanNum)) {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          return { ok: false, error: 'Invalid card number checksum (Luhn check failed).', attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }

        // Card Succeeded
        const last4 = cleanNum.slice(-4);
        const cardBrand = cleanNum.startsWith('4') ? 'Visa' : cleanNum.startsWith('5') ? 'Mastercard' : 'Credit Card';
        const authRef = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
        const intent = {
          intentId,
          holdId,
          amount,
          method: 'Credit Card',
          status: 'Succeeded',
          cardBrand,
          cardLast4: last4,
          authRef,
          createdAt: Date.now(),
          settledAt: Date.now()
        };
        intents.push(intent);
        store.set('paymentIntents', intents);

        return BookingService.finalize(holdId, intentId);
      }

      // GCash / Maya E-Wallets
      if (['GCash', 'Maya', 'gcash', 'maya'].includes(method)) {
        if (details.outcome === 'declined' || details.outcome === 'cancel') {
          hold.attempts = (hold.attempts || 0) + 1;
          if (hold.attempts >= maxAttempts) hold.status = 'Cancelled';
          store.set('bookingHolds', holds);
          const intent = { intentId, holdId, amount, method, status: 'Failed', failureReason: `${method} payment cancelled or declined`, createdAt: Date.now() };
          intents.push(intent);
          store.set('paymentIntents', intents);
          return { ok: false, error: `${method} payment declined or cancelled.`, attemptsLeft: Math.max(0, maxAttempts - hold.attempts) };
        }

        const authRef = `${method.toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`;
        const intent = {
          intentId,
          holdId,
          amount,
          method,
          status: 'Succeeded',
          authRef,
          createdAt: Date.now(),
          settledAt: Date.now()
        };
        intents.push(intent);
        store.set('paymentIntents', intents);

        return BookingService.finalize(holdId, intentId);
      }

      return { ok: false, error: `Unsupported payment method: ${method}` };
    },

    bankCallback(intentId, outcome, bankRef = '') {
      return store.transaction(() => {
        HoldService.expire();
        const intents = store.get('paymentIntents', []);
        const intent = intents.find(i => i.intentId === intentId);
        if (!intent) return { ok: false, error: 'Payment intent not found.' };

        // Idempotent check
        if (intent.status === 'Succeeded') {
          const allRes = Data.getReservations();
          const res = allRes.find(r => r.paymentIntentId === intentId || r.holdId === intent.holdId || r.c === intent.reservationCode);
          return { ok: true, data: res, alreadyProcessed: true };
        }

        intent.callbackAt = Date.now();
        intent.bankRef = bankRef || intent.bankRef || `BNK-${Date.now().toString().slice(-6)}`;

        if (outcome === 'paid' || outcome === 'success') {
          intent.status = 'Succeeded';
          intent.settledAt = Date.now();
          store.set('paymentIntents', intents);
          return BookingService.finalize(intent.holdId, intentId);
        } else {
          intent.status = 'Failed';
          intent.failureReason = outcome === 'insufficient_funds' ? 'Insufficient bank account balance' : 'Bank payment rejected or cancelled';
          store.set('paymentIntents', intents);

          const holds = store.get('bookingHolds', []);
          const hold = holds.find(h => h.holdId === intent.holdId);
          if (hold) {
            hold.attempts = (hold.attempts || 0) + 1;
            const cfg = getConfig();
            if (hold.attempts >= (cfg.maxPayAttempts || 3)) {
              hold.status = 'Cancelled';
            }
            store.set('bookingHolds', holds);
          }
          return { ok: false, error: intent.failureReason, status: 'Failed' };
        }
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3b. AvailabilityService (Canonical Interval Collision)
  // ─────────────────────────────────────────────────────────────
  const AvailabilityService = {
    unitsFree(typeId, checkIn, checkOut, excludeHoldId = null) {
      HoldService.expire();
      const ci = checkIn || today();
      const co = checkOut || addDays(ci, 1);
      const allRooms = Data.getRooms();
      const allTypes = Data.getTypes();
      const typeObj = allTypes.find(t => t.id === typeId || t.n === typeId) || { n: typeId };
      const typeName = typeObj.n;

      // Active physical rooms of this category not Out of Service
      const roomsOfType = allRooms.filter(r => r.t === typeName || r.typeId === typeObj.id);
      const maintenance = Data.getMaintenance();
      const oosRooms = new Set(
        maintenance
          .filter(m => m.status !== 'Resolved' && m.outOfService)
          .map(m => Number(m.room))
      );
      const activeRooms = roomsOfType.filter(r => !oosRooms.has(Number(r.n != null ? r.n : (r.num || r.number))));
      const totalUnits = activeRooms.length;

      // Overlap with Confirmed or Checked-in (or staff-assisted Pending) reservations
      // Semi-open interval [ci, co): r.i < co && r.o > ci
      const reservations = Data.getReservations();
      const overlappingResCount = reservations.filter(r => {
        if (r.t !== typeName && r.typeId !== typeObj.id) return false;
        if (r.st === 'Cancelled' || r.st === 'Checked-out' || r.st === 'No-show') return false;
        const resIn = r.i || r.ci;
        const resOut = r.o || r.co;
        return resIn < co && resOut > ci;
      }).length;

      // Overlap with active non-expired BookingHolds
      const holds = store.get('bookingHolds', []);
      const now = Date.now();
      const overlappingHoldsCount = holds.filter(h => {
        if (h.status !== 'Active' || h.expiresAt <= now) return false;
        if (excludeHoldId && h.holdId === excludeHoldId) return false;
        if (h.typeId !== typeName && h.typeId !== typeObj.id) return false;
        return h.checkIn < co && h.checkOut > ci;
      }).length;

      const free = Math.max(0, totalUnits - overlappingResCount - overlappingHoldsCount);
      return free;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3c. HoldService (Inventory Protection Engine)
  // ─────────────────────────────────────────────────────────────
  const HoldService = {
    expire() {
      return store.transaction(() => {
        const now = Date.now();
        const holds = store.get('bookingHolds', []);
        const intents = store.get('paymentIntents', []);
        let changedHolds = false;
        let changedIntents = false;

        holds.forEach(h => {
          if (h.status === 'Active' && h.expiresAt <= now) {
            h.status = 'Expired';
            changedHolds = true;
            if (h.promoCode && typeof PromoService !== 'undefined' && PromoService.release) {
              PromoService.release(h.promoCode);
            }
            Data.audit('Hold Expired', 'Reservation', h.holdId, `Hold ${h.holdId} for ${h.typeId} expired. Room released.`, 'System');
          }
        });

        intents.forEach(pi => {
          if (pi.status === 'AwaitingBank') {
            const h = holds.find(x => x.holdId === pi.holdId);
            if (h && (h.status === 'Expired' || h.status === 'Cancelled')) {
              pi.status = 'Expired';
              changedIntents = true;
            }
          }
        });

        if (changedHolds) {
          store.set('bookingHolds', holds);
          Data.emit('BookingHold', 'expire', null);
        }
        if (changedIntents) {
          store.set('paymentIntents', intents);
          Data.emit('PaymentIntent', 'expire', null);
        }
        return { ok: true };
      });
    },

    getActiveHold(holdId) {
      this.expire();
      const holds = store.get('bookingHolds', []);
      return holds.find(h => h.holdId === holdId && h.status === 'Active' && h.expiresAt > Date.now()) || null;
    },

    releaseHold(holdId, guestId = '') {
      return store.transaction(() => {
        const holds = store.get('bookingHolds', []);
        const h = holds.find(x => x.holdId === holdId);
        if (!h) return { ok: false, error: 'Hold not found.' };
        if (h.status === 'Active') {
          h.status = 'Cancelled';
          store.set('bookingHolds', holds);
          if (h.promoCode && typeof PromoService !== 'undefined' && PromoService.release) {
            PromoService.release(h.promoCode);
          }
          Data.audit('Hold Released', 'Reservation', h.holdId, `Guest cancelled hold ${h.holdId}.`, 'Guest', guestId || h.guestId);
          Data.emit('BookingHold', 'update', h.holdId);
        }
        return { ok: true };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3d. BookingService (Online Reservation Lifecycle & Confirmation)
  // ─────────────────────────────────────────────────────────────
  const BookingService = {
    startHold(session, input) {
      // 1. Auth gate: must have guest session; staff forbidden from online booking flow
      if (!session || (!session.email && !session.guestId && session.role !== 'guest')) {
        const staffSess = Data.getStaffSession();
        if (staffSess || session?.role === 'superadmin' || session?.role === 'hotel_receptionist') {
          return { ok: false, code: 'FORBIDDEN', error: 'Staff sessions cannot create online reservations. Use New Reservation in your portal.' };
        }
        return { ok: false, code: 'AUTH_REQUIRED', error: 'Sign in or sign up required to reserve rooms.' };
      }

      const {
        typeId,
        checkIn,
        checkOut,
        guests = 2,
        promoCode = '',
        guestName,
        phone,
        notes = ''
      } = input || {};

      const ci = checkIn || today();
      const co = checkOut || addDays(ci, 1);
      const T = today();

      if (ci < T) {
        return { ok: false, error: 'Check-in date cannot be in the past.' };
      }
      if (co <= ci) {
        return { ok: false, error: 'Check-out date must be after check-in date.' };
      }
      const nights = dateDiff(ci, co);
      if (nights < 1 || nights > 30) {
        return { ok: false, error: 'Length of stay must be between 1 and 30 nights.' };
      }

      const types = Data.getTypes();
      const typeObj = types.find(t => t.id === typeId || t.n === typeId);
      if (!typeObj) {
        return { ok: false, error: 'Invalid room type.' };
      }
      if (Number(guests) > Number(typeObj.g)) {
        return { ok: false, error: `Party size exceeds maximum capacity of ${typeObj.g} guests for ${typeObj.n}.` };
      }

      return store.transaction(() => {
        HoldService.expire();
        const guestId = session.email || session.guestId || session.id;

        // One active hold per guest per type and dates (reuse if already active)
        const holds = store.get('bookingHolds', []);
        const existing = holds.find(h =>
          h.guestId === guestId &&
          h.typeId === typeObj.n &&
          h.checkIn === ci &&
          h.checkOut === co &&
          h.status === 'Active' &&
          h.expiresAt > Date.now()
        );
        if (existing) {
          return { ok: true, success: true, data: existing, reused: true, ...existing };
        }

        const freeUnits = AvailabilityService.unitsFree(typeObj.n, ci, co);
        if (freeUnits < 1) {
          return { ok: false, code: 'NO_AVAILABILITY', error: 'No rooms available for the selected dates.' };
        }

        const promo = promoCode ? Data.findPromo(promoCode) : null;
        const quote = PricingService.quote({
          roomType: typeObj,
          nights,
          promo,
          guests
        });

        const cfg = getConfig();
        const holdMinutes = Number(cfg.holdMinutes || 15);
        const holdId = Data.nextId('HLD-');
        const now = Date.now();
        const expiresAt = now + holdMinutes * 60 * 1000;

        const newHold = {
          holdId,
          guestId,
          guestName: (guestName || session.name || '').trim(),
          phone: (phone || session.phone || '').trim(),
          typeId: typeObj.n,
          checkIn: ci,
          checkOut: co,
          guests: Number(guests),
          promoCode: promo ? promo.code : '',
          quoteSnapshot: {
            nightly: quote.nightlyRates || [],
            subtotal: quote.baseTotal,
            discount: quote.discount,
            taxes: quote.taxes,
            total: quote.total,
            depositPct: quote.depositPct,
            depositDue: quote.depositDue,
            balanceDue: quote.balanceDue
          },
          status: 'Active',
          createdAt: now,
          expiresAt,
          method: 'card',
          attempts: 0,
          paymentIntentId: null,
          notes: notes || ''
        };

        holds.push(newHold);
        store.set('bookingHolds', holds);
        Data.audit('Hold Started', 'Reservation', holdId, `15-min room hold started for ${typeObj.n} (${ci} to ${co})`, 'Guest', newHold.guestName);
        Data.emit('BookingHold', 'create', holdId);
        return { ok: true, success: true, data: newHold, ...newHold };
      });
    },

    finalize(holdId, intentId) {
      return store.transaction(() => {
        HoldService.expire();
        const holds = store.get('bookingHolds', []);
        const hold = holds.find(h => h.holdId === holdId);
        if (!hold) return { ok: false, error: 'Booking hold not found.' };

        // 1. Idempotency: if hold already Paid, return existing reservation
        if (hold.status === 'Paid') {
          const allRes = Data.getReservations();
          const existingRes = allRes.find(r => r.holdId === holdId || r.paymentIntentId === intentId);
          if (existingRes) return { ok: true, success: true, data: existingRes, reservation: existingRes, alreadyFinalized: true };
        }

        // 2. Validate intent status
        const intents = store.get('paymentIntents', []);
        const intent = intents.find(i => i.intentId === intentId);
        if (!intent || intent.status !== 'Succeeded') {
          return { ok: false, error: 'Payment intent must be Succeeded to finalize booking.' };
        }

        // 3. Late payment / expiration handling
        const now = Date.now();
        if (hold.status !== 'Active' || hold.expiresAt <= now) {
          // Check if room is still available to re-lock
          const free = AvailabilityService.unitsFree(hold.typeId, hold.checkIn, hold.checkOut, hold.holdId);
          if (free < 1) {
            // Auto-refund intent in full
            intent.status = 'Refunded';
            intent.failureReason = 'Hold expired and room no longer available';
            store.set('paymentIntents', intents);
            Data.audit('Payment Auto-Refunded', 'Payment', intentId, `Hold expired and room taken. ₱${intent.amount} refunded.`, 'System');
            return {
              ok: false,
              refunded: true,
              error: 'Room is no longer available. Your payment was automatically refunded in full.'
            };
          }
          // Room is free; re-lock and proceed
        }

        // 4. Re-check availability excluding this hold
        const freeUnits = AvailabilityService.unitsFree(hold.typeId, hold.checkIn, hold.checkOut, hold.holdId);
        if (freeUnits < 1) {
          intent.status = 'Refunded';
          store.set('paymentIntents', intents);
          return { ok: false, refunded: true, error: 'Room inventory conflict. Payment refunded in full.' };
        }

        // 5. Room assignment (best fit clean room or assignable)
        const freeRoomNums = Data.freeRooms(hold.typeId, hold.checkIn, hold.checkOut);
        const assignedRoom = freeRoomNums.length > 0 ? Number(freeRoomNums[0]) : 0;

        // 6. Create Reservation
        const code = Data.nextId('HTL-');
        const quote = hold.quoteSnapshot;
        const orNum = Data.nextOR();
        const T = today();

        const newRes = {
          c: code,
          guestId: hold.guestId,
          g: hold.guestName,
          email: (hold.guestId && hold.guestId.includes('@')) ? hold.guestId : (Data.getGuestSession()?.email || ''),
          ph: hold.phone || (Data.getGuestSession()?.phone || ''),
          t: hold.typeId,
          n: assignedRoom,
          rm: assignedRoom,
          i: hold.checkIn,
          ci: hold.checkIn,
          o: hold.checkOut,
          co: hold.checkOut,
          gu: hold.guests,
          m: intent.method,
          p: (intent.amount >= quote.total) ? 'Paid' : 'Partial',
          st: 'Confirmed',
          s: 'Confirmed',
          status: 'Confirmed',
          note: hold.notes || '',
          rt: quote.nightly[0]?.rate || 3200,
          rate: quote.nightly[0]?.rate || 3200,
          promo: hold.promoCode ? Data.findPromo(hold.promoCode) : null,
          source: 'Online',
          createdBy: null,
          idType: '',
          idNumber: '',
          depositPct: quote.depositPct || 50,
          depositRequired: quote.depositDue,
          depositPaid: intent.amount,
          balanceDue: quote.balanceDue,
          holdId: hold.holdId,
          paymentIntentId: intent.intentId,
          quote: quote,
          confirmedAt: nowISO(),
          confirmedBy: 'System (payment)',
          created: T,
          pay: [
            {
              id: orNum,
              or: orNum,
              d: T,
              a: intent.amount,
              amt: intent.amount,
              m: intent.method,
              k: 'Deposit',
              t: 'Deposit',
              note: `${quote.depositPct}% down payment on online booking`,
              auth: intent.authRef || intent.bankRef || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
              ref: intent.intentId,
              cardLast4: intent.cardLast4 || ''
            }
          ],
          x: []
        };

        // 7. Record payment in unified payments store
        const unifiedPayments = store.get('payments', []);
        unifiedPayments.push({
          orNo: orNum,
          date: T,
          time: nowTime(),
          timestamp: Date.now(),
          kind: 'Deposit',
          method: intent.method,
          amount: intent.amount,
          refType: 'Reservation',
          refId: code,
          authRef: newRes.pay[0].auth,
          cardLast4: intent.cardLast4 || '',
          cashier: 'System (payment gateway)',
          reason: `${quote.depositPct}% down payment online booking`
        });
        store.set('payments', unifiedPayments);

        // 8. Redeem promo
        if (hold.promoCode) {
          Data.incrementPromo(hold.promoCode);
        }

        // 9. Update hold and intent
        hold.status = 'Paid';
        hold.paymentIntentId = intent.intentId;
        intent.status = 'Succeeded';
        intent.reservationCode = code;
        intent.settledAt = Date.now();

        store.set('bookingHolds', holds);
        store.set('paymentIntents', intents);

        // Save reservation
        const allRes = Data.getReservations();
        allRes.unshift(newRes);
        Data.saveReservations(allRes);

        // 10. Audit and notifications
        Data.audit('Booking Confirmed', 'Reservation', code, `Online booking ${code} confirmed by ${intent.method} payment ₱${intent.amount}.`, 'System', hold.guestName);

        // Notify hotel & guest
        const notifs = store.get('notifications', []);
        notifs.unshift({
          id: Data.nextId('NTF-'),
          time: nowISO(),
          title: `New Online Booking ${code}`,
          message: `Guest ${hold.guestName} confirmed ${hold.typeId} (${fmtDate(hold.checkIn)} - ${fmtDate(hold.checkOut)}). Paid ₱${intent.amount.toLocaleString()} (50% down payment). Balance ₱${quote.balanceDue.toLocaleString()} due at check-in.`,
          type: 'booking',
          refId: code,
          read: false
        });
        store.set('notifications', notifs);

        Data.emit('Reservation', 'create', code);
        Data.emit('BookingHold', 'update', holdId);
        Data.emit('PaymentIntent', 'update', intentId);

        return { ok: true, success: true, data: newRes, reservation: newRes };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. RoomService (Availability & Smart Assignment)
  // ─────────────────────────────────────────────────────────────
  const RoomService = {
    freeRooms(typeId, checkIn, checkOut, excludeCode = '') {
      const allRooms = Data.getRooms();
      const allRes = Data.getReservations();
      const allMnt = Data.getMaintenance();
      const ci = checkIn || today();
      const co = checkOut || addDays(ci, 1);

      // Filter by type if specified
      const targetRooms = typeId ? allRooms.filter(r => r.t === typeId || r.typeId === typeId) : allRooms;

      return targetRooms.filter(room => {
        const roomNo = Number(room.n != null ? room.n : (room.num || room.number));

        // 1. Check Maintenance Out of Service overlapping dates
        const isOOS = allMnt.some(m => {
          if (!m.outOfService || m.room !== roomNo) return false;
          if (m.status === 'Resolved' || m.status === 'Closed') return false;
          const mFrom = m.fromDate || m.created || today();
          const mTo = m.toDate || addDays(mFrom, 1);
          return !(co <= mFrom || ci >= mTo);
        });
        if (isOOS) return false;

        // 2. Check Overlapping Reservations
        const hasOverlap = allRes.some(r => {
          if (r.c === excludeCode) return false;
          if (r.s === 'Cancelled' || r.s === 'Checked-out' || r.s === 'No-show') return false;
          const rRm = Number(r.rm != null ? r.rm : r.n);
          if (rRm !== roomNo) return false;
          const rCi = r.ci || r.i || today();
          const rCo = r.co || r.o || addDays(rCi, 1);
          return !(co <= rCi || ci >= rCo);
        });
        if (hasOverlap) return false;

        // 3. If arrival is today, room must be Clean or Inspected
        if (ci <= today()) {
          const hk = Data.getRoomHK(roomNo);
          if (hk && (hk.s === 'Dirty' || hk.s === 'In progress')) {
            return false;
          }
        }

        return true;
      });
    },

    assignRoom(typeId, checkIn, checkOut, guestPreference = '') {
      const available = this.freeRooms(typeId, checkIn, checkOut);
      if (available.length === 0) return null;

      // 1. Check guest preference (exact room or floor)
      if (guestPreference) {
        const prefMatch = available.find(r => {
          const num = String(r.num || r.number);
          return num === guestPreference || (r.floor && String(r.floor) === guestPreference);
        });
        if (prefMatch) return prefMatch.num || prefMatch.number;
      }

      // 2. Assign lowest available room number
      available.sort((a, b) => Number(a.n != null ? a.n : (a.num || a.number)) - Number(b.n != null ? b.n : (b.num || b.number)));
      const chosen = available[0];
      return Number(chosen.n != null ? chosen.n : (chosen.num || chosen.number));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. ReservationService (State Machine & Business Rules)
  // ─────────────────────────────────────────────────────────────
  const ReservationService = {
    createReservation(params) {
      const {
        typeId,
        checkIn,
        checkOut,
        guests = 2,
        guestName,
        guestEmail = '',
        guestPhone = '',
        promoCode = '',
        source = 'Online',
        paymentMethod = 'Credit Card',
        idType = '',
        idNumber = '',
        discountType = null,
        notes = ''
      } = params;

      return store.transaction(() => {
        const session = AuthService.getCurrentSession();
        const effectiveSource = (session && session.role === 'superadmin') ? (source || 'Staff-assisted') : 'Online';

        // Walk-in / Check-in validation
        if (effectiveSource === 'Walk-in') {
          if (!idType || !idNumber) {
            throw new Error('Government ID verification required for front-desk walk-in reservations.');
          }
        }

        // Room availability check
        const roomNo = params.roomNo || RoomService.assignRoom(typeId, checkIn, checkOut);
        if (!roomNo) {
          throw new Error('No clean rooms available for the selected dates and category.');
        }

        // Pricing quote
        let promo = null;
        if (promoCode) {
          promo = Data.findPromo(promoCode);
          if (!promo || !promo.active) {
            throw new Error(`Promo code '${promoCode}' is invalid or expired.`);
          }
        }

        const roomType = Data.getTypes().find(t => t.id === typeId || t.n === typeId) || { r: 3500, n: typeId };
        const quote = PricingService.quote({
          baseRate: roomType.r,
          nights: dateDiff(checkIn, checkOut),
          promo,
          discountType,
          roomType
        });

        // Ensure Guest entity
        const guestId = GuestService.ensureGuest({
          name: guestName,
          email: guestEmail,
          phone: guestPhone
        });

        const code = Data.nextId('HTL-');
        const isOnlineImmediatePay = (paymentMethod === 'Credit Card' || paymentMethod === 'Debit Card' || paymentMethod === 'GCash' || paymentMethod === 'Maya');

        let status = 'Pending';
        let holdExpiresAt = null;

        if (isOnlineImmediatePay || effectiveSource === 'Walk-in') {
          status = 'Confirmed';
        } else {
          // 24h hold or 2h before arrival
          const arrivalHours = Math.max(2, dateDiff(today(), checkIn) * 24);
          const holdHours = Math.min(24, arrivalHours);
          holdExpiresAt = new Date(Date.now() + holdHours * 3600 * 1000).toISOString();
        }

        const newRes = {
          c: code,
          guestId,
          g: guestName,
          email: guestEmail,
          ph: guestPhone,
          t: roomType.n,
          typeId: roomType.id || typeId,
          rm: roomNo,
          n: roomNo,
          ci: checkIn,
          i: checkIn,
          co: checkOut,
          o: checkOut,
          nights: quote.nights,
          guests: Number(guests || 2),
          s: status,
          st: status,
          source: effectiveSource,
          rate: quote.rate,
          rt: quote.rate,
          total: quote.netTotal,
          nightlyRates: quote.nightlyRates,
          promo: promo ? promo.code : '',
          holdExpiresAt,
          idType: idType || '',
          idNumber: idNumber || '',
          pay: [],
          x: [],
          notes: notes || '',
          createdBy: (session && session.name) ? session.name : 'Online Guest',
          createdAt: nowISO()
        };

        // If folio-credit promo, post credit to folio
        if (promo && promo.type === 'folio-credit' && quote.promoApplied?.creditVal) {
          newRes.x.push({
            id: Date.now(),
            d: today(),
            desc: `Promotion: ${promo.code} F&B Dining Credit`,
            amt: -Math.abs(quote.promoApplied.creditVal),
            cat: 'Promotion'
          });
        }

        // Record Initial Payment if confirmed
        if (status === 'Confirmed') {
          const depositAmount = quote.depDue;
          const payRes = PaymentService.recordPayment({
            method: paymentMethod,
            amount: depositAmount,
            refType: 'Reservation',
            refId: code,
            kind: 'Deposit',
            cashier: (session && session.name) ? session.name : 'Online Payment Gateway',
            reason: `Guarantee deposit for ${code}`
          });
          if (payRes.ok) {
            newRes.pay.push({
              or: payRes.data.orNo,
              d: payRes.data.date,
              m: paymentMethod,
              amt: payRes.data.amount,
              ref: payRes.data.authRef
            });
          }
        }

        const allRes = Data.getReservations();
        allRes.push(newRes);
        Data.saveReservations(allRes);

        // Consume promo
        if (promo) Data.incrementPromo(promo.code);

        AuditService.log(
          `Created Reservation (${effectiveSource})`,
          'Reservation',
          code,
          `${guestName} booked room ${roomNo} (${newRes.t}) from ${checkIn} to ${checkOut}`,
          session?.role === 'superadmin' ? 'Superadmin' : 'Guest',
          session?.name || guestName
        );

        Data.emit('Reservation', 'create', code);
        return { ok: true, data: newRes };
      });
    },

    checkIn(code, idType, idNumber) {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };

        const effectiveIdType = idType || r.idType;
        const effectiveIdNum = idNumber || r.idNumber;
        if (!effectiveIdType || !effectiveIdNum) {
          return { ok: false, error: 'Government ID verification required for check-in.' };
        }

        if (r.s !== 'Confirmed' && r.s !== 'Pending') {
          return { ok: false, error: `Cannot check in stay with status '${r.s}'.` };
        }
        if (r.ci > today()) {
          return { ok: false, error: `Check-in date (${r.ci}) has not arrived yet.` };
        }

        // Deposit settlement check: must meet depositRequired
        const requiredDeposit = r.depositRequired != null ? r.depositRequired : (Data.depAmt ? Data.depAmt(r) : 0);
        const paidSoFar = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.amt || p.a) || 0), 0);
        if (paidSoFar < requiredDeposit) {
          return {
            ok: false,
            error: `Cannot check in: Required deposit (${typeof peso === 'function' ? peso(requiredDeposit) : '₱' + requiredDeposit}) has not been settled.`
          };
        }

        // Room condition check
        const roomNo = Number(r.rm != null ? r.rm : r.n);
        const roomHK = Data.getRoomHK(roomNo);
        if (roomHK && (roomHK.s === 'Dirty' || roomHK.s === 'In progress')) {
          return {
            ok: false,
            error: `Room ${r.rm} is currently ${roomHK.s}. Please reassign to an available Clean room.`
          };
        }

        r.s = 'Checked-in';
        r.st = 'Checked-in';
        r.idType = idType;
        r.idNumber = idNumber;
        r.checkInTime = nowTime();
        Data.saveReservation(r);

        // Room status becomes Occupied
        Data.setRoomHK(roomNo, { s: 'Occupied', p: 'Medium' });

        const session = AuthService.getCurrentSession();
        AuditService.log('Guest Check-in', 'Reservation', r.c, `Room ${r.rm} checked in for ${r.g}`, 'Superadmin', session?.name || 'Front Desk');
        Data.emit('Reservation', 'update', r.c);

        return { ok: true, data: r };
      });
    },

    checkOut(code, overrideReason = '') {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };
        if (r.s !== 'Checked-in') {
          return { ok: false, error: `Cannot check out stay with status '${r.s}'.` };
        }

        const bal = (typeof FolioService !== 'undefined' && FolioService.getFolio) ? FolioService.getFolio(r.c)?.balance : (Data.balance ? Data.balance(r) : Data.bal(r));
        if (bal > 0 && !overrideReason) {
          return {
            ok: false,
            error: `Outstanding folio balance of ₱${bal.toLocaleString()} must be settled before checkout.`
          };
        }

        r.s = 'Checked-out';
        r.st = 'Checked-out';
        r.checkOutTime = nowTime();
        if (overrideReason) r.overrideReason = overrideReason;
        Data.saveReservation(r);

        // Room becomes Dirty with urgent priority if next arrival is today
        const nextArrivalToday = Data.getReservations().some(other => other.rm === r.rm && other.ci === today() && other.s !== 'Cancelled');
        Data.setRoomHK(r.rm, { s: 'Dirty', p: nextArrivalToday ? 'Urgent' : 'High' });

        // Award loyalty points once
        LoyaltyService.awardStayPoints(r);

        const session = AuthService.getCurrentSession();
        AuditService.log('Guest Check-out', 'Reservation', r.c, `Room ${r.rm} checked out for ${r.g}`, 'Superadmin', session?.name || 'Front Desk');
        Data.emit('Reservation', 'update', r.c);

        return { ok: true, data: r };
      });
    },

    cancelReservation(code, reason = '') {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };

        if (r.s === 'Checked-in' || r.st === 'Checked-in') {
          return { ok: false, error: 'Checked-in stays cannot be cancelled. Use early check-out instead.' };
        }
        if (r.s === 'Cancelled' || r.st === 'Cancelled' || r.s === 'Checked-out' || r.st === 'Checked-out') {
          return { ok: false, error: `Reservation is already ${r.s || r.st}.` };
        }

        const cfg = getConfig();
        const daysToArrival = dateDiff(today(), r.ci || r.i);
        const freeCancelDays = cfg.freeCancelDays || 3;
        const totalPaid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((acc, p) => acc + (Number(p.amt || p.a) || 0), 0);
        const priorRefunds = (r.pay || []).filter(p => p.k === 'Refund' || p.t === 'Refund').reduce((acc, p) => acc + (Number(p.amt || p.a) || 0), 0);
        const netPaid = Math.max(0, totalPaid - priorRefunds);

        let refundAmt = 0;
        let retainedFee = 0;

        if (daysToArrival >= freeCancelDays) {
          // Free cancellation: 100% refund of all payments
          refundAmt = netPaid;
          retainedFee = 0;
        } else {
          // Late cancellation: 30% deduction from net paid
          const feePct = cfg.lateCancelFeePct || 30;
          retainedFee = Money.round2(netPaid * (feePct / 100));
          refundAmt = Math.max(0, Money.round2(netPaid - retainedFee));
        }

        // Process refund payment if applicable
        if (refundAmt > 0) {
          PaymentService.recordPayment({
            method: (r.pay && r.pay[0]?.m) || 'Cash',
            amount: refundAmt,
            refType: 'Reservation',
            refId: r.c,
            kind: 'Refund',
            reason: reason || (daysToArrival >= freeCancelDays ? 'Free cancellation full refund' : `Late cancellation policy refund less 30% fee`)
          });
        }

        // Release promo
        if (r.promo) {
          const promoCode = typeof r.promo === 'object' ? r.promo.code : r.promo;
          const promo = Data.findPromo(promoCode);
          if (promo && promo.usedCount > 0) {
            promo.usedCount--;
            Data.savePromos(Data.getPromos());
          }
        }

        r.s = 'Cancelled';
        r.st = 'Cancelled';
        r.cancelReason = reason || 'Guest cancellation';
        r.cancelledAt = nowISO();
        Data.saveReservation(r);

        const session = AuthService.getCurrentSession();
        AuditService.log('Cancelled Reservation', 'Reservation', r.c, `Cancelled: ${r.g}. Refund: ₱${refundAmt.toLocaleString()}, Deducted: ₱${retainedFee.toLocaleString()}`, session?.role === 'superadmin' ? 'Superadmin' : 'Guest', session?.name || r.g);
        Data.emit('Reservation', 'cancel', r.c);

        return { ok: true, data: { refundAmt, retainedFee, res: r } };
      });
    },

    markNoShow(code, reason = 'No-show cut-off elapsed') {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };
        if (r.s !== 'Confirmed' && r.st !== 'Confirmed') {
          return { ok: false, error: `Only Confirmed stays can be marked No-show (current: ${r.s || r.st}).` };
        }
        r.s = 'No-show';
        r.st = 'No-show';
        r.noShowAt = nowISO();
        Data.saveReservation(r);
        const paid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((acc, p) => acc + (Number(p.amt || p.a) || 0), 0);
        AuditService.log('No-show Recorded', 'Reservation', r.c, `All payments retained (₱${paid.toLocaleString()}). No refund issued. ${reason}`, 'Superadmin', 'System');
        Data.emit('Reservation', 'update', r.c);
        return { ok: true, data: r, retainedAmount: paid };
      });
    },

    modifyStay(code, updates = {}) {
      return store.transaction(() => {
        const r = Data.findRes(code);
        if (!r) return { ok: false, error: 'Reservation not found.' };
        if (r.s !== 'Confirmed' && r.st !== 'Confirmed') {
          return { ok: false, error: 'Only Confirmed reservations can be modified.' };
        }

        const newTypeId = updates.typeId || r.t || r.typeId;
        const newCi = updates.checkIn || r.i || r.ci;
        const newCo = updates.checkOut || r.o || r.co;
        const newGuests = Number(updates.guests || r.gu || 2);
        const promoCode = updates.promoCode || (r.promo ? (typeof r.promo === 'object' ? r.promo.code : r.promo) : '');

        if (newCi < today()) {
          return { ok: false, error: 'New arrival date cannot be in the past.' };
        }
        if (newCo <= newCi) {
          return { ok: false, error: 'Check-out date must be after check-in date.' };
        }

        const free = AvailabilityService.unitsFree(newTypeId, newCi, newCo, null);
        const sameTypeAndDates = (newTypeId === r.t && newCi === (r.i || r.ci) && newCo === (r.o || r.co));
        if (!sameTypeAndDates && free < 1) {
          return { ok: false, error: 'Selected room category is not available for the updated dates.' };
        }

        const typeObj = Data.getTypes().find(t => t.n === newTypeId || t.id === newTypeId);
        if (typeObj && newGuests > typeObj.g) {
          return { ok: false, error: `Party size exceeds maximum capacity of ${typeObj.g} guests.` };
        }

        const nights = dateDiff(newCi, newCo);
        const quote = PricingService.quote({
          roomType: typeObj,
          nights,
          promo: promoCode ? Data.findPromo(promoCode) : null,
          guests: newGuests
        });

        const currentPaid = (r.pay || []).filter(p => p.k !== 'Refund' && p.t !== 'Refund').reduce((s, p) => s + (Number(p.amt || p.a) || 0), 0);
        const newDepositRequired = quote.depositDue;

        if (newDepositRequired > currentPaid && !updates.paidTopUp) {
          const topUpDue = Money.round2(newDepositRequired - currentPaid);
          return {
            ok: false,
            topUpRequired: true,
            topUpAmount: topUpDue,
            newQuote: quote,
            error: `Modification increases required deposit. Please settle top-up of ₱${topUpDue.toLocaleString()} to confirm change.`
          };
        }

        r.t = typeObj ? typeObj.n : newTypeId;
        r.i = newCi;
        r.ci = newCi;
        r.o = newCo;
        r.co = newCo;
        r.gu = newGuests;
        r.rt = quote.nightlyRates[0]?.rate || typeObj?.r || 3200;
        r.rate = r.rt;
        r.total = quote.total;
        r.depositRequired = newDepositRequired;
        r.depositPaid = currentPaid + (Number(updates.topUpAmount) || 0);
        r.balanceDue = Money.round2(quote.total - r.depositPaid);
        r.quote = quote;

        if (updates.paidTopUp && updates.topUpAmount > 0) {
          const orNum = Data.nextOR();
          r.pay.push({
            id: orNum,
            or: orNum,
            d: today(),
            a: updates.topUpAmount,
            amt: updates.topUpAmount,
            m: updates.paymentMethod || 'Credit card',
            k: 'Deposit',
            t: 'Deposit',
            note: 'Modification deposit top-up settlement',
            auth: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
            ref: r.c
          });
        }

        Data.saveReservation(r);
        Data.audit('Stay Modified', 'Reservation', r.c, `Stay modified: ${r.t} (${newCi} to ${newCo}), New total: ₱${quote.total.toLocaleString()}`, 'Guest', r.g);
        Data.emit('Reservation', 'update', r.c);
        return { ok: true, data: r, quote };
      });
    },

    runExpiryJobs() {
      // 1. Expire Pending holds
      const allRes = Data.getReservations();
      let updated = false;

      allRes.forEach(r => {
        if (r.s === 'Pending' && r.holdExpiresAt && new Date(r.holdExpiresAt) <= new Date()) {
          r.s = 'Cancelled';
          r.st = 'Cancelled';
          r.cancelReason = 'Hold expired (unpaid deposit)';
          updated = true;
          AuditService.log('Reservation Hold Expired', 'Reservation', r.c, `Hold expired for ${r.g}`, 'System', 'HoldExpiryRunner');
        } else if (r.s === 'Confirmed' && r.ci < today()) {
          // Auto No-Show for missed check-in date
          r.s = 'No-show';
          r.st = 'No-show';
          updated = true;
          AuditService.log('Reservation Auto No-Show', 'Reservation', r.c, `No-show recorded for ${r.g} (arrival date passed)`, 'System', 'HoldExpiryRunner');
        }
      });

      if (updated) {
        Data.saveReservations(allRes);
        Data.emit('Reservation', 'expiry-jobs', Date.now());
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. FolioService (Incidentals, Credits & Settlement)
  // ─────────────────────────────────────────────────────────────
  const FolioService = {
    getFolio(resCode) {
      const res = Data.findRes(resCode);
      if (!res) return null;

      const roomCharges = Data.roomChg(res);
      const incidentals = (res.x || []).map(item => ({
        id: item.id,
        date: item.d,
        description: item.desc,
        amount: Number(item.amt || 0),
        category: item.cat || 'Incidentals'
      }));

      const totalCharges = roomCharges + incidentals.reduce((sum, item) => sum + item.amount, 0);
      const payments = (res.pay || []).map(p => ({
        orNo: p.or,
        date: p.d,
        method: p.m,
        amount: Number(p.amt || 0),
        ref: p.ref || ''
      }));

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, totalCharges - totalPaid);

      return {
        code: res.c,
        guest: res.g,
        room: res.rm,
        roomCharges,
        incidentals,
        totalCharges,
        payments,
        totalPaid,
        balance,
        status: res.s
      };
    },

    postCharge(resCode, desc, amount, category = 'Incidentals') {
      return store.transaction(() => {
        const res = Data.findRes(resCode);
        if (!res) return { ok: false, error: 'Reservation not found.' };

        Data.addCharge(res, desc, amount, category);
        Data.emit('Folio', 'charge', resCode);
        return { ok: true, data: this.getFolio(resCode) };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 7. OrderService (POS, Stations & Dining Billing)
  // ─────────────────────────────────────────────────────────────
  const OrderService = {
    createOrder(params) {
      const {
        type = 'Dine-in',
        tableNo = '',
        roomNo = '',
        resCode = '',
        items = [],
        note = '',
        discountPromo = null
      } = params;

      if (!items || items.length === 0) {
        return { ok: false, error: 'Order must contain at least one item.' };
      }

      return store.transaction(() => {
        // Enforce 86'd check
        const menuItems = Data.getMenu();
        for (const line of items) {
          const menuItem = menuItems.find(m => m.id === line.id || m.name === line.name);
          if (menuItem && menuItem.available === false) {
            throw new Error(`Item '${menuItem.name}' is currently 86'd (unavailable).`);
          }
        }

        const code = Data.nextId('ORD-');
        let subtotal = 0;
        const lineSnapshots = items.map(item => {
          const price = Number(item.price || item.p || 0);
          const qty = Number(item.qty || 1);
          const lineTotal = price * qty;
          subtotal += lineTotal;
          return {
            id: item.id || '',
            name: item.name,
            price,
            qty,
            station: item.station || 'Kitchen',
            note: item.note || '',
            status: 'New'
          };
        });

        // Apply dining promo if applicable
        let discount = 0;
        if (discountPromo) {
          const promo = Data.findPromo(discountPromo);
          if (promo && promo.active) {
            if (promo.type === 'percent') {
              discount = Math.round(subtotal * (Number(promo.value) / 100));
            } else if (promo.type === 'fixed') {
              discount = Math.min(subtotal, Number(promo.value));
            }
          }
        }

        const finalTotal = Math.max(0, subtotal - discount);
        const session = AuthService.getCurrentSession();

        const order = {
          code,
          type,
          tableNo: type === 'Dine-in' ? tableNo : '',
          roomNo: type === 'In-room' ? roomNo : '',
          resCode: type === 'In-room' ? resCode : '',
          items: lineSnapshots,
          subtotal: finalTotal,
          status: 'New',
          payStatus: 'Unpaid',
          note: note || '',
          time: nowTime(),
          date: today(),
          createdAt: nowISO(),
          createdBy: (session && session.name) ? session.name : 'Guest'
        };

        const allOrders = Data.getOrders();
        allOrders.push(order);
        Data.saveOrders(allOrders);

        // Dine-in order occupies table
        if (type === 'Dine-in' && tableNo) {
          TableService.setTableStatus(tableNo, 'Occupied');
        }

        AuditService.log('Created Restaurant Order', 'Order', code, `${type} order ${code} for ₱${finalTotal.toLocaleString()}`, session?.role === 'superadmin' ? 'Superadmin' : 'Guest', session?.name || 'Guest');
        Data.emit('Order', 'create', code);

        return { ok: true, data: order };
      });
    },

    updateKitchenStatus(orderCode, newStatus) {
      return store.transaction(() => {
        const allOrders = Data.getOrders();
        const order = allOrders.find(o => o.code === orderCode);
        if (!order) return { ok: false, error: 'Order not found.' };

        order.status = newStatus;
        order.updatedAt = nowISO();

        // If dine-in, mark table as Needs cleaning
        if ((newStatus === 'Served' || newStatus === 'Paid') && order.type === 'Dine-in' && (order.tableNo || order.table)) {
          TableService.setTableStatus(order.tableNo || order.table, 'Needs cleaning');
        }

        Data.saveOrders(allOrders);
        Data.emit('Order', 'update-kitchen', orderCode);
        return { ok: true, data: order };
      });
    },

    settleOrder(orderCode, paymentMethod, meta = {}) {
      return store.transaction(() => {
        const res = Data.billOrder(orderCode, paymentMethod, meta);
        const order = Data.getOrders().find(o => o.code === orderCode);
        if (order && order.type === 'Dine-in' && (order.tableNo || order.table)) {
          TableService.setTableStatus(order.tableNo || order.table, 'Needs cleaning');
        }
        return res;
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. TableService (90-min Slot Engine & Live States)
  // ─────────────────────────────────────────────────────────────
  const TableService = {
    findAvailableTables(date, time, partySize = 2, area = '') {
      const allTables = Data.getTables();
      const allRes = Data.getTableRes();
      const targetTimeMin = parseTimeToMinutes(time);

      return allTables.filter(t => {
        if (!t.active && t.active !== undefined) return false;
        if (Number(t.seats) < Number(partySize)) return false;

        // Check 90-minute conflict window with other bookings
        const hasConflict = allRes.some(r => {
          if (r.date !== date) return false;
          const rT = Number(r.tableNum != null ? r.tableNum : (r.table != null ? r.table : r.tableNo));
          const tN = Number(t.num != null ? t.num : t.id);
          if (rT !== tN) return false;
          if (r.status === 'Cancelled' || r.status === 'Completed' || r.status === 'No-show') return false;

          const rTimeMin = parseTimeToMinutes(r.time);
          return Math.abs(targetTimeMin - rTimeMin) < 90;
        });

        return !hasConflict;
      }).sort((a, b) => {
        // Best fit: smallest seating capacity first
        if (Number(a.seats) !== Number(b.seats)) return Number(a.seats) - Number(b.seats);
        // Prefer requested area
        if (area && a.area === area && b.area !== area) return -1;
        if (area && b.area === area && a.area !== area) return 1;
        return Number(a.num || 1) - Number(b.num || 1);
      });
    },

    setTableStatus(tableNo, status) {
      const allTables = Data.getTables();
      const table = allTables.find(t => String(t.num || t.name) === String(tableNo));
      if (table) {
        table.status = status;
        table.st = status;
        store.set('tables', allTables);
        Data.emit('Table', 'update', tableNo);
      }
    }
  };

  function parseTimeToMinutes(tStr) {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  // ─────────────────────────────────────────────────────────────
  // 9. HousekeepingService
  // ─────────────────────────────────────────────────────────────
  const HousekeepingService = {
    computeAutoPriority(roomNo) {
      const allRes = Data.getReservations();
      const todayArrival = allRes.some(r => r.rm === roomNo && r.ci === today() && r.s !== 'Cancelled');
      if (todayArrival) return 'Urgent';

      const tomorrowArrival = allRes.some(r => r.rm === roomNo && r.ci === addDays(today(), 1) && r.s !== 'Cancelled');
      if (tomorrowArrival) return 'High';

      const nearArrival = allRes.some(r => r.rm === roomNo && dateDiff(today(), r.ci) <= 3 && r.s !== 'Cancelled');
      if (nearArrival) return 'Medium';

      return 'Low';
    },

    assignAllUnassigned() {
      const staffList = Data.getStaff().filter(s => s.active && s.department === 'Housekeeping');
      if (staffList.length === 0) return { ok: false, error: 'No active Housekeeping personnel available.' };

      const dirtyRooms = Data.getRooms().filter(r => {
        const hk = Data.getRoomHK(r.num);
        return hk && (hk.s === 'Dirty' || hk.s === 'In progress') && !hk.assignedStaffId;
      });

      let staffIdx = 0;
      dirtyRooms.forEach(room => {
        const staff = staffList[staffIdx % staffList.length];
        Data.setRoomHK(room.num, { assignedStaffId: staff.id, assignedStaffName: staff.name });
        staffIdx++;
      });

      Data.emit('Housekeeping', 'bulk-assign', dirtyRooms.length);
      return { ok: true, assignedCount: dirtyRooms.length };
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 10. MaintenanceService (OOS Conflicts & Relocation)
  // ─────────────────────────────────────────────────────────────
  const MaintenanceService = {
    checkOOSConflicts(roomNo, fromDate, toDate) {
      const allRes = Data.getReservations();
      const from = fromDate || today();
      const to = toDate || addDays(from, 1);

      return allRes.filter(r => {
        if (r.rm !== roomNo) return false;
        if (r.s === 'Cancelled' || r.s === 'Checked-out' || r.s === 'No-show') return false;
        return !(to <= r.ci || from >= r.co);
      });
    },

    resolveTicket(ticketId) {
      return store.transaction(() => {
        const list = Data.getMaintenance();
        const ticket = list.find(m => m.id === ticketId);
        if (!ticket) return { ok: false, error: 'Ticket not found.' };

        ticket.status = 'Resolved';
        ticket.resolvedAt = nowISO();
        ticket.outOfService = false;
        Data.saveMaintenance(list);

        // Hand off room to Housekeeping Dirty
        Data.setRoomHK(ticket.room, { s: 'Dirty', p: 'High' });

        AuditService.log('Resolved Maintenance', 'Maintenance', ticketId, `Room ${ticket.room} maintenance resolved -> set to Dirty`, 'Superadmin', 'Front Desk');
        Data.emit('Maintenance', 'resolve', ticketId);
        return { ok: true, data: ticket };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 11. GuestService & LoyaltyService
  // ─────────────────────────────────────────────────────────────
  const GuestService = {
    ensureGuest({ name, email = '', phone = '' }) {
      const allGuests = store.get('guests', []);
      let match = allGuests.find(g => (email && g.email && g.email.toLowerCase() === email.toLowerCase()) || (phone && g.phone === phone));

      if (match) return match.guestId || match.id;

      const guestId = Data.nextId('GST-');
      const newGuest = {
        guestId,
        id: guestId,
        name,
        email,
        phone,
        vip: false,
        loyaltyTier: 'Member',
        loyaltyPoints: 0,
        createdAt: nowISO()
      };
      allGuests.push(newGuest);
      store.set('guests', allGuests);
      return guestId;
    },

    updateGuest(guestIdOrEmail, updates = {}) {
      const allGuests = store.get('guests', []);
      const q = String(guestIdOrEmail || '').trim().toLowerCase();
      let match = allGuests.find(g => (g.guestId && g.guestId.toLowerCase() === q) || (g.id && g.id.toLowerCase() === q) || (g.email && g.email.toLowerCase() === q));
      if (match) {
        Object.assign(match, updates);
        store.set('guests', allGuests);
      }
      return match || null;
    }
  };

  const LoyaltyService = {
    calculateTier(nights) {
      const cfg = getConfig();
      const n = Number(nights || 0);
      const tiers = cfg.loyalty?.tiers || [
        { name: 'Bronze', minNights: 0 },
        { name: 'Silver', minNights: cfg.loyalty?.silverNights || 5 },
        { name: 'Gold', minNights: cfg.loyalty?.goldNights || 12 },
        { name: 'Platinum', minNights: cfg.loyalty?.platinumNights || 25 }
      ];
      const sorted = [...tiers].sort((a, b) => b.minNights - a.minNights);
      for (const t of sorted) {
        if (n >= t.minNights) return t;
      }
      return tiers[0] || { name: 'Bronze', minNights: 0 };
    },

    awardStayPoints(res) {
      if (res.loyaltyAwarded) return;
      const guestId = res.guestId || GuestService.ensureGuest({ name: res.g, email: res.email, phone: res.ph });
      const pts = Math.floor((res.total || 0) / 100);

      Data.addLoyaltyPoints(res.g, pts, `Completed stay ${res.c}`);
      res.loyaltyAwarded = true;
    },

    redeemReward(guestId, rewardId) {
      return store.transaction(() => {
        const cfg = getConfig();
        const reward = cfg.loyalty.rewards.find(r => r.id === rewardId);
        if (!reward) return { ok: false, error: 'Reward not found.' };

        const voucherCode = Data.nextId('VCH-');
        const vouchers = store.get('vouchers', []);
        const newVoucher = {
          code: voucherCode,
          guestId,
          rewardId,
          name: reward.name,
          points: reward.points,
          status: 'Issued',
          issuedAt: nowISO(),
          expiresAt: addDays(today(), 90)
        };

        vouchers.push(newVoucher);
        store.set('vouchers', vouchers);
        Data.emit('Loyalty', 'redeem', voucherCode);
        return { ok: true, data: newVoucher };
      });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 12. AuditService (Tamper-Evident SHA-256 Hash Chaining)
  // ─────────────────────────────────────────────────────────────
  const AuditService = {
    log(action, entity, entityId, details = '', actorType = 'System', actorName = 'System') {
      const log = store.get('audit', []);
      const prevEntry = log[log.length - 1];
      const prevHash = prevEntry ? (prevEntry.hash || 'GENESIS') : 'GENESIS';

      const entryId = Data.nextId('AUD-');
      const timestamp = nowISO();
      const rawPayload = `${entryId}|${timestamp}|${actorType}|${actorName}|${action}|${entity}|${entityId}|${details}|${prevHash}`;
      const hash = getCrypto() ? getCrypto().sha256(rawPayload) : 'NO_CRYPTO';

      const entry = {
        id: entryId,
        timestamp,
        time: timestamp,
        actorType,
        actorName,
        user: actorName,
        action,
        entity,
        recordType: entity,
        entityId,
        recordId: entityId,
        details,
        prevHash,
        hash
      };

      log.push(entry);
      store.set('audit', log);
      Data.emit('Audit', 'log', entryId);
      return entry;
    }
  };

  // ─── Approval Service (Manager Overrides & Sensitive Financial Authorizations) ───
  const ApprovalService = {
    getRequests() {
      return store.get('approvalRequests', [
        {
          id: 'APR-1001',
          type: 'CHECKOUT_WITH_BALANCE',
          title: 'Guest Checkout with Unsettled Balance Override',
          amount: 2500,
          reason: 'Corporate billing arrangement with San Juan Medical Center',
          refId: 'HTL-2035',
          refType: 'Reservation',
          requestedBy: 'Maria Santos (Front Desk)',
          requestedAt: today() + ' 09:15',
          status: 'Approved',
          reviewedBy: 'Superadmin',
          reviewedAt: today() + ' 09:30',
          decision: 'Approved',
          notes: 'Corporate invoice dispatched'
        },
        {
          id: 'APR-1002',
          type: 'FEE_WAIVER',
          title: 'Late Cancellation Fee Waiver',
          amount: 3200,
          reason: 'Medical emergency flight cancellation documentation presented',
          refId: 'HTL-2038',
          refType: 'Reservation',
          requestedBy: 'John Reyes (Front Desk)',
          requestedAt: today() + ' 11:40',
          status: 'Pending',
          reviewedBy: null,
          reviewedAt: null,
          decision: null,
          notes: ''
        }
      ]);
    },
    saveRequests(list) {
      store.set('approvalRequests', list);
      Data.emit('Approval', 'update', { count: list.length });
    },
    getPendingRequests() {
      return this.getRequests().filter(r => r.status === 'Pending');
    },
    createRequest(params) {
      const list = this.getRequests();
      const id = Data.nextId('APR-');
      const req = {
        id,
        type: params.type || 'MANAGER_OVERRIDE',
        title: params.title || 'Manager Approval Request',
        amount: Number(params.amount || 0),
        reason: (params.reason || '').trim(),
        refId: params.refId || '',
        refType: params.refType || 'General',
        requestedBy: params.requestedBy || (Data.getStaffSession()?.name) || 'Staff Member',
        requestedAt: nowISO(),
        status: 'Pending',
        reviewedBy: null,
        reviewedAt: null,
        decision: null,
        notes: ''
      };
      list.unshift(req);
      this.saveRequests(list);
      Data.audit('Approval Request Created', 'Approval', id, `${req.title} (${req.requestedBy})`);
      return { ok: true, data: req };
    },
    approveRequest(id, reviewerName, notes = '') {
      const list = this.getRequests();
      const req = list.find(r => r.id === id);
      if (!req) return { ok: false, error: 'Approval request not found.' };
      req.status = 'Approved';
      req.decision = 'Approved';
      req.reviewedBy = reviewerName || (Data.getStaffSession()?.name) || 'Superadmin';
      req.reviewedAt = nowISO();
      req.notes = notes;
      this.saveRequests(list);
      Data.audit('Approval Granted', 'Approval', id, `Approved by ${req.reviewedBy}. Notes: ${notes}`);
      return { ok: true, data: req };
    },
    rejectRequest(id, reviewerName, reason = '') {
      const list = this.getRequests();
      const req = list.find(r => r.id === id);
      if (!req) return { ok: false, error: 'Approval request not found.' };
      req.status = 'Rejected';
      req.decision = 'Rejected';
      req.reviewedBy = reviewerName || (Data.getStaffSession()?.name) || 'Superadmin';
      req.reviewedAt = nowISO();
      req.notes = reason;
      this.saveRequests(list);
      Data.audit('Approval Rejected', 'Approval', id, `Rejected by ${req.reviewedBy}. Reason: ${reason}`);
      return { ok: true, data: req };
    }
  };

  // Global service export bundle
  const Services = {
    Money,
    AuthService,
    PricingService,
    AvailabilityService,
    HoldService,
    BookingService,
    PaymentService,
    RoomService,
    ReservationService,
    FolioService,
    OrderService,
    TableService,
    HousekeepingService,
    MaintenanceService,
    GuestService,
    LoyaltyService,
    AuditService,
    ApprovalService
  };

  root.PUPSJ_Services = Services;
  Object.assign(root, Services);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Services;
  }
})(typeof window !== 'undefined' ? window : globalThis);

const originalRole=()=>Original.serverRole;
const originalStaff=()=>Original.user&&Original.serverRole!=='guest'?Original.user:null;
const originalGuest=()=>Original.serverRole==='guest'?Original.user:null;
Data.init=()=>{};Data.runExpiryJobs=()=>{};Data.resetDemo=Data.resetDemoData=()=>{throw Error('Reset requires a protected server training scenario.');};
Data.getStaffSession=originalStaff;Data.getGuestSession=originalGuest;
Data.setStaffSession=Data.setGuestSession=()=>{};
Data.clearStaffSession=Data.clearGuestSession=()=>{if(Original.user)originalRequest('/api/logout','POST',{});Original.user=null;Original.serverRole=null;};
Data.getStaff=()=>store.get('staff',[]);Data.getGuestAccounts=()=>store.get('guestAccounts',[]);
Data.getAdminAccounts=()=>[];Data.getPayments=()=>store.get('res',[]).flatMap(r=>(r.pay||[]).map(p=>({...p,resCode:r.c,amount:p.a,method:p.m,kind:p.k,createdAt:p.at,orNum:p.or})));
Data.getTypes=()=>store.get('types',[]);Data.getRooms=()=>store.get('rooms',[]);
Data.getReservations=()=>store.get('res',[]);Data.getOrders=()=>store.get('orders',[]);
Data.getBusinessDate=()=>originalData.businessDate||new Date().toLocaleDateString('en-CA');
Data.audit=()=>{};Data.emit=(entity,action,detail)=>window.dispatchEvent(new CustomEvent('pupsj:data-change',{detail:{entity,action,detail}}));
Data.nextId=prefix=>prefix+crypto.randomUUID().slice(0,12);Data.nextOR=()=>crypto.randomUUID();Data.nextSequence=prefix=>prefix+Date.now();
Data.getBookingHolds=()=>[];Data.getPaymentIntents=()=>[];
Data.tot=Data.roomChg=r=>Number(typeof r==='string'?Data.findRes(r)?.total:r?.total)||0;
Data.paidAmt=r=>Number(typeof r==='string'?Data.findRes(r)?.depositPaid:r?.depositPaid)||0;
Data.balOf=Data.bal=Data.balance=r=>Number(typeof r==='string'?Data.findRes(r)?.balanceDue:r?.balanceDue)||0;
Data.depAmt=r=>Number(r?.pricing?.deposit_due||0);
Data.freeRooms=(name,arrival,departure,exclude)=>{
 if(!arrival||!departure||departure<=arrival)return [];
 if(originalStaff())return Data.getRooms().filter(x=>x.t===name&&!x.out_of_service&&!Data.getReservations().some(r=>r.c!==exclude&&r.n===x.n&&!['Cancelled','Checked-out'].includes(r.st)&&r.i<departure&&r.o>arrival)).map(x=>x.n);
 const available=originalRequest('/api/availability?'+new URLSearchParams({arrival,departure,adults:1,children:0}));const type=available.find(x=>x.name===name);return type?Array.from({length:Math.max(1,Number(Data.getTypes().find(x=>x.n===name)?.c||1))},(_,i)=>i+1):[];
};
function originalChanged(kind,list){
 const key={'room-types':'types',rooms:'rooms',guests:'guestAccounts',employees:'staff',menu:'menu',tables:'tables'}[kind];
 const before=originalData[key]||[];const idof=x=>x.id??x.n;
 for(const item of list){const old=before.find(x=>String(idof(x))===String(idof(item)));if(old&&JSON.stringify(old)===JSON.stringify(item))continue;let data;
  if(kind==='room-types')data={name:item.n,rate:item.r,capacity:item.g,description:item.desc||'',photo:item.photo||null,bed_size:item.bed_size||null,extra_capacity:Number(item.extra_capacity||0),extra_person_rate:Number(item.extra_person_rate||0),accessible_room:!!item.accessible_room,accessible_bathroom:!!item.accessible_bathroom};
  if(kind==='rooms'){const type=Data.getTypes().find(x=>x.n===item.t);if(!type)throw Error('Select an existing room type.');data={number:String(item.n),room_type_id:type.id,housekeeping_status:originalData.hk[item.n]?.s||'Clean',out_of_service:!!item.out_of_service||item.status==='Maintenance'};}
  if(kind==='guests')data={name:item.name,email:item.email,phone:item.phone||null,address:item.address||'',birth_date:item.birthDate||null};
  if(kind==='menu')data={name:item.name,category:item.category||'Main Course',price:item.price,available:!!item.available};
  if(kind==='tables')data={label:item.label||item.name||'Table '+item.num,capacity:item.seats||item.capacity||4,status:['Free','Available','Clean','Needs cleaning'].includes(item.status||item.st)?'Available':'Blocked'};
  if(kind==='employees'){const role=/restaurant/i.test(item.role)?'restaurant':(/housekeeping/i.test(item.role)?'housekeeping':(/management|admin/i.test(item.role)?'admin':'frontdesk'));data={name:item.name,email:item.email,phone:item.phone||null,role,active:item.active!==false};if(item.password)data.password=item.password;}
  originalRequest('/api/directory/'+kind+(old?'/'+old.id:''),old?'PUT':'POST',data);
 }
 for(const old of before)if(!list.some(x=>String(idof(x))===String(idof(old))))originalRequest('/api/original/directory/'+kind+'/'+old.id,'DELETE');
 originalReload();Data.emit(kind,'update');
}
Data.saveTypes=Data.saveRoomTypes=list=>originalChanged('room-types',list);
Data.saveRooms=list=>originalChanged('rooms',list);Data.saveMenu=list=>originalChanged('menu',list);
Data.saveStaff=list=>originalChanged('employees',list);Data.saveTables=list=>originalChanged('tables',list);
Data.saveGuestAccounts=list=>originalChanged('guests',list);
Data.createGuestProfile=data=>{const record=originalRequest('/api/directory/guests','POST',{name:data.name,email:data.email,phone:data.phone||null,address:data.address||''});originalReload();Data.emit('guests','create');return {success:true,ok:true,data:record};};
Data.saveGuest=Data.createGuestProfile;
Data.updateGuestProfile=(name,updates)=>{if(originalRole()==='guest'){originalRequest('/api/profile','PUT',{name:updates.name||Original.user.name,email:updates.email||Original.user.email,phone:updates.phone||Data.getGuestAccounts()[0]?.phone});originalReload();return {success:true};}const row=Data.getGuestAccounts().find(x=>x.name===name);if(!row)throw Error('Guest not found.');originalChanged('guests',Data.getGuestAccounts().map(x=>x.id===row.id?{...x,...updates}:x));return {success:true};};
Data.saveHk=Data.saveHK=list=>{const before=originalData.hk||{};const updates=Array.isArray(list)?Object.fromEntries(list.map(x=>[x.room||x.n,x])):list;for(const [number,record]of Object.entries(updates)){if(JSON.stringify(before[number])===JSON.stringify(record))continue;const room=Data.getRooms().find(x=>String(x.n)===String(number));if(room){if(before[number]?.s!==record.s)originalRequest('/api/rooms/'+room.id+'/housekeeping','PUT',{housekeeping_status:record.s||record.status||'Dirty'});originalRequest('/api/original/auxiliary','POST',{entity:'hkMetadata',record:{id:String(number),a:Number(record.a||0),p:record.p||'',assignedName:record.assignedName||''}});}}originalReload();Data.emit('housekeeping','update');};
Data.setRoomHK=(number,update)=>Data.saveHk({...originalData.hk,[number]:{...originalData.hk[number],...update}});
Data.checkIn=(code,number)=>{const r=Data.findRes(code);if(!r)throw Error('Reservation not found.');if(!number&&!r.n){originalAssignModal(code);return {success:false,ok:false,error:'Select a room to complete check-in.'};}const room=Data.getRooms().find(x=>String(x.n)===String(number||r.n));originalRequest('/api/reservations/'+r.id+'/room','PUT',{room_id:room?.id});originalRequest('/api/reservations/'+r.id+'/check-in','POST',{});originalReload();Data.emit('res','check-in');return {success:true,ok:true,data:Data.findRes(code)};};
Data.checkOut=code=>{const r=Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/check-out','POST',{});originalReload();Data.emit('res','check-out');return {success:true,ok:true};};
Data.cancelReservation=code=>{const r=Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/cancel','POST',{});originalReload();Data.emit('res','cancel');return {success:true,ok:true};};
Data.addPayment=(code,amount,method,kind='Payment',note='')=>{const r=typeof code==='object'?code:Data.findRes(code);if(kind==='Refund'){const p=originalRequest('/api/reservations/'+r.id+'/refunds','POST',{amount,reason:note||'Guest credit refund',idempotency_key:crypto.randomUUID()});originalReload();return p.receipt;}if(method!=='Cash')throw Error('Use PayMongo test checkout for QR Ph or cards.');const p=originalRequest('/api/payments/batch','POST',{reference:crypto.randomUUID(),posting_location:'Hotel Front Desk',allocations:[{reservation_id:r.id,amount}]});originalReload();Data.emit('payments','record');return p.reference;};
Data.addCharge=Data.addFolioCharge=(code,description,amount)=>{const r=typeof code==='object'?code:Data.findRes(code);originalRequest('/api/reservations/'+r.id+'/charges','POST',{description,amount});originalReload();Data.emit('res','charge');};
Data.saveReservations=Data.saveRes=list=>{for(const row of list){const old=Data.findRes(row.c);if(!old)throw Error('Create reservations using the booking form.');if(row.i!==old.i||row.o!==old.o)originalRequest('/api/reservations/'+old.id+'/dates','PUT',{arrival:row.i,departure:row.o});else if(row.st!==old.st){if(row.st==='Cancelled')Data.cancelReservation(row.c);else if(row.st==='Checked-in')Data.checkIn(row.c,row.n);else if(row.st==='Checked-out')Data.checkOut(row.c);else throw Error('Use the reservation workflow for this status.');}}originalReload();Data.emit('res','update');};
Data.updateReservation=(code,updates)=>Data.saveReservations(Data.getReservations().map(x=>x.c===code?{...x,...updates}:x));
Data.createOrder=input=>{const r=Data.findRes(input.resCode||input.linkedRes);const lines=input.lines||[];const payload={channel:input.type==='In-room'?'Room service':'Dine-in',items:lines.map(x=>({menu_item_id:x.menuId||x.id,quantity:x.qty}))};if(input.type==='In-room')payload.delivery_reservation_id=r?.id;else if(input.table)payload.dining_table_id=Number(input.table);const o=originalRequest('/api/orders','POST',payload);originalReload();Data.emit('orders','create');return Data.getOrders().find(x=>x.id===o.id);};
Data.cancelOrder=(code,reason)=>{const o=Data.getOrders().find(x=>x.code===code);originalRequest('/api/orders/'+o.id+'/void','POST',{reason:reason||'Guest cancellation'});originalReload();Data.emit('orders','void');return {success:true};};
Data.addItemsToOrder=(code,lines)=>{const o=Data.getOrders().find(x=>x.code===code);const items=[...o.lines,...lines].map(x=>({menu_item_id:x.menuId||x.id,quantity:x.qty}));originalRequest('/api/orders/'+o.id,'PUT',{items,reason:'Staff updated unpaid order'});originalReload();Data.emit('orders','update');};
Data.billOrder=(code,method,meta={})=>{if(typeof method==='object'){meta=method;method=meta.method;}const o=Data.getOrders().find(x=>x.code===code);if(method!=='Cash')throw Error('Use the payment checkout to settle this method.');originalRequest('/api/orders/'+o.id+'/settle','POST',{settlement:'Cash',cash_received:Number(meta.amount||o.subtotal),idempotency_key:crypto.randomUUID()});originalReload();return {success:true,orNum:'Recorded - '+code};};
Data.saveOrders=()=>{throw Error('Posted orders cannot be rewritten. Use order actions.');};
Data.updateOrderStatus=(code,status)=>{const o=Data.getOrders().find(x=>x.code===code);const service_status=/deliver|served|complete/i.test(status)?'Delivered':(/out|ready/i.test(status)?'Out for delivery':'Recorded');originalRequest('/api/orders/'+o.id+'/delivery','PUT',{service_status});originalReload();Data.emit('orders','update');};
function originalAux(entity,list){for(const row of list){const old=(originalData[entity]||[]).find(x=>x.id===row.id);if(!old||JSON.stringify(old)!==JSON.stringify(row))originalRequest('/api/original/auxiliary','POST',{entity,record:{...row,id:String(row.id)}});}originalReload();Data.emit(entity,'update');}
for(const [method,entity]of Object.entries({saveThreads:'threads',saveInquiries:'inquiries',saveMaintenance:'maintenance',saveFeedback:'feedback',saveHkRequests:'hkRequests',saveTableRes:'tableRes'}))Data[method]=list=>originalAux(entity,list);
Data.setBusinessDate=()=>{throw Error('Use Reconcile and Close to advance the business date.');};Data.resetBusinessDate=()=>{throw Error('Closed business dates cannot be reset.');};
AuthService.login=(email,password)=>{try{const user=originalRequest('/api/login','POST',{email,password});originalReload();return {ok:true,session:Original.user,isStaff:user.role!=='guest'};}catch(e){return {ok:false,error:e.message};}};
AuthService.logout=()=>{originalRequest('/api/logout','POST',{});location.href=originalBase+'/login';};
AuthService.checkIdleTimeout=()=>false;AuthService.touchActivity=()=>{};
ReservationService.runExpiryJobs=()=>{};HoldService.expire=()=>{};
window.addEventListener('error',event=>{if(event.error&&typeof toast==='function')toast(event.error.message,'bad');});

Data.savePromos=list=>{const p=originalRequest('/api/policy');const promos=list.filter(x=>x.active!==false).map(x=>({code:x.code,label:x.label||x.name||x.code,percent:Number(x.percent??x.value??x.discount??0),start:x.start||x.startDate||today(),end:x.end||x.endDate||addDays(today(),365),public:x.public!==false}));originalRequest('/api/policy','POST',{...p,promos});originalReload();Data.emit('promos','update');};


/* Original source: site-shell.js */
/* ==========================================================================
   PUPSJ Hotel & Restaurant — Public Site Shell (site-shell.js)
   Renders top navigation, footer, concierge widget, and guest session menu.
   ========================================================================== */
'use strict';

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


/* Original source: booking-modal.js */
/* ==========================================================================
   PUPSJ Hotel & Restaurant — Booking Modal & Folio System (booking-modal.js)
   Universal 5-step reservation flow (Stay -> Guest -> Review -> Pay -> Confirmed),
   dynamic CONFIG.depositPct, countdown hold timer, simulated gateway & bank QR Ph,
   folio ledger, BIR tax invoices, and reservation detail modal.
   ========================================================================== */
'use strict';

// ─── 0. Universal Authentication Gate Modal ───
function showAuthGateModal({ type = 'room', roomType = 'Standard', ci = '', co = '', guests = 2, promo = '', notes = '', tableNum = 0, date = '', time = '', partySize = 2 } = {}) {
  const currentPath = window.location.pathname + window.location.search;
  
  if (typeof savePendingIntent === 'function') {
    savePendingIntent({
      type,
      roomType,
      ci: ci || today(),
      co: co || addDays(ci || today(), 1),
      guests,
      promo,
      notes,
      tableNum,
      date: date || today(),
      time: time || '18:00',
      partySize,
      returnUrl: currentPath
    });
  }

  let summaryDetails = '';
  if (type === 'room') {
    const types = typeof Data !== 'undefined' && Data.getTypes ? Data.getTypes() : [];
    const typeObj = types.find(t => t.n === roomType) || { r: 3200, n: roomType };
    const checkIn = ci || today();
    const checkOut = co || addDays(checkIn, 1);
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(checkIn, checkOut) : 1);
    const pricing = typeof calculateStayPricing === 'function'
      ? calculateStayPricing({ baseRate: typeObj.r, nights, promo: (typeof Data !== 'undefined' && Data.findPromo) ? Data.findPromo(promo) : null })
      : { netTotal: typeObj.r * nights, depDue: Math.ceil(typeObj.r * nights * (CONFIG.depositPct / 100)) };

    summaryDetails = `
      <div class="card card-sm" style="margin: 16px 0; background: var(--surface-2); text-align: left; font-size: 13px; border: 1px solid var(--line);">
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 6px;">Your Selected Accommodation:</div>
        <div><b>Room Category:</b> ${esc(roomType)}</div>
        <div><b>Stay Period:</b> ${typeof fmtDate === 'function' ? fmtDate(checkIn) : checkIn} – ${typeof fmtDate === 'function' ? fmtDate(checkOut) : checkOut} (${nights} night${nights > 1 ? 's' : ''})</div>
        <div><b>Registered Guests:</b> ${guests} guest${guests > 1 ? 's' : ''}</div>
        <div><b>Accommodation Total:</b> ${typeof peso === 'function' ? peso(pricing.netTotal) : '₱' + pricing.netTotal}</div>
        <div style="color: var(--ink-3); font-size: 12px; margin-top: 4px;">${CONFIG.depositPct}% Guarantee Deposit Due on confirmation: ${typeof peso === 'function' ? peso(pricing.depDue) : '₱' + pricing.depDue}</div>
        ${promo ? `<div style="color: var(--ok); margin-top: 4px;"><b>Promotion Voucher:</b> ${esc(promo)}</div>` : ''}
      </div>
    `;
  } else if (type === 'table') {
    summaryDetails = `
      <div class="card card-sm" style="margin: 16px 0; background: var(--surface-2); text-align: left; font-size: 13px; border: 1px solid var(--line);">
        <div style="font-weight: 600; color: var(--gold-ink); margin-bottom: 6px;">Your Selected Dining Reservation:</div>
        <div><b>Date &amp; Time:</b> ${typeof fmtDate === 'function' ? fmtDate(date || today()) : (date || today())} at ${esc(time || '18:00')}</div>
        <div><b>Party Size:</b> ${partySize} guest${partySize > 1 ? 's' : ''}</div>
        ${promo ? `<div style="color: var(--ok); margin-top: 4px;"><b>Promotion Voucher:</b> ${esc(promo)}</div>` : ''}
      </div>
    `;
  }

  const isManagement = window.location.pathname.includes('/management/');
  const isGuest = window.location.pathname.includes('/guest/');
  const isRooms = window.location.pathname.includes('/rooms/');
  const isMain = window.location.pathname.includes('/main/');
  const isRoot = !isManagement && !isGuest && !isRooms && !isMain;
  
  let loginBase = '../auth/login.html';
  if (isRoot) loginBase = 'pages/auth/login.html';
  else if (isManagement || isGuest || isRooms || isMain) loginBase = '../auth/login.html';

  const returnParam = encodeURIComponent(currentPath);

  const gateHtml = `
    <div style="text-align: center; padding: 6px 0;">
      <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Security Key Icon - Insert guest authentication key SVG here]</div>
      <h3 style="font-size: 22px; margin: 0 0 8px; font-family: 'Cormorant Garamond', serif;">Guest Account Required</h3>
      <p class="text-secondary" style="font-size: 14px; margin: 0 auto; max-width: 440px;">
        Sign in or create a guest account to complete your reservation. Your choices are safely preserved and will automatically resume.
      </p>

      ${summaryDetails}

      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
        <a href="${loginBase}?tab=register&next=${returnParam}" class="btn" style="text-align: center; text-decoration: none;">
          Create Guest Account &amp; Complete Reservation &rarr;
        </a>
        <a href="${loginBase}?tab=signin&next=${returnParam}" class="btn-secondary" style="text-align: center; text-decoration: none;">
          Already have an account? Sign In
        </a>
      </div>
      <div style="margin-top: 14px;">
        <button type="button" class="btn-ghost" style="font-size: 13px;" onclick="closeModal()">Cancel &amp; Continue Browsing</button>
      </div>
    </div>
  `;

  showModal('Sign In or Register', gateHtml, '', { maxWidth: '480px' });
}

// ─── 1. Rebuilt 5-Step Online Room Booking Engine ───
function openBookingModal(initialType, checkInDate, checkOutDate, guestCount = 2, initialPromo = '', onComplete = null) {
  const staffSession = typeof Data !== 'undefined' && Data.getStaffSession ? Data.getStaffSession() : null;
  const guestSession = typeof Data !== 'undefined' && Data.getGuestSession ? Data.getGuestSession() : null;

  // Rule 7 / Rule 5.3: Staff sessions using the online flow get guided to their management portal
  if (staffSession && !guestSession) {
    const isRoot = !window.location.pathname.includes('/management/') && !window.location.pathname.includes('/guest/') && !window.location.pathname.includes('/rooms/') && !window.location.pathname.includes('/main/');
    const resPath = isRoot ? 'pages/management/reservations.html?new=1' : '../management/reservations.html?new=1';
    showModal(
      'Staff Desk Mode Notice',
      `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Briefcase Icon - Insert staff management portal icon here]</div>
        <h3 style="font-size: 20px; margin: 0 0 8px;">Signed in as Staff: ${esc(staffSession.name)}</h3>
        <p class="text-secondary" style="font-size: 14px; max-width: 440px; margin: 0 auto 16px;">
          The public booking engine requires a guest account and 50% online deposit. For walk-ins or staff-assisted front-desk bookings, please use the Front Desk Reservations module.
        </p>
        <div style="display: flex; justify-content: center; gap: 10px;">
          <a href="${resPath}" class="btn">Use New Reservation in your portal &rarr;</a>
          <button type="button" class="btn-ghost" onclick="closeModal()">Close</button>
        </div>
      </div>
      `,
      '',
      { maxWidth: '500px' }
    );
    return;
  }

  const types = typeof Data !== 'undefined' && Data.getTypes ? Data.getTypes() : [];
  let selectedType = types.find(t => t.n === (initialType ? initialType.n || initialType : '')) || types[0] || { n: 'Standard Room', r: 3200, g: 2 };

  let ci = checkInDate || today();
  let co = checkOutDate || addDays(ci, 1);
  if (co <= ci) co = addDays(ci, 1);
  let guests = Math.max(1, Number(guestCount || 2));
  let promoCode = initialPromo || '';
  let activePromo = (promoCode && typeof Data !== 'undefined' && Data.findPromo) ? Data.findPromo(promoCode) : null;

  // Step state
  let currentStep = 1; // 1: Stay, 2: Guest, 3: Review, 4: Pay, 5: Confirmed
  let guestName = guestSession ? guestSession.name : '';
  let guestPhone = guestSession ? (guestSession.phone || '') : '';
  let guestEmail = guestSession ? (guestSession.email || '') : '';
  let guestNotes = '';
  let policyAgreed = false;

  let activeHold = null;
  let activeIntent = null;
  let timerInterval = null;
  let pollInterval = null;
  let confirmedReservation = null;
  let paymentMethod = 'card'; // 'card' | 'gcash' | 'maya' | 'bank'
  let selectedBank = 'BDO Unibank';
  let attemptsMade = 0;
  let inlinePayError = '';

  const cleanupTimers = () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  };

  const getQuote = () => {
    const nights = Math.max(1, typeof dateDiff === 'function' ? dateDiff(ci, co) : 1);
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.PricingService) {
      return PUPSJ_Services.PricingService.quote({
        roomType: selectedType.n,
        baseRate: selectedType.r,
        nights,
        guestCount: guests,
        promoCode: activePromo ? activePromo.code : ''
      });
    }
    const base = selectedType.r * nights;
    const dep = typeof Money !== 'undefined' ? Money.ceilCentavo(base * (CONFIG.depositPct / 100)) : Math.ceil(base * 0.5);
    return {
      nights,
      subtotal: base,
      discount: 0,
      total: base,
      depositDue: dep,
      balanceDue: base - dep,
      taxes: { vat: Math.round(base * 0.12), svc: Math.round(base * 0.10) }
    };
  };

  const getFreeUnits = (excludeHoldId = null) => {
    if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.AvailabilityService) {
      const units = PUPSJ_Services.AvailabilityService.unitsFree(selectedType.n, ci, co, excludeHoldId);
      return typeof units === 'number' ? units : (Array.isArray(units) ? units.length : Number(units) || 0);
    }
    const fallback = typeof Data !== 'undefined' && Data.freeRooms ? Data.freeRooms(selectedType.n, ci, co) : [101];
    return Array.isArray(fallback) ? fallback.length : (Number(fallback) || 0);
  };

  const renderStepsNav = () => {
    const steps = [
      { num: 1, label: 'Stay' },
      { num: 2, label: 'Guest' },
      { num: 3, label: 'Review' },
      { num: 4, label: 'Pay' },
      { num: 5, label: 'Confirmed' }
    ];
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--line); padding-bottom: 12px; gap: 4px;">
        ${steps.map(s => {
          const isActive = s.num === currentStep;
          const isDone = s.num < currentStep;
          return `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? 'var(--gold-ink)' : isDone ? 'var(--ok)' : 'var(--ink-3)'};">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: 11px; font-weight: 700; background: ${isActive ? 'var(--gold)' : isDone ? 'var(--ok)' : 'var(--surface-2)'}; color: ${isActive || isDone ? '#fff' : 'var(--ink-3)'};">
                ${isDone ? '✓' : s.num}
              </span>
              <span class="step-label" style="display: inline-block;">${s.label}</span>
            </div>
          `;
        }).join('<span style="color: var(--line); font-size: 12px;">&rarr;</span>')}
      </div>
    `;
  };

  // Build root modal container
  const modalShell = `
    <div id="bookingModalRoot" style="min-height: 380px; font-size: 14px;">
      <!-- Dynamic Step Content Injected Here -->
    </div>
  `;

  showModal('Online Room Reservation', modalShell, '', {
    maxWidth: '700px',
    onClose() {
      cleanupTimers();
    },
    onOpen(modal) {
      const root = modal.querySelector('#bookingModalRoot');
      if (!root) return;

      const render = () => {
        if (currentStep === 1) renderStep1(root);
        else if (currentStep === 2) renderStep2(root);
        else if (currentStep === 3) renderStep3(root);
        else if (currentStep === 4) renderStep4(root);
        else if (currentStep === 5) renderStep5(root);
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 1: STAY (Public Availability & Rates)
      // ─────────────────────────────────────────────────────────────
      const renderStep1 = (container) => {
        const quote = getQuote();
        const freeCount = getFreeUnits();
        const hasCapacity = guests <= selectedType.g;
        const canProceed = freeCount > 0 && hasCapacity;

        container.innerHTML = `
          ${renderStepsNav()}

          <!-- Room Summary Card -->
          <div style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;">
              <b style="font-size: 16px; color: var(--ink);">${esc(selectedType.n)}</b>
              <span style="font-size: 15px; font-weight: 600; color: var(--gold-ink);">${peso(selectedType.r)} / night</span>
            </div>
            <div class="text-sm text-secondary" style="margin-top: 4px;">
              ${fmtDate(ci)} – ${fmtDate(co)} &middot; ${quote.nights} night${quote.nights > 1 ? 's' : ''} &middot; Max ${selectedType.g} guests
            </div>
            <div style="margin-top: 6px;">
              ${!hasCapacity
                ? `<span class="pill pill--bad">Exceeds room capacity (Max ${selectedType.g} guests)</span>`
                : freeCount > 0
                  ? `<span class="pill pill--ok">${freeCount} room${freeCount > 1 ? 's' : ''} available</span>`
                  : `<span class="pill pill--bad">Fully booked for selected dates</span>`
              }
            </div>
          </div>

          <form id="step1Form" onsubmit="return false;">
            <div class="field-row-3">
              <div class="field">
                <label for="s1Type">Room Category</label>
                <select id="s1Type">
                  ${types.map(t => `<option value="${esc(t.n)}" ${t.n === selectedType.n ? 'selected' : ''}>${esc(t.n)} (${peso(t.r)}/nt)</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="s1Ci">Check-in Date *</label>
                <input type="date" id="s1Ci" value="${ci}" min="${today()}" required>
              </div>
              <div class="field">
                <label for="s1Co">Check-out Date *</label>
                <input type="date" id="s1Co" value="${co}" min="${addDays(ci, 1)}" required>
              </div>
            </div>

            <div class="field-row-2">
              <div class="field">
                <label for="s1Guests">Party Size (Guests) *</label>
                <input type="number" id="s1Guests" min="1" max="${selectedType.g}" value="${guests}" required>
              </div>
              <div class="field">
                <label for="s1Promo">Promotion Voucher Code</label>
                <div style="display: flex; gap: 6px;">
                  <input type="text" id="s1Promo" placeholder="WELCOME10" style="text-transform: uppercase;" value="${esc(promoCode)}">
                  <button type="button" class="btn-secondary" id="btnS1ApplyPromo" style="white-space: nowrap;">Apply</button>
                </div>
                <div id="s1PromoMsg" class="text-xs" style="margin-top: 3px;">
                  ${activePromo ? `<span style="color: var(--ok); font-weight: 600;">Applied: ${esc(activePromo.title || activePromo.code)}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- Dynamic Pricing Preview -->
            <div style="background-color: var(--surface-2); padding: 14px 16px; border-radius: var(--r); margin: 16px 0; border: 1px solid var(--line); font-size: 13px;">
              <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                <span class="text-secondary">Room accommodation (${quote.nights} nights &times; ${peso(selectedType.r)}):</span>
                <b>${peso(quote.subtotal)}</b>
              </div>
              ${activePromo ? `
                <div style="display: flex; justify-content: space-between; padding: 2px 0; color: var(--ok);">
                  <span>Promotion Discount (${activePromo.code}):</span>
                  <b>&minus; ${peso(quote.discount)}</b>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; color: var(--ink-3);">
                <span>BIR VAT (${CONFIG.tax.vatPct}%) &amp; Service Charge (${CONFIG.tax.svcPct}%):</span>
                <span>Included in tariff</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); margin-top: 6px; font-size: 15px;">
                <b>Total Stay Tariff:</b>
                <b style="color: var(--ink); font-size: 16px;">${peso(quote.total)}</b>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; color: var(--gold-ink); font-weight: 600;">
                <span>Pay Now (${CONFIG.depositPct}% Down Payment):</span>
                <span style="font-size: 16px;">${peso(quote.depositDue)}</span>
              </div>
              <div class="text-xs" style="color: var(--ink-3); margin-top: 4px;">
                Remaining balance of ${peso(quote.balanceDue)} is settled upon check-in or via the Guest Portal.
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
              <button type="button" class="btn" id="btnStep1Continue" ${!canProceed ? 'disabled' : ''}>
                Reserve Room &rarr;
              </button>
            </div>
          </form>
        `;

        // Event Listeners for Step 1
        const typeSelect = container.querySelector('#s1Type');
        const ciInput = container.querySelector('#s1Ci');
        const coInput = container.querySelector('#s1Co');
        const guestInput = container.querySelector('#s1Guests');
        const promoInput = container.querySelector('#s1Promo');
        const promoBtn = container.querySelector('#btnS1ApplyPromo');
        const continueBtn = container.querySelector('#btnStep1Continue');

        if (typeSelect) {
          typeSelect.onchange = () => {
            selectedType = types.find(t => t.n === typeSelect.value) || types[0];
            render();
          };
        }
        if (ciInput) {
          ciInput.onchange = () => {
            ci = ciInput.value;
            const minCo = addDays(ci, 1);
            if (co <= ci) co = minCo;
            render();
          };
        }
        if (coInput) {
          coInput.onchange = () => {
            co = coInput.value;
            render();
          };
        }
        if (guestInput) {
          guestInput.oninput = () => {
            guests = Number(guestInput.value || 1);
            render();
          };
        }
        if (promoBtn && promoInput) {
          promoBtn.onclick = () => {
            const code = promoInput.value.trim().toUpperCase();
            if (!code) {
              activePromo = null;
              promoCode = '';
              render();
              return;
            }
            const validation = typeof Data !== 'undefined' && Data.validatePromo ? Data.validatePromo(code, {
              scope: 'rooms',
              nights: dateDiff(ci, co),
              spend: dateDiff(ci, co) * selectedType.r
            }) : { valid: false, error: 'Promo code unavailable' };

            if (validation.valid) {
              activePromo = validation.promo;
              promoCode = code;
              toast(`Promo ${code} applied successfully!`, 'ok');
            } else {
              activePromo = null;
              toast(validation.error || 'Invalid promotion voucher', 'warn');
            }
            render();
          };
        }

        if (continueBtn) {
          continueBtn.onclick = () => {
            // Unauthenticated visitors hitting commit get the Auth Gate
            if (!guestSession) {
              closeModal();
              showAuthGateModal({
                type: 'room',
                roomType: selectedType.n,
                ci,
                co,
                guests,
                promo: activePromo ? activePromo.code : ''
              });
              return;
            }
            currentStep = 2;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 2: GUEST DETAILS (Prefilled from session, validated)
      // ─────────────────────────────────────────────────────────────
      const renderStep2 = (container) => {
        container.innerHTML = `
          ${renderStepsNav()}

          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 4px; font-size: 18px; font-family: 'Cormorant Garamond', serif;">Guest Information</h3>
            <p class="text-secondary text-sm" style="margin: 0;">
              Confirm primary contact details for instant confirmation delivery and check-in verification.
            </p>
          </div>

          <form id="step2Form" onsubmit="return false;">
            <div class="field-row-2">
              <div class="field">
                <label for="s2GuestName">Primary Guest Full Name *</label>
                <input type="text" id="s2GuestName" value="${esc(guestName)}" placeholder="Maria Santos" required autocomplete="name">
              </div>
              <div class="field">
                <label for="s2Phone">Philippine Mobile Number *</label>
                <input type="tel" id="s2Phone" value="${esc(guestPhone)}" placeholder="+63 917 123 4567" required autocomplete="tel">
              </div>
            </div>

            <div class="field">
              <label for="s2Email">Email Address (Read-only on Guest Session) *</label>
              <input type="email" id="s2Email" value="${esc(guestEmail)}" readonly style="background: var(--surface-2); color: var(--ink-2);" required autocomplete="email">
              <span class="field-hint" style="font-size: 11px; color: var(--ink-3);">Confirmation voucher and Official Receipt (OR) will be dispatched to this email.</span>
            </div>

            <div class="field">
              <label for="s2Notes">Special Requests &amp; Preferences (Optional)</label>
              <textarea id="s2Notes" rows="2" placeholder="Quiet high floor, extra pillows, anticipated arrival time…">${esc(guestNotes)}</textarea>
            </div>

            <div class="banner banner--info" style="font-size: 12px; margin-top: 14px; padding: 10px 12px; background: var(--surface-2); border-radius: var(--r); border: 1px solid var(--line);">
              <span class="ic" data-icon="shield">[ICON: shield]</span>
              Government photo ID is not required during online reservation. ID verification occurs seamlessly at Front Desk check-in.
            </div>

            <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 20px;">
              <button type="button" class="btn-secondary" id="btnStep2Back">&larr; Back to Stay</button>
              <button type="button" class="btn" id="btnStep2Continue">Review Pricing &amp; Terms &rarr;</button>
            </div>
          </form>
        `;

        const backBtn = container.querySelector('#btnStep2Back');
        const contBtn = container.querySelector('#btnStep2Continue');

        if (backBtn) {
          backBtn.onclick = () => {
            currentStep = 1;
            render();
          };
        }

        if (contBtn) {
          contBtn.onclick = () => {
            const nameVal = (container.querySelector('#s2GuestName')?.value || '').trim();
            const phoneVal = (container.querySelector('#s2Phone')?.value || '').trim();
            const notesVal = (container.querySelector('#s2Notes')?.value || '').trim();

            if (nameVal.length < 2) {
              toast('Please enter primary guest full name', 'warn');
              container.querySelector('#s2GuestName')?.focus();
              return;
            }
            if (typeof isValidPhMobile === 'function' && !isValidPhMobile(phoneVal)) {
              toast('Please enter a valid Philippine mobile number (e.g. +63 917 123 4567)', 'warn');
              container.querySelector('#s2Phone')?.focus();
              return;
            }

            guestName = nameVal;
            guestPhone = phoneVal;
            guestNotes = notesVal;
            currentStep = 3;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 3: REVIEW (Pricing breakdown, deposit box, policy tick)
      // ─────────────────────────────────────────────────────────────
      const renderStep3 = (container) => {
        const quote = getQuote();
        const cancelPolicyText = `Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations made less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction. No-shows are not refunded. Remaining balance of ${peso(quote.balanceDue)} is collected upon check-in.`;

        container.innerHTML = `
          ${renderStepsNav()}

          <div style="margin-bottom: 14px;">
            <h3 style="margin: 0 0 4px; font-size: 18px; font-family: 'Cormorant Garamond', serif;">Review Reservation &amp; Guarantee Terms</h3>
            <p class="text-secondary text-sm" style="margin: 0;">
              Confirm accommodation tariffs and payment schedule before locking your room inventory.
            </p>
          </div>

          <!-- Stay Overview Summary -->
          <div style="background-color: var(--surface-2); padding: 12px 16px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line); font-size: 13px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div><b>Room Category:</b> ${esc(selectedType.n)}</div>
              <div><b>Stay Dates:</b> ${fmtDate(ci)} – ${fmtDate(co)} (${quote.nights} nights)</div>
              <div><b>Primary Guest:</b> ${esc(guestName)}</div>
              <div><b>Contact:</b> ${esc(guestPhone)} &middot; ${esc(guestEmail)}</div>
            </div>
            ${guestNotes ? `<div style="margin-top: 8px; font-size: 12px; color: var(--ink-2);"><b>Requests:</b> ${esc(guestNotes)}</div>` : ''}
          </div>

          <!-- Detailed Tariff Breakdown -->
          <div style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 16px; font-size: 13px; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span class="text-secondary">Room accommodation (${quote.nights} nights &times; ${peso(selectedType.r)}):</span>
              <b>${peso(quote.subtotal)}</b>
            </div>
            ${activePromo ? `
              <div style="display: flex; justify-content: space-between; padding: 2px 0; color: var(--ok);">
                <span>Promotion Discount (${activePromo.code}):</span>
                <b>&minus; ${peso(quote.discount)}</b>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; color: var(--ink-3);">
              <span>Statutory VAT (${CONFIG.tax.vatPct}%) &amp; Service Charge (${CONFIG.tax.svcPct}%):</span>
              <span>${peso(quote.taxes.vat + quote.taxes.svc)} (included)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--line); margin-top: 6px; font-size: 15px;">
              <b>Total Stay Tariff:</b>
              <b style="color: var(--ink); font-size: 16px;">${peso(quote.total)}</b>
            </div>
          </div>

          <!-- Highlighted Required Deposit Box -->
          <div style="background: rgba(184, 137, 26, 0.08); border: 2px solid var(--gold); border-radius: var(--r); padding: 14px 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-weight: 700; color: var(--gold-ink); font-size: 15px;">
                Pay now (${CONFIG.depositPct}% down payment):
              </span>
              <span style="font-size: 20px; font-weight: 700; color: var(--gold-ink);">
                ${peso(quote.depositDue)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--ink-2);">
              <span>Balance due at check-in:</span>
              <span style="font-weight: 600;">${peso(quote.balanceDue)}</span>
            </div>
            <div class="text-xs" style="color: var(--ink-3); margin-top: 6px;">
              Your booking is confirmed instantly once payment succeeds.
            </div>
          </div>

          <!-- Policy Tick Box -->
          <div style="margin-bottom: 18px; background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line);">
            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px;">
              <input type="checkbox" id="s3PolicyTick" ${policyAgreed ? 'checked' : ''} style="margin-top: 2px;">
              <span>
                I have read and agree to the <b>Cancellation &amp; Deposit Policy</b>:<br>
                <span class="text-secondary text-xs">${cancelPolicyText}</span>
              </span>
            </label>
          </div>

          <div style="display: flex; justify-content: space-between; gap: 10px;">
            <button type="button" class="btn-secondary" id="btnStep3Back">&larr; Back to Guest</button>
            <button type="button" class="btn" id="btnStep3StartHold" ${!policyAgreed ? 'disabled' : ''}>
              Pay ${peso(quote.depositDue)} and Confirm Booking &rarr;
            </button>
          </div>
        `;

        const policyTick = container.querySelector('#s3PolicyTick');
        const startHoldBtn = container.querySelector('#btnStep3StartHold');
        const backBtn = container.querySelector('#btnStep3Back');

        if (policyTick && startHoldBtn) {
          policyTick.onchange = () => {
            policyAgreed = policyTick.checked;
            startHoldBtn.disabled = !policyAgreed;
          };
        }

        if (backBtn) {
          backBtn.onclick = () => {
            currentStep = 2;
            render();
          };
        }

        if (startHoldBtn) {
          startHoldBtn.onclick = () => {
            if (!policyAgreed) {
              toast('Please accept the cancellation & deposit policy to proceed.', 'warn');
              return;
            }

            startHoldBtn.disabled = true;
            startHoldBtn.textContent = 'Securing Inventory Hold…';

            try {
              if (typeof PUPSJ_Services === 'undefined' || !PUPSJ_Services.BookingService) {
                throw new Error('BookingService unavailable');
              }

              const holdRes = PUPSJ_Services.BookingService.startHold(guestSession, {
                typeId: selectedType.n,
                checkIn: ci,
                checkOut: co,
                guests,
                promoCode: activePromo ? activePromo.code : '',
                notes: guestNotes
              });

              if (!holdRes || (holdRes.ok === false && !holdRes.data)) {
                const errMsg = holdRes?.error || holdRes?.code || 'Unable to hold room';
                throw new Error(errMsg);
              }

              const hold = (holdRes && holdRes.data) ? holdRes.data : holdRes;
              activeHold = hold;
              attemptsMade = hold.attempts || 0;
              inlinePayError = '';
              currentStep = 4;
              render();
            } catch (err) {
              startHoldBtn.disabled = false;
              startHoldBtn.textContent = `Pay ${peso(quote.depositDue)} and Confirm Booking →`;
              if (err.message === 'NO_AVAILABILITY') {
                toast('Sorry, all units of this category were just locked or booked by other guests. Please select other dates.', 'bad');
              } else {
                toast(err.message || 'Unable to hold room', 'bad');
              }
            }
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 4: PAY (Inventory hold countdown, Card/GCash/Maya/Bank)
      // ─────────────────────────────────────────────────────────────
      const renderStep4 = (container) => {
        cleanupTimers();

        if (!activeHold) {
          currentStep = 1;
          render();
          return;
        }

        const holdData = (activeHold && activeHold.data) ? activeHold.data : activeHold;
        const quote = (holdData && holdData.quoteSnapshot) ? holdData.quoteSnapshot : getQuote();
        const attemptsLeft = Math.max(0, (CONFIG.maxPayAttempts || 3) - attemptsMade);

        // Helper: Format countdown mm:ss
        const getRemainingSec = () => {
          const expMs = new Date(holdData.expiresAt || activeHold.expiresAt).getTime();
          const nowMs = Date.now();
          return Math.max(0, Math.floor((expMs - nowMs) / 1000));
        };

        const remainingSec = getRemainingSec();
        if (remainingSec <= 0) {
          renderHoldExpired(container);
          return;
        }

        const isAmber = remainingSec < 120;
        const minStr = String(Math.floor(remainingSec / 60)).padStart(2, '0');
        const secStr = String(remainingSec % 60).padStart(2, '0');

        container.innerHTML = `
          ${renderStepsNav()}

          <!-- Inventory Hold Countdown Banner -->
          <div id="holdBanner" style="background: ${isAmber ? 'rgba(217, 119, 6, 0.12)' : 'var(--surface-2)'}; border: 1px solid ${isAmber ? 'var(--warn)' : 'var(--line)'}; border-radius: var(--r); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: ${isAmber ? 'var(--warn)' : 'var(--gold-ink)'};">
                [PLACEHOLDER: Lock Badge - Insert inventory hold padlock icon here] Room Inventory Locked &middot; Hold ${activeHold.holdId}
              </div>
              <div class="text-xs text-muted" style="margin-top: 2px;">
                Complete down payment before timer expires to guarantee your booking.
              </div>
            </div>
            <div style="text-align: right;">
              <div id="holdTimerDisplay" aria-live="polite" style="font-size: 24px; font-weight: 700; font-family: monospace; color: ${isAmber ? 'var(--warn)' : 'var(--ink)'};">
                ${minStr}:${secStr}
              </div>
              <div class="text-xs text-secondary">
                Attempts Left: <b>${attemptsLeft}</b>
              </div>
            </div>
          </div>
          <!-- Screen Reader Accessible Announcer -->
          <div id="holdAnnouncer" aria-live="polite" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;"></div>

          ${inlinePayError ? `
            <div class="banner banner--bad" style="margin-bottom: 14px; padding: 10px 14px;">
              <span class="ic" data-icon="alert">[ICON: alert]</span>
              <span>${esc(inlinePayError)}</span>
            </div>
          ` : ''}

          <!-- Payment Method Tabs -->
          <div class="tabs" style="margin-bottom: 16px;">
            <button type="button" class="tab-btn ${paymentMethod === 'card' ? 'active' : ''}" id="tabPayCard">
              <span class="ic" data-icon="credit-card">[ICON: credit-card]</span> Credit / Debit Card
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'gcash' ? 'active' : ''}" id="tabPayGcash">
              GCash
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'maya' ? 'active' : ''}" id="tabPayMaya">
              Maya
            </button>
            <button type="button" class="tab-btn ${paymentMethod === 'bank' ? 'active' : ''}" id="tabPayBank">
              Bank Transfer (QR Ph)
            </button>
          </div>

          <!-- Form Area for Selected Method -->
          <div id="payMethodContainer" style="background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 16px; margin-bottom: 16px;">
            ${renderPaymentMethodForm(quote)}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px;">
            <a href="javascript:void(0)" id="btnCancelReleaseHold" class="text-sm" style="color: var(--bad); text-decoration: underline;">
              Cancel and release room
            </a>
            <span class="text-xs text-muted">
              Secure 256-bit simulated transaction
            </span>
          </div>
        `;

        // Start Hold Countdown Timer
        timerInterval = setInterval(() => {
          const sec = getRemainingSec();
          const timerEl = container.querySelector('#holdTimerDisplay');
          const bannerEl = container.querySelector('#holdBanner');
          const announcer = container.querySelector('#holdAnnouncer');

          if (sec <= 0) {
            cleanupTimers();
            if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
              PUPSJ_Services.HoldService.expire();
            }
            renderHoldExpired(container);
            return;
          }

          const m = String(Math.floor(sec / 60)).padStart(2, '0');
          const s = String(sec % 60).padStart(2, '0');
          if (timerEl) timerEl.textContent = `${m}:${s}`;

          // Amber under 2 minutes
          if (sec < 120 && timerEl && bannerEl) {
            timerEl.style.color = 'var(--warn)';
            bannerEl.style.borderColor = 'var(--warn)';
          }

          // Accessible voice announcements at 5:00, 1:00, and 0:00
          if (sec === 300 && announcer) announcer.textContent = 'Room hold alert: 5 minutes remaining to complete payment.';
          if (sec === 60 && announcer) announcer.textContent = 'Room hold alert: 1 minute remaining.';
        }, 1000);

        // Bind Method Tabs
        const btnCard = container.querySelector('#tabPayCard');
        const btnGcash = container.querySelector('#tabPayGcash');
        const btnMaya = container.querySelector('#tabPayMaya');
        const btnBank = container.querySelector('#tabPayBank');
        const cancelHoldBtn = container.querySelector('#btnCancelReleaseHold');

        if (btnCard) btnCard.onclick = () => { paymentMethod = 'card'; inlinePayError = ''; render(); };
        if (btnGcash) btnGcash.onclick = () => { paymentMethod = 'gcash'; inlinePayError = ''; render(); };
        if (btnMaya) btnMaya.onclick = () => { paymentMethod = 'maya'; inlinePayError = ''; render(); };
        if (btnBank) btnBank.onclick = () => { paymentMethod = 'bank'; inlinePayError = ''; render(); };

        if (cancelHoldBtn) {
          cancelHoldBtn.onclick = () => {
            cleanupTimers();
            if (typeof PUPSJ_Services !== 'undefined' && PUPSJ_Services.HoldService) {
              PUPSJ_Services.HoldService.releaseHold(activeHold.holdId);
            }
            activeHold = null;
            toast('Room hold released.', 'info');
            currentStep = 1;
            render();
          };
        }

        bindPaymentMethodEvents(container);
      };

      const renderPaymentMethodForm = (quote) => {
        const depAmt = peso(quote.depositDue);

        if (paymentMethod === 'card') {
          return `
            <form id="cardPayForm" onsubmit="return false;">
              <div class="field">
                <label for="payCardName">Cardholder Full Name *</label>
                <input type="text" id="payCardName" value="${esc(guestName)}" placeholder="Maria Santos" required autocomplete="cc-name">
              </div>
              <div class="field">
                <label for="payCardNumber">Credit / Debit Card Number *</label>
                <input type="text" id="payCardNumber" placeholder="4242 4242 4242 4242" maxlength="19" required autocomplete="cc-number">
              </div>
              <div class="field-row-2">
                <div class="field">
                  <label for="payCardExp">Expiry Date (MM/YY) *</label>
                  <input type="text" id="payCardExp" placeholder="12/28" maxlength="5" required autocomplete="cc-exp">
                </div>
                <div class="field">
                  <label for="payCardCvv">CVV Security Code *</label>
                  <input type="password" id="payCardCvv" placeholder="123" maxlength="4" required autocomplete="cc-csc">
                </div>
              </div>

              ${CONFIG.demoLogins ? `
                <details style="margin: 10px 0; font-size: 12px; background: var(--surface-2); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line);">
                  <summary style="cursor: pointer; font-weight: 600; color: var(--gold-ink);">Demo Test Cards (Click to auto-fill)</summary>
                  <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4242424242424242" data-exp="12/28" data-cvv="123" style="color: var(--ok); text-decoration: underline;">4242 4242 4242 4242 &middot; Succeeded</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000000002" data-exp="12/28" data-cvv="123" style="color: var(--warn); text-decoration: underline;">4000 0000 0000 0002 &middot; Card Declined</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000009995" data-exp="12/28" data-cvv="123" style="color: var(--warn); text-decoration: underline;">4000 0000 0000 9995 &middot; Insufficient Funds</a>
                    <a href="javascript:void(0)" class="demo-card-fill" data-card="4000000000000069" data-exp="01/20" data-cvv="123" style="color: var(--bad); text-decoration: underline;">4000 0000 0000 0069 &middot; Expired Card</a>
                  </div>
                </details>
              ` : ''}

              <button type="button" class="btn btn-block" id="btnSubmitCardPayment" style="margin-top: 10px;">
                Pay Down Payment ${depAmt} &rarr;
              </button>
            </form>
          `;
        }

        if (paymentMethod === 'gcash' || paymentMethod === 'maya') {
          const brand = paymentMethod === 'gcash' ? 'GCash' : 'Maya';
          return `
            <div style="text-align: center; padding: 10px 0;">
              <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Mobile Phone Icon - Insert mobile wallet phone graphic here]</div>
              <h4 style="margin: 0 0 6px; font-size: 16px;">Simulated ${brand} E-Wallet Authorization</h4>
              <p class="text-secondary text-sm" style="margin: 0 auto 14px; max-width: 400px;">
                Authenticate down payment of <b>${depAmt}</b> via your registered mobile number (${esc(guestPhone)}).
              </p>
              <button type="button" class="btn" id="btnOpenWalletSheet">
                Open Simulated ${brand} Sheet &rarr;
              </button>
            </div>
          `;
        }

        if (paymentMethod === 'bank') {
          const banks = [
            'BDO Unibank',
            'BPI (Bank of the Philippine Islands)',
            'Metrobank',
            'UnionBank of the Philippines',
            'Landbank of the Philippines',
            'RCBC',
            'Security Bank'
          ];
          const refCode = `PUP-${activeHold.holdId}`;
          return `
            <div>
              <div style="margin-bottom: 12px;">
                <label for="bankSelect" style="font-size: 13px; font-weight: 600;">Select Originating Bank</label>
                <select id="bankSelect" style="margin-top: 4px;">
                  ${banks.map(b => `<option value="${b}" ${b === selectedBank ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
              </div>

              <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); border: 1px solid var(--line); margin-bottom: 14px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between;">
                  <span>Reference Code:</span>
                  <b style="font-family: monospace;">${refCode}</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Settlement Amount:</span>
                  <b style="color: var(--gold-ink);">${depAmt}</b>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <span>Payment Window:</span>
                  <span>${CONFIG.bankHoldMinutes || 30} Minutes (Auto-confirmed upon callback)</span>
                </div>
              </div>

              <!-- QR Ph Code Placeholder -->
              <div style="text-align: center; margin: 14px 0;">
                <div style="display: inline-block; padding: 14px; background: #fff; border-radius: 8px; border: 1px solid var(--line); color: #000; font-family: monospace; font-size: 11px;">
                  <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600; color: #333;">[PLACEHOLDER: Phone Device Icon - Insert mobile QR scanner graphic here]</div>
                  <div style="font-weight: 700; margin-top: 4px;">[IMAGE: QR Ph code, 1:1]</div>
                  <div style="font-size: 10px; color: #555;">Scan with any PH banking app</div>
                </div>
              </div>

              <div style="text-align: center;">
                <button type="button" class="btn" id="btnLaunchBankSheet">
                  Launch Simulated Online Banking / QR Ph Gateway &rarr;
                </button>
              </div>
            </div>
          `;
        }
      };

      const bindPaymentMethodEvents = (container) => {
        // 1. Card Auto-Fill & Submission
        container.querySelectorAll('.demo-card-fill').forEach(link => {
          link.onclick = () => {
            const num = link.dataset.card;
            const exp = link.dataset.exp;
            const cvv = link.dataset.cvv;
            const numInp = container.querySelector('#payCardNumber');
            const expInp = container.querySelector('#payCardExp');
            const cvvInp = container.querySelector('#payCardCvv');
            if (numInp) numInp.value = num;
            if (expInp) expInp.value = exp;
            if (cvvInp) cvvInp.value = cvv;
          };
        });

        const submitCardBtn = container.querySelector('#btnSubmitCardPayment');
        if (submitCardBtn) {
          submitCardBtn.onclick = () => {
            const name = (container.querySelector('#payCardName')?.value || '').trim();
            const cardNumber = (container.querySelector('#payCardNumber')?.value || '').trim();
            const exp = (container.querySelector('#payCardExp')?.value || '').trim();
            const cvv = (container.querySelector('#payCardCvv')?.value || '').trim();

            if (!name || !cardNumber || !exp || !cvv) {
              toast('Please complete all card details', 'warn');
              return;
            }

            submitCardBtn.disabled = true;
            submitCardBtn.textContent = 'Processing Payment…';

            try {
              const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, 'card', {
                name,
                cardNumber,
                exp,
                cvv
              });

              if (res.ok || res.success) {
                cleanupTimers();
                confirmedReservation = res.data || res.reservation;
                currentStep = 5;
                render();
              } else {
                attemptsMade = res.attempts;
                inlinePayError = res.error || 'Card transaction declined';
                if (res.holdExpired) {
                  renderHoldExpired(container);
                } else {
                  render();
                }
              }
            } catch (err) {
              submitCardBtn.disabled = false;
              submitCardBtn.textContent = `Pay Down Payment ${peso(quote.depositDue)} →`;
              inlinePayError = err.message || 'Payment failed';
              render();
            }
          };
        }

        // 2. GCash / Maya Simulated Sheet
        const walletBtn = container.querySelector('#btnOpenWalletSheet');
        if (walletBtn) {
          walletBtn.onclick = () => {
            const brand = paymentMethod === 'gcash' ? 'GCash' : 'Maya';
            const depAmt = peso(quote.depositDue);
            const ref = 'PUP-WALLET-' + Date.now().toString().slice(-6);

            const sheetHtml = `
              <div style="text-align: center; padding: 10px 0;">
                <div style="font-size: 13px; font-weight: 600; color: var(--gold-ink); margin-bottom: 8px;">[PLACEHOLDER: Payment Card Icon - Insert credit card / payment method icon here]</div>
                <h3 style="margin: 0 0 4px; font-size: 20px;">${brand} Express Checkout</h3>
                <p class="text-secondary text-sm" style="margin: 0 0 16px;">
                  Merchant: <b>${CONFIG.hotelName}</b> &middot; Ref: <b>${ref}</b>
                </p>
                <div style="background: var(--surface-2); padding: 14px; border-radius: var(--r); margin-bottom: 16px; border: 1px solid var(--line);">
                  <div class="text-xs text-secondary">Authorized Payment Amount</div>
                  <div style="font-size: 24px; font-weight: 700; color: var(--gold-ink);">${depAmt}</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="btn" id="btnApproveWallet">Approve Down Payment</button>
                  <button type="button" class="btn-secondary" id="btnDeclineWallet">Simulate Declined Payment</button>
                  <button type="button" class="btn-ghost" id="btnCancelWallet">Cancel</button>
                </div>
              </div>
            `;

            showModal(`${brand} Authorization`, sheetHtml, '', {
              maxWidth: '420px',
              onOpen(subModal) {
                const approveBtn = subModal.querySelector('#btnApproveWallet');
                const declineBtn = subModal.querySelector('#btnDeclineWallet');
                const cancelBtn = subModal.querySelector('#btnCancelWallet');

                if (approveBtn) {
                  approveBtn.onclick = () => {
                    closeModal();
                    const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, paymentMethod, {
                      phone: guestPhone,
                      outcome: 'paid',
                      ref
                    });
                    if (res.ok || res.success) {
                      cleanupTimers();
                      confirmedReservation = res.data || res.reservation;
                      currentStep = 5;
                      render();
                    } else {
                      attemptsMade = res.attempts;
                      inlinePayError = res.error || 'Payment failed';
                      render();
                    }
                  };
                }

                if (declineBtn) {
                  declineBtn.onclick = () => {
                    closeModal();
                    const res = PUPSJ_Services.PaymentService.pay(activeHold.holdId, paymentMethod, {
                      phone: guestPhone,
                      outcome: 'declined',
                      ref
                    });
                    attemptsMade = res.attempts;
                    inlinePayError = res.error || 'Payment declined by e-wallet provider';
                    render();
                  };
                }

                if (cancelBtn) {
                  cancelBtn.onclick = () => closeModal();
                }
              }
            });
          };
        }

        // 3. Bank Transfer Simulated Gateway Sheet
        const bankSelect = container.querySelector('#bankSelect');
        if (bankSelect) {
          bankSelect.onchange = () => {
            selectedBank = bankSelect.value;
          };
        }

        const launchBankBtn = container.querySelector('#btnLaunchBankSheet');
        if (launchBankBtn) {
          launchBankBtn.onclick = () => {
            // Initiates hold extension to bankHoldMinutes and creates AwaitingBank intent
            const initRes = PUPSJ_Services.PaymentService.pay(activeHold.holdId, 'bank', {
              bankName: selectedBank
            });

            const intent = initRes?.intent || initRes?.data;
            if (!initRes || (!initRes.success && !initRes.ok) || !intent) {
              toast(initRes?.error || 'Unable to open bank transfer gateway', 'bad');
              return;
            }

            activeIntent = intent;

            // Start polling PaymentIntent status every 2s
            if (!pollInterval) {
              pollInterval = setInterval(() => {
                if (!activeIntent) return;
                const freshIntent = PUPSJ_Services.PaymentService.getIntent(activeIntent.intentId);
                if (freshIntent && freshIntent.status === 'Succeeded') {
                  cleanupTimers();
                  const allRes = Data.getReservations();
                  const targetRes = allRes.find(r => r.holdId === activeHold.holdId) || (typeof Data.findRes === 'function' ? Data.findRes(freshIntent.holdId) : null);
                  confirmedReservation = targetRes || allRes[0];
                  currentStep = 5;
                  render();
                }
              }, 2000);
            }

            const depAmt = peso(quote.depositDue);
            const refCode = `PUP-${activeHold.holdId}`;

            const bankSheetHtml = `
              <div style="text-align: center; padding: 10px 0;">
                <h3 style="margin: 0 0 4px; font-size: 20px;">${esc(selectedBank)} Gateway</h3>
                <p class="text-secondary text-sm" style="margin: 0 0 14px;">
                  Simulated Online Banking / QR Ph Webhook Simulator
                </p>

                <div style="background: #fff; color: #111; padding: 14px; border-radius: 8px; border: 1px solid var(--line); display: inline-block; margin-bottom: 14px;">
                  <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600; color: #333;">[PLACEHOLDER: Phone Device Icon - Insert mobile QR scanner graphic here]</div>
                  <div style="font-family: monospace; font-size: 11px; font-weight: 700;">[IMAGE: QR Ph code, 1:1]</div>
                  <div style="font-size: 12px; margin-top: 4px;">Ref: <b>${refCode}</b> &middot; <b>${depAmt}</b></div>
                </div>

                <div id="bankSheetStatus" class="text-sm" style="margin-bottom: 14px; min-height: 20px; color: var(--gold-ink); font-weight: 600;">
                  Awaiting your online banking action…
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <button type="button" class="btn" id="btnApproveBankCallback">
                    Approve Payment (2-4s Webhook Callback)
                  </button>
                  <button type="button" class="btn-secondary" id="btnDeclineBankCallback">
                    Decline Payment
                  </button>
                  <button type="button" class="btn-ghost" id="btnCloseBankSheet">
                    Close Sheet (Keep Waiting)
                  </button>
                </div>
              </div>
            `;

            showModal('Bank Gateway Simulator', bankSheetHtml, '', {
              maxWidth: '440px',
              onOpen(bModal) {
                const approveBtn = bModal.querySelector('#btnApproveBankCallback');
                const declineBtn = bModal.querySelector('#btnDeclineBankCallback');
                const closeBtn = bModal.querySelector('#btnCloseBankSheet');
                const statusDiv = bModal.querySelector('#bankSheetStatus');

                if (approveBtn) {
                  approveBtn.onclick = () => {
                    approveBtn.disabled = true;
                    if (statusDiv) statusDiv.innerHTML = 'Simulating secure bank gateway confirmation callback (2.5s)…';

                    setTimeout(() => {
                      const callbackRes = PUPSJ_Services.PaymentService.bankCallback(
                        activeIntent.intentId,
                        'paid',
                        'BNK-REF-' + Date.now()
                      );
                      closeModal();
                      if (callbackRes.success) {
                        cleanupTimers();
                        confirmedReservation = callbackRes.reservation;
                        currentStep = 5;
                        render();
                      } else {
                        inlinePayError = callbackRes.error || 'Bank confirmation failed';
                        render();
                      }
                    }, 2500);
                  };
                }

                if (declineBtn) {
                  declineBtn.onclick = () => {
                    PUPSJ_Services.PaymentService.bankCallback(activeIntent.intentId, 'declined');
                    closeModal();
                    attemptsMade += 1;
                    inlinePayError = 'Bank transfer declined by provider';
                    render();
                  };
                }

                if (closeBtn) closeBtn.onclick = () => closeModal();
              }
            });
          };
        }
      };

      const renderHoldExpired = (container) => {
        cleanupTimers();
        container.innerHTML = `
          ${renderStepsNav()}
          <div style="text-align: center; padding: 24px 0;">
            <div style="font-size: 13px; font-weight: 600; color: var(--warn); margin-bottom: 8px;">[PLACEHOLDER: Timer Expired Icon - Insert hold timeout hourglass / clock SVG here]</div>
            <h3 style="font-size: 22px; font-family: 'Cormorant Garamond', serif; margin: 0 0 6px;">Room Inventory Hold Expired</h3>
            <p class="text-secondary text-sm" style="max-width: 440px; margin: 0 auto 18px;">
              The temporary reservation hold has timed out to allow other guests access to room inventory. Your search criteria has been safely preserved.
            </p>
            <button type="button" class="btn" id="btnCheckAvailAgain">
              Check Availability Again &rarr;
            </button>
          </div>
        `;

        const btnAgain = container.querySelector('#btnCheckAvailAgain');
        if (btnAgain) {
          btnAgain.onclick = () => {
            activeHold = null;
            activeIntent = null;
            inlinePayError = '';
            currentStep = 1;
            render();
          };
        }
      };

      // ─────────────────────────────────────────────────────────────
      // STEP 5: CONFIRMED (Instant Confirmation, Voucher, OR, Email)
      // ─────────────────────────────────────────────────────────────
      const renderStep5 = (container) => {
        cleanupTimers();
        const r = confirmedReservation || (typeof Data !== 'undefined' ? Data.getReservations()[0] : null);
        if (!r) {
          container.innerHTML = '<p class="text-secondary">Reservation confirmed.</p>';
          return;
        }

        const quote = r.quoteSnapshot || getQuote();
        const orNumber = (r.payments && r.payments[0] && r.payments[0].or) ? r.payments[0].or : ('OR-' + r.c.replace(/\D/g, ''));
        const nts = typeof Data !== 'undefined' && Data.nts ? Data.nts(r) : quote.nights;

        container.innerHTML = `
          ${renderStepsNav()}

          <div style="text-align: center; padding: 6px 0 14px;">
            <span class="pill pill--ok" style="font-size: 13px; padding: 4px 14px;">Instant Online Booking Confirmed</span>
            <h2 style="margin: 10px 0 2px; font-size: 34px; font-family: 'Cormorant Garamond', serif;">${r.c}</h2>
            <p class="text-secondary" style="font-size: 14px; margin: 0;">
              Thank you, <b>${esc(r.g)}</b>! Your room reservation is guaranteed.
            </p>
          </div>

          <div class="card card-sm" style="margin: 0 0 16px; text-align: left; background-color: var(--surface-2); font-size: 13px; border: 1px solid var(--line);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div><b>Room Category:</b> ${esc(r.t)} ${r.n ? `(Room ${r.n})` : '(Assigned at Check-in)'}</div>
              <div><b>Stay Period:</b> ${fmtDate(r.i)} – ${fmtDate(r.o)} (${nts} nights)</div>
              <div><b>Registered Guests:</b> ${r.gu} guest${r.gu > 1 ? 's' : ''}</div>
              <div><b>Status:</b> <span class="pill pill--ok">${r.st}</span></div>
              <div><b>Total Tariff:</b> ${peso(quote.total)}</div>
              <div><b>Deposit Settled:</b> <span style="color: var(--ok); font-weight: 600;">${peso(r.depositPaid || quote.depositDue)} (${r.depositPct || CONFIG.depositPct}% down payment)</span></div>
              <div><b>Official Receipt:</b> <b style="font-family: monospace;">${orNumber}</b></div>
              <div><b>Balance Due:</b> <span style="color: var(--bad); font-weight: 600;">${peso(r.balanceDue || quote.balanceDue)} at check-in</span></div>
            </div>
            <div style="border-top: 1px solid var(--line); margin-top: 10px; padding-top: 8px; font-size: 11px; color: var(--ink-3);">
              Confirmed by <b>${esc(r.confirmedBy || 'System (payment)')}</b> &middot; Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival.
            </div>
          </div>

          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <a href="../guest/guest-portal.html?code=${r.c}&tab=reservations" class="btn">
              View in My Reservations &rarr;
            </a>
            <button type="button" class="btn-secondary" id="btnBmPrintVoucher">
              <span class="ic" data-icon="print">[ICON: print]</span> Print Voucher
            </button>
            <button type="button" class="btn-ghost" id="btnBmSimEmail">
              Simulated Email Preview
            </button>
          </div>
        `;

        const printBtn = container.querySelector('#btnBmPrintVoucher');
        const emailBtn = container.querySelector('#btnBmSimEmail');

        if (printBtn) {
          printBtn.onclick = () => openVoucherModal(r.c);
        }
        if (emailBtn) {
          emailBtn.onclick = () => openSimulatedEmailModal(r.c);
        }

        if (typeof onComplete === 'function') {
          try { onComplete(r); } catch (e) {}
        }
      };

      // Initial Render
      render();
    }
  });
}

// ─── Voucher Modal with [PLACEHOLDER: Watermark SIMULATED] ───
function openVoucherModal(resCode) {
  const r = typeof Data !== 'undefined' && Data.findRes ? Data.findRes(resCode) : null;
  if (!r) {
    toast('Reservation not found', 'bad');
    return;
  }
  const nts = typeof Data !== 'undefined' && Data.nts ? Data.nts(r) : 1;
  const quote = r.quoteSnapshot || { total: Data.tot(r), depositDue: r.depositPaid, balanceDue: r.balanceDue };
  const orNumber = (r.payments && r.payments[0] && r.payments[0].or) ? r.payments[0].or : ('OR-' + r.c.replace(/\D/g, ''));

  const voucherHtml = `
    <div style="position: relative; padding: 16px; font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #111; border: 1px solid #ddd; border-radius: 8px;">
      <!-- Simulated Watermark Overlay -->
      <div style="position: absolute; top: 38%; left: 18%; transform: rotate(-25deg); font-size: 38px; font-weight: 800; color: rgba(184, 137, 26, 0.15); pointer-events: none; border: 4px dashed rgba(184, 137, 26, 0.2); padding: 8px 24px; text-transform: uppercase;">
        [PLACEHOLDER: Watermark SIMULATED]
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 20px; color: var(--gold-ink); font-family: 'Cormorant Garamond', serif;">${CONFIG.hotelName}</h2>
          <div style="font-size: 11px; color: #555;">Official Online Reservation Voucher</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 15px; font-weight: 700; color: var(--ok);">GUARANTEED</div>
          <div style="font-size: 12px; font-weight: 600;">Code: ${r.c}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; margin-bottom: 14px;">
        <div><b>Guest Name:</b> ${esc(r.g)}</div>
        <div><b>Contact Phone:</b> ${esc(r.ph || 'On file')}</div>
        <div><b>Room Category:</b> ${esc(r.t)} (Room ${r.n || 'TBD'})</div>
        <div><b>Stay Duration:</b> ${fmtDate(r.i)} – ${fmtDate(r.o)} (${nts} nights)</div>
        <div><b>Registered Guests:</b> ${r.gu} guest(s)</div>
        <div><b>Deposit Receipt:</b> ${orNumber}</div>
      </div>

      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 10px; font-size: 12px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between;"><span>Total Accommodation Tariff:</span><b>${peso(quote.total)}</b></div>
        <div style="display: flex; justify-content: space-between; color: var(--ok);"><span>Deposit Settled (${r.depositPct || CONFIG.depositPct}%):</span><b>&minus; ${peso(r.depositPaid || quote.depositDue)}</b></div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 4px; margin-top: 4px; font-weight: 700; color: var(--bad);">
          <span>Balance Due at Check-in:</span><span>${peso(r.balanceDue || quote.balanceDue)}</span>
        </div>
      </div>

      <div style="font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
        <b>Cancellation Policy:</b> Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction. No-shows are not refunded.
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;" class="no-print">
        <button type="button" class="btn-secondary" onclick="closeModal()">Close</button>
        <button type="button" class="btn" onclick="window.print()"><span class="ic" data-icon="print">[ICON: print]</span> Print Voucher</button>
      </div>
    </div>
  `;

  showModal(`Reservation Voucher &mdash; ${r.c}`, voucherHtml, '', { maxWidth: '540px' });
}

// ─── Simulated Confirmation Email Preview ───
function openSimulatedEmailModal(resCode) {
  const r = typeof Data !== 'undefined' && Data.findRes ? Data.findRes(resCode) : null;
  if (!r) return;
  const quote = r.quoteSnapshot || { total: Data.tot(r), depositDue: r.depositPaid, balanceDue: r.balanceDue };

  const emailHtml = `
    <div style="background: var(--surface); padding: 14px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px;">
      <div style="border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 12px; font-size: 12px;">
        <div><b>From:</b> PUPSJ Hotel Reservations &lt;reservations@pupsjhotel.com&gt;</div>
        <div><b>To:</b> ${esc(r.email || r.g + '@guest.com')}</div>
        <div><b>Date:</b> ${new Date().toLocaleString()}</div>
        <div><b>Subject:</b> Booking Confirmed: Your Stay at PUPSJ Hotel (${r.c})</div>
      </div>

      <p>Dear ${esc(r.g)},</p>
      <p>Thank you for choosing ${CONFIG.hotelName}. Your reservation is officially confirmed upon receipt of your 50% deposit payment.</p>
      
      <div style="background: var(--surface-2); padding: 12px; border-radius: var(--r); margin: 12px 0;">
        <div><b>Confirmation Code:</b> ${r.c}</div>
        <div><b>Room Category:</b> ${esc(r.t)}</div>
        <div><b>Arrival:</b> ${fmtDate(r.i)} from 2:00 PM</div>
        <div><b>Departure:</b> ${fmtDate(r.o)} until 12:00 PM</div>
        <div><b>Deposit Paid:</b> ${peso(r.depositPaid || quote.depositDue)} (${r.depositPct || CONFIG.depositPct}%)</div>
        <div><b>Balance Due at Check-in:</b> ${peso(r.balanceDue || quote.balanceDue)}</div>
      </div>

      <p class="text-xs text-secondary">
        Cancellation Policy: Free cancellation up to ${CONFIG.freeCancelDays || 3} days before arrival. Cancellations less than ${CONFIG.freeCancelDays || 3} days before arrival are refunded less a ${CONFIG.lateCancelFeePct || 30}% deduction.
      </p>

      <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
        <button type="button" class="btn-secondary" onclick="closeModal()">Close Email</button>
      </div>
    </div>
  `;

  showModal('Simulated Email Preview', emailHtml, '', { maxWidth: '520px' });
}

// ─── Intent Auto-Resume on Page Ready ───
if (typeof window !== 'undefined') {
  window.showAuthGateModal = showAuthGateModal;
  window.openBookingModal = openBookingModal;
  window.openVoucherModal = openVoucherModal;
  window.openSimulatedEmailModal = openSimulatedEmailModal;

  window.addEventListener('DOMContentLoaded', () => {
    try {
      if (typeof getPendingIntent === 'function') {
        const guestSession = (typeof Data !== 'undefined' && Data.getGuestSession) ? Data.getGuestSession() : null;
        const intent = getPendingIntent();
        if (guestSession && intent && intent.type === 'room') {
          clearPendingIntent();
          setTimeout(() => {
            openBookingModal(intent.roomType, intent.ci, intent.co, intent.guests, intent.promo);
            if (typeof toast === 'function') {
              toast('Welcome back! Your pending room reservation has been restored.', 'ok');
            }
          }, 250);
        }
      }
    } catch (e) {}
  });
}


// ─── 2. Global Folio & Ledger Modal ───
function openFolioModal(resCode, onUpdate = null) {
  const res = Data.findRes(resCode);
  if (!res) {
    toast('Reservation not found', 'bad');
    return;
  }

  const renderFolio = () => {
    const r = Data.findRes(resCode);
    if (!r) return;
    const nts = Data.nts(r);
    const roomCharge = Data.roomChg(r);
    const total = Data.tot(r);
    const paid = Data.paidAmt(r);
    const bal = Data.balOf(r);

    const bodyHtml = `
      <div style="font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 18px;">${esc(r.g)}</h3>
            <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
            <div class="text-xs text-muted" style="margin-top: 2px;">${fmtDate(r.i)} to ${fmtDate(r.o)} (${nts} nights)</div>
          </div>
          <div style="text-align: right;">
            <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : 'pill--warn'}">${r.st}</span>
            <div style="margin-top: 4px; font-weight: 600; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
              ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled (₱0)'}
            </div>
          </div>
        </div>

        <!-- 1. Charges Section -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b>1. Charges Breakdown</b>
            <span class="text-secondary text-xs">Room + Incidentals</span>
          </div>
          <div class="table-wrap" style="max-height: 150px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>Item / Description</th>
                  <th>Category</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Room Accommodation (${nts} nights &times; ${peso(r.rt || 3200)})</td>
                  <td>Accommodation</td>
                  <td style="text-align: right; font-weight: 600;">${peso(roomCharge)}</td>
                </tr>
                ${(r.x || []).map(x => `
                  <tr>
                    <td>${esc(x.desc)}</td>
                    <td>${esc(x.cat || 'Incidentals')}</td>
                    <td style="text-align: right; font-weight: 600;">${peso(x.amt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Post Charge Form -->
          <div style="background: var(--surface-2); padding: 10px; border-radius: var(--r); margin-top: 8px; border: 1px solid var(--line);">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">Add Folio Charge:</div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 6px; align-items: end;">
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Description *</label>
                <input type="text" id="folioChgDesc" placeholder="e.g. Minibar, Laundry, Airport Transfer" style="height: 32px; font-size: 12px;">
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Category</label>
                <select id="folioChgCat" style="height: 32px; font-size: 12px;">
                  <option value="Dining">Dining</option>
                  <option value="Spa">Spa &amp; Wellness</option>
                  <option value="Minibar">Minibar</option>
                  <option value="Laundry">Laundry</option>
                  <option value="Incidentals" selected>Incidentals</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Amount (₱) *</label>
                <input type="number" id="folioChgAmt" min="1" placeholder="0" style="height: 32px; font-size: 12px;">
              </div>
              <button class="btn btn-sm" id="btnFolioPostCharge" style="height: 32px; white-space: nowrap;">Post Charge</button>
            </div>
          </div>
        </div>

        <!-- 2. Payments & Receipts Section -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b>2. Recorded Payments &amp; Receipts</b>
            <span class="text-secondary text-xs">Official Receipts (OR-#####)</span>
          </div>
          <div class="table-wrap" style="max-height: 150px; overflow-y: auto;">
            <table>
              <thead>
                <tr>
                  <th>OR No.</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Type</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(r.pay || []).map(p => `
                  <tr>
                    <td><b>${esc(p.id || p.or)}</b></td>
                    <td>${fmtDate(p.d)}</td>
                    <td>${esc(p.m)}</td>
                    <td>
                      <span class="pill ${p.k === 'Refund' || p.t === 'Refund' ? 'pill--bad' : 'pill--ok'}" style="font-size: 11px;">
                        ${esc(p.k || p.t || 'Payment')}
                      </span>
                    </td>
                    <td style="text-align: right; font-weight: 600; color: ${p.k === 'Refund' || p.t === 'Refund' ? 'var(--bad)' : 'var(--ink)'};">
                      ${p.k === 'Refund' || p.t === 'Refund' ? `&minus; ${peso(p.a || p.amt)}` : peso(p.a || p.amt)}
                    </td>
                  </tr>
                `).join('')}
                ${(!r.pay || !r.pay.length) ? `
                  <tr><td colspan="5" class="text-center text-muted" style="padding: 12px;">No payments recorded yet.</td></tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          <!-- Post Payment Form -->
          <div style="background: var(--surface-2); padding: 10px; border-radius: var(--r); margin-top: 8px; border: 1px solid var(--line);">
            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px;">Record Payment / Deposit / Refund:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 6px; align-items: end;">
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Payment Type</label>
                <select id="folioPayType" style="height: 32px; font-size: 12px;">
                  <option value="Payment" selected>Payment</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Refund">Refund</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Method</label>
                <select id="folioPayMethod" style="height: 32px; font-size: 12px;">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div class="field" style="margin: 0;">
                <label style="font-size: 11px;">Amount (₱)</label>
                <input type="number" id="folioPayAmt" min="1" value="${Math.max(0, bal)}" style="height: 32px; font-size: 12px;">
              </div>
              <button class="btn btn-sm" id="btnFolioPostPayment" style="height: 32px; white-space: nowrap;">Record</button>
            </div>
          </div>
        </div>

        <!-- Ledger Financial Summary -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 10px 14px; border-radius: var(--r); border: 1px solid var(--line); font-size: 13px;">
          <div><b>Total Charges:</b> ${peso(total)}</div>
          <div style="color: var(--ok);"><b>Total Paid:</b> ${peso(paid)}</div>
          <div style="font-weight: 700; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
            ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Zero Balance (Settled)'}
          </div>
        </div>
      </div>
    `;

    const footerHtml = `
      <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
        <div>
          <button class="btn-secondary" id="btnFolioPrintInv">
            <span class="ic" data-icon="print">[ICON: print]</span> Tax Invoice
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

    showModal(`Guest Folio &amp; Ledger &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '720px' });

    // Scoped Lookups
    const modalEl = document.getElementById('appModalBackdrop');
    if (!modalEl) return;

    const btnPostChg = modalEl.querySelector('#btnFolioPostCharge');
    if (btnPostChg) {
      btnPostChg.onclick = () => {
        const desc = (modalEl.querySelector('#folioChgDesc')?.value || '').trim();
        const cat = modalEl.querySelector('#folioChgCat')?.value || 'Incidentals';
        const amt = parseFloat(modalEl.querySelector('#folioChgAmt')?.value);
        if (!desc) {
          toast('Enter a charge description', 'warn');
          return;
        }
        if (isNaN(amt) || amt <= 0) {
          toast('Enter a valid charge amount', 'warn');
          return;
        }
        Data.addCharge(r.c, desc, amt, cat);
        toast(`Added ${desc} (${peso(amt)}) to folio`, 'ok');
        renderFolio();
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      };
    }

    const btnPostPay = modalEl.querySelector('#btnFolioPostPayment');
    if (btnPostPay) {
      btnPostPay.onclick = () => {
        const type = modalEl.querySelector('#folioPayType')?.value || 'Payment';
        const method = modalEl.querySelector('#folioPayMethod')?.value || 'Cash';
        const amt = parseFloat(modalEl.querySelector('#folioPayAmt')?.value);
        if (isNaN(amt) || amt <= 0) {
          toast('Enter a valid payment amount', 'warn');
          return;
        }

        if (type === 'Refund' && amt > paid) {
          toast('Refund amount cannot exceed total settled payments', 'bad');
          return;
        }

        const orNo = Data.addPayment(r.c, amt, method, type, 'Front Desk Settlement');
        toast(`Recorded ${peso(amt)} via ${method} (${orNo.id || orNo})`, 'ok');
        renderFolio();
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      };
    }

    const btnPrintInv = modalEl.querySelector('#btnFolioPrintInv');
    if (btnPrintInv) {
      btnPrintInv.onclick = () => printTaxInvoice(r.c);
    }
  };

  renderFolio();
}

// ─── 3. Global Reservation Detail Modal ───
function openReservationDetail(code, onUpdate = null) {
  const r = Data.findRes(code);
  if (!r) {
    toast('Reservation not found', 'bad');
    return;
  }

  const nts = Data.nts(r);
  const total = Data.tot(r);
  const paid = Data.paidAmt(r);
  const bal = Data.balOf(r);
  const canCheckIn = r.st === 'Confirmed' && isClean && (paid >= (r.depositRequired != null ? r.depositRequired : Data.depAmt(r)));
  const canCheckOut = r.st === 'Checked-in';

  const bodyHtml = `
    <div style="font-size: 13px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 20px;">${esc(r.g)}</h2>
          <div class="text-sm text-secondary">${esc(r.t)} &middot; Room <b>${r.n}</b> &middot; Code: <b>${r.c}</b></div>
          ${r.ph ? `<div class="text-sm text-muted">Phone: ${esc(r.ph)}</div>` : ''}
          ${r.email ? `<div class="text-sm text-muted">Email: ${esc(r.email)}</div>` : ''}
        </div>
        <div style="text-align: right;">
          <span class="pill ${r.st === 'Checked-in' ? 'pill--ok' : r.st === 'Confirmed' ? 'pill--info' : r.st === 'Pending' ? 'pill--warn' : 'pill--bad'}">${r.st}</span>
          <div style="font-size: 12px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'}; font-weight: 600; margin-top: 4px;">
            ${bal > 0 ? `Balance Due: ${peso(bal)}` : 'Balance Settled (₱0)'}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line);">
        <div>
          <div class="text-xs text-secondary">Check-in Date:</div>
          <b>${fmtDate(r.i)} (2:00 PM)</b>
        </div>
        <div>
          <div class="text-xs text-secondary">Check-out Date:</div>
          <b>${fmtDate(r.o)} (12:00 PM)</b>
        </div>
        <div>
          <div class="text-xs text-secondary">Length of Stay:</div>
          <b>${nts} Night(s) &middot; ${r.gu} Guest(s)</b>
        </div>
        <div>
          <div class="text-xs text-secondary">Room Cleanliness:</div>
          <b>${isClean ? '<span style="color:var(--ok);">Clean &amp; Ready</span>' : '<span style="color:var(--bad);">Dirty / Cleaning in progress</span>'}</b>
        </div>
      </div>

      ${r.note ? `
        <div style="background: var(--bg); border: 1px solid var(--line); padding: 10px; border-radius: var(--r); margin-bottom: 14px;">
          <span class="text-xs text-secondary">Guest Special Requests:</span>
          <div style="margin-top: 2px;">${esc(r.note)}</div>
        </div>
      ` : ''}

      ${r.promo ? `
        <div style="background: rgba(184, 137, 26, 0.1); color: var(--gold-ink); padding: 8px 12px; border-radius: var(--r); margin-bottom: 14px; font-size: 12px; border: 1px solid var(--gold);">
          Promo Applied: <b>${esc(typeof r.promo === 'object' ? r.promo.code : r.promo)}</b>
        </div>
      ` : ''}

      <div style="border-top: 1px solid var(--line); padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span>Room Accommodation Rate:</span>
          <span>${peso(r.rt || 3200)} / night &times; ${nts}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <span>Total Folio Charges:</span>
          <b>${peso(total)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--ok);">
          <span>Payments Settled:</span>
          <b>&minus; ${peso(paid)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; border-top: 1px solid var(--line); padding-top: 6px; margin-top: 6px; color: ${bal > 0 ? 'var(--bad)' : 'var(--ok)'};">
          <span>Outstanding Balance:</span>
          <span>${peso(bal)}</span>
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <div style="display: flex; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; gap: 6px;">
        <button class="btn-secondary btn-sm" id="btnDetailFolio">
          <span class="ic" data-icon="wallet">[ICON: wallet]</span> Folio &amp; Payments
        </button>
        <button class="btn-secondary btn-sm" id="btnDetailInvoice">
          <span class="ic" data-icon="print">[ICON: print]</span> Tax Invoice
        </button>
      </div>
      <div style="display: flex; gap: 6px;">
        ${r.st === 'Confirmed' ? `
          <button class="btn btn-sm" id="btnDetailCheckIn" ${!canCheckIn ? 'title="Requires clean room & deposit payment"' : ''}>Check In</button>
        ` : ''}
        ${canCheckOut ? `
          <button class="btn btn-sm" id="btnDetailCheckOut">Check Out</button>
        ` : ''}
        ${r.st !== 'Cancelled' && r.st !== 'Checked-out' ? `
          <button class="btn-ghost btn-sm" id="btnDetailCancel" style="color: var(--bad);">Cancel Booking</button>
        ` : ''}
        <button class="btn-secondary btn-sm" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;

  showModal(`Reservation &mdash; ${r.c}`, bodyHtml, footerHtml, { maxWidth: '640px' });

  const modalEl = document.getElementById('appModalBackdrop');
  if (!modalEl) return;

  const btnFolio = modalEl.querySelector('#btnDetailFolio');
  if (btnFolio) {
    btnFolio.onclick = () => {
      openFolioModal(r.c, () => openReservationDetail(r.c, onUpdate));
    };
  }

  const btnInv = modalEl.querySelector('#btnDetailInvoice');
  if (btnInv) {
    btnInv.onclick = () => printTaxInvoice(r.c);
  }

  const btnCheckIn = modalEl.querySelector('#btnDetailCheckIn');
  if (btnCheckIn) {
    btnCheckIn.onclick = () => {
      const res = Data.checkIn(r.c);
      if (res.success) {
        toast(`Guest ${r.g} checked into Room ${r.n}`, 'ok');
        openReservationDetail(r.c, onUpdate);
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      } else {
        toast(res.error, 'warn');
      }
    };
  }

  const btnCheckOut = modalEl.querySelector('#btnDetailCheckOut');
  if (btnCheckOut) {
    btnCheckOut.onclick = () => {
      if (bal > 0) {
        toast(`Please settle outstanding folio balance of ${peso(bal)} before check-out`, 'warn');
        openFolioModal(r.c, () => openReservationDetail(r.c, onUpdate));
        return;
      }
      const res = Data.checkOut(r.c);
      if (res.success) {
        toast(`Guest ${r.g} checked out. Room ${r.n} marked Dirty for housekeeping turnover.`, 'ok');
        openReservationDetail(r.c, onUpdate);
        if (typeof onUpdate === 'function') {
          try { onUpdate(); } catch (e) {}
        }
      }
    };
  }

  const btnCancel = modalEl.querySelector('#btnDetailCancel');
  if (btnCancel) {
    btnCancel.onclick = () => {
      const diff = dateDiff(today(), r.i);
      const isFree = diff >= (CONFIG.freeCancelDays || 3);
      const policyNotice = isFree
        ? `Full deposit refund will be issued under ${CONFIG.freeCancelDays || 3}-day policy.`
        : `${CONFIG.lateCancelFeePct || 30}% late cancellation deduction will apply under policy.`;

      const confirmBody = `
        <p>Are you sure you want to cancel reservation <b>${esc(r.c)}</b> (${esc(r.g)})?</p>
        <p class="text-sm text-secondary" style="margin-top: 8px;">${policyNotice}</p>
      `;

      const confirmFooter = `
        <button class="btn-secondary" onclick="openReservationDetail('${r.c}', ${onUpdate ? 'onUpdate' : 'null'})">Back</button>
        <button class="btn btn-danger" id="btnConfirmCancelRes">Cancel Reservation</button>
      `;

      showModal('Confirm Cancellation', confirmBody, confirmFooter, { maxWidth: '440px' });

      const cModal = document.getElementById('appModalBackdrop');
      const confirmBtn = cModal ? cModal.querySelector('#btnConfirmCancelRes') : null;
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const cancelRes = Data.cancelReservation(r.c, 'Staff');
          if (cancelRes.success) {
            toast(`Reservation ${r.c} cancelled. Refund: ${peso(cancelRes.refundAmt)}`, 'ok');
            closeModal();
            if (typeof onUpdate === 'function') {
              try { onUpdate(); } catch (e) {}
            }
          }
        };
      }
    };
  }
}

// ─── 4. BIR Tax Invoice Print Helper ───
function printTaxInvoice(resCode) {
  const res = Data.findRes(resCode);
  if (!res) {
    toast('Reservation not found for invoice', 'bad');
    return;
  }

  const nts = Data.nts(res);
  const total = Data.tot(res);
  const paid = Data.paidAmt(res);
  const balance = Data.balOf(res);
  const tax = taxBreakdown(total);

  const invoiceHtml = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #111; padding: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h2 style="margin: 0; font-size: 22px; color: var(--gold-ink);">${CONFIG.hotelName}</h2>
          <div style="font-size: 12px; color: #555;">${CONFIG.address}</div>
          <div style="font-size: 12px; color: #555;">TIN: ${CONFIG.legal.tin} &middot; Permit: ${CONFIG.legal.permit}</div>
          <div style="font-size: 12px; color: #555;">Tel: ${CONFIG.phones[0]} &middot; Official Folio &amp; Tax Invoice</div>
        </div>
        <div style="text-align: right;">
          <span class="pill pill--ok" style="font-size: 11px;">OFFICIAL FOLIO</span>
          <div style="font-size: 13px; font-weight: 600; margin-top: 4px;">Code: ${res.c}</div>
          <div style="font-size: 12px; color: #666;">Date: ${fmtDate(today())}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--surface-2); padding: 12px; border-radius: var(--r); margin-bottom: 14px; border: 1px solid var(--line); font-size: 12px;">
        <div>
          <div><b>Guest:</b> ${esc(res.g)}</div>
          <div><b>Phone:</b> ${esc(res.ph) || 'On file'}</div>
          <div><b>Category:</b> ${esc(res.t)} (Room ${res.n})</div>
        </div>
        <div>
          <div><b>Check-In:</b> ${fmtDate(res.i)} (2:00 PM)</div>
          <div><b>Check-Out:</b> ${fmtDate(res.o)} (12:00 PM)</div>
          <div><b>Stay:</b> ${nts} nights &middot; ${res.gu} guests</div>
        </div>
      </div>

      <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 14px;">
        <thead>
          <tr style="background: var(--surface-2); text-align: left;">
            <th style="padding: 6px 8px;">Description</th>
            <th style="padding: 6px 8px; text-align: center;">Qty</th>
            <th style="padding: 6px 8px; text-align: right;">Rate</th>
            <th style="padding: 6px 8px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 8px;">Room Accommodation: ${esc(res.t)}</td>
            <td style="padding: 6px 8px; text-align: center;">${nts}</td>
            <td style="padding: 6px 8px; text-align: right;">${peso(res.rt || 3200)}</td>
            <td style="padding: 6px 8px; text-align: right;">${peso(Data.roomChg(res))}</td>
          </tr>
          ${(res.x || []).map(x => `
            <tr>
              <td style="padding: 6px 8px;">${esc(x.desc)}</td>
              <td style="padding: 6px 8px; text-align: center;">1</td>
              <td style="padding: 6px 8px; text-align: right;">${peso(x.amt)}</td>
              <td style="padding: 6px 8px; text-align: right;">${peso(x.amt)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; border-top: 1px solid var(--line); padding-top: 10px; font-size: 12px; margin-bottom: 14px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Tax &amp; Levy Breakdown</div>
          <div style="display: flex; justify-content: space-between;"><span>Vatable Base (Net):</span><span>${peso(tax.net)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>12% VAT:</span><span>${peso(tax.vat)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>10% Service Charge:</span><span>${peso(tax.svc)}</span></div>
        </div>
        <div style="background: var(--surface-2); padding: 8px 12px; border-radius: var(--r); border: 1px solid var(--line);">
          <div style="display: flex; justify-content: space-between;"><span>Total Charges:</span><b>${peso(total)}</b></div>
          <div style="display: flex; justify-content: space-between; color: var(--ok);"><span>Payments Applied:</span><b>&minus; ${peso(paid)}</b></div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 4px; padding-top: 4px; font-weight: 600; color: ${balance > 0 ? 'var(--bad)' : 'var(--ok)'};">
            <span>${balance > 0 ? 'Balance Due:' : 'Net Balance:'}</span>
            <span>${balance > 0 ? peso(balance) : 'PAID IN FULL'}</span>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px;" class="no-print">
        <button class="btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn" onclick="window.print()">Print / Save PDF</button>
      </div>
    </div>
  `;

  showModal('Official Tax Folio', invoiceHtml, '', { maxWidth: '640px' });
}

// ─── Global Window Exposure ───
if (typeof window !== 'undefined') {
  window.openBookingModal = openBookingModal;
  window.openFolioModal = openFolioModal;
  window.openReservationDetail = openReservationDetail;
  window.printTaxInvoice = printTaxInvoice;
}


/* Original source: rooms-deals.js */
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

// Add recommendations within the original modal, card and navigation design.
function originalField(name,label,value='',type='text',extra=''){return `<div class="field"><label>${esc(label)}</label><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;}
function originalSelect(name,label,options,value=''){return `<div class="field"><label>${esc(label)}</label><select name="${name}">${options.map(([id,text])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></div>`;}
function originalForm(title,body,submit,save){
 showModal(title,`<form id="originalActionForm">${body}<div id="originalActionError" class="field-hint" role="alert" style="color:var(--bad)"></div><button class="btn btn-block" type="submit">${esc(submit)}</button></form>`,'',{maxWidth:'650px',onOpen:()=>{$('originalActionForm').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('[type=submit]');button.disabled=true;try{await save(Object.fromEntries(new FormData(event.target)),event.target);}catch(e){if($('originalActionError'))$('originalActionError').textContent=e.message;else toast(e.message,'bad');}finally{if(button.isConnected)button.disabled=false;}};}});
}
async function originalRefresh(){const result=await HRMS.api('/api/original/snapshot');originalData=result.data;Original.user=result.user;Data.emit('all','update');}
function originalBooking(initialType,arrival,departure,count=2,promo=''){
 if(!originalStaff()){const q=new URLSearchParams();if(arrival)q.set('arrival',arrival);if(departure)q.set('departure',departure);location.href=originalBase+'/pages/rooms/rooms-deals.html?'+q;return;}
 const staff=!!originalStaff();const types=Data.getTypes();const guests=Data.getGuestAccounts();
 const body=(staff?originalSelect('guest_id','Booking contact',guests.map(g=>[g.id,g.name]))+originalSelect('payer_guest_id','Payer',guests.map(g=>[g.id,g.name]))+originalSelect('source','Booking channel',[['Walk-in','Walk-in'],['Telephone','Telephone'],['Online','Online']]):'')+originalSelect('room_type_id','Room type',types.map(t=>[t.id,t.n]),types.find(t=>t.n===initialType)?.id)+originalField('arrival','Arrival',arrival||today(),'date','required')+originalField('departure','Departure',departure||addDays(arrival||today(),1),'date','required')+'<div class="grid-2">'+originalField('adults','Adults',count||2,'number','min="1" required')+originalField('children','Children',0,'number','min="0" required')+'</div>'+originalSelect('breakfast','Breakfast',[['None','No breakfast'],['Buffet','Buffet breakfast'],['Plated','Plated breakfast']])+originalField('breakfast_pax','Breakfast guests per night',0,'number','min="0" required')+originalField('promo_code','Promo code (optional)',promo)+originalField('requests','Special requests')+'<p class="field-hint">Special requests are subject to availability and confirmation. Your room number is assigned by Hotel Staff at check-in.</p>'+(staff?originalSelect('discount_category','Verified discount',[['None','None'],['Senior','Senior'],['PWD','PWD']])+originalField('discount_verification','Eligibility review (no ID number)')+originalField('company_name','Company name (optional)'):'')+'<div id="originalQuote"></div>';
 let reviewKey='';originalForm(staff?'Front Desk Reservation':'Reserve Your Stay',body,'Review Booking',async(d,form)=>{
  const key=JSON.stringify(d);const button=form.querySelector('[type=submit]');
  if(reviewKey!==key){const quote=await HRMS.api('/api/quote','POST',d);reviewKey=key;$('originalQuote').innerHTML=`<div class="card" style="margin:16px 0;padding:16px"><h3>Booking Summary</h3><p>Accommodation ${peso(quote.room)}; extra guests ${peso(quote.extra_guests)}; breakfast ${peso(quote.breakfast)}</p><p>Discount ${peso(quote.discount)}; configured local tax ${peso(quote.local_tax)}</p><p><strong>Total: ${peso(quote.total)}</strong></p><p>Optional deposit: ${peso(quote.deposit_due)}. You may pay later at check-in.</p></div>`;button.textContent='Confirm Reservation';return;}
  const r=await HRMS.api('/api/reservations','POST',d);await originalRefresh();showModal('Reservation Confirmed',`<div class="card" style="padding:20px"><h2>${esc(r.code)}</h2><p>Your room type is reserved. Hotel Staff will assign the room number at check-in.</p><p>Breakfast: ${esc(r.breakfast)} for ${r.breakfast_pax} guest(s).</p><p>Special requests are subject to availability.</p><button id="originalPayDeposit" class="btn">Pay Optional Deposit</button> <button id="originalConfirmation" class="btn-secondary">Confirmation Letter</button></div>`,'',{onOpen:()=>{$('originalPayDeposit').onclick=()=>originalPayment(r.id);$('originalConfirmation').onclick=()=>originalLetter(r.id);}});
 });
}
async function originalPayment(id){const f=await HRMS.api('/api/reservations/'+id+'/folio');const reference=crypto.randomUUID();originalForm('Payment',`<p>Current balance: <strong>${peso(f.balance)}</strong></p>`+originalField('amount','Amount',Math.max(0,Math.min(f.balance,f.reservation.pricing?.deposit_due||f.balance)),'number','required min="0.01" step="0.01"')+originalSelect('method','Payment method',originalStaff()?[['Cash','Cash'],['qrph','QR Ph - PayMongo test'],['card','Debit / Credit - PayMongo test']]:[['qrph','QR Ph - PayMongo test'],['card','Debit / Credit - PayMongo test']]),'Continue',async d=>{if(d.method==='Cash'){await HRMS.api('/api/payments/batch','POST',{reference,posting_location:'Hotel Front Desk',allocations:[{reservation_id:id,amount:d.amount}]});await originalRefresh();closeModal();toast('Payment recorded.','ok');}else{const c=await HRMS.api('/api/paymongo/checkout','POST',{reference,method:d.method,allocations:[{reservation_id:id,amount:d.amount}]});if(c.checkout_url)location.href=c.checkout_url;}});}
async function originalLetter(id){const letters=await HRMS.api('/api/reservations/'+id+'/letters');showModal('Reservation Confirmation',letters.map(x=>`<p>${esc(x.email)} - ${esc(x.status)}</p><pre style="white-space:pre-wrap;font-family:inherit">${esc(x.body)}</pre>`).join('')||'<p>No confirmation letter for this older reservation.</p>');}
function originalAssignModal(code){const r=Data.findRes(code);const rooms=Data.getRooms().filter(x=>x.t===r.t&&!x.out_of_service&&['Clean','Inspected'].includes(originalData.hk[x.n]?.s));originalForm('Assign Room and Check In',originalSelect('room_id','Ready room',rooms.map(x=>[x.id,'Room '+x.n])),'Complete Check-in',async d=>{await HRMS.api('/api/reservations/'+r.id+'/room','PUT',d);await HRMS.api('/api/reservations/'+r.id+'/check-in','POST',{});await originalRefresh();closeModal();toast('Guest checked in.','ok');});}
async function originalFolio(code){const r=Data.findRes(code);const f=await HRMS.api('/api/reservations/'+r.id+'/folio');const body=`<p>${esc(r.g)} - ${esc(r.t)} - ${esc(r.st)}</p><table class="table"><thead><tr><th>Charge</th><th>Amount</th></tr></thead><tbody><tr><td>Booked accommodation and options</td><td>${peso(f.reservation.amount)}</td></tr>${f.charges.map(x=>`<tr><td>${esc(x.description)}</td><td>${peso(x.amount)}</td></tr>`).join('')}</tbody></table><p>Total ${peso(f.total)}; paid ${peso(f.paid)}; balance <strong>${peso(f.balance)}</strong></p><p><a class="btn-secondary" target="_blank" href="${originalBase}/reservations/${r.id}/receipt">Print Statement / Acknowledgment</a></p><div class="actions"><button class="btn" id="originalFolioPay">Payment</button><button class="btn-secondary" id="originalFolioLetter">Confirmation Letter</button>${originalStaff()?'<button class="btn-secondary" id="originalFolioCharge">Add Charge</button>':''}</div>`;
 showModal('Guest Folio - '+code,body,'',{maxWidth:'700px',onOpen:()=>{$('originalFolioPay').onclick=()=>originalPayment(r.id);$('originalFolioLetter').onclick=()=>originalLetter(r.id);if($('originalFolioCharge'))$('originalFolioCharge').onclick=()=>originalForm('Additional Charge',originalField('description','Description','','text','required')+originalField('amount','Amount','','number','required min="0.01" step="0.01"'),'Post Charge',async d=>{await HRMS.api('/api/reservations/'+r.id+'/charges','POST',d);await originalRefresh();originalFolio(code);});}});
}
function originalReservation(code){const r=Data.findRes(code);if(!r)return;showModal('Reservation - '+code,`<p><strong>${esc(r.g)}</strong></p><p>${esc(r.t)}; ${fmtDate(r.i)} to ${fmtDate(r.o)}</p><p>${r.adults} adults, ${r.children} children. Room: ${r.n||'Assign at check-in'}</p><p>Breakfast: ${esc(r.breakfast)} for ${r.breakfast_pax} guests.</p><p>${esc(r.note||'')}<br>Special requests are subject to availability.</p><div class="actions"><button class="btn" id="originalOpenFolio">View Folio</button>${originalStaff()&&r.st==='Confirmed'?'<button class="btn" id="originalCheckin">Assign Room / Check In</button>':''}${r.st==='Checked-in'&&originalStaff()?'<button class="btn-secondary" id="originalCheckout">Check Out</button>':''}${r.st==='Confirmed'?'<button class="btn-secondary" id="originalDates">Change Dates</button><button class="btn-secondary" id="originalCancel">Cancel Reservation</button>':''}</div>`,'',{onOpen:()=>{$('originalOpenFolio').onclick=()=>originalFolio(code);if($('originalCheckin'))$('originalCheckin').onclick=()=>originalAssignModal(code);if($('originalCheckout'))$('originalCheckout').onclick=()=>{try{Data.checkOut(code);closeModal();toast('Guest checked out.','ok');}catch(e){toast(e.message,'bad');}};if($('originalCancel'))$('originalCancel').onclick=()=>originalForm('Cancel Reservation','<p>Applicable cancellation charges will be recorded. Continue?</p>','Confirm Cancellation',async()=>{await HRMS.api('/api/reservations/'+r.id+'/cancel','POST',{});await originalRefresh();closeModal();});if($('originalDates'))$('originalDates').onclick=()=>originalForm('Change Dates',originalField('arrival','Arrival',r.i,'date','required')+originalField('departure','Departure',r.o,'date','required'),'Update Dates',async d=>{await HRMS.api('/api/reservations/'+r.id+'/dates','PUT',d);await originalRefresh();closeModal();});}});}
async function originalPolicy(){const p=await HRMS.api('/api/policy');const fields=[['breakfast_buffet_rate','Buffet breakfast price'],['breakfast_plated_rate','Plated breakfast price'],['deposit_percent','Optional deposit %'],['advance_discount_percent','Advance-payment discount %'],['senior_discount_percent','Approved senior training discount %'],['pwd_discount_percent','Approved PWD training discount %'],['local_tax_percent','Configured local tax %'],['parking_spaces','Parking spaces']];originalForm('Booking and Payment Policies',fields.map(([k,l])=>originalField(k,l,p[k],'number','min="0" step="0.01" required')).join('')+originalSelect('outside_food_allowed','Outside food',[[false,'Not permitted'],[true,'Allowed under policy']],p.outside_food_allowed)+originalField('confirmation_reminders','Confirmation notes and reminders',p.confirmation_reminders),'Save Policies',async d=>{await HRMS.api('/api/policy','POST',{...d,outside_food_allowed:d.outside_food_allowed==='true',promos:p.promos});await originalRefresh();closeModal();toast('Policy saved.','ok');});}
async function originalRoomDetails(){const ts=Data.getTypes();originalForm('Room Details and Accessibility',originalSelect('id','Room type',ts.map(t=>[t.id,t.n]))+originalField('bed_size','Bed sizes')+originalField('photo','Photo URL','','url')+originalField('extra_capacity','Extra guests permitted (0 or 1)',0,'number','min="0" max="1"')+originalField('extra_person_rate','Extra-person price / night',0,'number','min="0" step="0.01"')+originalSelect('accessible_room','Wheelchair-accessible room',[[false,'Not listed'],[true,'Yes']])+originalSelect('accessible_bathroom','Wheelchair-accessible bathroom',[[false,'Not listed'],[true,'Yes']]),'Save Room Details',async d=>{const t=ts.find(x=>x.id===Number(d.id));await HRMS.api('/api/directory/room-types/'+t.id,'PUT',{name:t.n,rate:t.r,capacity:t.g,description:t.desc,...d,accessible_room:d.accessible_room==='true',accessible_bathroom:d.accessible_bathroom==='true'});await originalRefresh();closeModal();toast('Room details saved.','ok');});}
async function originalCloseDay(){let department=originalRole()==='restaurant'?'Restaurant':'Hotel';if(originalRole()==='admin')department=location.pathname.includes('/restaurant/')?'Restaurant':'Hotel';const dates=await HRMS.api('/api/business-dates');originalForm('Reconcile and Close - '+department,originalField('date','Business date',dates[department],'date','required')+originalField('counted_cash','Counted cash',0,'number','required min="0" step="0.01"')+originalField('notes','Reconciliation notes'),'Close Business Date',async d=>{await HRMS.api('/api/closing','POST',{...d,department});await originalRefresh();closeModal();toast('Business date closed.','ok');});}
function originalOrderSettlement(code){const o=Data.getOrders().find(x=>x.code===code);const stays=Data.getReservations().filter(x=>x.st==='Checked-in');originalForm('Settle Bill - '+code,`<p>Bill total ${peso(o.subtotal)}</p>`+originalSelect('method','Method',[['Cash','Cash'],['Room','Charge to guest room'],['qrph','QR Ph - PayMongo test'],['card','Debit / Credit - PayMongo test']])+originalField('cash_received','Cash tendered',o.subtotal,'number','min="0" step="0.01"')+originalSelect('reservation_id','Active guest folio',[['','Select for room charging'],...stays.map(x=>[x.id,x.c+' - '+x.g])]),'Continue',async d=>{if(['qrph','card'].includes(d.method)){const c=await HRMS.api('/api/orders/'+o.id+'/checkout','POST',{method:d.method,reference:crypto.randomUUID()});if(c.checkout_url)location.href=c.checkout_url;return;}const v={settlement:d.method,idempotency_key:crypto.randomUUID()};if(d.method==='Room')v.reservation_id=d.reservation_id;else v.cash_received=d.cash_received;await HRMS.api('/api/orders/'+o.id+'/settle','POST',v);await originalRefresh();closeModal();toast('Bill settled.','ok');});}
if(typeof openBookingModal!=='undefined')openBookingModal=originalBooking;
if(typeof openFolioModal!=='undefined')openFolioModal=originalFolio;
if(typeof openReservationDetail!=='undefined')openReservationDetail=originalReservation;
if(typeof printTaxInvoice!=='undefined')printTaxInvoice=code=>{const r=Data.findRes(code);window.open(originalBase+'/reservations/'+r.id+'/receipt','_blank');};
if(typeof openVoucherModal!=='undefined')openVoucherModal=code=>originalLetter(Data.findRes(code).id);
if(typeof openSimulatedEmailModal!=='undefined')openSimulatedEmailModal=code=>originalLetter(Data.findRes(code).id);
window.openNewStaffReservation=()=>originalBooking();
window.openReservationDetail=originalReservation;window.openFolioModal=originalFolio;
window.openBillSettlementModal=originalOrderSettlement;
window.printOrderChit=code=>window.open(originalBase+'/orders/'+Data.getOrders().find(x=>x.code===code).id+'/receipt','_blank');
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;if(['btnNewReservation','btnWalkInCheckIn'].includes(b.id)){e.preventDefault();e.stopImmediatePropagation();originalBooking();}if(b.id==='btnGpPayBalance'){e.preventDefault();e.stopImmediatePropagation();const r=Data.getReservations().find(x=>x.st==='Checked-in')||Data.getReservations().find(x=>x.st==='Confirmed');if(r)originalPayment(r.id);}if(['btnConfirmDayClose','btnExecutePostings','btnResetBDate'].includes(b.id)){e.preventDefault();e.stopImmediatePropagation();if(b.id==='btnConfirmDayClose')originalCloseDay();else toast('Accommodation is recorded once at booking. Use department closing to reconcile.','info');}},true);
function originalEnhance(){
 const main=document.querySelector('.staff-content');if(main&&!document.getElementById('originalRecommendationActions')){
  const tools=document.createElement('div');tools.id='originalRecommendationActions';tools.className='actions';tools.style.marginBottom='16px';
  if(originalRole()==='admin'){const policy=document.createElement('button');policy.className='btn-secondary btn-sm';policy.textContent='Booking & Payment Policies';policy.onclick=()=>originalPolicy().catch(e=>toast(e.message,'bad'));tools.append(policy);if(location.pathname.includes('roomtypes')){const rooms=document.createElement('button');rooms.className='btn-secondary btn-sm';rooms.textContent='Bed Sizes, Photos & Accessibility';rooms.onclick=()=>originalRoomDetails().catch(e=>toast(e.message,'bad'));tools.append(rooms);}}
  if(originalStaff()&&location.pathname.includes('night-audit')){const close=document.createElement('button');close.className='btn btn-sm';close.textContent='Reconcile and Close';close.onclick=()=>originalCloseDay().catch(e=>toast(e.message,'bad'));tools.append(close);}
  if(tools.childNodes.length)main.prepend(tools);
 }
 if(typeof window.openBillSettlementModal==='function')window.openBillSettlementModal=originalOrderSettlement;
 // The restored concierge retains its original container but uses the trained backend.
 const form=document.querySelector('#conciergeForm');if(form&&!form.dataset.serverBound){form.dataset.serverBound='1';form.addEventListener('submit',async e=>{e.preventDefault();e.stopImmediatePropagation();const input=form.querySelector('input');if(!input?.value.trim())return;try{const answer=await HRMS.api('/api/chat','POST',{message:input.value});const host=$('conciergeMessages');const p=document.createElement('div');p.className='concierge-bubble concierge-bubble--bot';p.textContent=answer.answer;host.append(p);input.value='';}catch(x){toast(x.message,'bad');}},true);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',originalEnhance);else originalEnhance();
setTimeout(originalEnhance,250);

function originalBatchPayment(){const rows=Data.getReservations().filter(r=>r.balanceDue>0&&['Confirmed','Checked-in'].includes(r.st));originalForm('Pay Multiple Rooms',originalSelect('payer','Payer',Data.getGuestAccounts().map(g=>[g.id,g.name]))+rows.map(r=>originalField('amount_'+r.id,r.c+' - '+r.g+' (balance '+peso(r.balanceDue)+')',0,'number','min="0" step="0.01"')).join(''),'Record Cash Payment',async d=>{const allocations=rows.filter(r=>Number(d['amount_'+r.id])>0).map(r=>({reservation_id:r.id,amount:Number(d['amount_'+r.id])}));if(!allocations.length)throw Error('Enter a payment amount.');if(allocations.some(a=>String(rows.find(r=>r.id===a.reservation_id).payerId)!==d.payer))throw Error('Select folios belonging to this payer.');await HRMS.api('/api/payments/batch','POST',{reference:crypto.randomUUID(),posting_location:'Hotel Front Desk',allocations});await originalRefresh();closeModal();toast('Payments recorded.','ok');});}
function originalTransfer(){const rows=Data.getReservations();originalForm('Transfer Unused Deposit',originalSelect('from','Source folio',rows.map(r=>[r.id,r.c+' - '+r.g]))+originalSelect('to','Destination folio',rows.map(r=>[r.id,r.c+' - '+r.g]))+originalField('amount','Amount',0,'number','min="0.01" step="0.01" required')+originalField('reason','Reason','','text','required'),'Transfer Credit',async d=>{await HRMS.api('/api/payments/transfer','POST',{...d,reference:crypto.randomUUID()});await originalRefresh();closeModal();toast('Transfer recorded.','ok');});}
function originalFinanceTools(){if(!['admin','frontdesk'].includes(originalRole())||!/(payments|reservations)/.test(location.pathname))return;const host=document.querySelector('.staff-content');if(!host||$('originalFinanceTools'))return;const bar=document.createElement('div');bar.id='originalFinanceTools';bar.className='actions';for(const [label,fn]of [['Pay Multiple Rooms',originalBatchPayment],['Transfer Unused Deposit',originalTransfer]]){const b=document.createElement('button');b.className='btn-secondary btn-sm';b.textContent=label;b.onclick=fn;bar.append(b);}host.prepend(bar);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',originalFinanceTools);else originalFinanceTools();

async function originalBookingServices(){const list=await HRMS.api('/api/booking/services');originalForm('Optional Booking Services','<p>Prices are per unit, per night. Guests select quantities before entering their details.</p>'+list.map((o,i)=>'<div class="field"><label>'+esc(o.name)+' — '+peso(o.price)+'</label><label><input type="checkbox" name="active_'+i+'" '+(o.active?'checked':'')+'> Offered to guests</label></div>').join('')+originalField('name','New service name (leave blank to update existing offers)')+originalField('description','Description')+originalField('price','Price per unit, per night',0,'number','min="0" step="0.01"'),'Save Services',async(d,form)=>{const services=list.map((o,i)=>({...o,active:form.elements['active_'+i].checked}));if(d.name.trim())services.push({id:crypto.randomUUID(),name:d.name.trim(),description:d.description,price:Number(d.price),active:true});await HRMS.api('/api/booking/services','POST',{services});closeModal();toast('Booking services saved.','ok');});}
function originalBookingServiceTool(){if(originalRole()!=='admin')return;const host=$('originalRecommendationActions');if(host&&!$('originalServiceTool')){const button=document.createElement('button');button.id='originalServiceTool';button.className='btn-secondary btn-sm';button.textContent='Optional Booking Services';button.onclick=()=>originalBookingServices().catch(e=>toast(e.message,'bad'));host.append(button);}}
setTimeout(originalBookingServiceTool,350);


Object.assign(window,{openBookingModal,openFolioModal,openReservationDetail,printTaxInvoice,openVoucherModal,openSimulatedEmailModal});