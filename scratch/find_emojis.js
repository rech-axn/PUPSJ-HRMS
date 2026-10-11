const fs = require('fs');
const path = require('path');

// Regex for emojis specifically
const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

const ignoredChars = new Set(['©', '®', '™', '₱', '·', '•', '…', '§', '°', '±', '×', '÷', '✔', '✓', '✖', '✗', '▶', '◀', '▲', '▼', '◆', '◇', '○', '●', '★', '☆']);

const matchesFound = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'scratch') {
        scanDir(full);
      }
    } else if (/\.(html|js|css)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const matches = line.match(emojiRegex);
        if (matches) {
          const filtered = matches.filter(m => !ignoredChars.has(m));
          if (filtered.length > 0) {
            matchesFound.push({
              file: full,
              lineNum: idx + 1,
              emojis: filtered,
              line: line.trim()
            });
          }
        }
      });
    }
  }
}

scanDir('c:\\Users\\reche\\OneDrive\\Documents\\SAD_UI');

console.log(`Found ${matchesFound.length} lines with REAL emojis:`);
matchesFound.forEach(m => {
  const rel = path.relative('c:\\Users\\reche\\OneDrive\\Documents\\SAD_UI', m.file);
  console.log(`${rel}:${m.lineNum} [${m.emojis.join(' ')}] ${m.line}`);
});
