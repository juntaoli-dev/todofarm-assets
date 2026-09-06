/**
 * Minimal PNG encoder. Zero dependencies, pairs with the decoder in validate.mjs.
 *
 * Exists so the toolchain can generate placeholder art and scaffold blank
 * canvases at exactly the right size, without asking anyone to install anything.
 * Always writes PNG-32, 8-bit, non-interlaced, no ancillary chunks, which is
 * precisely what the art standard demands.
 */
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = b => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const u32 = n => new Uint8Array([n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]);
const cat = arrs => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let p = 0; for (const a of arrs) { out.set(a, p); p += a.length; }
  return out;
};
const chunk = (type, data) => {
  const t = new TextEncoder().encode(type);
  const body = cat([t, data]);
  return cat([u32(data.length), body, u32(crc32(body))]);
};

/**
 * @param {number} w
 * @param {number} h
 * @param {(x:number,y:number)=>[number,number,number,number]} paint
 * @returns {Promise<Uint8Array>} PNG bytes
 */
export async function encodePNG(w, h, paint) {
  const stride = w * 4;
  const rows = new Uint8Array(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    const o = y * (1 + stride);
    rows[o] = 0; // filter: none. Our images are tiny, so filtering buys nothing.
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = paint(x, y), p = o + 1 + x * 4;
      rows[p] = r; rows[p + 1] = g; rows[p + 2] = b; rows[p + 3] = a;
    }
  }
  const z = new Uint8Array(await new Response(
    new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate'))
  ).arrayBuffer());
  return cat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', cat([u32(w), u32(h), new Uint8Array([8, 6, 0, 0, 0])])),
    chunk('IDAT', z),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/**
 * Indexed PNG (colour type 3) with a palette baked in. Index 0 is transparent
 * (via tRNS), the rest are the master palette. Aseprite opens this already in
 * Indexed mode with these exact swatches, on any machine, with no settings.
 * @param {number[]} palette  packed 0xRRGGBB values
 * @param {(x:number,y:number)=>number} index  palette index per pixel, 0 = transparent
 */
export async function encodeIndexedPNG(w, h, palette, index) {
  const rows = new Uint8Array(h * (1 + w));
  for (let y = 0; y < h; y++) { const o = y * (1 + w); rows[o] = 0; for (let x = 0; x < w; x++) rows[o + 1 + x] = index(x, y) & 255; }
  const plte = new Uint8Array((palette.length + 1) * 3); // [0] = 0,0,0 transparent
  palette.forEach((c, i) => { plte[(i + 1) * 3] = c >> 16 & 255; plte[(i + 1) * 3 + 1] = c >> 8 & 255; plte[(i + 1) * 3 + 2] = c & 255; });
  const z = new Uint8Array(await new Response(
    new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  return cat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', cat([u32(w), u32(h), new Uint8Array([8, 3, 0, 0, 0])])),
    chunk('PLTE', plte),
    chunk('tRNS', new Uint8Array([0])),
    chunk('IDAT', z),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

/** A fully transparent RGBA canvas. */
export const blank = (w, h) => encodePNG(w, h, () => [0, 0, 0, 0]);

/** A fully transparent INDEXED canvas carrying the master palette. What you open in Aseprite to start a slot. */
export const blankIndexed = (w, h, palette) => encodeIndexedPNG(w, h, palette, () => 0);
