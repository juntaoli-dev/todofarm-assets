#!/usr/bin/env node
/**
 * fuck <message words>     git add -A && git commit -m "<message words>"
 * fuck -p <message words>  ...and git push
 * Runs in whatever repo you are standing in. No quotes needed.
 */
import { spawnSync } from 'node:child_process';
let args = process.argv.slice(2);
const push = args[0] === '-p' || args[0] === '--push';
if (push) args = args.slice(1);
const msg = args.join(' ').trim();
if (!msg) { console.error('fuck <message>   (add -A, commit)\nfuck -p <message>   (…and push)'); process.exit(1); }
const git = (...a) => spawnSync('git', a, { stdio: 'inherit' }).status ?? 1;
if (git('add', '-A')) process.exit(1);
if (git('commit', '-m', msg)) process.exit(1);
if (push && git('push')) process.exit(1);
