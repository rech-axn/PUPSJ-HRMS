const fs = require('fs');
const readline = require('readline');

const p = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript_full.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(p),
  crlfDelay: Infinity
});

let modifiedFilesAfter1811 = new Set();
let allEdits = [];

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const step = obj.step_index;
    if (step > 1811) {
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' || tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            const target = tc.args?.TargetFile || tc.args?.target_file;
            if (target && !target.includes('scratch')) {
              modifiedFilesAfter1811.add(target);
              allEdits.push({ step, tool: tc.name, file: target });
            }
          }
        }
      }
    }
  } catch (e) {}
});

rl.on('close', () => {
  console.log('Modified files after step 1811:');
  for (const f of modifiedFilesAfter1811) {
    console.log('-', f);
  }
  console.log(`\nTotal edit actions after step 1811: ${allEdits.length}`);
});
