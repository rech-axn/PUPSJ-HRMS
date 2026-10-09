const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'baseline_slots.json'), 'utf8'));

let mismatches = 0;
let totalCurrentIcons = 0;
let totalCurrentImgs = 0;

console.log('=== VERIFYING ICON AND IMAGE SLOT PRESERVATION ===\n');

for (const [relPath, baseCounts] of Object.entries(baseline)) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[MISSING FILE] ${relPath}`);
    mismatches++;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const iconMatches = [...content.matchAll(/\[ICON:\s*[^\]]+\]/g)];
  const imgMatches = [...content.matchAll(/\[IMAGE:\s*[^\]]+\]/g)];
  const imgPlaceholderCalls = [...content.matchAll(/imgPlaceholder\(/g)];

  const curIcons = iconMatches.length;
  const curImgs = imgMatches.length + imgPlaceholderCalls.length;

  totalCurrentIcons += curIcons;
  totalCurrentImgs += curImgs;

  if (curIcons !== baseCounts.iconCount || curImgs !== baseCounts.imgCount) {
    console.error(`[MISMATCH] ${relPath}: Expected (${baseCounts.iconCount} icons, ${baseCounts.imgCount} imgs), Found (${curIcons} icons, ${curImgs} imgs)`);
    mismatches++;
  }
}

console.log(`Current Total Icons: ${totalCurrentIcons} (Baseline: 116)`);
console.log(`Current Total Images: ${totalCurrentImgs} (Baseline: 5)`);
if (mismatches === 0) {
  console.log('\n[SUCCESS] 100% PRESERVATION: All 116 icon slots and 5 image slots are intact across all files!');
} else {
  console.error(`\n[FAIL] Found ${mismatches} mismatches!`);
  process.exit(1);
}
