/** Open a file with its default app. Works on macOS, Windows and Linux. */
import { execFile } from 'node:child_process';
export function openFile(path) {
  const p = process.platform;
  if (p === 'darwin') execFile('open', [path], () => {});
  else if (p === 'win32') execFile('cmd', ['/c', 'start', '""', path], { windowsHide: true }, () => {});
  else execFile('xdg-open', [path], () => {});
}
