const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let lineNum = 0;
let matches = [];

rl.on('line', (line) => {
  lineNum++;
  if (line.includes('Root Cause Analysis') || line.includes('Guests and Orders') || line.includes('guests and orders')) {
    matches.push({ lineNum, snippet: line.slice(0, 150) });
  }
});

rl.on('close', () => {
  console.log('Matches found:', matches);
});
