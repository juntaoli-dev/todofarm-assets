# todoFarm assets

The art library. Every sprite here is **hand-drawn**, by the founder or by a community artist. No AI-generated art, ever.

This repo is the source of truth for three things: what art is needed, what the rules are, and what is finished.

## For artists

1. **Find an open slot** in [`slots/`](slots/). Each one names its exact spec and what the sprite is for.
2. **Read [STANDARD.md](STANDARD.md).** It is short. The rules exist so a hundred artists produce art that looks like one game.
3. **Draw it**, then submit through the workshop, which validates your file and opens the pull request for you.

You do not need to use git. If you want to anyway, drop the PNG at `art/<slot-id>@1x.png` and open a PR.

### Your file is checked before a human sees it

Twelve rules run automatically. Six of them fail files that look completely fine in Aseprite:

| rule | why it exists |
|---|---|
| Binary alpha, no soft edges | anti-aliasing reads as blur at 3x zoom and breaks atlas bleeding |
| Transparent pixels are RGB 0,0,0 | stale colour under a transparent pixel causes coloured fringing at integer upscale |
| No embedded ICC profile | a colour profile silently shifts values between your editor and the game |
| PNG-32, colour type 6 | indexed PNG cannot carry the alpha we need |
| No `#FF00FF` | magenta is the engine's missing-asset marker and must never ship |
| Every frame drawn | a blank frame in a strip means a missing animation, not an intentional pause |

## For developers

The game **never browses this repo**. It reads [`manifest.json`](manifest.json), and a missing key means the art is not done yet.

```js
const man = await fetch(MANIFEST).then(r => r.json())
const chest = man.assets['prop1x1.chest.wooden.closed']
if (!chest) usePlaceholder()
else load(chest.url, chest.w, chest.h)
```

Fetch **one manifest and one atlas** per build. Unauthenticated `raw.githubusercontent.com` reads are capped at 60 per hour per IP, so fetching individual sprites will fail in CI.

## Commands

```bash
npm test               # 12 validator self-tests, builds PNGs by hand
npm run validate       # validate everything in art/
npm run manifest       # regenerate manifest.json, report what is outstanding
npm run manifest:check # fail if manifest.json is stale (CI uses this)
```

No dependencies. Node 18+ only, because the validator needs `DecompressionStream`.

## Why the validator parses PNG bytes instead of using a canvas

A canvas cannot do this job. Its 2D pipeline premultiplies alpha, so `getImageData` returns `0,0,0` for every transparent pixel regardless of what the file holds. A canvas-based check for stale RGB **can never fail**, which is worse than having no check at all. Colour type and embedded ICC profiles are likewise invisible to it.

So [`lib/validate.mjs`](lib/validate.mjs) walks the chunks, inflates `IDAT`, and un-filters the scanlines itself. It has no dependencies and the same file runs in the browser, in Node, and in CI.

## Layout

```
classes.json        the nine art classes and their specs
slots/              one JSON per slot: what is needed, and why
art/                approved PNGs, named <slot-id>@1x.png
manifest.json       generated. what the game reads.
lib/validate.mjs    the validator. browser, node and CI all use this one file.
scripts/            selftest, validate-art, build-manifest
```
