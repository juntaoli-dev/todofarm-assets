# Aseprite setup and export

Everything here is verified against Aseprite's own source, not blog posts. If you follow the three settings below you will never see a format error.

## Three settings, once, and you are done

### 1. Never use a Background layer

**This is the one that will get you.** Aseprite's New Sprite dialog offers a Background layer, and most tutorials tell you to use one.

Aseprite writes a PNG with **no alpha channel** whenever a visible Background layer exists. Not "when the art is opaque" — the check in its source is literally `bg && bg->isVisible()`. Our validator rejects that file, correctly, because the game needs transparency around every sprite.

If you already have one: **Layer menu &rarr; Background &rarr; Convert to Layer.**

When making a new sprite, set Background to **Transparent**.

### 2. Export in RGB colour mode

**Sprite menu &rarr; Color Mode &rarr; RGB Color** before you export. An Indexed sprite exports as a palette PNG, which we reject.

**Drawing** in Indexed is actually the better habit, though. Indexed stores one palette slot per pixel, so a half-transparent pixel cannot be represented at all, which makes the no-anti-aliasing rule enforce itself while you work. Draw in Indexed, convert to RGB, export.

If remembering the conversion feels like one step too many, just work in RGB the whole time. `npm run watch` will catch anything.

### 3. Colour profile: the default is already fine

Aseprite writes a one-byte `sRGB` marker, not an embedded ICC profile. **We only reject `iCCP`**, a real multi-kilobyte profile block, so you have nothing to change.

It only bites if you import art carrying a profile. If that ever happens, **Edit &rarr; Preferences &rarr; Color** and untick **Color Management**, which stops Aseprite writing any colour chunk at all. Verified in its source: the profile writer sits behind `if (fop->preserveColorProfile() && spec.colorSpace())`, and that preference is the only thing feeding it.

## Drawing settings

- Use the **Pencil**, not the Brush. Pencil has hard edges.
- Turn **anti-aliasing off** on every tool that offers it.
- To erase, use **Edit &rarr; Clear**, not painting with a transparent colour. Painting leaves colour data hiding under transparent pixels, which is invisible in Aseprite and shows as coloured fringing in the game.

## Exporting

`npm run scaffold <slot-id>` makes the PNG at the right size and opens it. Draw, save with **Cmd+S**, and `npm run watch` checks it. For most slots that is the whole workflow.

If you work in `.aseprite` files and export separately, these are the commands. Argument order matters: `--color-mode` goes **after** the filename.

**Single frame** — every `tile`, `prop`, `icon` and `ui9` slot:

```bash
aseprite -b sprite.aseprite --color-mode rgb \
  --save-as "art/prop1x1.chest.wooden.closed@1x.png"
```

**Vertical strip** — `tile.anim` and `crop` slots, 4 frames stacked top to bottom:

```bash
aseprite -b sprite.aseprite --color-mode rgb \
  --sheet-type vertical --sheet "art/crop.wheat.stages@1x.png"
```

**4&times;4 character grid** — `char` slots, 4 directions &times; 4 frames:

```bash
aseprite -b sprite.aseprite --color-mode rgb \
  --sheet-type rows --sheet-columns 4 --sheet "art/char.player.walk@1x.png"
```

### Flags to never pass

Each of these breaks a fixed canvas or a fixed grid:

```
--trim  --trim-sprite  --trim-by-grid  --crop  --slice  --shrink-to
--sheet-pack  --power-of-two-size  --extrude  --merge-duplicates
--ignore-empty
```

`--ignore-empty` deserves a special warning. It does not error on a blank frame, it **removes** it and shifts every frame after it. Your animation desyncs and nothing tells you. Our `frames.allDrawn` check would never even see the blank frame, because it was gone before the file was written.

## Buying it

**$19.99** on Steam or from [aseprite.org](https://www.aseprite.org/), verified 2026-09-04. Current version 1.3.18.3.

It is source-available, and compiling it yourself is permitted for your own use. Same binary either way.

The trial cannot save files at all, so it only shows you the interface.

Note that itch.io and Steam are currently shipping **different versions**, so prefer Steam or the official site.

## Alternatives

See the tools section of the [README](README.md).
