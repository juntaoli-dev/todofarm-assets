/**
 * Self-test for the validator. Builds PNG bytes by hand, because a canvas
 * cannot produce the faults we most need to catch: it premultiplies alpha,
 * so it physically cannot emit a file with stale RGB under transparency.
 *
 * Run: node scripts/selftest.mjs
 */
import { validate } from '../lib/validate.mjs';
import { encodeIndexedPNG } from '../lib/png.mjs';

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const u32 = n => new Uint8Array([n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
const chunk = (type, data) => {
  const t = new TextEncoder().encode(type);
  const body = new Uint8Array(t.length + data.length);
  body.set(t); body.set(data, t.length);
  return [u32(data.length), body, u32(crc32(body))];
};
const cat = arrs => {
  const n = arrs.reduce((s, a) => s + a.length, 0), o = new Uint8Array(n);
  let p = 0; for (const a of arrs) { o.set(a, p); p += a.length; }
  return o;
};

/** paint(x,y) returns [r,g,b,a] */
async function png(w, h, paint, { color = 6, iccp = false } = {}) {
  const rows = new Uint8Array(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const o = y * (1 + w * 4); rows[o] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = paint(x, y), p = o + 1 + x * 4;
      rows[p] = r; rows[p + 1] = g; rows[p + 2] = b; rows[p + 3] = a;
    }
  }
  const z = new Uint8Array(await new Response(
    new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunk('IHDR', new Uint8Array([...u32(w), ...u32(h), 8, color, 0, 0, 0]))];
  if (iccp) parts.push(...chunk('iCCP', new Uint8Array([110, 0, 0, 120, 156, 3, 0, 0, 0, 0, 1])));
  parts.push(...chunk('IDAT', z), ...chunk('IEND', new Uint8Array(0)));
  return cat(parts);
}

const SPEC = { id: 'test', w: 16, h: 16, frames: 1, colors: 20 };
const STRIP = { id: 'strip', w: 16, h: 16, frames: 4, strip: true, colors: 16 };
const solid = (x, y) => y < 10 ? [232, 193, 112, 255] : [0, 0, 0, 0];

let pass = 0, fail = 0;
const t = async (name, bytes, spec, expectOk, expectId) => {
  const r = await validate(bytes, spec);
  const hit = expectId ? r.blocking.some(c => c.id === expectId) : true;
  const good = r.ok === expectOk && hit;
  console.log(`${good ? 'ok  ' : 'FAIL'}  ${name}` +
    (good ? '' : `\n        expected ok=${expectOk}${expectId ? ` and ${expectId}` : ''}, ` +
      `got ok=${r.ok} [${r.blocking.map(c => c.id).join(', ')}]`));
  good ? pass++ : fail++;
};

await t('a clean 16x16 passes', await png(16, 16, solid), SPEC, true);
await t('wrong canvas size is rejected', await png(24, 16, solid), SPEC, false, 'canvas.size');
await t('soft alpha is rejected',
  await png(16, 16, (x, y) => y < 10 ? [232, 193, 112, 255] : [0, 0, 0, 128]), SPEC, false, 'alpha.binary');
await t('stale RGB under transparency is rejected',
  await png(16, 16, (x, y) => y < 10 ? [232, 193, 112, 255] : [255, 0, 0, 0]), SPEC, false, 'alpha.clean');
await t('the magenta sentinel is rejected',
  await png(16, 16, (x, y) => (x === 3 && y === 3) ? [255, 0, 255, 255] : solid(x, y)), SPEC, false, 'palette.sentinel');
await t('over the colour cap is rejected',
  await png(16, 16, (x, y) => [x * 16, y * 16, (x + y) * 8, 255]), SPEC, false, 'palette.cap');
await t('a blank canvas is rejected',
  await png(16, 16, () => [0, 0, 0, 0]), SPEC, false, 'content.notBlank');
await t('an embedded ICC profile is rejected',
  await png(16, 16, solid, { iccp: true }), SPEC, false, 'png.iccp');
await t('an RGB png with no alpha channel is rejected',
  await png(16, 16, () => [232, 193, 112, 255], { color: 2 }), SPEC, false, 'png.colorType');
await t('a 4-frame strip passes',
  await png(16, 64, (x, y) => (y % 16) < 12 ? [232, 193, 112, 255] : [0, 0, 0, 0]), STRIP, true);
await t('a strip with a blank frame is rejected',
  await png(16, 64, (x, y) => y < 48 && (y % 16) < 12 ? [232, 193, 112, 255] : [0, 0, 0, 0]), STRIP, false, 'frames.allDrawn');
await t('an indexed png with a transparent index passes',
  await encodeIndexedPNG(16, 16, [0x2e222f, 0x966c6c, 0xf9c22b], (x, y) => y < 10 ? 2 : 0), SPEC, true);
await t('an indexed png with no transparent index warns but passes for opaque tiles',
  await (async () => { const b = await encodeIndexedPNG(16, 16, [0x2e222f, 0x966c6c], () => 1);
    /* strip the tRNS chunk to simulate a lost transparent colour */
    const s = Buffer.from(b); const i = s.indexOf(Buffer.from('tRNS')); const len = s.readUInt32BE(i - 4);
    return new Uint8Array(Buffer.concat([s.subarray(0, i - 4), s.subarray(i + 4 + len + 4)])); })(),
  { ...SPEC, opaque: true }, true);
await t('a non-png is rejected', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), SPEC, false, 'png.signature');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
