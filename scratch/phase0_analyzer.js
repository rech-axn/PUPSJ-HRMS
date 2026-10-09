const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Helper to find all files recursively
function getFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'scratch') {
        results = results.concat(getFiles(fullPath, exts));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const htmlFiles = getFiles(path.join(root, 'pages'), ['.html']).concat([path.join(root, 'index.html')]);
const jsFiles = getFiles(path.join(root, 'js'), ['.js']);
const allFiles = [...htmlFiles, ...jsFiles];

console.log('--- SLOT INVENTORY (BEFORE ANY EDIT) ---');
const slotInventory = {};
let totalIconSlots = 0;
let totalImageSlots = 0;

allFiles.forEach(f => {
  const relPath = path.relative(root, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  
  // Icon slot detection:
  // [ICON: ...] or class="ic" or data-icon="..."
  const iconMatches = [...content.matchAll(/\[ICON:\s*[^\]]+\]/g)];
  const imgMatches = [...content.matchAll(/\[IMAGE:\s*[^\]]+\]/g)];
  
  // Also count imgPlaceholder calls
  const imgPlaceholderCalls = [...content.matchAll(/imgPlaceholder\(/g)];

  const iconCount = iconMatches.length;
  const imgCount = imgMatches.length + imgPlaceholderCalls.length;

  slotInventory[relPath] = { iconCount, imgCount };
  totalIconSlots += iconCount;
  totalImageSlots += imgCount;

  if (iconCount > 0 || imgCount > 0) {
    console.log(`${relPath.padEnd(35)}: ${iconCount} icon slots, ${imgCount} image slots`);
  }
});

console.log(`TOTALS: ${totalIconSlots} icon slots, ${totalImageSlots} image slots across codebase\n`);

// Save slot baseline to scratch/baseline_slots.json
fs.writeFileSync(path.join(__dirname, 'baseline_slots.json'), JSON.stringify(slotInventory, null, 2));

console.log('Baseline slot counts saved to scratch/baseline_slots.json');
