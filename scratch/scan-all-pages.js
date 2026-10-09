const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.join(__dirname, '..');
const htmlFiles = [
  'index.html',
  'pages/main/home.html',
  'pages/main/about.html',
  'pages/main/contact.html',
  'pages/main/menu.html',
  'pages/main/terms.html',
  'pages/main/privacy.html',
  'pages/rooms/rooms-deals.html',
  'pages/auth/guest-login.html',
  'pages/auth/staff-login.html',
  'pages/guest/guest-portal.html'
];

console.log('=== SCANNING STATIC HTML PAGES FOR DEFECTS ===\n');
let staticIssues = 0;
htmlFiles.forEach(rel => {
  const fullPath = path.join(baseDir, rel);
  if (!fs.existsSync(fullPath)) {
    console.error(`[MISSING] ${rel}`);
    staticIssues++;
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const textOnly = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, ' ');
  
  const mUndef = textOnly.match(/\bundefined\b/i);
  const mNan = textOnly.match(/\bNaN\b/);
  const mNull = textOnly.match(/\bnull\b/i);
  const mObj = textOnly.match(/\[object Object\]/i);
  const mParens = textOnly.match(/\(\s*\)/);

  let errs = [];
  if (mUndef) errs.push('undefined');
  if (mNan) errs.push('NaN');
  if (mNull) errs.push('null');
  if (mObj) errs.push('[object Object]');
  if (mParens) errs.push('empty ()');

  if (errs.length > 0) {
    console.error(`[FAIL] ${rel}: ${errs.join(', ')}`);
    staticIssues++;
  } else {
    console.log(`[PASS] ${rel}: Clean`);
  }
});

console.log(`\nStatic HTML Scan Result: ${staticIssues} issues.`);
