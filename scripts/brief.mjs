/**
 * Print a slot's brief and spec. Read-only, no side effects.
 * Run: npm run brief                  the one you are working on right now
 *      npm run brief <slot-id>        one slot, full brief
 *      npm run brief grass            any slot whose id contains "grass"
 *      npm run brief all              every slot, one line each
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { canvasOf } from '../lib/validate.mjs';
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
if (!hits.length) { console.error(`no slot matches "${q}". Run: npm run brief all`); process.exit(1); }

if (hits.length > 1 || !q) {
  for (const s of hits) {
    const d = canvasOf(classes[s.class]);
    const drawn = existsSync(`art/${s.id}@1x.png`) ? D(' drawn') : '';
    console.log(`${s.blocks === 'v0' ? R('v0') : D('v1')}  ${B(s.id.padEnd(30))} ${D(`${d.w}x${d.h}`)}${drawn}`);
  }
  if (q) console.log(D(`\n${hits.length} matches. Narrow it: npm run brief <exact-id>`));
  process.exit(0);
}

const s = hits[0], c = classes[s.class], d = canvasOf(c);
console.log(`\n${B(s.id)}  ${s.blocks === 'v0' ? R('[blocks first playable]') : D('[v1]')}\n`);
console.log(`  ${B(d.w + 'x' + d.h)}${c.grid ? D(`  = a 4 x 4 grid of ${c.w / 4}x${c.h / 4} cells`) : ''}`);
console.log(`  ${c.frames > 1 ? c.frames + ' frames' + (c.strip ? ', stacked top to bottom' : '') + '  ' : ''}max ${c.colors} colours  anchor ${c.anchor}${c.opaque ? '  fully opaque' : ''}`);
console.log(`  file  art/${s.id}@1x.png\n`);
console.log('  ' + s.brief.replace(/(.{78}\s)/g, '$1\n  ') + '\n');
console.log(D(`  npm run scaffold ${s.id}`));
