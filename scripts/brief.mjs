/**
 * Print a slot's brief and spec. Read-only, no side effects.
 * Run: tf brief                  the one you are working on right now
 *      tf brief <slot-id>        one slot, full brief
 *      tf brief grass            any slot whose id contains "grass"
 *      tf brief all              every slot, one line each
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { canvasOf } from '../lib/validate.mjs';
import { printSlot } from '../lib/print.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { openIssues } from './done.mjs';

const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`;
const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => (a.blocks === b.blocks ? a.id.localeCompare(b.id) : a.blocks < b.blocks ? -1 : 1));

let q = (process.argv[2] || '').toLowerCase();
let hits;
if (!q) {
  // "Current" is whatever scaffold would ask you about first: drawn but not
  // closed, then half done, then the top of the queue.
  const { state, queue } = await loadQueue();
  let open = null; try { open = await openIssues(); } catch {}
  const cur = state.find(x => x.st === 'done' && open?.has(x.s.id))
    || queue.find(x => x.st === 'started') || state.find(x => x.st === 'broken') || queue[0];
  if (!cur) { console.log('Nothing in progress and nothing left to draw.'); process.exit(0); }
  hits = [cur.s]; q = cur.s.id.toLowerCase();
} else if (q === 'all') {
  hits = slots; q = '';
} else {
  hits = slots.filter(s => s.id.toLowerCase().includes(q));
}
if (!hits.length) { console.error(`no slot matches "${q}". Run: tf brief all`); process.exit(1); }

if (hits.length > 1 || !q) {
  for (const s of hits) {
    const d = canvasOf(classes[s.class]);
    const drawn = existsSync(`art/${s.id}@1x.png`) ? D(' drawn') : '';
    console.log(`${s.blocks === 'v0' ? R('v0') : D('v1')}  ${B(s.id.padEnd(30))} ${D(`${d.w}x${d.h}`)}${drawn}`);
  }
  if (q) console.log(D(`\n${hits.length} matches. Narrow it: tf brief <exact-id>`));
  process.exit(0);
}

const s = hits[0];
printSlot(s, classes);
console.log(D(`\n  tf sketch ${s.id}     renders the sketch as a PNG and opens it`));
console.log(D(`  tf scaffold ${s.id}`));
