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
minigame — **Football, Flappy, Graveyard, Runner, Crown Grab, Tile Blitz,
Hot Potato** and **Meteor Derby** are live — all 8 tiles are filled. `Backspace`
goes back a step.

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

## Minigame: FOOTBALL — 2–4 player "defend your wall" pong

`game/football.html` — a **square pitch** where each player guards one side:
**P1 bottom, P2 top, P3 left, P4 right**. With 2 players the unused sides are
**solid walls**; 3 players leaves one wall; 4 fills every side.

- **New paddle control:** each keeper-paddle **slides on its own** and bounces
  corner-to-corner. **Tap your button to instantly reverse it** and line up with
  the ball — so every player needs only **one button**, which is how it scales to
  four on one keyboard.
- The **football** bounces off paddles (angle depends where it hits) and walls,
  and **speeds up over time**.
- **Lives:** each player has **3**. The ball getting past your side costs a life
  and re-centres the ball. At 0 lives your side **walls up and you're out**.
  **Last player standing wins.** (Two players = classic first-to-3-against.)

Controls (tap to flip your paddle): **P1 `WASD`/`Space`**, **P2 arrows/`Enter`**,
**P3 `IJKL`/`O`**, **P4 `TGHR`**; `Backspace` = menu, `Enter` = rematch. Player
count and fighters come from the select screen (defaults if launched directly).

## Minigame: FLAPPY DUEL (2–4 player)

`game/flappy.html` — couch Flappy Bird for **2–4 players**. Every chosen fighter
(with flapping wings) flies the **same pipes at once**, staggered front-to-back.

- Hit a pipe or the ground = that flyer is out.
- **Most pipes passed wins** — where or when you crash doesn't matter. Everyone
  keeps flying until they're down, then the highest pipe count wins (tie = draw).
- Clean 4-bit world: flat sky, simple clouds, green pipes, scrolling ground.

Controls (tap to flap): **P1 `WASD`/`Space`**, **P2 arrows**, **P3 `IJKL`/`O`**,
**P4 `TGHR`**; `Enter`/`R` = rematch, `Backspace` = menu. Player count + fighters
come from the select screen.

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

## Minigame: METEOR DERBY (space dodge)

`game/space.html` — two pilot pods **share one lane** in deep space. Each moves
**left/right only** and **wraps** around the screen edges. The pods are **solid**
— ram your rival to **shove them sideways** (they can never overlap) so a falling
meteor lands on *them*. Each hit wrecks your pod a little (cracked → wrecked);
**3 hits and you're destroyed**, the other pilot wins. Brief invincibility flash
after each hit; **3 health pips** per player. Art lives in `art/space.py`; the
starfield exports to `game/space_bg.png`.

Controls: **P1 `A`/`D`**, **P2 `←`/`→`**, `Enter`/`Space`/`R` = rematch,
`Backspace` = menu.

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
  gameselect.js  4x2 minigame grid (P1 picks; all 8 games live)
  crown.html / crown_game.js        CROWN GRAB (carry the crown, dash to steal)
  crown_map1.png / crown_map2.png   the two CROWN GRAB stage backgrounds
  tileblitz.html / tileblitz_game.js  TILE BLITZ (paint the most tiles)
  tileblitz_bg.png                  the TILE BLITZ arena background
  hotpotato.html / hotpotato_game.js  HOT POTATO (pass the bomb, dash)
  hotpotato_map1.png .. _map3.png   the three HOT POTATO stage backgrounds
  space.html / space_game.js        METEOR DERBY (shared lane, shove, dodge)
  space_bg.png                      the METEOR DERBY starfield background
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
