const fs = require('fs');
const path = require('path');
const vm = require('vm');

function runTest(scenarioName, initialStaffSession) {
  console.log(`\n=== Testing: ${scenarioName} ===`);
  const elements = new Map();
  const listeners = [];

  class MockElement {
    constructor(id = '', tagName = 'div') {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this._innerHTML = '';
      this.className = '';
      this.classList = {
        add: (c) => { this.className += ' ' + c; },
        remove: (c) => { this.className = this.className.replace(c, '').trim(); },
        toggle: (c, v) => { return true; },
        contains: (c) => this.className.includes(c)
      };
      this.style = {};
      this.value = '';
      this.children = [];
      this.dataset = { portal: 'hotel' };
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) {
      this._innerHTML = val;
    }
    setAttribute(k, v) { this[k] = v; }
    getAttribute(k) { return this[k] || null; }
    appendChild(child) { this.children.push(child); return child; }
    prepend(child) { this.children.unshift(child); return child; }
    querySelector(sel) {
      const clean = sel.replace('#', '').replace('.', '');
      return elements.get(clean) || null;
    }
    querySelectorAll() { return []; }
  }

  const staffSidebar = new MockElement('staffSidebar', 'aside');
  const staffTopbar = new MockElement('staffTopbar', 'header');
  const dashboardApp = new MockElement('dashboardApp', 'main');
  elements.set('staffSidebar', staffSidebar);
  elements.set('staffTopbar', staffTopbar);
  elements.set('dashboardApp', dashboardApp);

  const mockStorage = {
    pupsj_sessionStaff: initialStaffSession ? JSON.stringify(initialStaffSession) : null
  };

  const window = {
    location: {
      pathname: '/c:/Users/reche/OneDrive/Documents/SAD_UI/pages/hotel/dashboard.html',
      replace: (dest) => { console.log('window.location.replace called with:', dest); },
      href: ''
    },
    sessionStorage: {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = v; },
      removeItem: (k) => { delete mockStorage[k]; }
    },
    localStorage: {
      _data: {},
      getItem: function(k) { return this._data[k] || null; },
      setItem: function(k, v) { this._data[k] = v; },
      removeItem: function(k) { delete this._data[k]; }
    },
    addEventListener: (evt, fn) => {
      if (evt === 'DOMContentLoaded') listeners.push(fn);
    }
  };

  const document = {
    title: 'PUPSJ Hotel – Front Desk Dashboard',
    readyState: 'complete',
    body: new MockElement('body', 'body'),
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => {
      if (sel === 'aside') return staffSidebar;
      if (sel === 'header' || sel === '.top') return staffTopbar;
      if (sel === 'footer') return new MockElement('footer', 'footer');
      return elements.get(sel.replace('#', '').replace('.', '')) || null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => new MockElement('', tag),
    addEventListener: (evt, fn) => {
      if (evt === 'DOMContentLoaded') listeners.push(fn);
    }
  };
  document.body.dataset = { portal: 'hotel' };

  const ctx = {
    window,
    document,
    location: window.location,
    sessionStorage: window.sessionStorage,
    localStorage: window.localStorage,
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {}
  };
  vm.createContext(ctx);

  const jsDir = path.join(__dirname, '../js');
  ['crypto.js', 'validate.js', 'core.js', 'data.js', 'services.js', 'staff-shell.js', 'dashboard.js'].forEach(file => {
    try {
      const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
      vm.runInContext(code, ctx);
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message, e.stack);
    }
  });

  // Trigger any DOMContentLoaded listeners
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Error in DOMContentLoaded listener:', e.message, e.stack);
    }
  });

  console.log('Sidebar innerHTML length:', staffSidebar.innerHTML.length);
  console.log('Topbar innerHTML length:', staffTopbar.innerHTML.length);
  console.log('DashboardApp innerHTML length:', dashboardApp.innerHTML.length);
}

runTest('1. With hotel receptionist session', { id: 'STF-002', name: 'Maria Santos', role: 'hotel_receptionist' });
runTest('2. With superadmin session', { id: 'ADM-001', name: 'Superadmin', role: 'superadmin' });
runTest('3. With NO session (null)', null);
