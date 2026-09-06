/**
 * Open files. openFile() uses the OS default app. openInAseprite() finds
 * Aseprite itself, because the default app for .png is usually Preview or
 * Photos, which is useless for drawing and confusing to look at.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function openFile(path) {
  const p = process.platform;
  const [cmd, args] = p === 'darwin' ? ['open', [path]]
    : p === 'win32' ? ['cmd.exe', ['/c', 'start', '', path]]
    : ['xdg-open', [path]];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

/** Where Aseprite lives on this machine, or null. ASEPRITE env var wins. */
export function findAseprite() {
  const p = process.platform, H = homedir();
  const c = process.env.ASEPRITE ? [process.env.ASEPRITE]
    : p === 'darwin' ? ['/Applications/Aseprite.app',
        join(H, 'Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app')]
    : p === 'win32' ? [join(process.env.ProgramFiles || 'C:\\Program Files', 'Aseprite', 'Aseprite.exe'),
        join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Steam', 'steamapps', 'common', 'Aseprite', 'Aseprite.exe'),
        join(H, 'AppData', 'Local', 'Programs', 'Aseprite', 'Aseprite.exe')]
    : [join(H, '.steam/steam/steamapps/common/Aseprite/aseprite'), join(H, '.local/share/Steam/steamapps/common/Aseprite/aseprite'), '/usr/bin/aseprite', '/usr/local/bin/aseprite'];
  return c.find(existsSync) || null;
}

/**
 * Open one or more files in Aseprite as tabs, LAST file active. Falls back
 * to the default app per file if Aseprite is not found.
 */
export function openInAseprite(files) {
  const app = findAseprite();
  if (!app) { files.forEach(openFile); return false; }
  const p = process.platform;
  const [cmd, args] = p === 'darwin' ? ['open', ['-a', app, ...files]] : [app, files];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return true;
}
