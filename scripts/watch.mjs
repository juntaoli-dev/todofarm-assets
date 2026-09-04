/**
 * Watch art/ and validate on every save. Leave this running in a terminal
 * beside Aseprite; save, glance, keep drawing.
 *
 * Editors save atomically: write a temp file, then rename over the target. A
 * naive watcher therefore sees a delete followed by a create, fires twice, and
 * can read the file mid-write. So: debounce, then retry a short read until the
 * bytes stop changing.
 *
 * Run: node scripts/watch.mjs
 */
import { readFileSync, readdirSync, existsSync, watch, statSync } from 'fs';
import { basename } from 'path';
import { validate, canvasOf, isUntouched } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const B = s => `\x1b[1m${s}\x1b[0m`, D = s => `\x1b[2m${s}\x1b[0m`;
const G = s => `\x1b[32m${s}\x1b[0m`, R = s => `\x1b[31m${s}\x1b[0m`, Y = s => `\x1b[33m${s}\x1b[0m`;
const time = () => D(new Date().toTimeString().slice(0, 8));

/** Read once the file has stopped growing, so we never parse a half-written PNG. */
async function settled(file, tries = 12) {
  let last = -1;
  for (let i = 0; i < tries; i++) {
    if (!existsSync(file)) { await new Promise(r => setTimeout(r, 40)); continue; }
    const size = statSync(file).size;
    if (size > 0 && size === last) return readFileSync(file);
    last = size;
    await new Promise(r => setTimeout(r, 40));
  }
  return existsSync(file) ? readFileSync(file) : null;
}

async function check(file) {
  const id = basename(file).replace(/@1x\.png$/, '');
  if (basename(file).startsWith('.')) return; // editor temp file, mid atomic save
  if (!existsSync(`slots/${id}.json`)) {
    console.log(`${time()} ${R('?')} ${B(basename(file))}  no slot with id "${id}"`);
    return;
  }
  const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
  const cls = classes[slot.class];
  const bytes = await settled(file);
  if (!bytes) return;

  const r = await validate(new Uint8Array(bytes), { ...cls, id });
  if (r.ok) {
    const warn = r.warnings.length ? Y(`  ${r.warnings.length} advisory`) : '';
    const cols = r.palette ? D(`  ${r.palette.length}/${cls.colors} colours`) : '';
    console.log(`${time()} ${G('PASS')} ${B(id)}${cols}${warn}`);
  } else if (isUntouched(r)) {
    console.log(`${time()} ${D('....')} ${B(id)}  ${D('empty canvas, waiting for you')}`);
  } else {
    console.log(`${time()} ${R('FAIL')} ${B(id)}`);
    for (const c of r.blocking) console.log(`        ${R('x')} ${c.label}  ${D(c.value)}`);
  }
}

const pending = new Map();
const bounce = file => {
  clearTimeout(pending.get(file));
  pending.set(file, setTimeout(() => { pending.delete(file); check(file); }, 120));
};

const todo = readdirSync('slots').filter(f => f.endsWith('.json')).length;
const have = existsSync('art') ? readdirSync('art').filter(f => f.endsWith('.png')).length : 0;
console.log(`\n${B('watching art/')}   ${have} files, ${todo} slots`);
console.log(D('save from Aseprite and the result appears here. ctrl-c to stop.\n'));

for (const f of readdirSync('art').filter(f => f.endsWith('.png') && !f.startsWith('.')))
  await check(`art/${f}`);

watch('art', (_evt, name) => {
  if (name && name.endsWith('.png') && !name.startsWith('.')) bounce(`art/${name}`);
});
