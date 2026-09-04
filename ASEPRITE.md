# Aseprite setup and export

Everything here is verified against Aseprite's own source, not blog posts. If you follow the three settings below you will never see a format error.

## Three settings, once, and you are done

### 1. Never use a Background layer

**This is the one that will get you.** Aseprite's New Sprite dialog offers a Background layer, and most tutorials tell you to use one.

Aseprite writes a PNG with **no alpha channel** whenever a visible Background layer exists. Not "when the art is opaque" — the check in its source is literally `bg && bg->isVisible()`. Our validator rejects that file, correctly, because the game needs transparency around every sprite.

If you already have one: **Layer menu &rarr; Background &rarr; Convert to Layer.**

When making a new sprite, set Background to **Transparent**.

### 2. Stay in RGB colour mode

**Sprite menu &rarr; Color Mode &rarr; RGB Color.**

Indexed mode exports an indexed PNG, which we reject. Indexed *feels* right for pixel art with a small palette, but the palette limit is enforced by counting colours in the file, so you get the discipline without the format problem. Work in RGB and use a palette swatch set instead.

### 3. Leave the colour profile as sRGB

**Sprite menu &rarr; Properties &rarr; Color Profile &rarr; sRGB.**

An embedded profile silently shifts your colours between Aseprite and the game. Default Aseprite is fine here; this only bites if you have imported something.

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

Aseprite is source-available. Compiling it yourself is permitted for your own use, and it is the same binary. The paid build is a convenience, not a different program. Check the current price and licence terms on the official site before buying.

The trial cannot save files at all, so it is only useful to see whether you like the interface.

## Alternatives

See the tools section of the [README](README.md).
