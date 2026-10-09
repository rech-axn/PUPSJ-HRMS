const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 1871 || lineNum === 1877 || lineNum === 2067) {
    console.log(`Line ${lineNum}:`, line.slice(0, 300));
  }
});
