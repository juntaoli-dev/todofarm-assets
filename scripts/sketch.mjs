/**
 * Render a slot's ASCII sketch to a PNG you can open beside your canvas.
 * The sketch is a picture of the brief, not the art: it goes to sketches/,
 * which is gitignored, and never into art/.
 *
 * Run: tf sketch            the slot you are working on
 *      tf sketch <slot-id>  one slot
 *      tf sketch all        every slot that has a sketch
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { loadQueue } from '../lib/queue.mjs';
import { openInAseprite } from '../lib/open.mjs';
import { printSlot } from '../lib/print.mjs';
import { compose, renderSketch } from '../lib/sketch.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const load = id => JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
let arg = process.argv.slice(2).find(a => !a.startsWith('--'));
if (arg === 'all') {
  let n = 0;
  for (const f of readdirSync('slots').filter(f => f.endsWith('.json'))) { const s = load(f.slice(0, -5)); if (s.sketch) { await renderSketch(s, classes); n++; } }
  console.log(`${n} sketches rendered to sketches/`);
} else {
  if (!arg) { const { state, queue } = await loadQueue(); const cur = queue.find(x => x.st === 'started') || state.find(x => x.st === 'broken') || queue[0]; if (!cur) { console.log('nothing to sketch'); process.exit(0); } arg = cur.s.id; }
  if (!existsSync(`slots/${arg}.json`)) { console.error(`no slot "${arg}"`); process.exit(1); }
  const s = load(arg);
  if (!s.sketch) { console.log(`${arg} has no sketch yet.`); process.exit(0); }
  const out = await renderSketch(s, classes);
  // Brief first, then the sketch placed on the real canvas, so you read what it
  // is before you look at what it looks like.
  printSlot(s, classes, { grid: compose(s, classes) });
  console.log(`\n  ${out}   a picture of the brief, never commit it`);
  if (!process.argv.includes('--no-open')) openInAseprite([out]);
}
