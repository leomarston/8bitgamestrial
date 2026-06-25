# 8-Bit Party — Character Designs (4-bit build)

Couch co-op party minigame. Designs first: two hand-crafted **4-bit** characters
(a single shared **16-color palette** for the whole game — true 4-bit constraint).

Every sprite is authored pixel-by-pixel as an ASCII grid in `characters.py`, then
rendered scaled-up by `render.py`. Nothing is auto-generated — each pixel is placed
by hand.

## The roster

| | PLAYER 1 — **PIXEL** | PLAYER 2 — **BYTE** |
|---|---|---|
| Hair | Brown side-swept mop | Blue beanie (white pom) + blonde hair |
| Outfit | Red hoodie, blue jeans | Green hoodie w/ star, grey joggers |
| Shoes | White sneakers, grey soles | White sneakers, green soles |
| Controls | `WASD` + `Space` | `Arrows` + `Enter` |

Both built from the same 24×29 chibi base so animations and hitboxes stay
consistent between players.

## The 4-bit palette (16 colors)

| # | hex | use | | # | hex | use |
|---|-----|-----|---|---|-----|-----|
| 0 | — | transparent | | 8 | `2f64af` | blue dark |
| 1 | `251e33` | outline | | 9 | `b06434` | hair light |
| 2 | `f4f4ee` | white/shine | | 10 | `683a1e` | hair dark |
| 3 | `ffce9e` | skin light | | 11 | `6bd66b` | green light |
| 4 | `d88c58` | skin shadow | | 12 | `2f8c50` | green dark |
| 5 | `ff5d5d` | red light | | 13 | `ffd54a` | yellow/accent |
| 6 | `be3238` | red dark | | 14 | `c2c7d0` | grey light |
| 7 | `5db4ff` | blue light | | 15 | `5a6375` | grey dark |

## Outputs (`out/`)

- `character_select.png` — the hero "CHOOSE YOUR FIGHTER" screen
- `pixel_card.png`, `byte_card.png` — individual beauty shots
- `pixel_sprite.png`, `byte_sprite.png` — clean 16× sprites (transparent bg)
- `pixel_1x.png`, `byte_1x.png` — true-resolution sprites (24×29)

## Regenerate

```bash
pip install Pillow
python3 build.py          # individual cards + sprites
python3 select_sheet.py   # character-select screen
```

> Next step (not in this pass): the actual couch-play game loop with local
> keyboard input for both players.
