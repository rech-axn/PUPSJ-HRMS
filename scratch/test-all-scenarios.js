const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '../js');
const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8');

const elements = new Map();
const listeners = new Map();

class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this._innerHTML = '';
    this.className = '';
    this.classList = {
      add: (c) => {},
      remove: (c) => {},
      toggle: (c, val) => {},
      contains: (c) => false
    };
    this.style = {};
    this.value = '';
    this.checked = false;
    this.children = [];
    this.dataset = {};
    this.onclick = null;
    this.onchange = null;
    this.oninput = null;
    this.onsubmit = null;
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) { this._innerHTML = val; }
  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k] || null; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { return child; }
  querySelector(sel) { return new MockElement(); }
  querySelectorAll(sel) { return []; }
  addEventListener(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, []);
    listeners.get(evt).push(fn);
  }
}

const storage = {};
const localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { for (const k in storage) delete storage[k]; }
};

const sessionStorageStore = {};
const sessionStorage = {
  getItem: (k) => sessionStorageStore[k] || null,
  setItem: (k, v) => { sessionStorageStore[k] = String(v); },
  removeItem: (k) => { delete sessionStorageStore[k]; },
  clear: () => { for (const k in sessionStorageStore) delete sessionStorageStore[k]; }
};

const document = {
  title: 'PUPSJ Verification Suite',
  getElementById: (id) => new MockElement(id),
  querySelector: (sel) => new MockElement(),
  querySelectorAll: (sel) => [],
  createElement: (tag) => new MockElement('', tag),
  body: new MockElement('body', 'body'),
  head: new MockElement('head', 'head'),
  addEventListener: (evt, fn) => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
};

const mockWin = {
  document,
  localStorage,
  sessionStorage,
  location: {
    href: 'http://localhost/pages/rooms/rooms-deals.html',
    pathname: '/pages/rooms/rooms-deals.html',
    hash: '',
    search: '',
    replace: () => {}
  },
  navigator: { userAgent: 'NodeTest' },
  setTimeout: (fn, ms) => setTimeout(fn, ms || 0),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms || 0),
  clearInterval: (id) => clearInterval(id),
  console,
  Event: class { constructor(t) { this.type = t; } },
  CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d?.detail; } },
  URLSearchParams: class {
    constructor(str) { this.params = new Map(); }
    get(k) { return this.params.get(k) || null; }
    set(k, v) { this.params.set(k, v); }
  },
  addEventListener: (evt, fn) => {
    if (!listeners.has(evt)) listeners.set(evt, []);
    listeners.get(evt).push(fn);
  },
  removeEventListener: (evt, fn) => {}
};
mockWin.window = mockWin;
mockWin.self = mockWin;

const context = vm.createContext(mockWin);
vm.runInContext(coreCode, context);
vm.runInContext(dataCode, context);

// Test runner inside context
const testScript = `
  console.log('=== EXECUTING PUPSJ VERIFICATION & SCENARIOS SUITE ===\\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, scenarioName, details = '') {
    if (condition) {
      console.log('[PASS] ' + scenarioName + ' ' + (details ? '(' + details + ')' : ''));
      passed++;
    } else {
      console.error('[FAIL] ' + scenarioName + ' - FAILED! ' + details);
      failed++;
    }
  }

  // Ensure clean state
  Data.resetDemoData();

  // SCENARIO 7: Direct call with no session is rejected
  try {
    Data.clearGuestSession();
    Data.clearStaffSession();
    let threw = false;
    try {
      Data.createReservation({ g: 'Hacker', t: 'Standard', i: today(), o: addDays(today(), 2) });
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Scenario 7a: Direct Data.createReservation with no session is rejected');

    threw = false;
    try {
      Data.createTableRes({ guestName: 'Hacker', date: today(), time: '19:00', party: 2 });
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Scenario 7b: Direct Data.createTableRes with no session is rejected');

    threw = false;
    try {
      Data.createOrder({ lines: [{ name: 'Steak', unitPrice: 1000, qty: 1 }] });
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Scenario 7c: Direct Data.createOrder with no session is rejected');
  } catch (e) {
    assert(false, 'Scenario 7', e.message);
  }

  // SCENARIO 9c: Guest cannot spoof Walk-in or createdBy
  try {
    Data.setGuestSession({ name: 'Malicious Guest', email: 'guest@test.local', phone: '+63 917 111 2222' });
    let threw = false;
    try {
      Data.createReservation({
        g: 'Malicious Guest',
        t: 'Standard',
        source: 'Walk-in',
        i: today(),
        o: addDays(today(), 2)
      });
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Scenario 9c-1: Guest session cannot create Walk-in source reservation');

    threw = false;
    try {
      Data.createReservation({
        g: 'Malicious Guest',
        t: 'Standard',
        createdBy: { id: 1, name: 'Admin', role: 'Manager' },
        i: today(),
        o: addDays(today(), 2)
      });
    } catch (e) {
      threw = true;
    }
    assert(threw, 'Scenario 9c-2: Guest session cannot specify staff createdBy');
  } catch (e) {
    assert(false, 'Scenario 9c', e.message);
  }

  // SCENARIO 9 & 9d: Front Desk books walk-in for today with ID details and check-in
  try {
    Data.setStaffSession({ id: 2, name: 'Maria Santos', role: 'Front Desk' });
    const walkInRes = Data.createReservation({
      g: 'Juan Dela Cruz',
      ph: '+63 917 999 8888',
      email: 'juan.walkin@example.com',
      t: 'Deluxe City View',
      n: 202,
      i: today(),
      o: addDays(today(), 2),
      gu: 2,
      source: 'Walk-in',
      idType: "Driver's License",
      idNumber: 'D02-98-123456',
      checkInNow: true,
      initialPayment: { amount: 5800, method: 'Cash' }
    });

    assert(walkInRes.source === 'Walk-in', 'Scenario 9: Walk-in source recorded', walkInRes.c);
    assert(walkInRes.createdBy.name === 'Maria Santos', 'Scenario 9: createdBy staff recorded', walkInRes.createdBy.name);
    assert(walkInRes.idNumber === 'D02-98-123456', 'Scenario 9: Gov ID recorded', walkInRes.idType);
    assert(walkInRes.st === 'Checked-in', 'Scenario 9: Same-day immediate check-in allowed', walkInRes.st);

    // Check audit log
    const auditLogs = Data.getAuditLog();
    const walkInAudit = auditLogs.find(a => a.recordId === walkInRes.c);
    assert(!!walkInAudit && walkInAudit.details.includes('Maria Santos'), 'Scenario 9: Audit log tracks staff actor and source');
  } catch (e) {
    assert(false, 'Scenario 9', e.message);
  }

  // SCENARIO 9a: Front Desk seats a walk-in diner and places order with kitchen routing
  try {
    Data.setStaffSession({ id: 2, name: 'Maria Santos', role: 'Front Desk' });
    const walkInOrder = Data.createOrder({
      type: 'Dine-in',
      table: 5,
      target: 'Table 5',
      source: 'Walk-in',
      lines: [
        { id: 'MNU-301', name: 'US Angus Ribeye Steak (250g)', unitPrice: 1450, qty: 1 }
      ]
    });
    assert(walkInOrder.source === 'Walk-in' && walkInOrder.subtotal === 1450, 'Scenario 9a: Staff walk-in order created', walkInOrder.code);

    const statusUpdate = Data.updateOrderStatus(walkInOrder.code, 'Preparing');
    assert(statusUpdate.status === 'Preparing', 'Scenario 9a: Kitchen status updated to Preparing');
  } catch (e) {
    assert(false, 'Scenario 9a', e.message);
  }

  // SCENARIO 9b: Walk-in later claims portal account with verification
  try {
    Data.clearStaffSession();
    Data.setGuestSession({ name: 'Juan Dela Cruz', email: 'juan.newaccount@example.com', phone: '+63 917 999 8888' });

    const reservations = Data.getReservations();
    const walkIn = reservations.find(r => r.g === 'Juan Dela Cruz');

    const wrongClaim = Data.claimWalkInReservation('HTL-9999', 'Dela Cruz', 'juan.newaccount@example.com');
    assert(!wrongClaim.success, 'Scenario 9b: Claiming non-existent code fails');

    const wrongVerify = Data.claimWalkInReservation(walkIn.c, 'Smith', 'juan.newaccount@example.com');
    assert(!wrongVerify.success, 'Scenario 9b: Claiming with mismatched verification fails');

    const correctClaim = Data.claimWalkInReservation(walkIn.c, 'Dela Cruz', 'juan.newaccount@example.com');
    assert(correctClaim.success && correctClaim.res.email === 'juan.newaccount@example.com', 'Scenario 9b: Claiming with matching last name succeeds');
  } catch (e) {
    assert(false, 'Scenario 9b', e.message);
  }

  // SCENARIO 11 & 12: Intent preservation, URL whitelist validation
  try {
    savePendingIntent({
      type: 'room',
      roomType: 'Family Suite',
      ci: today(),
      co: addDays(today(), 3),
      guests: 4,
      promo: 'WELCOME10',
      returnUrl: '/pages/rooms/rooms-deals.html'
    });

    const retrieved = getPendingIntent();
    assert(retrieved && retrieved.roomType === 'Family Suite' && retrieved.promo === 'WELCOME10', 'Scenario 11: Pending intent saved and retrieved');

    assert(validateReturnUrl('https://evil.com') === '../guest/guest-portal.html', 'Scenario 12: External evil URL ignored and default fallback returned');
    assert(validateReturnUrl('javascript:alert(1)') === '../guest/guest-portal.html', 'Scenario 12: javascript: URI ignored and default fallback returned');
    assert(validateReturnUrl('../rooms/rooms-deals.html') === '../rooms/rooms-deals.html', 'Scenario 12: Valid relative path accepted');
  } catch (e) {
    assert(false, 'Scenario 11/12', e.message);
  }

  // SCENARIO 13: Password length & duplicate email validation
  try {
    const staffEmail = 'admin@pupsj.edu.ph';
    assert(Data.findStaffByEmail(staffEmail) !== null, 'Scenario 13: Staff email exists in store');
    assert(isValidEmail('not-an-email') === false, 'Scenario 13: Invalid email syntax rejected');
    assert(isValidPhMobile('12345') === false, 'Scenario 13: Invalid PH mobile syntax rejected');
    assert(isValidPhMobile('+63 917 123 4567') === true, 'Scenario 13: Valid PH mobile recognized');
  } catch (e) {
    assert(false, 'Scenario 13', e.message);
  }

  // SCENARIO 8: Ownership security
  try {
    Data.setGuestSession({ name: 'Ana Dela Cruz', email: 'ana.delacruz@example.com', phone: '+63 917 000 0001' });
    const reservations = Data.getReservations();
    
    const anaRes = reservations.find(r => r.c === 'HTL-2041');
    const liamRes = reservations.find(r => r.c === 'HTL-2042');

    assert(anaRes.email === 'ana.delacruz@example.com', 'Scenario 8: Ana owns HTL-2041');
    assert(liamRes.email === 'liam.carter@example.com', 'Scenario 8: Liam owns HTL-2042');

    const cancelResult = Data.cancelReservation('HTL-2042');
    assert(!cancelResult.success && cancelResult.error.includes('Unauthorized'), 'Scenario 8: Guest Ana cannot cancel Liam\\\'s reservation');
  } catch (e) {
    assert(false, 'Scenario 8', e.message);
  }

  console.log('\\n========================================');
  console.log('SUITE RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED');
  console.log('========================================\\n');
`;

vm.runInContext(testScript, context);
