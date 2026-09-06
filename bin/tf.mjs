#!/usr/bin/env node
/**
 * tf: the artist's command. `tf sketch`, `tf brief`, `tf scaffold`, `tf done`...
 * Works from any directory, because it cds to the repo it lives in first.
 * Installed onto PATH once per machine by `npm run setup` (npm link).
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const CMDS = {
  scaffold: 'scaffold.mjs',  brief: 'brief.mjs',   sketch: 'sketch.mjs',   watch: 'watch.mjs',
  done: 'done.mjs',          next: 'next.mjs',     check: 'validate-art.mjs', sheet: 'sheet.mjs',
  status: 'readme-status.mjs', issues: 'make-issues.mjs', placeholders: 'placeholders.mjs',
  manifest: 'build-manifest.mjs', setup: 'setup.mjs', test: 'selftest.mjs',
};
const [verb, ...rest] = process.argv.slice(2);
if (!verb || verb === 'help' || !CMDS[verb]) {
  if (verb && verb !== 'help') console.error(`tf: no such command "${verb}"\n`);
  console.log(`tf <command>\n
  scaffold [slot]   next canvas, asks first if you finished the current one
  brief    [slot]   what it is, the brief, and the sketch
  sketch   [slot]   the same, plus a PNG opened beside your editor
  watch             leave running; every save is checked
  done     [slot]   validate, close the issue, tick the tracker
  next              the ranked queue
  check             validate everything in art/
  sheet             contact sheet of all art

  status, issues, placeholders, manifest, setup, test`);
  process.exit(verb && verb !== 'help' ? 1 : 0);
}
const child = spawn(process.execPath, [join(root, 'scripts', CMDS[verb]), ...rest], { cwd: root, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 0));
