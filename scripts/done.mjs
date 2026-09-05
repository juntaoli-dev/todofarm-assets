/**
 * Mark a slot finished: validate it, close its issue, refresh the tracker.
 * Run: node scripts/done.mjs <slot-id>
 */
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { validate, loadPalette, summarise } from '../lib/validate.mjs';

import { loadQueue } from '../lib/queue.mjs';

let id = process.argv[2];
if (!id) {
  const { state } = await loadQueue();
  const gh0 = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
  const open = new Set(JSON.parse(gh0('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'title')).map(i => i.title));
  const ready = state.filter(x => x.st === 'done' && open.has(x.s.id)).map(x => x.s.id);
  if (ready.length === 0) { console.log('Nothing passing with an open issue. Draw something first.'); process.exit(0); }
  if (ready.length > 1) {
    console.log('More than one finished slot. Say which:\n' + ready.map(r => `  npm run done ${r}`).join('\n'));
    process.exit(1);
  }
  id = ready[0];
  console.log(`finishing: ${id}\n`);
}
const file = `art/${id}@1x.png`;
if (!existsSync(`slots/${id}.json`)) { console.error(`no slot "${id}"`); process.exit(1); }
if (!existsSync(file)) { console.error(`${file} does not exist yet`); process.exit(1); }

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
const MASTER = existsSync('palette/resurrect-64.hex')
  ? loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8')) : null;

const r = await validate(new Uint8Array(readFileSync(file)), { ...classes[slot.class], id, masterPalette: MASTER });
console.log(summarise(r, file));
if (!r.ok) { console.error('\nNot closing the issue while it still fails.'); process.exit(1); }

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
const issue = JSON.parse(gh('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title'))
  .find(i => i.title === id);
if (!issue) { console.log(`\nNo open issue titled "${id}", nothing to close.`); process.exit(0); }

const note = `Drawn and passing. ${r.palette.length} colours${r.warnings.length ? `, ${r.warnings.length} advisory` : ', all on palette'}.`;
gh('issue', 'close', String(issue.number), '-c', note);
console.log(`\nclosed #${issue.number}`);
execFileSync('node', ['scripts/make-issues.mjs'], { stdio: 'inherit' });
