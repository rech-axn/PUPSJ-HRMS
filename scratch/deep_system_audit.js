const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// 1. Check all links in HTML and JS
const htmlDir = path.join(root, 'pages');
const jsDir = path.join(root, 'js');

console.log('=== DEEP SYSTEM AUDIT ===\n');

// 2. Inspect booking-modal.js
const bm = fs.readFileSync(path.join(jsDir, 'booking-modal.js'), 'utf8');
console.log('--- BOOKING-MODAL.JS CHECK ---');
console.log('Checks for guest session?', /getGuestSession/i.test(bm));
console.log('Checks for staff session?', /getStaffSession/i.test(bm));
console.log('Has walk-in ID fields (gov ID type / number)?', /idType|govId|idNumber/i.test(bm));
console.log('Branches by session role?', /role|isStaff|sessionRole/i.test(bm));

// 3. Inspect menu.js table reservation
const menu = fs.readFileSync(path.join(jsDir, 'menu.js'), 'utf8');
console.log('\n--- MENU.JS TABLE RESERVATION CHECK ---');
console.log('Checks for guest session?', /getGuestSession/i.test(menu));
console.log('Checks for staff session?', /getStaffSession/i.test(menu));
console.log('Increments promo before or after save?', menu.indexOf('incrementPromo') < menu.indexOf('createTableRes') ? 'BEFORE (BUG)' : 'AFTER');

// 4. Inspect guest-login.js
const gl = fs.readFileSync(path.join(jsDir, 'guest-login.js'), 'utf8');
console.log('\n--- GUEST-LOGIN.JS CHECK ---');
console.log('Handles ?next= parameter?', /next/i.test(gl));
console.log('Checks sessionStorage pending intent?', /sessionStorage|pending_intent|intent/i.test(gl));
console.log('Validates redirect URL against whitelist?', /whitelist/i.test(gl));

// 5. Inspect rooms-deals.js
const rd = fs.readFileSync(path.join(jsDir, 'rooms-deals.js'), 'utf8');
console.log('\n--- ROOMS-DEALS.JS CHECK ---');
console.log('Claim Offer button behavior:', rd.match(/claim|promo/gi)?.length || 0, 'references');
console.log('esc() inside querySelector?', /querySelector\([^)]*esc\(/i.test(rd));

// 6. Inspect data.js gates
const data = fs.readFileSync(path.join(jsDir, 'data.js'), 'utf8');
console.log('\n--- DATA.JS ENFORCEMENT CHECK ---');
const creationFns = ['createReservation', 'createTableRes', 'createOrder', 'createFeedback', 'createThread'];
creationFns.forEach(fn => {
  const fnIdx = data.indexOf(fn);
  if (fnIdx !== -1) {
    const slice = data.slice(fnIdx, fnIdx + 400);
    const hasSessionCheck = /getGuestSession|getStaffSession|session/i.test(slice);
    const hasSource = /source/i.test(slice);
    const hasCreatedBy = /createdBy/i.test(slice);
    console.log(`${fn}: SessionCheck=${hasSessionCheck}, SupportsSource=${hasSource}, SupportsCreatedBy=${hasCreatedBy}`);
  } else {
    console.log(`${fn}: NOT FOUND in data.js`);
  }
});

// 7. Check dual schema fallbacks
console.log('\n--- DUAL SCHEMA FALLBACKS SCAN ---');
const fallbacks = [
  'ref || id', 'guestName || guest', 'recordType || type', 'desc || description',
  'updated || updatedAt', 'assignedTo || assigned', 'staffNotes || notes',
  'rating || ratingOverall', 'startIndex || startIdx'
];
fallbacks.forEach(fb => {
  const parts = fb.split(' || ');
  const regex = new RegExp(`\\b${parts[0]}\\b\\s*\\|\\|\\s*\\b${parts[1]}\\b`, 'g');
  let count = 0;
  fs.readdirSync(jsDir).forEach(f => {
    if (f.endsWith('.js')) {
      const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
      const matches = code.match(regex);
      if (matches) count += matches.length;
    }
  });
  console.log(`Fallback ${fb}: found ${count} times in js/`);
});
