const fs = require('fs');
const path = require('path');

function getFiles(dir, ext) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item.startsWith('.')) continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) res.push(...getFiles(full, ext));
    else if (full.endsWith(ext)) res.push(full);
  }
  return res;
}

const htmlFiles = getFiles('.', '.html');
console.log('HTML files count:', htmlFiles.length);
const map = {};
for (const f of htmlFiles) {
  const norm = f.replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  const scripts = [...content.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  map[norm] = scripts;
  console.log(norm, '-->', scripts.join(', '));
}

fs.writeFileSync('scratch/html_map.json', JSON.stringify(map, null, 2));
