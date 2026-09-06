/**
 * Render a slot's ASCII sketch to a PNG you can open beside your canvas.
 * The sketch is a picture of the brief, not the art: it goes to sketches/,
 * which is gitignored, and never into art/.
 *
 * Run: tf sketch            the slot you are working on
 *      tf sketch <slot-id>  one slot
 *      tf sketch all        every slot that has a sketch
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { encodePNG } from '../lib/png.mjs';
import { canvasOf } from '../lib/validate.mjs';
import { loadQueue } from '../lib/queue.mjs';
import { openFile } from '../lib/open.mjs';
import { printSlot } from '../lib/print.mjs';

// Neutral ramp from Resurrect 64, so a sketch is obviously a sketch and still on palette.
const INK = { '#': [0x2e,0x22,0x2f], '-': [0x62,0x55,0x65], 'o': [0x96,0x6c,0x6c],
              '+': [0xab,0x94,0x7a], '=': [0xf9,0xc2,0x2b] };

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));

/** Place the sketch rows onto the slot's full canvas according to its class. */
export function compose(slot) {
  const cls = classes[slot.class], { w, h } = canvasOf(cls);
  const rows = slot.sketch; if (!rows) return null;
  const sw = rows[0].length, sh = rows.length;
  const grid = Array.from({ length: h }, () => '.'.repeat(w).split(''));
  const stamp = (ox, oy) => { for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (rows[y][x] !== '.') grid[oy + y][ox + x] = rows[y][x]; };
  if (sw === w && sh === h) stamp(0, 0);                                  // exact
  else if (cls.grid && sw === w / 4 && sh === h / 4)                      // one char cell -> 4x4 sheet
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) stamp(c * sw, r * sh);
  else if (cls.strip && sw === w && sh === cls.h)                         // one frame -> every frame
    for (let f = 0; f < cls.frames; f++) stamp(0, f * sh);
  else if (slot.class.startsWith('prop')) stamp(Math.floor((w - sw) / 2), h - sh);   // bottom anchored
  else stamp(Math.floor((w - sw) / 2), Math.floor((h - sh) / 2));         // centred
  return grid.map(r => r.join(''));
}

export async function renderSketch(slot) {
  const grid = compose(slot); if (!grid) return null;
  const w = grid[0].length, h = grid.length;
  const png = await encodePNG(w, h, (x, y) => { const c = INK[grid[y][x]]; return c ? [...c, 255] : [0, 0, 0, 0]; });
  mkdirSync('sketches', { recursive: true });
  const out = `sketches/${slot.id}@1x.png`; writeFileSync(out, png); return out;
}

const load = id => JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
let arg = process.argv.slice(2).find(a => !a.startsWith('--'));
if (arg === 'all') {
  let n = 0;
  for (const f of readdirSync('slots').filter(f => f.endsWith('.json'))) { const s = load(f.slice(0, -5)); if (s.sketch) { await renderSketch(s); n++; } }
  console.log(`${n} sketches rendered to sketches/`);
} else {
  if (!arg) { const { state, queue } = await loadQueue(); const cur = queue.find(x => x.st === 'started') || state.find(x => x.st === 'broken') || queue[0]; if (!cur) { console.log('nothing to sketch'); process.exit(0); } arg = cur.s.id; }
  if (!existsSync(`slots/${arg}.json`)) { console.error(`no slot "${arg}"`); process.exit(1); }
  const s = load(arg);
  if (!s.sketch) { console.log(`${arg} has no sketch yet.`); process.exit(0); }
  const out = await renderSketch(s);
  // Brief first, then the sketch placed on the real canvas, so you read what it
  // is before you look at what it looks like.
  printSlot(s, classes, { grid: compose(s) });
  console.log(`\n  ${out}   a picture of the brief, never commit it`);
  if (!process.argv.includes('--no-open')) openFile(out);
}
