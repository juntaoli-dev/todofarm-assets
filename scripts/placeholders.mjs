/**
 * Generate placeholder art for every slot that has none, so the game can be
 * built and played before a single sprite is drawn.
 *
 * They are magenta and black checkerboards on purpose. A plausible grey box is
 * the worst possible placeholder: it looks deliberate, so it ships. Magenta is
 * impossible to mistake for finished art, which is exactly why the art standard
 * forbids #FF00FF in real submissions.
 *
 * Output goes to placeholders/, which is gitignored. Real art in art/ always wins.
 *
 * Run: node scripts/placeholders.mjs
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { encodePNG } from '../lib/png.mjs';
import { canvasOf } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')));

rmSync('placeholders', { recursive: true, force: true });
mkdirSync('placeholders', { recursive: true });

const MAGENTA = [255, 0, 255, 255], BLACK = [26, 16, 26, 255];

let made = 0, skipped = 0;
for (const s of slots) {
  if (existsSync(`art/${s.id}@1x.png`)) { skipped++; continue; }
  const cls = classes[s.class];
  if (!cls) continue;
  const { w, h } = canvasOf(cls);
  const fh = cls.strip ? h / cls.frames : h;

  const png = await encodePNG(w, h, (x, y) => {
    const frame = Math.floor(y / fh), fy = y % fh;
    // Every frame gets a different phase so "no blank frames" holds and so an
    // animating placeholder visibly animates, proving the strip is wired up.
    const on = (Math.floor((x + frame) / 4) + Math.floor(fy / 4)) % 2 === 0;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    if (edge) return BLACK;
    return on ? MAGENTA : BLACK;
  });
  writeFileSync(`placeholders/${s.id}@1x.png`, png);
  made++;
}
console.log(`${made} placeholders written to placeholders/  (${skipped} slots already have real art)`);
if (made) console.log('The game can be built now. Every magenta square is a slot waiting for you.');
