/**
 * Build a contact sheet of every slot, real art and placeholders side by side.
 * A solo artist has no art director, so the substitute is seeing everything at
 * once: style drift is obvious on a contact sheet and invisible file by file.
 *
 * Run: tf sheet        (opens sheet.html with your default browser)
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { validate, canvasOf, isUntouched } from '../lib/validate.mjs';
import { openFile } from '../lib/open.mjs';
import { loadPalette } from '../lib/validate.mjs';

const { classes } = JSON.parse(readFileSync('classes.json', 'utf8'));
const MASTER = existsSync('palette/resurrect-64.hex')
  ? loadPalette(readFileSync('palette/resurrect-64.hex', 'utf8')) : null;
const slots = readdirSync('slots').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(readFileSync(`slots/${f}`, 'utf8')))
  .sort((a, b) => a.class.localeCompare(b.class) || a.id.localeCompare(b.id));

const cards = [];
for (const s of slots) {
  const cls = classes[s.class], d = canvasOf(cls);
  const real = `art/${s.id}@1x.png`, ph = `placeholders/${s.id}@1x.png`;
  const file = existsSync(real) ? real : existsSync(ph) ? ph : null;
  let state = 'missing', note = 'not started';
  if (existsSync(real)) {
    const r = await validate(new Uint8Array(readFileSync(real)), { ...cls, id: s.id, masterPalette: MASTER });
    if (r.ok) { state = 'ok'; note = `${r.palette.length}/${cls.colors} colours`; }
    else if (isUntouched(r)) { state = 'wip'; note = 'empty canvas'; }
    else { state = 'bad'; note = r.blocking.map(c => c.label).join(' · '); }
  } else if (file) { state = 'ph'; note = 'placeholder'; }

  const zoom = Math.max(1, Math.min(6, Math.floor(96 / Math.max(d.w, d.h))));
  cards.push(`<figure class="${state}">
    <div class="pv" style="height:${Math.max(d.h * zoom, 64)}px">${file
      ? `<img src="${file}" width="${d.w * zoom}" height="${d.h * zoom}" alt="${s.id}">` : '<span>—</span>'}</div>
    <figcaption><b>${s.id}</b><span>${d.w}x${d.h} · ${note}</span>
      ${s.blocks === 'v0' ? '<em>blocks first playable</em>' : ''}</figcaption>
  </figure>`);
}

writeFileSync('sheet.html', `<!doctype html><meta charset="utf-8"><title>todoFarm contact sheet</title>
<style>
:root{--bg:#14110E;--pan:#1C1815;--line:#3A332B;--tx:#EDE4D6;--tx2:#A89C88;--tx3:#71685A;
  --ok:#7FB85C;--bad:#D4614A;--warn:#DE9640;--ph:#B08BD8}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--tx);margin:0;padding:26px;
  font:14px/1.5 'IBM Plex Sans',system-ui,sans-serif}
h1{font:600 17px/1.3 ui-monospace,monospace;margin:0 0 4px}
p{color:var(--tx3);margin:0 0 22px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
figure{margin:0;background:var(--pan);border:1px solid var(--line);border-top:3px solid var(--line)}
figure.ok{border-top-color:var(--ok)} figure.bad{border-top-color:var(--bad)}
figure.wip{border-top-color:var(--warn)} figure.ph{border-top-color:var(--ph)}
.pv{display:grid;place-items:center;padding:12px;
  background:repeating-conic-gradient(#2b2620 0 25%,#221e19 0 50%) 50%/14px 14px}
.pv span{color:var(--tx3)}
img{image-rendering:pixelated;display:block}
figcaption{padding:8px 10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:3px}
figcaption b{font:500 11.5px/1.3 ui-monospace,monospace;word-break:break-all}
figcaption span{color:var(--tx3);font-size:11px}
figcaption em{color:var(--bad);font-style:normal;font-size:10px;letter-spacing:.4px;text-transform:uppercase}
</style>
<h1>todoFarm contact sheet</h1>
<p>Green is done, orange started, red failing, purple placeholder. Style drift is obvious here and invisible file by file.</p>
<div class="grid">${cards.join('')}</div>`);
console.log(`sheet.html  ${slots.length} slots`);
if (!process.argv.includes('--no-open')) openFile('sheet.html');
