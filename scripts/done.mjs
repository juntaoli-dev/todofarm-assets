/**
 * Mark a slot finished: validate it, close its issue, refresh the tracker.
 * Run: npm run done [slot-id]      (no id: the one passing file with an open issue)
 * Also imported by scaffold, which asks "did you finish X?" before moving on.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validate, loadPalette, summarise } from '../lib/validate.mjs';
import { loadQueue } from '../lib/queue.mjs';

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Titles of open issues. Throws if gh is missing or offline. */
export async function openIssues() {
  return new Set(JSON.parse(gh('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'title')).map(i => i.title));
}

/** Validate, close the issue, refresh the tracker. Returns true if it closed something. */
export async function finish(id) {
  const file = `art/${id}@1x.png`;
  if (!existsSync(`slots/${id}.json`)) throw new Error(`no slot "${id}"`);
  if (!existsSync(file)) throw new Error(`${file} does not exist yet`);
  const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
  const slot = JSON.parse(readFileSync(`slots/${id}.json`, 'utf8'));
  const master = existsSync('palette/resurrect-64.hex') ? loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8')) : null;
  const r = await validate(new Uint8Array(readFileSync(file)), { ...classes[slot.class], id, masterPalette: master });
  console.log(summarise(r, file));
  if (!r.ok) { console.error('\nNot closing the issue while it still fails.'); return false; }

  const issue = JSON.parse(gh('issue', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title')).find(i => i.title === id);
  if (!issue) { console.log(`No open issue titled "${id}", nothing to close.`); return false; }
  const note = `Drawn and passing. ${r.palette.length} colours${r.warnings.length ? `, ${r.warnings.length} advisory` : ', all on palette'}.`;
  gh('issue', 'close', String(issue.number), '-c', note);
  console.log(`closed #${issue.number}`);
  execFileSync('node', ['scripts/make-issues.mjs'], { stdio: 'inherit' });
  return true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let id = process.argv[2];
  if (!id) {
    const { state } = await loadQueue();
    let open; try { open = await openIssues(); } catch (e) { console.error('cannot reach GitHub: ' + e.message.split('\n')[0]); process.exit(1); }
    const ready = state.filter(x => x.st === 'done' && open.has(x.s.id)).map(x => x.s.id);
    if (!ready.length) { console.log('Nothing passing with an open issue. Draw something first.'); process.exit(0); }
    if (ready.length > 1) { console.log('More than one finished slot. Say which:\n' + ready.map(r => `  npm run done ${r}`).join('\n')); process.exit(1); }
    id = ready[0]; console.log(`finishing: ${id}\n`);
  }
  process.exit((await finish(id)) ? 0 : 1);
}
