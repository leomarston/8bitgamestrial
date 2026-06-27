# 8-BIT PARTY (4-bit build)

A local **couch co-op** party fighter for two players on one keyboard.
This pass delivers the **Mortal-Kombat-style character select screen** with
**8 pre-designed fighters** (no character editor — all art is predesigned).

## Play it

Just open **`game/index.html`** in any browser (no server needed — the sprite
data is inlined).

**Flow:** character select → **game select** → the chosen minigame.
After the fighters lock in, a **CHOOSE A GAME** hub appears (a full 7×2 grid).
**Player 1** drives the cursor (`WASD` + `Space`) and picks one of **13 minigames** —
**Football, Flappy, Graveyard, Runner, Crown Grab, Tile Blitz, Hot Potato, Meteor
Derby, Tank Duel, Slime Volley, Red Light Green Light, Traffic Run** and **Ship
Dash** — or the **8-BIT CUP** tournament in the 14th slot. `Backspace` goes back a
step.

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
**P3 `IJKL`/`O`**, **P4 `TGHR`**; `Esc` = pause, `Enter` = rematch. Player
count and fighters come from the select screen (defaults if launched directly).

## Minigame: FLAPPY DUEL (2–4 player)

`game/flappy.html` — couch Flappy Bird for **2–4 players**. Every chosen fighter
(with flapping wings) flies the **same pipes at once**, staggered front-to-back.

- Hit a pipe or the ground = that flyer is out, and the crashed bird **stays
  frozen exactly where it died** (no tumbling to the ground).
- **Most pipes passed wins** — where or when you crash doesn't matter. Everyone
  keeps flying until they're down, then the highest pipe count wins (tie = draw).
- A pipe only counts once you've **fully cleared it**: dying on a pipe — even
  right at its edge — means you didn't pass it, so you get no point for it.
- Clean 4-bit world: flat sky, simple clouds, green pipes, scrolling ground.

Controls (tap to flap): **P1 `WASD`/`Space`**, **P2 arrows**, **P3 `IJKL`/`O`**,
**P4 `TGHR`**; `Enter`/`R` = rematch, `Esc` = pause. Player count + fighters
come from the select screen.

## Minigame: GRAVEYARD (turn-into-a-zombie tag, 2–4 players)

`game/graveyard.html` — top-down cemetery chase. An **AI zombie** starts in the
middle and hunts the **nearest human**. It's slower than the players but relentless
and **can't pass through graves**. **Get caught — by the AI zombie OR by a
player-zombie — and you TURN INTO A ZOMBIE that you keep controlling**, then hunt
the survivors. **Last human standing wins.**

Humans can **punch a rival** (knocks them **down for 0.7s** — easy zombie bait);
player-zombies can **lunge** to grab. Player-zombies are tinted green but keep a
**bright ring and name-tag in their own player colour**, so each dead player can
always tell which zombie they're controlling. Sound effects: punch, footsteps,
zombie groan. (The turn-into-a-zombie twist only changes play at 3–4 players; at
2 players it's simply last-human-standing.)

Controls: **P1 `WASD`/`Space`**, **P2 arrows/`Enter`**, **P3 `IJKL`/`O`**,
**P4 `TFGH`/`R`**; `Enter`/`R` = rematch, `Esc` = pause. Art in
`art/graveyard.py`, sounds in `game/sfx/`.

## Minigame: RUNNER (auto-scroll platformer, 2–4 players)

`game/platformer.html` — a forward auto-scrolling platformer in a night sandbox
style (cobblestone, wood, grass/red-brick, vines, crates) for **2–4 players**.
The **frame scrolls right on its own, fast but slower than you can run**; **fall
behind the left edge (or into a pit) and you're OUT.** Last one keeping up wins.
Controls: **P1 `A`/`D`+`W`**, **P2 arrows+`Up`**, **P3 `J`/`L`+`I`**, **P4 `F`/`H`+`T`**.

- Players are **one block tall** and **jump high** (~3 blocks) for nimble parkour.
- **Solid blocks actually block** — you stand on / are stopped by ground, ledges
  and crates; background towers, trees and vines don't block.
- The level is generated from segments and **loops seamlessly** (effectively
  infinite), and it's **re-randomised every round** (new obstacles/alignment).
- **Stomp:** land on the other player's head and they get **squished — flattened
  and frozen for ~1s** (then pop back) with a wet *splat*, while you bounce off.
  Falling behind / into a pit plays the same *splat*. The instant one player is
  out (fell behind / pit), the other **wins immediately**.
  Art lives in `art/blocks.py`.

Controls: **P1 `A`/`D` + `W` (jump)**, **P2 arrows + `Up` (jump)**, `Enter`/`R`
= rematch, `Esc` = pause.

## Minigame: CROWN GRAB (king of the crown, 2–4 players)

`game/crown.html` — top-down couch free-for-all over a golden crown. **Grab it,
carry it on your head, and HOLD IT LONGEST.** No punching — each player has a
**DASH**: dash into anyone to **black them out for 1 second**, and if they were
holding the crown you **steal it**. The scoreboard shows every player's
**cumulative hold time in milliseconds, live** (plus a territory share bar); when
the 30s clock ends, **most cumulative hold time wins.**

The arena is **picked at random each round** (the **Court** with four pillars, or
the **Wall** down the middle), and **starting spots are randomised** for fairness.
Art lives in `art/crown.py`; stages export to `game/crown_map*.png`.

Controls: **P1 `WASD`/`Space`**, **P2 arrows/`Enter`**, **P3 `IJKL`/`O`**,
**P4 `TFGH`/`R`**; `Enter`/`Space`/`R` = rematch, `Esc` = pause.

## Minigame: TILE BLITZ (paint the floor)

`game/tileblitz.html` — top-down territory battle for **2–4 players** on a tiled
floor. **Roam the grid and paint every tile you step on your colour** (red / blue
/ green / gold), stealing rivals' tiles by walking over them. **DASH** into a
rival to **black them out 1 second**. When the timer ends, whoever **owns the most
tiles wins**. Live counts + a territory share bar. Art in `art/tilebangers.py`;
the floor tile is one template recoloured per player; starts are randomised.

Controls: **P1 `WASD`/`Space`**, **P2 arrows/`Enter`**, **P3 `IJKL`/`O`**,
**P4 `TFGH`/`R`**; `Enter`/`Space`/`R` = rematch, `Esc` = pause.

## Minigame: HOT POTATO (don't hold the bomb)

`game/hotpotato.html` — top-down couch game for **2–4 players (elimination)**. One
player holds a lit bomb; a **fuse counts down**. **Pass it by touching — or dashing
into — another player** (a short cooldown stops instant ping-pong). When the fuse
blows, **whoever holds it is ELIMINATED**; a fresh bomb goes to a random survivor
and it repeats until **one player remains = winner**. Use the **DASH** to catch a
runner or escape (careful — touching the carrier means *you* catch it).

The arena is **picked at random each round** from three hand-drawn stages: the
**Yard** (open + TNT barrels), the **Street** (a crossroads with four houses you
can cut through — each has two doorways), and the **House** (four rooms linked by
doorway gaps). Art lives in `art/hotpotato.py`; stages export to
`game/hotpotato_map{1,2,3}.png`.

Controls: **P1 `WASD`/`Space`**, **P2 arrows/`Enter`**, **P3 `IJKL`/`O`**,
**P4 `TFGH`/`R`**; `Enter`/`Space`/`R` = rematch, `Esc` = pause.

## Minigame: METEOR DERBY (space dodge)

`game/space.html` — **2–4** pilot pods **share one lane** in deep space. Each
moves **left/right only** and **wraps** around the screen edges. The pods are
**solid** — ram a rival to **shove them sideways** (pods can never overlap, even
in a 3–4 way pile-up) so a falling meteor lands on *them*. Each hit wrecks your
pod a little (cracked → wrecked); **3 hits and you're space dust**, your pod
leaves the lane. **Last pod flying wins.** Brief invincibility flash after each
hit; **3 health pips** per player. Pods **and meteors shrink** as more players
join, so 4 pods aren't cramped in the lane. Starting sides are **randomised every
round**. Art lives in `art/space.py`; the starfield exports to `game/space_bg.png`.

Controls: **P1 `A`/`D`**, **P2 `←`/`→`**, **P3 `J`/`L`**, **P4 `F`/`H`**,
`Enter`/`Space`/`R` = rematch, `Esc` = pause.

## Minigame: TANK DUEL (2–4 players)

`game/tank.html` — top-down tank combat on a **freshly randomized battlefield
every round** (Battle City / Atari Combat style). The map is a **mirror-symmetric
maze** (fair to all four corners, always connected, open spawn pockets) of
**destructible brick**, **solid steel**, **water** (tanks can't drive in, shots
fly over) and **bush** (concealment). Drive in **4 directions** and **fire** your
cannon: shells **destroy brick**, **bounce once off steel/the border**, fly over
water and through bushes. **One hit and you're scrap — last tank rolling wins.**
Spawns are reshuffled each round: **2P** = diagonal corners, **3P** = three random
corners, **4P** = all four. The generator + tile art live in `art/tank.py` (sample
maps render to `art/out/tank_map_*.png`); the map is generated live in JS.

Controls: move with your cluster (**P1 `WASD`**, **P2 arrows**, **P3 `IJKL`**,
**P4 `TFGH`**), **fire** with **`Space` / `Enter` / `O` / `R`**;
`Enter`/`R` = rematch, `Esc` = pause.

## Minigame: SLIME VOLLEY (2–4 players)

`game/volley.html` — a beach court split into **one colored "hole" per player**
(2/3/4), separated by **nets**. Each player is **locked to their own zone**; move
left/right and **jump** to bump the big ball — keep it out of **your** hole and
knock it over a net into someone else's. The serve is **thrown at a random angle**
each rally (never a straight drop). Every time the ball lands in your hole you
**lose a point — you start at 2, hit 0 and you're OUT** (your hole seals up and
bounces the ball). **Last player standing wins.** Tuned for a wide screen: small
players, a big ball, roomy areas. Court is drawn live; mockup art in `art/volley.py`.

Controls: **move** with your cluster L/R (**P1 `A`/`D`**, **P2 `←`/`→`**, **P3
`J`/`L`**, **P4 `F`/`H`**), **jump** with **`W` / `↑` / `I` / `T`** (your action
key also jumps); `Enter`/`R` = rematch, `Esc` = pause.

## Minigame: RED LIGHT GREEN LIGHT (2–4 players)

`game/rlgl.html` — each player races their **own lane** to the finish on the
right. A male **catcher** oversees from the right-middle: **back turned = GREEN**
(run), **facing you = RED** (freeze). Hold **any of your cluster keys to GO**,
release to stop — movement has **very low momentum**, so you can stop fast but
greed still overruns the line. **Move while it's RED and you're snapped back to
the START** (no elimination — you just keep racing). **First to the finish wins.**
Tuned so a round takes ~6–8 green bursts (≈25–40s): a single green can only cover
~30% of the track, the catcher's turn gives a ~0.35s window to stop, and greens
shorten as the round drags on. A **60-second countdown** runs as a pixel display
top-right; if it expires, the furthest-ahead racer wins. Lanes are shuffled each
round. Catcher/lamp art in `art/rlgl.py` (exported to `data.js`).

Controls: **GO** by holding any of your keys (**P1 `WASD`/`Space`**, **P2
arrows/`Enter`**, **P3 `IJKL`/`O`**, **P4 `TFGH`/`R`**); `Enter`/`R` = rematch,
`Esc` = pause.

## Minigame: TRAFFIC RUN (2–4 players)

`game/traffic.html` — a **Frogger-style coin dash** for **2–4 players**. Everyone
starts on the **grass strip at the bottom** and crosses **eight lanes of traffic**
to grab coins. **The further UP a coin is, the more it's worth** (1 in the lane
nearest the grass, up to 6 at the far end), so the big payouts mean braving the
busiest, far-side lanes.
**Get run over and you're flung back to the grass** (with a wet *splat* sound) —
**no points lost**, you just start the crossing again. **First to 15 total points
wins.**

Each player has a **DASH** on their action key — a quick burst in the direction
you're moving, perfect for threading a gap between two cars or diving for a coin.
Cars run both ways (alternating lanes), wrap around the screen, and vary in speed;
coins respawn at a fresh random lane the moment one is grabbed. Stone-wall
scoreboard up top shows each player's live total. Car/coin art lives in
`art/traffic.py` (exported to `data.js`); the road, wall and grass are baked once.

Controls: **move** with your cluster (**P1 `WASD`**, **P2 arrows**, **P3 `IJKL`**,
**P4 `TFGH`**), **DASH** with **`Space` / `Enter` / `O` / `R`**;
`Enter`/`R` = rematch, `Esc` = pause.

## Minigame: SHIP DASH (2–4 players)

`game/ship.html` — a dead-simple **button-masher boat race**. Each player owns a
**sea lane** and the **only control is one button**: every press is an oar stroke
that surges your boat right; stop pressing and you coast to a stop, so the faster
you **mash**, the faster you row. **First boat across the FINISH on the right
wins.** Holding the key does nothing — you have to actually hammer it.

One key each: **P1 `Space`**, **P2 `Enter`**, **P3 `O`**, **P4 `R`** — each lane
shows its own key and a live progress bar, so it's instantly clear for **2, 3, or
4 players**. Boats carry a **player-coloured sail** (and the player's fighter
aboard) over a wave-and-foam sea with buoy lane dividers and a checkered finish.
`Enter` / your key = rematch, `Esc` = pause. Art lives in `art/ship.py`
(recolourable boat exported to `data.js`); the sea/sky/finish are baked once.

## Pause menu

Every minigame (and the cup) has an in-game **pause menu** — press **`Esc`** (or
**`P`**). `game/pause.js` (loaded by every game page) freezes the action by gating
`requestAnimationFrame`, snapshots the screen and draws an 8-bit panel in the
game's own pixel font: **CONTINUE / SETTINGS / MAIN MENU** (navigate `↑`/`↓`,
confirm `Enter`). **SETTINGS** toggles **MUSIC** and **SOUND** (persisted in
`localStorage`; SFX honour it via an `Audio` mute, music via `musicOff`). **MAIN
MENU** returns to the hub and ends any running cup. This replaces the old
Backspace-to-menu (Backspace is now inert in games).

## The 8-BIT CUP (tournament)

`game/tournament.html` — the 14th hub tile. Pick the **gold cup** and the party
plays **random minigames back-to-back**; each round's winner earns a point and a
**standings board** shows between rounds (every player's portrait, `X/5` and five
star pips, sorted by wins). After the winner is celebrated, a **slot-machine
roulette of game icons** spins, decelerates and **lands on the next game**
(with ticks and a "GET READY!"), then launches it — no buttons, it flows on its
own. The icons come from `game/gameicons.js` (a recognisable per-game picture
built from the inlined sprite data). **First to 5 wins lifts the cup** — a champion screen with confetti. Draws
(e.g. everyone wiped out) score no point and just roll another game.

How it hangs together:
- `game/tournament.js` is the controller: on each visit it applies the round you
  just returned from, celebrates the star, spins the **next-game roulette** onto a
  fresh random pick (never an immediate repeat) and launches it.
- `game/cuphook.js` (loaded by every minigame) makes a game *cup-aware*: while a
  cup is running it reports the winner and bounces back to the standings; when no
  cup is running it does nothing, so games still play and rematch normally.
  Quitting a round via the pause menu's MAIN MENU ends the tournament cleanly.
- Trophy / pip / board art lives in `art/cup.py` (exported to `data.js`).

`Esc` opens the pause menu (MAIN MENU exits the cup); on the champion screen `Enter` starts a fresh cup.

## Start countdown

Every minigame opens with the same **“3 · 2 · 1 · GO!”** countdown, drawn over a
dimmed board. `game/countdown.js` (loaded by every game page) synthesises
**Formula-1 starting-light beeps** with the Web Audio API — three identical
red-light beeps for **3 · 2 · 1**, then a higher *lights-out* tone on **GO** — so
no audio file is needed. Games call `Countdown.label(remaining)` each frame to get
the on-screen number *and* trigger the beep on each change.

## Music & sound

`game/music.js` (loaded by every page) handles background music:
- **Menu** (character select + game select) loops the **menu track**, kept
  seamless across the two menu screens via `sessionStorage`.
- **Each game** preloads a **random track from `music1`–`music4`** but stays
  **silent through the countdown** — the music kicks in **only at GO**, when play
  actually begins (`GameMusic.start()`). A rematch re-rolls a fresh track
  (`GameMusic.next()`), again silent until the next GO.

Per-game SFX (footsteps, zombie, punch, plus a death **splash/splat** played when
a player is run over in Traffic Run or squished/knocked out in Runner — never on a
temporary blackout) live alongside in `game/sfx/`. Audio unlocks on the first
key/pointer input (browser autoplay policy).

When a round ends, **`game/results.js`** plays a synth result sting — a bright
**victory jingle** if someone won, or a flat **draw** womp on a tie — alongside the
on-screen "P# WINS!" / draw message. In the cup the result is then held a beat
(~3.6s) so it lands before the standings roulette takes over.

## Repo layout

```
game/            the playable screens
  index.html     character select
  game.js        MK-style select logic (cursors, lock-in, mirror) -> game select
  gameselect.html  the "choose a game" hub
  gameselect.js  7x2 minigame grid (P1 picks; 13 games + the cup)
  traffic.html / traffic_game.js    TRAFFIC RUN (Frogger coin dash, dash button)
  ship.html / ship_game.js          SHIP DASH (one-button mash boat race)
  tournament.html / tournament.js   8-BIT CUP (random games, first to 5 wins)
  cuphook.js     makes each minigame report its winner back to the cup
  countdown.js   shared 3-2-1-GO start countdown (F1 light beeps)
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
