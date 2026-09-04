# todoFarm assets

The art library for **todoFarm**, a todo list you walk around in. You dump a task, a silent classifier files it into a chest, and a craftsman turns what you finish into things that decorate your farm.

Every sprite here is **hand-drawn**. No AI-generated art, ever.

---

## Where art goes

**One folder: [`art/`](art/)**

**One filename: `<slot-id>@1x.png`**

So the closed wooden chest is exactly this path, no other:

```
art/prop1x1.chest.wooden.closed@1x.png
```

The name is not decoration. The tooling matches the filename against `slots/<slot-id>.json` to find the spec it should be checked against. A file named `chest.png` validates against nothing and is ignored.

## What format

**PNG. Only PNG.** JPG is rejected on sight, because it cannot hold a real alpha channel and it destroys hard pixel edges.

| rule | what it means when you are drawing |
|---|---|
| **PNG-32** | RGBA, 8 bits per channel. Not indexed, not greyscale. Just export as PNG. |
| **Binary alpha** | Every pixel is either fully solid or fully see-through. **Turn anti-aliasing off.** Soft edges look blurry once the game scales the sprite up 3&times;. |
| **Exact canvas** | Not "about 16 wide". Exactly the size the slot says. `npm run scaffold` makes the canvas for you so you cannot get this wrong. |
| **Colour cap** | Between 8 and 24 colours depending on the slot. This is a feature, not a restriction, and it is most of what makes pixel art look professional. |
| **Transparent means empty** | Erase properly. Do not paint white behind a sprite. |
| **No `#FF00FF` magenta** | That exact pink is reserved as the "art is missing" marker. |
| **No colour profile** | Do not tick "embed colour profile" on export. It shifts your colours between your editor and the game. |

You do not have to memorise any of this. `npm run watch` tells you the moment you break one.

---

## What to draw

<!-- STATUS:START -->
**0 of 20 drawn. 12 still block the first playable build.**

| | slot | canvas | frames | max colours | blocks v0 | state |
|---|---|---|---|---|---|---|
| &#9744; | `char.craftsman.walk` | **64&times;64** | 4 dirs x 4 frames | 24 | **yes** | not started |
| &#9744; | `char.player.walk` | **64&times;64** | 4 dirs x 4 frames | 24 | **yes** | not started |
| &#9744; | `icon.coin` | **16&times;16** | 1 | 12 | **yes** | not started |
| &#9744; | `prop1x1.chest.iron.locked` | **16&times;16** | 1 | 20 | **yes** | not started |
| &#9744; | `prop1x1.chest.wooden.closed` | **16&times;16** | 1 | 20 | **yes** | not started |
| &#9744; | `prop1x1.chest.wooden.open` | **16&times;16** | 1 | 20 | **yes** | not started |
| &#9744; | `prop2x2.furnace.cold` | **32&times;32** | 1 | 24 | **yes** | not started |
| &#9744; | `prop2x2.furnace.lit` | **32&times;32** | 1 | 24 | **yes** | not started |
| &#9744; | `tile.terrain.dirt_path` | **16&times;16** | 1 | 16 | **yes** | not started |
| &#9744; | `tile.terrain.grass_a` | **16&times;16** | 1 | 16 | **yes** | not started |
| &#9744; | `tile.terrain.soil_tilled` | **16&times;16** | 1 | 16 | **yes** | not started |
| &#9744; | `ui9.panel.wood` | **24&times;24** | 1 | 8 | **yes** | not started |
| &#9744; | `crop.wheat.stages` | **16&times;64** | 4 stacked | 16 | no | not started |
| &#9744; | `icon.tomato` | **16&times;16** | 1 | 12 | no | not started |
| &#9744; | `prop1x1.fence.wood` | **16&times;16** | 1 | 20 | no | not started |
| &#9744; | `prop1x2.tree.oak` | **16&times;32** | 1 | 20 | no | not started |
| &#9744; | `prop2x2.furniture.oak_table` | **32&times;32** | 1 | 24 | no | not started |
| &#9744; | `tile.anim.water` | **16&times;64** | 4 stacked | 16 | no | not started |
| &#9744; | `tile.terrain.grass_b` | **16&times;16** | 1 | 16 | no | not started |
| &#9744; | `ui9.panel.parchment` | **24&times;24** | 1 | 8 | no | not started |
<!-- STATUS:END -->

**The tickable version lives in the issues**, because a checklist in a README renders as boxes but is not clickable. GitHub only makes them work inside issues.

&rarr; **[First playable: the 12 sprites that block everything](../../issues)**

One issue per sprite, with its spec and brief. Close an issue and the tracking checklist ticks itself.

## The game is not waiting for you

```bash
npm run placeholders   # magenta checkerboards for every undrawn slot
npm run manifest       # a complete manifest, so the game builds today
```

Every magenta square in the game is a slot waiting for art. They are magenta on purpose: a plausible grey box looks deliberate and ships by accident. Placeholders are gitignored, and real art always wins over a placeholder.

This means you never have to draw ahead of the code, or code ahead of the drawing.

---

## The four commands

```bash
npm run next                 # what to draw next, in priority order, with the spec
npm run scaffold <slot-id>   # correctly sized empty PNG, opens it for you
npm run watch                # leave running beside your editor; every save is checked
npm run sheet                # contact sheet of everything, to spot style drift
```

The loop: `next` tells you what and what size &rarr; `scaffold` creates the canvas &rarr; you draw &rarr; `watch` says PASS or exactly what is wrong.

```
11:32:47  ....  icon.coin   empty canvas, waiting for you
11:32:48  PASS  icon.coin   2/12 colours
11:33:02  FAIL  icon.coin
          x Canvas is exactly 16x16      20x16
          x Colours within the cap of 12   320 used
```

### Shipping

```bash
npm run check                          # validate everything
git add art/ && git commit -m "add the coin" && git push
git tag assets-v1 && git push --tags   # publishes a Release the game fetches
```

---

## What to draw it in

<!-- TOOLS:START -->
Being researched. Short version: **Aseprite** is the industry standard for pixel art, it is inexpensive, and it runs natively on macOS. This section will be replaced with verified prices, free alternatives, and a beginner learning path.
<!-- TOOLS:END -->

---

## For developers

The game **never browses this repo**. It reads `manifest.json` from a Release, and a missing key means the art is not done yet.

```js
const man = await fetch(MANIFEST).then(r => r.json())
const chest = man.assets['prop1x1.chest.wooden.closed']
if (!chest || chest.placeholder) usePlaceholder()
else load(chest.url, chest.w, chest.h)
```

Fetch **one manifest and one archive** per build, from a GitHub Release. Do not fetch individual sprites from `raw.githubusercontent.com`: unauthenticated reads are capped at 60 per hour per IP, CI runners share egress addresses, and no rate-limit headers are returned, so there is no warning before it fails.

## For other artists, later

The [workshop](https://github.com/juntaoli-dev/todofarm-workshop) is a web app that lets someone **without** repo access claim a slot, drop a PNG, and have a pull request opened for them. It is built and working, and deliberately **switched off**, because for a solo artist who already has write access it is pure overhead.

Turn it on when someone else wants to draw.

## Why the validator parses PNG bytes instead of using a canvas

A canvas cannot do this job. Its 2D pipeline premultiplies alpha, so reading pixels back returns `0,0,0` for every transparent pixel regardless of what the file holds. A canvas-based check for stale colour under transparency **can never fail**, which is worse than having no check. Colour type and embedded colour profiles are likewise invisible to it.

So [`lib/validate.mjs`](lib/validate.mjs) walks the PNG chunks, inflates the image data, and un-filters the scanlines itself. No dependencies, and the same file runs in your browser, in Node, and in CI.

## Layout

```
classes.json        the nine art classes and their exact specs
slots/              one JSON per slot: what is needed, and why
art/                YOUR ART GOES HERE, as <slot-id>@1x.png
placeholders/       generated magenta stand-ins, gitignored
manifest.json       generated. what the game reads.
lib/validate.mjs    the validator. browser, node and CI all use this one file.
lib/png.mjs         a tiny PNG encoder, for scaffolds and placeholders
scripts/            next, scaffold, watch, sheet, check, manifest
```

Node 18 or newer. No dependencies anywhere.
