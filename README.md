# todoFarm assets

The art library. Every sprite here is **hand-drawn**, by the founder or by a community artist. No AI-generated art, ever.

This repo is the source of truth for three things: what art is needed, what the rules are, and what is finished.

## You are the only artist right now

Four commands. You do not need the rest of this file.

```bash
npm run next        # what to draw, in priority order, with the exact spec
npm run scaffold <slot-id>   # makes a correctly sized empty PNG and opens it
npm run watch       # leave running beside Aseprite. every save gets checked.
npm run sheet       # contact sheet of everything, to catch style drift
```

The loop is: `next` tells you what and what size, `scaffold` makes the canvas so you cannot get the size wrong, `watch` tells you the moment a save breaks a rule.

```
11:32:47  ....  icon.coin   empty canvas, waiting for you
11:32:48  PASS  icon.coin   2/12 colours
11:33:02  FAIL  icon.coin
          x Canvas is exactly 16x16   20x16
          x Colours within the cap of 12   320 used
```

### The game already runs, on placeholders

```bash
npm run placeholders   # magenta checkerboards for every undrawn slot
npm run manifest       # a full manifest, so the game builds today
```

Every magenta square in the game is a slot waiting for you. They are magenta on purpose: a plausible grey box looks deliberate and ships by accident, which is the same reason `#FF00FF` is a **rejected** colour in real art. Placeholders are gitignored and real art in `art/` always wins.

So you never have to draw ahead of the code, or code ahead of the drawing.

### When you commit

```bash
npm run check          # validate everything
git add art/ && git commit && git push
git tag assets-v1 && git push --tags   # publishes a Release the game can fetch
```

## For other artists, later

The [`workshop/`](../workshop) repo is a web app that lets someone without repo access claim a slot, drop a PNG, and have a pull request opened for them. It is built and working, and it is **switched off** until someone actually wants to contribute, because for a solo artist with write access it is pure overhead.

Turn it on when the answer to "does anyone else want to draw for this?" becomes yes.

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
