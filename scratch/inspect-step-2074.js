const fs = require('fs');
const p = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript_full.jsonl';
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream(p),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 2074) {
      console.log('Step 2074 TargetContent:');
      console.log(obj.tool_calls[0].args.TargetContent);
      console.log('--- REPLACEMENT WAS ---');
      console.log(obj.tool_calls[0].args.ReplacementContent);
    }
  } catch (e) {}
});
