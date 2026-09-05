/**
 * The work queue: every slot with its real state, ranked so a beginner is
 * never handed the hardest thing first. Shared by next, scaffold and done.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { validate, loadPalette, isUntouched } from './validate.mjs';

// A flat tile is one drawing; a char sheet is sixteen that must line up.
const HARD = { tile: 1, icon: 1, ui9: 2, prop1x1: 2, prop1x2: 3, prop2x2: 3,
  prop2x3: 4, 'tile.anim': 5, crop: 5, char: 9 };

export async function loadQueue() {
  const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
  const master = existsSync('palette/resurrect-64.hex')
    ? loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8')) : null;
  const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')));

  const state = [];
  for (const s of slots) {
    const cls = classes[s.class], file = `art/${s.id}@1x.png`;
    if (!existsSync(file)) { state.push({ s, cls, st: 'todo' }); continue; }
    const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id: s.id, masterPalette: master });
    if (r.ok) state.push({ s, cls, st: 'done', r });
    else if (isUntouched(r)) state.push({ s, cls, st: 'started', r });
    else state.push({ s, cls, st: 'broken', r, why: r.blocking.map(c => `${c.label}: ${c.value}`) });
  }

  // v0 first, then easiest first, then finishing beats starting.
  const rank = x => (x.s.blocks === 'v0' ? 0 : 100) + (HARD[x.s.class] ?? 5) * 2 + (x.st === 'started' ? 0 : 1);
  const queue = state.filter(x => x.st === 'todo' || x.st === 'started').sort((a, b) => rank(a) - rank(b));
  return { classes, state, queue, master };
}
