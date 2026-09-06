/**
 * One-time setup on a new machine. Safe to re-run.
 * Run: tf setup
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { findAseprite } from '../lib/open.mjs';

const ok = s => console.log('  ok   ' + s), warn = s => console.log('  !!   ' + s);
console.log('Mayorly assets setup\n');

// 1. git hooks: validate art and refresh the README on every commit
execSync('git config core.hooksPath .githooks');
ok('git hooks enabled (core.hooksPath = .githooks)');

// 2. Aseprite: drop the master palette into its presets so it is in the dropdown
// Aseprite reads presets from <user config folder>/palettes. Same on Steam.
// ASEPRITE_USER_FOLDER overrides the location on every OS.
const p = process.platform;
const userDir = process.env.ASEPRITE_USER_FOLDER
  || (p === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'Aseprite')
  : p === 'win32' ? join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'Aseprite')
  : join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'aseprite'));
const dir = join(userDir, 'palettes');
try {
  mkdirSync(dir, { recursive: true });
  copyFileSync('palette/resurrect-64.gpl', join(dir, 'resurrect-64.gpl'));
  ok(`Resurrect 64 installed into Aseprite presets\n       ${dir}\n       (in Aseprite: palette menu > Presets, press the refresh button or F5, no restart needed)`);
} catch (e) { warn(`could not install the palette into Aseprite: ${e.message}\n       load palette/resurrect-64.gpl by hand instead`); }

// 2b. Aseprite itself, so scaffold can open files in it rather than Preview
const ase = findAseprite(); ase ? ok(`Aseprite found: ${ase}`) : warn('Aseprite not found; scaffold will open files with the default app. Set ASEPRITE=/path/to/Aseprite.app');

// 3. `tf` on PATH, so the commands are `tf sketch` from anywhere
try { execSync('npm link', { stdio: 'ignore' }); ok('`tf` is on your PATH (npm link). Try: tf brief'); }
catch { warn('npm link failed (permissions?). Fallback: add this to your shell profile:\n       alias tf="node ' + process.cwd().replace(/\\/g, '/') + '/bin/tf.mjs"'); }

// 4. gh is needed by `tf done` and `tf scaffold`'s finish check
try { execSync('gh auth status', { stdio: 'ignore' }); ok('gh is installed and signed in'); }
catch { warn('gh CLI missing or not signed in: `tf done` will not work until it is.\n       https://cli.github.com  then  gh auth login'); }

// 5. node
const [maj] = process.versions.node.split('.').map(Number);
if (maj >= 18) ok(`node ${process.versions.node}`);
else warn(`node ${process.versions.node} is too old; the validator needs 18+`);

console.log('\nnext:  tf scaffold');
