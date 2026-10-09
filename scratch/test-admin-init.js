const fs = require('fs');
const path = require('path');
const jsDir = path.join(__dirname, '../js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

for (const f of files) {
  const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
  const lines = code.trim().split('\n');
  const lastLines = lines.slice(-15).join(' ');
  const hasInit = /init\(|safeInit|DOMContentLoaded|onload/i.test(lastLines);
  console.log(f.padEnd(20), hasInit ? 'INIT_FOUND' : 'NO_INIT_AT_END');
}
