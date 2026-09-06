/** Place a slot's ASCII sketch on its full canvas and render it. Shared by tf sketch and tf scaffold. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodeIndexedPNG } from './png.mjs';
import { canvasOf, loadPalette } from './validate.mjs';
import { readFileSync } from 'node:fs';

// Neutral ramp, all five are Resurrect 64 colours. The sketch PNG is INDEXED with
// the full master palette baked in, exactly like a scaffold, so opening the
// reference in Aseprite shows the same 65 swatches as the canvas.
const INK = { '#': 0x2e222f, '-': 0x625565, 'o': 0x966c6c, '+': 0xab947a, '=': 0xf9c22b };
const MASTER = [...loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8'))];
const IDX = Object.fromEntries(Object.entries(INK).map(([ch, rgb]) => [ch, MASTER.indexOf(rgb) + 1])); // +1: index 0 is transparent
for (const [ch, i] of Object.entries(IDX)) if (i === 0) throw new Error(`sketch ink ${ch} is not in the master palette`);

export function compose(slot, classes) {
  const cls = classes[slot.class], { w, h } = canvasOf(cls);
  const rows = slot.sketch; if (!rows) return null;
  const sw = rows[0].length, sh = rows.length;
  const grid = Array.from({ length: h }, () => '.'.repeat(w).split(''));
  const stamp = (ox, oy) => { for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) if (rows[y][x] !== '.') grid[oy + y][ox + x] = rows[y][x]; };
  if (sw === w && sh === h) stamp(0, 0);
  else if (cls.grid && sw === w / 4 && sh === h / 4) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) stamp(c * sw, r * sh); }
  else if (cls.strip && sw === w && sh === cls.h) { for (let f = 0; f < cls.frames; f++) stamp(0, f * sh); }
  else if (slot.class.startsWith('prop')) stamp(Math.floor((w - sw) / 2), h - sh);
  else stamp(Math.floor((w - sw) / 2), Math.floor((h - sh) / 2));
  return grid.map(r => r.join(''));
}

export async function renderSketch(slot, classes) {
  const grid = compose(slot, classes); if (!grid) return null;
  const w = grid[0].length, h = grid.length;
  const png = await encodeIndexedPNG(w, h, MASTER, (x, y) => IDX[grid[y][x]] || 0);
  mkdirSync('sketches', { recursive: true });
  const out = `sketches/${slot.id}.sketch.png`; writeFileSync(out, png); return out;
}
