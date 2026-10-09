const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, '../js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

console.log('Auditing buttons across all JS files for unbound actions...\n');

let totalUnbound = 0;

for (const f of jsFiles) {
  const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
  
  // Find all buttons defined in template strings: <button ...>
  const btnMatches = [...code.matchAll(/<button\b([^>]*)>/gi)];
  const unboundInFile = [];

  for (const m of btnMatches) {
    const attrs = m[1];
    
    // Check if it has inline onclick
    const hasInlineOnclick = /onclick\s*=/i.test(attrs);
    
    // Check if it has an id
    const idMatch = attrs.match(/id\s*=\s*["']([^"']+)["']/i);
    const id = idMatch ? idMatch[1] : null;

    // Check if it has data- or other framework attribute that is handled
    const hasDataAttr = /data-[a-z0-9_-]+\s*=/i.test(attrs);

    // If it has inline onclick, it is bound
    if (hasInlineOnclick) continue;

    // If it has an id, check if id is bound in the code (e.g. $(id).onclick or getElementById(id) or `#${id}`)
    if (id) {
      // Regex to see if this id is referenced elsewhere in the file
      const escapedId = id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const count = (code.match(new RegExp(escapedId, 'g')) || []).length;
      // If it only appears once, it means it was created in the HTML template and NEVER referenced!
      if (count <= 1) {
        unboundInFile.push({ type: 'ID only appears once (never bound)', id, snippet: m[0] });
      }
    } else if (!hasDataAttr) {
      // Button with no onclick, no id, no data attribute
      // Could be modal close? Check class
      if (!/modal-close|close/i.test(attrs) && !/type\s*=\s*["']submit["']/i.test(attrs)) {
        unboundInFile.push({ type: 'No id, no onclick, no data attribute', id: '(none)', snippet: m[0] });
      }
    }
  }

  if (unboundInFile.length > 0) {
    console.log(`[!] ${f} has ${unboundInFile.length} potential unbound button(s):`);
    for (const u of unboundInFile) {
      console.log(`    - ${u.type}: ${u.id} -> ${u.snippet.slice(0, 60)}...`);
      totalUnbound++;
    }
  }
}

console.log(`\nAudit complete. Total unbound buttons found: ${totalUnbound}`);
