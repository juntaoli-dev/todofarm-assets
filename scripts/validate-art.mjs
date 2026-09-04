/**
 * Validate art files against their slot spec.
 * Run: node scripts/validate-art.mjs [file ...]     (no args = every file in art/)
 * Exits non-zero on any blocking failure. Used by CI and by the workshop API.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { basename } from 'path';
import { validate, summarise } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const files = process.argv.slice(2).length
  ? process.argv.slice(2).filter(f => f.endsWith('.png'))
  : readdirSync('art').filter(f => f.endsWith('.png')).map(f => `art/${f}`);

if (!files.length) { console.log('nothing to validate'); process.exit(0); }

let bad = 0;
for (const file of files) {
  const id = basename(file).replace(/@1x\.png$/, '');
  const slotFile = `slots/${id}.json`;
  if (!existsSync(slotFile)) {
    console.log(`FAIL  ${file}\n        - no slot exists with id "${id}"`);
    bad++; continue;
  }
  const slot = JSON.parse(readFileSync(slotFile, 'utf8'));
  const cls = classes[slot.class];
  if (!cls) { console.log(`FAIL  ${file}\n        - unknown class "${slot.class}"`); bad++; continue; }

  const r = await validate(new Uint8Array(readFileSync(file)), { ...cls, id });
  console.log(summarise(r, file));
  if (!r.ok) bad++;
}
console.log(`\n${files.length - bad} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
