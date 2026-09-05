/**
 * Create a correctly sized empty PNG for a slot and open it.
 *
 * With no slot id it is the front door of the whole loop: it first asks
 * whether anything you were working on is finished, marks it done if you say
 * yes, and only then scaffolds the next slot. Say no and it does nothing.
 *
 * Run: npm run scaffold [slot-id] [--no-open]
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { blank } from '../lib/png.mjs';
import { canvasOf } from '../lib/validate.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { openFile } from '../lib/open.mjs';
import { finish, openIssues } from './done.mjs';

const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`;

/** y/N prompt. Returns null when there is no terminal to ask (CI, pipes). */
async function ask(q) {
  if (!process.stdin.isTTY) return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { const a = (await rl.question(q)).trim().toLowerCase(); return a === 'y' || a === 'yes'; }
  catch { console.log('\nNothing changed.'); process.exit(0); } // Ctrl+C or Ctrl+D at the prompt means no
  finally { rl.close(); }
}

let id = process.argv.slice(2).find(a => !a.startsWith('--'));

if (!id) {
  const { state } = await loadQueue();

  // 1. Anything drawn and passing that has not been marked done yet?
  let open = null;
  try { open = await openIssues(); }
  catch { console.log(D('(cannot reach GitHub, skipping the "did you finish" check)\n')); }
  if (open) {
    for (const x of state.filter(x => x.st === 'done' && open.has(x.s.id))) {
      const yes = await ask(`Did you finish ${B(x.s.id)}? [y/N] `);
      if (yes === null) break;
      if (!yes) { console.log(`OK, keep going on ${x.s.id}. Nothing changed.`); process.exit(0); }
      await finish(x.s.id);
      console.log();
    }
  }

  // 2. Anything half drawn and failing?
  for (const x of state.filter(x => x.st === 'broken')) {
    console.log(`${B(x.s.id)} is started but not passing:`);
    for (const w of x.why) console.log(D('  ' + w));
    const yes = await ask(`Leave it and move on anyway? [y/N] `);
    if (yes === null) break;
    if (!yes) { console.log(`OK. Back to ${x.s.id}: npm run watch`); process.exit(0); }
  }

  const { queue } = await loadQueue();
  if (!queue.length) { console.log('Nothing left to scaffold. Everything is drawn.'); process.exit(0); }
  id = queue[0].s.id;
  console.log(`next up: ${B(id)}\n`);
}

if (!existsSync(`slots/${id}.json`)) { console.error(`no slot "${id}". Run: npm run next`); process.exit(1); }
const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
const cls = classes[slot.class], { w, h } = canvasOf(cls);
const file = `art/${id}@1x.png`;

if (existsSync(file)) console.log(`${file} already exists, leaving it alone.`);
else {
  writeFileSync(file, await blank(w, h));
  console.log(`${file}  ${w}x${h}, transparent`);
}
console.log(`  max ${cls.colors} colours · anchor ${cls.anchor}` +
  (cls.frames > 1 ? ` · ${cls.frames} frames ${cls.strip ? 'stacked top to bottom' : `(${cls.grid}, ${w / 4}x${h / 4} cells)`}` : ''));
console.log(`\n  ${slot.brief}\n`);
console.log('Leave `npm run watch` running and it will check every time you save.');
if (!process.argv.includes('--no-open')) openFile(file);
