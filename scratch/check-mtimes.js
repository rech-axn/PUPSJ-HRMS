const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let res = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    if (f === 'node_modules' || f === '.git' || f === 'scratch') continue;
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) res = res.concat(getFiles(p));
    else res.push({ p: path.relative(path.join(__dirname, '..'), p).replace(/\\/g, '/'), mtime: st.mtime });
  }
  return res;
}

const all = getFiles(path.join(__dirname, '..'));
all.sort((a, b) => b.mtime - a.mtime);
console.log(all.slice(0, 30).map(x => `${x.mtime.toISOString()} ${x.p}`).join('\n'));
