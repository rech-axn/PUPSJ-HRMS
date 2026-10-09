const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '../js');

// Create mock browser DOM environment
function createMockWindow() {
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
    set innerHTML(val) {
      this._innerHTML = val;
      // parse IDs
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
    querySelector(sel) { return elements.get(sel.replace('#', '')) || new MockElement(); }
    querySelectorAll(sel) { return []; }
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
  }

  const document = {
    title: 'PUPSJ Test',
    getElementById: (id) => {
      if (!elements.has(id)) {
        elements.set(id, new MockElement(id));
      }
      return elements.get(id);
    },
    querySelector: (sel) => {
      if (sel.startsWith('#')) return document.getElementById(sel.slice(1));
      return new MockElement();
    },
    querySelectorAll: (sel) => [],
    createElement: (tag) => new MockElement('', tag),
    body: new MockElement('body', 'body'),
    head: new MockElement('head', 'head'),
    addEventListener: (evt, fn) => {},
    removeEventListener: (evt, fn) => {},
    dispatchEvent: (evt) => true
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
    location: {
      href: 'http://localhost/pages/management/dashboard.html',
      pathname: '/pages/management/dashboard.html',
      hash: '',
      search: '',
      replace: () => {}
    },
    navigator: { userAgent: 'NodeTest' },
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn) => setInterval(fn, 0),
    clearInterval: (id) => clearInterval(id),
    console,
    Event: class { constructor(t) { this.type = t; } },
    CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d?.detail; } }
  };

  mockWin.window = mockWin;
  mockWin.self = mockWin;

  return { mockWin, elements };
}

// Test loading core.js and data.js
const { mockWin } = createMockWindow();
vm.createContext(mockWin);

const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8');

vm.runInContext(coreCode, mockWin);
vm.runInContext(dataCode, mockWin);

console.log('Core and Data loaded successfully.');
console.log('SCHEMA_VERSION:', mockWin.SCHEMA_VERSION);
console.log('Rooms:', mockWin.Data.getRooms().length);
console.log('Reservations:', mockWin.Data.getReservations().length);
console.log('Orders:', mockWin.Data.getOrders().length);
console.log('Staff:', mockWin.Data.getStaff().length);
