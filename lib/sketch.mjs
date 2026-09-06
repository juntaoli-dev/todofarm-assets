/** Place a slot's ASCII sketch on its full canvas and render it. Shared by tf sketch and tf scaffold. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePNG } from './png.mjs';
import { canvasOf } from './validate.mjs';

// Neutral ramp from Resurrect 64, so a sketch is obviously a sketch and still on palette.
const INK = { '#': [0x2e,0x22,0x2f], '-': [0x62,0x55,0x65], 'o': [0x96,0x6c,0x6c],
              '+': [0xab,0x94,0x7a], '=': [0xf9,0xc2,0x2b] };

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
  const png = await encodePNG(w, h, (x, y) => { const c = INK[grid[y][x]]; return c ? [...c, 255] : [0, 0, 0, 0]; });
  mkdirSync('sketches', { recursive: true });
  const out = `sketches/${slot.id}.sketch.png`; writeFileSync(out, png); return out;
}
