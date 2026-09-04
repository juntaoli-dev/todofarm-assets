/**
 * Regenerate manifest.json from slots/ and art/.
 * Only slots with an approved file appear. A missing key means the art is not done.
 * Run: node scripts/build-manifest.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { validate, canvasOf } from '../lib/validate.mjs';

const { classes, standard, tile } = JSON.parse(readFileSync('classes.json', 'utf8'));
const check = process.argv.includes('--check');

const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => a.id.localeCompare(b.id));

const assets = {}, missing = [], broken = [];
for (const s of slots) {
  const cls = classes[s.class];
  if (!cls) { broken.push(`${s.id}: unknown class "${s.class}"`); continue; }
  const file = `art/${s.id}@1x.png`;
  if (!existsSync(file)) { missing.push(s); continue; }

  const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id: s.id });
  if (!r.ok) { broken.push(`${s.id}: ${r.blocking.map(c => c.label).join(', ')}`); continue; }

  const dim = canvasOf(cls);
  assets[s.id] = {
    url: `/${file}`, w: dim.w, h: dim.h, frames: cls.frames,
    anchor: cls.anchor, class: s.class,
    artist: s.artist || null, licence: s.licence || null,
    rev: s.rev || 1, bytes: statSync(file).size,
  };
}

if (broken.length) {
  console.error('Approved art failing validation:\n' + broken.map(b => '  ' + b).join('\n'));
  process.exit(1);
}

const manifest = { standard, tile, generated_from: 'slots/ + art/', assets };
const json = JSON.stringify(manifest, null, 2) + '\n';

if (check) {
  const cur = existsSync('manifest.json') ? readFileSync('manifest.json', 'utf8') : '';
  if (cur !== json) { console.error('manifest.json is stale. Run: node scripts/build-manifest.mjs'); process.exit(1); }
  console.log('manifest.json is up to date');
} else {
  writeFileSync('manifest.json', json);
  console.log(`manifest.json: ${Object.keys(assets).length} approved, ${missing.length} still open`);
}

const byBlock = missing.reduce((m, s) => ((m[s.blocks] ||= []).push(s.id), m), {});
for (const k of Object.keys(byBlock).sort())
  console.log(`  ${k}: ${byBlock[k].length} outstanding`);
