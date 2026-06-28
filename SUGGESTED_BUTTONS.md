# 8-BIT PARTY — Suggested Buttons (Phone Controller)

**Scenario:** the game runs on the **big screen** (TV / monitor). Every player
holds their **phone as a gamepad** — the phone only shows the control buttons and
sends inputs; all gameplay is rendered on the shared screen. Each phone shows the
player's **colour + tag (P1–P4)** at the top so people know who they are.

Below is exactly which buttons each phone needs per game, and what each does.
Buttons map 1:1 to the real keyboard controls already in the code.

---

## Control primitives used

- **D-pad / thumb-stick (4-way)** — up/down/left/right movement (hold to keep moving).
- **L / R buttons** — horizontal-only movement.
- **Action button** — one big round button (dash / fire / jump / punch…), varies per game.
- **Single button** — a game that needs only one input.

---

## The 13 games

### 1. Ship Dash — **1 button (center)**
- **ROW (big center button):** every *tap* is one oar stroke that surges your boat
  forward. Holding does nothing — you must **mash**. Stop tapping and the boat coasts
  to a stop. First boat to the finish wins.

### 2. Football (paddle defense) — **1 button**
- **REVERSE (one button):** your paddle slides back and forth on your wall by itself.
  *Tap* to flip its direction so you're under the ball and block it. That's the only
  input — timing taps is the whole game.

### 3. Flappy — **1 button**
- **FLAP (one button):** each *tap* gives your flyer an upward flap; gravity constantly
  pulls you down. Tap a rhythm to thread the pipes. Most pipes passed wins.

### 4. Red Light / Green Light — **1 button (hold)**
- **RUN (one hold-button):** **hold** to run down your lane, **release** to stop.
  Move while the catcher faces you (RED) and you're snapped back to the start. No
  direction needed — you only ever go forward. First to the finish wins.

### 5. Meteor Derby (space pods) — **2 buttons: ◀ LEFT · ▶ RIGHT**
- **LEFT / RIGHT:** slide your pod along its lane (hold to keep moving). Pods bump each
  other automatically like billiard balls. Dodge the falling meteors — 3 hits and
  you're out. No action button. Last pod flying wins.

### 6. Runner (auto-scroll platformer) — **3 buttons: ◀ LEFT · ▶ RIGHT · JUMP**
- **LEFT / RIGHT:** run (the level auto-scrolls; don't fall off the left edge or into pits).
- **JUMP:** hop over gaps and onto blocks. Last one keeping up wins.

### 7. Slime Volley — **3 buttons: ◀ LEFT · ▶ RIGHT · JUMP**
- **LEFT / RIGHT:** move along your hole.
- **JUMP:** the only action — jump to bump/head the ball over the net into someone
  else's hole. Keep it out of yours (start 3 lives). Last one standing wins.

### 8. Tank Duel — **D-pad (4-way) + FIRE**
- **D-pad / stick:** drive the tank in 4 directions (the way you press is the way the
  barrel points).
- **FIRE:** shoot a shell — destroys brick, stopped by steel, flies over water, through
  bushes. One hit and you're scrap. Last tank rolling wins.

### 9. Crown Grab — **D-pad (4-way) + DASH**
- **D-pad / stick:** run around the arena. Simply **touching** the crown-bearer takes
  the crown.
- **DASH:** lunge in the direction you're holding — bonk a rival to black them out 1s
  (and steal the crown if they had it). Hold the crown longest to win.

### 10. Tile Blitz — **D-pad (4-way) + DASH**
- **D-pad / stick:** walk to paint tiles in your colour (and steal rivals' tiles by
  walking over them).
- **DASH:** dash into a rival to black them out 1s. Most tiles when time ends wins.

### 11. Hot Potato — **D-pad (4-way) + PASS (dash)**
- **D-pad / stick:** move around.
- **PASS / DASH:** lunge into another player to hand off the ticking bomb (you can also
  pass by just touching). Holding it when the fuse blows = eliminated. Last one left wins.

### 12. Traffic Run — **D-pad (4-way) + DASH**
- **D-pad / stick:** cross the lanes of traffic; the higher up the coin, the more it's
  worth. Get run over and you're flung back (no points lost).
- **DASH:** a quick burst in the direction you're holding to slip through gaps.
  First to 15 points wins.

### 13. Graveyard — **D-pad (4-way) + ACTION (punch / lunge)**
- **D-pad / stick:** move; avoid the monster and dead players' souls.
- **ACTION:** while alive it's a **punch** (knock a rival down 0.7s). When you die you
  control your floating **soul** — the same button becomes a **lunge/grab** to catch
  survivors. Last player alive wins.

---

## Quick reference

| Game | Movement | Action button(s) |
|------|----------|------------------|
| Ship Dash | — | 1 button: **ROW** (mash) |
| Football | — | 1 button: **REVERSE** (tap) |
| Flappy | — | 1 button: **FLAP** (tap) |
| Red Light/Green Light | — | 1 button: **RUN** (hold) |
| Meteor Derby | LEFT / RIGHT | — |
| Runner | LEFT / RIGHT | **JUMP** |
| Slime Volley | LEFT / RIGHT | **JUMP** |
| Tank Duel | D-pad (4-way) | **FIRE** |
| Crown Grab | D-pad (4-way) | **DASH** |
| Tile Blitz | D-pad (4-way) | **DASH** |
| Hot Potato | D-pad (4-way) | **PASS** (dash) |
| Traffic Run | D-pad (4-way) | **DASH** |
| Graveyard | D-pad (4-way) | **PUNCH / LUNGE** |

---

## Shared (lobby / menus)

Outside the minigames the phone only needs a tiny set of buttons:

- **Main menu / pause:** **UP · DOWN · SELECT (A)** and **BACK (B)** — to move through
  PLAY / SETTINGS / QUIT and the pause menu.
- **Character select:** **UP · DOWN · LEFT · RIGHT** to move the cursor over the roster
  and **LOCK IN (A)**; **BACK (B)** to unlock / leave.
- **Game select:** only **P1's** phone drives it — **D-pad** to move the cursor and
  **PICK (A)**; **BACK (B)** to go back.

A single generic template covers all menus: a 4-way pad + **A (confirm)** + **B (back)**.
