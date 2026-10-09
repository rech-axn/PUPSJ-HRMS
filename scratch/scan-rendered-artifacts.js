const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '../js');
const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8');
const staffShellCode = fs.readFileSync(path.join(jsDir, 'staff-shell.js'), 'utf8');
const siteShellCode = fs.readFileSync(path.join(jsDir, 'site-shell.js'), 'utf8');
const bookingModalCode = fs.readFileSync(path.join(jsDir, 'booking-modal.js'), 'utf8');

const pagesToTest = [
  // Admin Management Pages
  { name: 'Dashboard', file: 'dashboard.html', appId: 'dashboardApp', script: 'dashboard.js' },
  { name: 'Reservations', file: 'reservations.html', appId: 'reservationsApp', script: 'reservations.js', extra: [bookingModalCode] },
  { name: 'Guests', file: 'guests.html', appId: 'guestsApp', script: 'guests.js', extra: [bookingModalCode] },
  { name: 'Housekeeping', file: 'housekeeping.html', appId: 'housekeepingApp', script: 'housekeeping.js' },
  { name: 'Maintenance', file: 'maintenance.html', appId: 'maintenanceApp', script: 'maintenance.js' },
  { name: 'Orders', file: 'orders.html', appId: 'ordersApp', script: 'orders.js' },
  { name: 'Kitchen', file: 'kitchen.html', appId: 'kitchenApp', script: 'kitchen.js' },
  { name: 'Tables', file: 'tables.html', appId: 'tablesApp', script: 'tables.js' },
  { name: 'Menu Mgmt', file: 'menu.html', appId: 'menuMgmtApp', script: 'menu-mgmt.js' },
  { name: 'Messages', file: 'messages.html', appId: 'messagesApp', script: 'messages.js' },
  { name: 'Inquiries', file: 'inquiries.html', appId: 'inquiriesApp', script: 'inquiries.js' },
  { name: 'Feedback', file: 'feedback.html', appId: 'feedbackApp', script: 'feedback.js' },
  { name: 'Payments', file: 'payments.html', appId: 'paymentsApp', script: 'payments.js', extra: [bookingModalCode] },
  { name: 'Reports', file: 'reports.html', appId: 'reportsApp', script: 'reports.js' },
  { name: 'Rooms', file: 'rooms.html', appId: 'roomsApp', script: 'rooms.js' },
  { name: 'Room Types', file: 'roomtypes.html', appId: 'roomTypesApp', script: 'roomtypes.js' },
  { name: 'Promotions', file: 'promotions.html', appId: 'promotionsApp', script: 'promotions.js' },
  { name: 'Employees', file: 'employees.html', appId: 'employeesApp', script: 'employees.js' },
  { name: 'Audit', file: 'audit.html', appId: 'auditApp', script: 'audit.js' }
];

console.log('=== SCANNING RENDERED OUTPUT FOR UNDEFINED / NAN / NULL ARTIFACTS ===\n');

let totalArtifacts = 0;

pagesToTest.forEach(p => {
  const elements = new Map();
  const listeners = new Map();

  class MockElement {
    constructor(id = '', tagName = 'div') {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this._innerHTML = '';
      this.className = '';
      this.classList = {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      };
      this.style = {};
      this.value = '';
      this.checked = false;
      this.children = [];
      this.dataset = {};
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) {
      this._innerHTML = val;
      const idMatches = [...val.matchAll(/id=["']([^"']+)["']/g)];
      for (const m of idMatches) {
        if (!elements.has(m[1])) {
          elements.set(m[1], new MockElement(m[1]));
        }
      }
    }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k] || null; }
    appendChild(child) { this.children.push(child); return child; }
    removeChild(child) { return child; }
    querySelector(sel) {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || new MockElement(sel.slice(1));
      return new MockElement();
    }
    querySelectorAll() { return []; }
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
  }

  const document = {
    title: 'PUPSJ ' + p.name,
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, new MockElement(id));
      return elements.get(id);
    },
    querySelector: (sel) => {
      if (sel.startsWith('#')) return document.getElementById(sel.slice(1));
      return new MockElement();
    },
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement('', tag),
    body: new MockElement('body', 'body'),
    head: new MockElement('head', 'head'),
    addEventListener: (evt, fn) => {
      if (evt === 'DOMContentLoaded') setTimeout(fn, 10);
    },
    removeEventListener: () => {},
    dispatchEvent: () => true
  };

  const storage = {};
  const localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { for (const k in storage) delete storage[k]; }
  };

  const mockWin = {
    document,
    localStorage,
    sessionStorage: localStorage,
    location: {
      href: `http://localhost/pages/management/${p.file}`,
      pathname: `/pages/management/${p.file}`,
      hash: '',
      search: '',
      replace: () => {}
    },
    navigator: { userAgent: 'NodeTest' },
    setTimeout: (fn, ms) => setTimeout(fn, ms || 0),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms || 0),
    clearInterval: (id) => clearInterval(id),
    console: { log: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    Event: class { constructor(t) { this.type = t; } },
    CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d?.detail; } },
    URLSearchParams: class {
      constructor() { this.params = new Map(); }
      get(k) { return this.params.get(k) || null; }
      set(k, v) { this.params.set(k, v); }
    },
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    removeEventListener: () => {}
  };
  mockWin.window = mockWin;
  mockWin.self = mockWin;

  const mainApp = new MockElement(p.appId, 'main');
  elements.set(p.appId, mainApp);

  const context = vm.createContext(mockWin);

  try {
    vm.runInContext(coreCode, context);
    vm.runInContext(dataCode, context);
    vm.runInContext(staffShellCode, context);
    if (p.extra) {
      for (const ex of p.extra) vm.runInContext(ex, context);
    }
    const pageScript = fs.readFileSync(path.join(jsDir, p.script), 'utf8');
    vm.runInContext(pageScript, context);

    const rendered = mainApp.innerHTML;
    // Scan for forbidden literal artifacts:
    // "undefined", "NaN", "null", "[object Object]", empty "()"
    const undefinedMatch = rendered.match(/>\s*undefined\s*<|:\s*undefined\b|["']undefined["']/i);
    const nanMatch = rendered.match(/>\s*NaN\s*<|₱NaN\b|:\s*NaN\b/);
    const nullMatch = rendered.match(/>\s*null\s*<|:\s*null\b/i);
    const objectMatch = rendered.match(/\[object Object\]/i);
    const textContentOnly = rendered.replace(/<[^>]+>/g, ' ');
    const emptyParens = textContentOnly.match(/\(\s*\)/);

    let issues = [];
    if (undefinedMatch) issues.push('undefined');
    if (nanMatch) issues.push('NaN');
    if (nullMatch) issues.push('null');
    if (objectMatch) issues.push('[object Object]');
    if (emptyParens) issues.push('empty ()');

    if (issues.length > 0) {
      console.error(`[FAIL] ${p.name.padEnd(16)}: Found artifacts: ${issues.join(', ')}`);
      totalArtifacts++;
    } else {
      console.log(`[PASS] ${p.name.padEnd(16)}: Clean (${rendered.length} bytes, 0 artifacts)`);
    }
  } catch (err) {
    console.error(`[ERROR] ${p.name}: ${err.message}`);
    totalArtifacts++;
  }
});

console.log('\n========================================');
console.log(`ARTIFACT SCAN RESULT: ${totalArtifacts} ISSUES DETECTED (Target: 0)`);
console.log('========================================\n');
