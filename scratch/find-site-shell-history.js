const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let found = [];
let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (line.includes('site-shell.js')) {
    found.push({ lineNum, len: line.length });
  }
});

rl.on('close', () => {
  console.log(`Found ${found.length} occurrences in transcript:`, found);
});
