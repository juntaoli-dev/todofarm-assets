# todoFarm assets: instructions for Claude

This is the art library for todoFarm. One person draws everything by hand in Aseprite. Your job in this repo is to keep the loop tight, never to draw.

## Rules that are not negotiable

- **No AI-generated art. Ever.** Do not generate, upscale, "clean up", or otherwise produce pixel art. Placeholders in `placeholders/` are deliberately ugly magenta checkerboards and that is the only synthetic art allowed.
- **`lib/validate.mjs` is the standard.** It is the single source of truth and it is vendored, byte for byte, into the `todofarm-workshop` repo. If you change it here, run `npm run sync` in the workshop repo. Never edit the workshop's copy directly.
- **Do not commit `manifest.json` or `placeholders/`.** Both are generated. The manifest is built at publish time and attached to a GitHub Release; committing it deadlocks CI.
- **Do not add dependencies.** Everything here is Node 18+ standard library on purpose, so it runs identically in a browser, in Node, and in CI.

## The loop the artist uses

```
npm run scaffold    asks "did you finish X?" about any passing-but-unclosed slot,
                    marks it done if yes, then creates the next slot's canvas and opens it
npm run watch       validates on every save and names the fix for any failure
npm run done        validates, closes the GitHub issue, refreshes the tracker
npm run next        shows the ranked queue without touching anything
```

The queue ranking lives in `lib/queue.mjs`: first-playable (`blocks: v0`) before v1, easiest class first, started before untouched. Do not hand a beginner a character sheet first.

## Where things are

| | |
|---|---|
| `classes.json` | the nine art classes, exact canvas sizes, colour caps, anchors |
| `slots/*.json` | one per sprite: brief, class, whether it blocks v0 |
| `art/<slot-id>@1x.png` | the only place art goes, the only filename shape |
| `palette/resurrect-64.*` | master palette, 64 colours, per-slot caps are drawn from it |
| `.githooks/pre-commit` | validates staged art, unstages blank scaffolds, refreshes README |
| `.github/workflows/` | `validate` on PR and push (read-only, fork-safe); `publish` on tag |

## Things that look like bugs and are not

- **A ground tile with no transparency is correct.** `tile` and `tile.anim` carry `opaque: true` in `classes.json`, which suppresses the transparency advisory.
- **A blank scaffold in `art/` failing validation is expected.** The hook leaves it out of commits; `isUntouched()` distinguishes it from broken art.
- **CI never posts PR comments.** It reports through the job summary so it needs no write token and works from forks.

## Things that are bugs, seen before

- The validator once used a canvas to read pixels. Canvas premultiplies alpha, so the stale-RGB check could never fail. It now parses PNG bytes itself. Do not reintroduce canvas.
- A visible Background layer in Aseprite exports PNG-24 with no alpha. The `png.colorType` failure message names the exact menu item. Keep that message.
- The README status table used to require a manual regenerate and CI gated on it, which failed every real commit. The hook regenerates it now. Do not add another gate that depends on a human remembering something.

## When touching the palette

Resurrect 64 by Kerrie Lake. Commercial use confirmed by the author on the Lospec page, no formal licence file. Credit her in the game. Off-palette colours are a warning, never a block; do not promote that to blocking.

## Cross-platform, verified against Git and Aseprite sources

- The hook shebang must stay `#!/bin/sh`. Git for Windows runs it through its bundled `usr\bin\sh.exe` from any shell or GUI. `#!/bin/bash` breaks under MinGit, which is what GitHub Desktop ships.
- The hook must be committed as mode `100755`. Windows ignores the executable bit, but macOS and Linux silently skip a `100644` hook. Fix with `git add --chmod=+x .githooks/pre-commit`, never with `chmod` on a Windows checkout (`core.fileMode=false` there).
- `.gitattributes` pins `.githooks/* text eol=lf`. A CRLF hook fails with `set: -: invalid option`. Anyone with a CRLF checkout runs `git add --renormalize .`.
- `core.hooksPath` is per clone, which is why `npm run setup` exists. Keep it relative (`.githooks`): JetBrains only detects hooks at relative or native `C:/` paths.
- GitHub Desktop 3.5.5+ needs Options > Git > Hooks > *Load Git hook environment variables from shell* or `node` is not on PATH inside the hook.
- Aseprite presets live in `<user config>/palettes`: `%APPDATA%\Aseprite`, `~/Library/Application Support/Aseprite`, `$XDG_CONFIG_HOME/aseprite`. `ASEPRITE_USER_FOLDER` overrides all three. Steam is the same binary. The presets list is cached on first open; the refresh button (F5) rescans, no restart.
- `lib/open.mjs` uses `cmd.exe /c start "" <file>` with an EMPTY title arg. A literal `'""'` gets escaped by libuv and breaks. `explorer.exe` always exits 1 and is unusable from Node.
