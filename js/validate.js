/**
 * PUPSJ PMS & POS — Centralized Entity Validation Schemas
 * Reused by UI components and service layer.
 */
(function(root) {
  'use strict';

  const WHITELISTED_PAGES = [
    'home.html', 'rooms-deals.html', 'menu.html', 'about.html',
    'contact.html', 'privacy.html', 'terms.html', 'guest-login.html',
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
    if (!['Kitchen', 'Bar'].includes(data.station)) errors.station = 'Station must be Kitchen or Bar.';
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
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
  }
})(typeof window !== 'undefined' ? window : globalThis);
