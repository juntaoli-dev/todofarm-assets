/**
 * Open a file with its default app. Works on macOS, Windows and Linux.
 *
 * Windows: `start` needs a window-title argument first. Pass an EMPTY string,
 * not '""': libuv quotes an empty arg as "" for you, and a literal '""' gets
 * escaped into \"\" which start then treats as the file. Detach and unref so
 * the parent exits without waiting. explorer.exe is not an option: it always
 * exits 1, so every Node call reports failure.
 */
import { spawn } from 'node:child_process';
export function openFile(path) {
  const p = process.platform;
  const [cmd, args] = p === 'darwin' ? ['open', [path]]
    : p === 'win32' ? ['cmd.exe', ['/c', 'start', '', path]]
    : ['xdg-open', [path]];
  spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}
