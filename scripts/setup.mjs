/**
 * One-time setup on a new machine. Safe to re-run.
 * Run: npm run setup
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ok = s => console.log('  ok   ' + s), warn = s => console.log('  !!   ' + s);
console.log('todoFarm assets setup\n');

// 1. git hooks: validate art and refresh the README on every commit
execSync('git config core.hooksPath .githooks');
ok('git hooks enabled (core.hooksPath = .githooks)');

// 2. Aseprite: drop the master palette into its presets so it is in the dropdown
const p = process.platform;
const dir = p === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Aseprite', 'palettes')
  : p === 'win32' ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'Aseprite', 'palettes')
  : join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'aseprite', 'palettes');
try {
  mkdirSync(dir, { recursive: true });
  copyFileSync('palette/resurrect-64.gpl', join(dir, 'resurrect-64.gpl'));
  ok(`Resurrect 64 installed into Aseprite presets\n       ${dir}\n       (restart Aseprite, then palette menu > presets)`);
} catch (e) { warn(`could not install the palette into Aseprite: ${e.message}\n       load palette/resurrect-64.gpl by hand instead`); }

// 3. gh is needed by `npm run done` and `npm run scaffold`'s finish check
try { execSync('gh auth status', { stdio: 'ignore' }); ok('gh is installed and signed in'); }
catch { warn('gh CLI missing or not signed in: `npm run done` will not work until it is.\n       https://cli.github.com  then  gh auth login'); }

// 4. node
const [maj] = process.versions.node.split('.').map(Number);
if (maj >= 18) ok(`node ${process.versions.node}`);
else warn(`node ${process.versions.node} is too old; the validator needs 18+`);

console.log('\nnext:  npm run scaffold');
