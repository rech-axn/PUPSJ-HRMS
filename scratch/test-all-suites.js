const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '../js');
const cryptoCode = fs.readFileSync(path.join(jsDir, 'crypto.js'), 'utf8');
const validateCode = fs.readFileSync(path.join(jsDir, 'validate.js'), 'utf8');
const coreCode = fs.readFileSync(path.join(jsDir, 'core.js'), 'utf8');
const dataCode = fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8');
const servicesCode = fs.readFileSync(path.join(jsDir, 'services.js'), 'utf8');
const testsCode = fs.readFileSync(path.join(jsDir, 'tests.js'), 'utf8');

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

const mockWin = {
  console,
  URL: global.URL || URL,
  localStorage,
  sessionStorage,
  location: { href: 'http://localhost/', pathname: '/', hash: '', search: '' },
  CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d?.detail; } },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};
mockWin.window = mockWin;
mockWin.global = mockWin;

const context = vm.createContext(mockWin);
vm.runInContext(cryptoCode, context);
vm.runInContext(validateCode, context);
vm.runInContext(coreCode, context);
vm.runInContext(dataCode, context);
vm.runInContext(servicesCode, context);
vm.runInContext(testsCode, context);

console.log('\n>>> RUNNING PUPSJ IN-BROWSER REGRESSION SUITE (tests.js) <<<');
const result = vm.runInContext('Tests.run()', context);

if (result.ok) {
  console.log(`\nSUCCESS: All ${result.passed} automated tests passed with 0 failures!`);
  process.exit(0);
} else {
  console.error(`\nFAILED: ${result.failed} tests failed.`);
  process.exit(1);
}
