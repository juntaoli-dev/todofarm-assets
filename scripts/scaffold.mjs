/**
 * Create a correctly sized, empty PNG for a slot and open it.
 * Removes the single most common mistake: drawing at the wrong canvas size.
 * Run: node scripts/scaffold.mjs <slot-id> [--no-open]
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execFile } from 'child_process';
import { blank } from '../lib/png.mjs';
import { canvasOf } from '../lib/validate.mjs';

import { loadQueue } from '../lib/queue.mjs';

let id = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!id) {
  const { queue } = await loadQueue();
  if (!queue.length) { console.log('Nothing left to scaffold. Everything is drawn.'); process.exit(0); }
  id = queue[0].s.id;
  console.log(`next up: ${id}\n`);
}
if (!existsSync(`slots/${id}.json`)) {
  console.error(`no slot "${id}". Run: node scripts/next.mjs`); process.exit(1);
}
const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
const cls = classes[slot.class], { w, h } = canvasOf(cls);
const file = `art/${id}@1x.png`;

if (existsSync(file)) {
  console.log(`${file} already exists, leaving it alone.`);
} else {
  writeFileSync(file, await blank(w, h));
  console.log(`${file}  ${w}x${h}, transparent`);
  console.log(`  max ${cls.colors} colours · anchor ${cls.anchor}` +
    (cls.frames > 1 ? ` · ${cls.frames} frames ${cls.strip ? 'stacked top to bottom' : `(${cls.grid})`}` : ''));
}
console.log(`\n  ${slot.brief}\n`);
console.log('Leave `npm run watch` running and it will check every time you save.');
if (!process.argv.includes('--no-open')) execFile('open', [file], () => {});
