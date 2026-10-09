const fs = require('fs');
const readline = require('readline');

const p = 'C:\\Users\\reche\\.gemini\\antigravity-ide\\brain\\5016582c-1a68-4bf8-8ec3-c5df076af651\\.system_generated\\logs\\transcript_full.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(p),
  crlfDelay: Infinity
});

let edits = [];

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    const step = obj.step_index;
    if (step > 1811 && obj.tool_calls) {
      for (const tc of obj.tool_calls) {
        if (tc.name === 'write_to_file' || tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
          const target = tc.args?.TargetFile || tc.args?.target_file;
          if (target && !target.includes('scratch')) {
            edits.push({
              step,
              tool: tc.name,
              target,
              args: tc.args
            });
          }
        }
      }
    }
  } catch (e) {}
});

rl.on('close', () => {
  console.log(`Found ${edits.length} edits after step 1811:`);
  edits.forEach((e, idx) => {
    console.log(`[${idx}] Step ${e.step}: ${e.tool} on ${e.target}`);
    if (e.tool === 'replace_file_content') {
      console.log(`   Target: ${JSON.stringify(e.args.TargetContent?.slice(0, 80))}`);
      console.log(`   Replacement: ${JSON.stringify(e.args.ReplacementContent?.slice(0, 80))}`);
    } else if (e.tool === 'write_to_file') {
      console.log(`   Overwrite: ${e.args.Overwrite}, length: ${e.args.CodeContent?.length}`);
    }
  });
});
