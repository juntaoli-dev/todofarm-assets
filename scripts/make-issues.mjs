/**
 * Create one GitHub issue per slot, plus a tracking issue whose checklist
 * ticks itself as each slot issue closes.
 *
 * A task list in a README renders as checkboxes but is NOT clickable. Only
 * issues, pull requests and discussions have working checkboxes, which is why
 * the tickable list lives here rather than in the README.
 *
 * Idempotent: re-running skips slots that already have an issue.
 * Run: node scripts/make-issues.mjs [--dry]
 */
import { readFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { canvasOf } from '../lib/validate.mjs';

const dry = process.argv.includes('--dry');
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8' }).trim();
const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => (a.blocks === b.blocks ? a.id.localeCompare(b.id) : a.blocks < b.blocks ? -1 : 1));

const existing = new Map(
  JSON.parse(gh('issue', 'list', '--state', 'all', '--limit', '200', '--json', 'number,title'))
    .map(i => [i.title, i.number]));

for (const name of ['v0', 'v1', 'art']) {
  try { gh('label', 'create', name, '--force', '--color',
    name === 'v0' ? 'B60205' : name === 'v1' ? 'C5DEF5' : 'FBCA04'); } catch {}
}

const made = [];
for (const s of slots) {
  const cls = classes[s.class], d = canvasOf(cls);
  const title = `${s.id}`;
  if (existing.has(title)) { made.push({ s, n: existing.get(title) }); continue; }

  const body = [
    s.brief, '',
    '### Spec', '',
    `| | |`, `|---|---|`,
    `| canvas | **${d.w} × ${d.h} px**, exactly |`,
    `| frames | ${cls.frames}${cls.strip ? ', stacked top to bottom' : cls.grid ? ` (${cls.grid})` : ''} |`,
    `| max colours | ${cls.colors} |`,
    `| anchor | ${cls.anchor} |`,
    `| format | PNG-32, binary alpha, no ICC profile |`,
    `| save as | \`art/${s.id}@1x.png\` |`,
    '',
    '### To do this one', '',
    '```bash',
    `npm run scaffold ${s.id}   # makes the canvas at the right size and opens it`,
    'npm run watch              # leave running; every save gets checked',
    '```',
    '',
    'Close this issue when `npm run watch` says **PASS** and the file is committed.',
  ].join('\n');

  if (dry) { console.log(`would create: ${title}`); continue; }
  const url = gh('issue', 'create', '--title', title, '--body', body,
    '--label', 'art', '--label', s.blocks);
  const n = Number(url.split('/').pop());
  made.push({ s, n });
  console.log(`#${n}  ${title}`);
}

if (dry) process.exit(0);

const list = b => made.filter(m => m.s.blocks === b).map(m => `- [ ] #${m.n} — ${m.s.brief.split('.')[0]}.`).join('\n');
const trackTitle = 'First playable: the 12 sprites that block everything';
const trackBody = [
  'These tick themselves as each issue closes. Nothing else is needed to get a playable build,',
  'and the game already runs on magenta placeholders until then.', '',
  '## Blocks the first playable build', '', list('v0'), '',
  '## After that', '', list('v1'), '',
  '---', '',
  'Start with `npm run next`, which always tells you what to draw and at what size.',
].join('\n');

if (existing.has(trackTitle)) {
  gh('issue', 'edit', String(existing.get(trackTitle)), '--body', trackBody);
  console.log(`\nupdated tracking issue #${existing.get(trackTitle)}`);
} else {
  const url = gh('issue', 'create', '--title', trackTitle, '--body', trackBody, '--label', 'art');
  console.log(`\ntracking issue: ${url}`);
  // gh has no --pin flag; pinning is a GraphQL mutation.
  try {
    const num = Number(url.split('/').pop());
    const id = gh('api', `repos/{owner}/{repo}/issues/${num}`, '--jq', '.node_id');
    gh('api', 'graphql', '-f', 'query=mutation($id:ID!){pinIssue(input:{issueId:$id}){issue{number}}}', '-f', `id=${id}`);
    console.log('pinned');
  } catch { console.log('(could not pin, not important)'); }
}
