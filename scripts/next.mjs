/**
 * What to draw next. The only command you need to remember.
 * Run: node scripts/next.mjs [count]
 */
import { canvasOf } from '../lib/validate.mjs';
import { loadQueue } from '../lib/queue.mjs';

const want = Number(process.argv[2]) || 3;
const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`, Y = s => `\x1b[33m${s}\x1b[0m`;

const { classes, state, queue } = await loadQueue();

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


if (!queue.length) { console.log(G('Everything is drawn. Tag a release: git tag assets-v1 && git push --tags\n')); process.exit(0); }

console.log(B(`Next ${Math.min(want, queue.length)}:`));
console.log(D('easiest first. a character sheet is 16 drawings that have to line up, so it is not where to begin.\n'));
for (const { s, st } of queue.slice(0, want)) {
  const c = classes[s.class], d = canvasOf(c);
  console.log(`${B(s.id)}  ${s.blocks === 'v0' ? R('[blocks first playable]') : D('[v1]')}` +
    (st === 'started' ? Y('  [started]') : ''));
  const cell = c.grid ? `  ${D(`= a ${c.grid.replace(' dirs x ', ' x ')} grid of ${c.w / 4}x${c.h / 4} cells`)}` : '';
  console.log(`  ${B(d.w + 'x' + d.h)}${cell}`);
  console.log(`  ${c.frames > 1 ? c.frames + ' frames' + (c.strip ? ', stacked top to bottom' : '') + '  ' : ''}` +
    `max ${c.colors} colours  anchor ${c.anchor}`);
  console.log(D('  ' + s.brief.replace(/(.{78}\s)/g, '$1\n  ')));
  console.log(D(`  npm run scaffold${queue[0]?.s.id === s.id ? '' : ' ' + s.id}\n`));
}
