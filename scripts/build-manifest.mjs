/**
 * Regenerate manifest.json from slots/ and art/.
 * Only slots with an approved file appear. A missing key means the art is not done.
 * Run: node scripts/build-manifest.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { validate, canvasOf, isUntouched } from '../lib/validate.mjs';
import { loadPalette } from '../lib/validate.mjs';

const { classes, standard, tile } = JSON.parse(readFileSync('classes.json', 'utf8'));
const MASTER = existsSync('palette/resurrect-64.hex')
  ? loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8')) : null;
const check = process.argv.includes('--check');
// Placeholders let the game build before any art exists. They are flagged in
// the manifest so the game, and you, can always tell what is real.
const withPlaceholders = process.argv.includes('--with-placeholders');

const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => a.id.localeCompare(b.id));

const assets = {}, missing = [], broken = [];
for (const s of slots) {
  const cls = classes[s.class];
  if (!cls) { broken.push(`${s.id}: unknown class "${s.class}"`); continue; }
  const real = `art/${s.id}@1x.png`;
  const stand = `placeholders/${s.id}@1x.png`;
  const isPlaceholder = !existsSync(real) && withPlaceholders && existsSync(stand);
  const file = existsSync(real) ? real : isPlaceholder ? stand : null;
  if (!file) { missing.push(s); continue; }

  // Placeholders deliberately break the magenta rule, so they are not validated.
  if (!isPlaceholder) {
    const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id: s.id, masterPalette: MASTER });
    if (!r.ok) {
      if (!isUntouched(r)) broken.push(`${s.id}: ${r.blocking.map(c => c.label).join(', ')}`);
      missing.push(s); continue;
    }
  }

  const dim = canvasOf(cls);
  assets[s.id] = {
    url: `/${file}`, w: dim.w, h: dim.h, frames: cls.frames,
    anchor: cls.anchor, class: s.class,
    artist: s.artist || null, licence: s.licence || null,
    rev: s.rev || 1, bytes: statSync(file).size,
    ...(isPlaceholder ? { placeholder: true } : {}),
  };
}

// Broken art is reported but does not stop a local run: you will often have a
// half-drawn file sitting in art/. CI publishes with --strict, which does stop.
if (broken.length) {
  console.error('Not in the manifest, failing validation:');
  for (const b of broken) console.error('  ' + b);
  if (process.argv.includes('--strict')) process.exit(1);
}

const manifest = { standard, tile, generated_from: 'slots/ + art/', assets };
const json = JSON.stringify(manifest, null, 2) + '\n';

if (check) {
  const cur = existsSync('manifest.json') ? readFileSync('manifest.json', 'utf8') : '';
  if (cur !== json) { console.error('manifest.json is stale. Run: node scripts/build-manifest.mjs'); process.exit(1); }
  console.log('manifest.json is up to date');
} else {
  writeFileSync('manifest.json', json);
  const ph = Object.values(assets).filter(a => a.placeholder).length;
  console.log(`manifest.json: ${Object.keys(assets).length - ph} real, ${ph} placeholder, ${missing.length} absent`);
}

const byBlock = missing.reduce((m, s) => ((m[s.blocks] ||= []).push(s.id), m), {});
for (const k of Object.keys(byBlock).sort())
  console.log(`  ${k}: ${byBlock[k].length} outstanding`);
