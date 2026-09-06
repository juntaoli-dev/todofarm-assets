/** One place that prints a slot: header, spec, brief, note, sketch. brief and sketch both use it. */
import { canvasOf } from './validate.mjs';
const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`;
const wrap = (t, ind = '  ') => ind + t.replace(/(.{78}\s)/g, '$1\n' + ind);
export const LEGEND = '# outline   - shadow   o mid   + light   = accent   . transparent';

export function printSlot(s, classes, { grid = null } = {}) {
  const c = classes[s.class], d = canvasOf(c);
  console.log(`\n${B(s.id)}  ${s.blocks === 'v0' ? R('[blocks first playable]') : D('[v1]')}\n`);
  console.log(`  ${B(d.w + 'x' + d.h)}${c.grid ? D(`  = a 4 x 4 grid of ${c.w / 4}x${c.h / 4} cells`) : ''}`);
  console.log(`  ${c.frames > 1 ? c.frames + ' frames' + (c.strip ? ', stacked top to bottom' : '') + '  ' : ''}max ${c.colors} colours  anchor ${c.anchor}${c.opaque ? '  fully opaque' : ''}`);
  console.log(`  file  art/${s.id}@1x.png\n`);
  console.log(wrap(s.brief) + '\n');
  const rows = grid || s.sketch;
  if (rows) {
    if (s.sketchNote) console.log(wrap(s.sketchNote) + '\n');
    for (const r of rows) console.log('  ' + r.split('').join(' '));
    console.log('\n' + D('  ' + LEGEND));
  }
}
