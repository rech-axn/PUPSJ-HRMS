const fs = require('fs');
const path = require('path');
const htmlDir = path.join(__dirname, '../pages/management');
const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
files.push('../guest/guests.html');

for (const f of files) {
  const p = path.resolve(htmlDir, f);
  const content = fs.readFileSync(p, 'utf8');
  const mainMatch = content.match(/<main[^>]*id=["']([^"']+)["']/i);
  const scripts = [...content.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log(f.padEnd(25), 'main id:', (mainMatch ? mainMatch[1] : 'NONE').padEnd(15), 'scripts:', scripts.join(', '));
}
