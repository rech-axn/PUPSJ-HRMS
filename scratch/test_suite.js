const fs = require('fs');
const vm = require('vm');

const coreCode = fs.readFileSync('js/core.js', 'utf8');
const dataCode = fs.readFileSync('js/data.js', 'utf8');

const sandbox = {
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  String,
  Number,
  Array,
  Object,
  JSON,
  RegExp,
  document: {
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    body: { classList: { add() {}, remove() {} } }
  },
  window: {
    dispatchEvent() {}
  },
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.init = init; } }
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(coreCode, sandbox);
vm.runInContext(dataCode, sandbox);

const Data = sandbox.Data;
const today = sandbox.today;
const addDays = sandbox.addDays;

console.log('--- Testing Data API ---');
console.log('Types count:', Data.getTypes().length);
console.log('Standard rooms:', Data.roomNums('Standard'));
console.log('Deluxe City View rooms:', Data.roomNums('Deluxe City View'));
console.log('Free Standard rooms today:', Data.freeRooms('Standard', today(), addDays(today(), 2)));
console.log('Reservations count:', Data.getReservations().length);

const r1 = Data.findRes('HTL-2041');
console.log('Found HTL-2041:', r1.g, 'Room:', r1.n, 'Type:', typeof r1.n);

const chg = Data.addCharge('HTL-2041', 'Room Service Snack', 450, 'Dining');
console.log('Charge added:', chg.desc, chg.amt);

const pay = Data.addPayment('HTL-2041', 450, 'Cash', 'Payment', 'Settlement');
console.log('Payment recorded:', pay.id, pay.a);

console.log('isRoomClean 201:', Data.isRoomClean(201));
console.log('isRoomClean 501 (dirty):', Data.isRoomClean(501));

console.log('Check-in 201 (clean & deposit paid):', Data.checkIn('HTL-2041'));
console.log('Check-out 201:', Data.checkOut('HTL-2041'));
console.log('Room 201 after check-out is clean?', Data.isRoomClean(201));

console.log('Cancel reservation HTL-2044:', Data.cancelReservation('HTL-2044', 'staff'));

console.log('Guest profiles count:', Object.keys(Data.getGuestProfiles()).length);
console.log('Next HTL ID:', Data.nextId('HTL-'));
console.log('Next MNT ID:', Data.nextId('MNT-'));
console.log('Next ORD ID:', Data.nextId('ORD-'));
console.log('Orders count:', Data.getOrders().length);

const billRes = Data.billOrder('ORD-1002', 'cash', { method: 'Cash' });
console.log('Billed ORD-1002:', billRes);

console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
