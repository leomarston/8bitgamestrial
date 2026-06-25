# 8-BIT PARTY (4-bit build)

A local **couch co-op** party fighter for two players on one keyboard.
This pass delivers the **Mortal-Kombat-style character select screen** with
**8 pre-designed fighters** (no character editor — all art is predesigned).

## Play it

Just open **`game/index.html`** in any browser (no server needed — the sprite
data is inlined).

**Flow:** character select → **game select** → the chosen minigame.
After both fighters lock in, a **CHOOSE A GAME** hub appears (a 4×2 grid like the
character select). **Player 1** drives the cursor (`WASD` + `Space`) and picks a
minigame — **Football, Flappy, Graveyard, Runner, Crown Grab, Tile Blitz** and
**Hot Potato** are live, the last tile is "coming soon". `Backspace` goes back a step.

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

## Minigame: FOOTBALL (Pong-style)

After both players lock in, the football match (`game/football.html`) **starts
automatically** (a short VS countdown, then play). It's Pong with a football skin:

- Each player is a **keeper** that moves **up/down only** (no left/right) in
  front of their net.
- A **bigger 4-bit football** bounces off keepers and the touchlines; the
  bounce angle depends on where it hits the keeper.
- Get the ball into the opponent's **net** to score. The ball **speeds up over
  time**. **First to 3 wins.**
- Real pitch art: mowed-stripe grass, full markings (centre circle, penalty &
  6-yard boxes, arcs, spots, corners), **goals with crosshatch nets**, and a
  **pixel crowd** in the stands.

Controls: **P1 `W`/`S`**, **P2 `↑`/`↓`**, `Backspace` = back to select,
`Enter`/`R` = rematch on the win screen. The keepers are whoever you picked on
the select screen (defaults to PIXEL vs BYTE if launched directly).

## Minigame: FLAPPY DUEL (2-player)

`game/flappy.html` — two-player couch Flappy Bird. Both chosen fighters (with
flapping wings) fly the **same pipes at once**, staggered so one is **in front**.

- Hit a pipe or the ground = you're out.
- **Most pipes passed wins** — where or when you crash doesn't matter. Both keep
  flying until they're down, then the higher pipe count wins (equal = draw).
- Clean 4-bit world: flat sky, simple clouds, green pipes, scrolling ground.

Controls: **P1 `W`/`Space`**, **P2 `↑`**, `Enter`/`R` = rematch, `Backspace` = menu.
Defaults to PIXEL vs BYTE; otherwise uses the fighters picked on the select screen.

## Minigame: GRAVEYARD (monster in the middle)

`game/graveyard.html` — top-down cemetery chase. A **zombie** starts in the middle
and hunts the **nearest living player**. It is **slower than the players** but
relentless, and it **can't pass through graves** (the crypt and tombstones are
solid). Get touched = you're out. **Last one standing wins.**

Players (and the zombie) have a **walk animation**. You can **punch your rival** —
that plays a punch and knocks them **down for 0.7s** (they can't move, easy zombie
bait), then they get back up. Sound effects: punch, footsteps on grass, and a
zombie groan (footstep/zombie kept quiet).

Controls: **P1 `WASD` + `Space` (punch)**, **P2 arrows + `Enter` (punch)**,
`Enter`/`R` = rematch, `Backspace` = menu. The cemetery uses its own moody
16-colour palette; art lives in `art/graveyard.py`, sounds in `game/sfx/`.

## Minigame: RUNNER (auto-scroll platformer)

`game/platformer.html` — a forward auto-scrolling platformer in a night sandbox
style (cobblestone, wood, grass/red-brick, vines, crates). The **frame scrolls
right on its own, fast but slower than you can run**; **fall behind the left edge
(or into a pit) and you're OUT.** Last one keeping up wins.

- Players are **one block tall** and **jump high** (~3 blocks) for nimble parkour.
- **Solid blocks actually block** — you stand on / are stopped by ground, ledges
  and crates; background towers, trees and vines don't block.
- The level is generated from segments and **loops seamlessly** (effectively
  infinite), and it's **re-randomised every round** (new obstacles/alignment).
- **Stomp:** land on the other player's head and they get **squished — flattened
  and frozen for ~1s** (then pop back), while you bounce off. The instant one
  player is out (fell behind / pit), the other **wins immediately**.
  Art lives in `art/blocks.py`.

Controls: **P1 `A`/`D` + `W` (jump)**, **P2 arrows + `Up` (jump)**, `Enter`/`R`
= rematch, `Backspace` = menu.

## Minigame: CROWN GRAB (king of the crown)

`game/crown.html` — top-down couch duel over a golden crown. **Grab the crown,
carry it on your head, and HOLD IT LONGEST.** There's **no punching** — each
player has a **DASH**. Dash into your rival and you **steal the crown** (if they
had it) and **black them out for 1 second** (they can't move). The scoreboard
shows each player's **cumulative hold time in milliseconds, live**; when the
clock runs out, **most cumulative hold time wins.**

The arena is **picked at random each round** from two hand-drawn stages: the
**Royal Court** (open floor with four pillars for cover) and the **Stone Dais**
(a raised middle you reach via short side steps). Solid collision for the pillars
and the dais. Art lives in `art/crown.py`; stages export to `game/crown_map*.png`.

Controls: **P1 `WASD` + `Space` (dash)**, **P2 arrows + `Enter` (dash)**,
`Enter`/`Space`/`R` = rematch, `Backspace` = menu.

## Minigame: TILE BLITZ (paint the floor)

`game/tileblitz.html` — top-down territory duel on a tiled floor. **Roam the grid
and paint every tile you step on your colour**, stealing the rival's tiles by
walking over them. Same **DASH** as Crown Grab — lunge in your direction, and if
you hit your rival they **black out for 1 second** (a window to paint over their
turf). When the timer runs out, whoever **owns the most tiles wins**. A live count
and a territory bar track the lead. Art lives in `art/tilebangers.py`; the floor
tile is one template the game recolours per player.

Controls: **P1 `WASD` + `Space` (dash)**, **P2 arrows + `Enter` (dash)**,
`Enter`/`Space`/`R` = rematch, `Backspace` = menu.

## Minigame: HOT POTATO (don't hold the bomb)

`game/hotpotato.html` — top-down couch duel. One player is stuck holding a lit
bomb; a **fuse counts down** (shown centre). **Pass the bomb by touching — or
dashing into — your rival** (a short cooldown stops instant ping-pong). Whoever is
**holding it when the fuse runs out gets BLOWN UP and loses**; the other survives.
Use the **DASH** to catch the runner or to escape (careful — dashing into the
carrier means *you* catch it).

The arena is **picked at random each round** from three hand-drawn stages: the
**Yard** (open + TNT barrels), the **Street** (a crossroads with four houses you
can cut through — each has two doorways), and the **House** (four rooms linked by
doorway gaps). Art lives in `art/hotpotato.py`; stages export to
`game/hotpotato_map{1,2,3}.png`.

Controls: **P1 `WASD` + `Space` (dash)**, **P2 arrows + `Enter` (dash)**,
`Enter`/`Space`/`R` = rematch, `Backspace` = menu.

## Music & sound

`game/music.js` (loaded by every page) handles background music:
- **Menu** (character select + game select) loops the **menu track**, kept
  seamless across the two menu screens via `sessionStorage`.
- **Each game** picks a **random track from `music1`–`music4`** when it starts and
  loops it; starting another game (or a rematch) **re-rolls** a fresh random track.

Per-game SFX (footsteps, zombie, punch) live alongside in `game/sfx/`. Audio
unlocks on the first key/pointer input (browser autoplay policy).

## Repo layout

```
game/            the playable screens
  index.html     character select
  game.js        MK-style select logic (cursors, lock-in, mirror) -> game select
  gameselect.html  the "choose a game" hub
  gameselect.js  4x2 minigame grid (P1 picks; 7 games live, 1 soon)
  crown.html / crown_game.js        CROWN GRAB (carry the crown, dash to steal)
  crown_map1.png / crown_map2.png   the two CROWN GRAB stage backgrounds
  tileblitz.html / tileblitz_game.js  TILE BLITZ (paint the most tiles)
  tileblitz_bg.png                  the TILE BLITZ arena background
  hotpotato.html / hotpotato_game.js  HOT POTATO (pass the bomb, dash)
  hotpotato_map1.png .. _map3.png   the three HOT POTATO stage backgrounds
  platformer.html / platformer.js   the RUNNER auto-scroll platformer
  football.html  the football minigame
  football.js    Pong-style football (pitch, nets, ball physics, scoring)
  flappy.html    the flappy duel minigame
  flappy.js      2-player flappy (clean 4-bit sky, wings, most-pipes-wins)
  graveyard.html      the graveyard chase minigame
  graveyard_game.js   top-down monster chase (last one standing)
  data.js        AUTO-GENERATED sprites + palette + pixel font + ball (do not edit)
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
