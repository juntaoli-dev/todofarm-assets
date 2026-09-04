/**
 * What to draw next. The only command you need to remember.
 * Run: node scripts/next.mjs [count]
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { validate, canvasOf, isUntouched } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const want = Number(process.argv[2]) || 3;
const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`, Y = s => `\x1b[33m${s}\x1b[0m`;

const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')));

const state = [];
for (const s of slots) {
  const file = `art/${s.id}@1x.png`;
  if (!existsSync(file)) { state.push({ s, st: 'todo' }); continue; }
  const r = await validate(new Uint8Array(readFileSync(file)), { ...classes[s.class], id: s.id });
  if (r.ok) state.push({ s, st: 'done' });
  else if (isUntouched(r)) state.push({ s, st: 'started' });
  else state.push({ s, st: 'broken', why: r.blocking.map(c => `${c.label}: ${c.value}`) });
}

const n = k => state.filter(x => x.st === k).length;
const v0left = state.filter(x => x.s.blocks === 'v0' && x.st !== 'done').length;
console.log(`\n${B('todoFarm art')}   ${G(n('done') + ' done')}  ${Y(n('started') + ' started')}  ` +
  `${n('todo')} todo  ${n('broken') ? R(n('broken') + ' broken') : ''}`);
console.log(D(`${v0left} of 12 first-playable slots still outstanding\n`));

const broken = state.filter(x => x.st === 'broken');
if (broken.length) {
  console.log(R('Fix these first:'));
  for (const b of broken) {
    console.log(`  ${B(b.s.id)}`);
    for (const w of b.why) console.log(D(`    ${w}`));
  }
  console.log();
}

// v0 before v1, started before untouched: finishing something beats starting something.
const rank = x => (x.s.blocks === 'v0' ? 0 : 10) + (x.st === 'started' ? 0 : 1);
const queue = state.filter(x => x.st === 'todo' || x.st === 'started').sort((a, b) => rank(a) - rank(b));

if (!queue.length) { console.log(G('Everything is drawn. Tag a release: git tag assets-v1 && git push --tags\n')); process.exit(0); }

console.log(B(`Next ${Math.min(want, queue.length)}:\n`));
for (const { s, st } of queue.slice(0, want)) {
  const c = classes[s.class], d = canvasOf(c);
  console.log(`${B(s.id)}  ${s.blocks === 'v0' ? R('[blocks first playable]') : D('[v1]')}` +
    (st === 'started' ? Y('  [started]') : ''));
  console.log(`  ${B(d.w + 'x' + d.h)}  ${c.frames > 1 ? c.frames + ' frames' + (c.strip ? ', stacked top to bottom' : ', ' + c.grid) + '  ' : ''}` +
    `max ${c.colors} colours  anchor ${c.anchor}`);
  console.log(D('  ' + s.brief.replace(/(.{78}\s)/g, '$1\n  ')));
  console.log(D(`  npm run scaffold ${s.id}\n`));
}
