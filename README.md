# 8-BIT PARTY (4-bit build)

A local **couch co-op** party fighter for two players on one keyboard.
This pass delivers the **Mortal-Kombat-style character select screen** with
**8 pre-designed fighters** (no character editor — all art is predesigned).

## Play it

Just open **`game/index.html`** in any browser (no server needed — the sprite
data is inlined). 

### Controls

| | Move | Pick / Lock in |
|---|---|---|
| **Player 1** | `W` `A` `S` `D` | `Space` (or `F`) |
| **Player 2** | Arrow keys | `Enter` |
| Both | — | `Backspace` = reselect |

### How the select screen works (researched from MK / fighting-game UX)

- A **4×2 grid** of 8 boxed fighter portraits.
- Each player drives their **own flashing cursor box** (P1 red, P2 blue) — both
  are visible at all times, with a `P1`/`P2` corner tag.
- When **both players hover the same fighter**, P2's box nests inside P1's so
  both stay visible — and **mirror matches are allowed** (you *can* both pick the
  same fighter), exactly like Mortal Kombat.
- Press your **pick** button to **lock in** — the box turns solid, a `READY`
  banner appears, and the info panel shows `LOCKED IN`. Move again to cancel.
- When **both are locked**, a clean **“BOTH FIGHTERS READY!”** VS screen appears.

## The roster (8 fighters, one shared 16-color palette)

| | | | |
|---|---|---|---|
| **PIXEL** brown mop, red hoodie | **BYTE** beanie + green hoodie | **NOVA** red flame hair | **CHIP** blonde twin-tails |
| **GLITCH** green mohawk | **ACE** ball cap, varsity | **ZED** masked ninja | **BOLT** visor robot |

## Repo layout

```
game/            the playable select screen
  index.html
  game.js        MK-style select logic (cursors, lock-in, mirror, ready)
  data.js        AUTO-GENERATED sprites + palette + pixel font (do not edit)
art/             the art pipeline (source of truth for all sprites)
  characters.py  hand-authored pixel grids for all 8 fighters
  render.py      the 16-color palette + sprite renderer
  pixelfont.py   hand-drawn 5x7 pixel font
  export_json.py characters.py -> game/data.js
  *_sheet.py     PNG mockups (roster sheet, cards, etc.)
  out/           rendered PNGs + verification screenshots
```

## Regenerate art / data

```bash
pip install Pillow
cd art
python3 roster_sheet.py     # roster contact sheet PNG
python3 export_json.py       # rebuild game/data.js from characters.py
python3 verify_game.py       # drive the screen in headless Chromium (needs playwright)
```

> **Next up (not in this pass):** the actual fight — two-player keyboard combat
> using the locked-in fighters.
