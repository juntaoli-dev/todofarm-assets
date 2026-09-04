/**
 * Regenerate the status table in README.md from the actual state of art/.
 * Runs in CI, so the README is never a stale promise.
 * Run: node scripts/readme-status.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { validate, canvasOf, isUntouched } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => (a.blocks === b.blocks ? a.id.localeCompare(b.id) : a.blocks < b.blocks ? -1 : 1));

const rows = [];
let done = 0, v0left = 0;
for (const s of slots) {
  const cls = classes[s.class], d = canvasOf(cls);
  const file = `art/${s.id}@1x.png`;
  let mark = '&#9744;', note = 'not started';
  if (existsSync(file)) {
    const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id: s.id });
    if (r.ok) { mark = '&#9745;'; note = `${r.palette.length}/${cls.colors} colours`; done++; }
    else if (isUntouched(r)) note = 'canvas ready, empty';
    else note = '**fix:** ' + r.blocking.map(c => c.label.toLowerCase()).join(', ');
  }
  if (s.blocks === 'v0' && mark === '&#9744;') v0left++;
  const frames = cls.frames > 1 ? (cls.strip ? `${cls.frames} stacked` : cls.grid) : '1';
  rows.push(`| ${mark} | \`${s.id}\` | **${d.w}&times;${d.h}** | ${frames} | ${cls.colors} | ${s.blocks === 'v0' ? '**yes**' : 'no' } | ${note} |`);
}

const table = [
  `**${done} of ${slots.length} drawn. ${v0left} still block the first playable build.**`,
  '',
  '| | slot | canvas | frames | max colours | blocks v0 | state |',
  '|---|---|---|---|---|---|---|',
  ...rows,
].join('\n');

const src = readFileSync('README.md', 'utf8');
const A = '<!-- STATUS:START -->', B = '<!-- STATUS:END -->';
const i = src.indexOf(A), j = src.indexOf(B);
if (i < 0 || j < 0) { console.error('README is missing the STATUS markers'); process.exit(1); }
const next = src.slice(0, i + A.length) + '\n' + table + '\n' + src.slice(j);

if (process.argv.includes('--check')) {
  if (next !== src) { console.error('README status table is stale. Run: npm run status'); process.exit(1); }
  console.log('README status table is current');
} else {
  writeFileSync('README.md', next);
  console.log(`README updated: ${done}/${slots.length} drawn, ${v0left} blocking`);
}
