/* 8-BIT PARTY — Graveyard (monster in the middle). Top-down chase: a zombie
 * hunts the nearest living player. It is SLOWER than the players but relentless
 * and can't pass through graves. Punch your rival (lands within range) to knock
 * them down for 0.7s. Get touched by the zombie = out. LAST ONE STANDING WINS.
 * P1 = WASD + Space(punch),  P2 = Arrows + Enter(punch). */
(() => {
  const D = window.GAME_DATA, GY = D.graveyard;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // ---------- sprite helpers ----------
  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]]; if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return { canvas: c, w, h };
  }
  function flip(s) {
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h };
  }
  const GP = GY.palette;
  const S = {}; for (const k of ["monster", "crypt", "headstone", "broken", "tomb", "tree", "fence", "pillar", "lantern", "skull", "bat"]) S[k] = build(GY[k], GP);
  const fight = {}; D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++)
        if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#0b0a14", sp); text(s, x, y, sc, c, sp); };
  const GOLD = "#ffd86b", DIM = "#9a9ab8", P1C = "#ff5d5d", P2C = "#5db4ff", INK = "#100c1c";
  function hsh(x, y, s) { const v = Math.sin(x * 127.1 + y * 311.7 + s * 53.7) * 43758.5; return v - Math.floor(v); }

  // ---------- audio ----------
  function mkAudio(src, vol, loop) { const a = new Audio(src); a.volume = vol; a.loop = !!loop; return a; }
  const sndWalk = mkAudio("sfx/walk.mp3", 0.2, true);
  const sndZombie = mkAudio("sfx/zombie.mp3", 0.18, true);
  let audioReady = false;
  function unlockAudio() { audioReady = true; }
  function playPunch() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.5; a.play().catch(() => {}); }
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!fight[p1name]) p1name = "PIXEL"; if (!fight[p2name]) p2name = "BYTE";

  // ---------- arena layout (screen coords) ----------
  const SC = 4;                                   // background prop scale
  const WALL = { l: 40, r: 920, t: 84, b: 560 };  // inner wall edges = play bounds
  const obstacles = [];
  function drawSpr(g, s, x, y, sc) { g.drawImage(s.canvas, x | 0, y | 0, (s.w * sc) | 0, (s.h * sc) | 0); }
  function stoneAt(g, key, cx, by) {              // place a grave with base centred at (cx,by)
    const s = S[key], w = s.w * SC, h = s.h * SC;
    drawSpr(g, s, cx - w / 2, by - h, SC);
    obstacles.push({ x: cx - w * 0.34, y: by - h * 0.55, w: w * 0.68, h: h * 0.55 });
  }

  const STONES = [
    ["broken", 150, 250], ["headstone", 300, 232], ["tomb", 660, 236], ["headstone", 832, 258],
    ["tomb", 235, 392], ["headstone", 720, 372], ["broken", 850, 446],
    ["headstone", 150, 486], ["broken", 372, 520], ["tomb", 560, 522], ["headstone", 770, 512],
  ];
  const crypt = { cx: 480, by: 224 };
  const spawn = { mon: { x: 480, y: 350 }, p1: { x: 110, y: 512 }, p2: { x: 850, y: 512 } };

  // ---------- pre-render the static background once ----------
  const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
  (function buildBG() {
    const g = bg.getContext("2d"); g.imageSmoothingEnabled = false;
    // grass (dithered low-res, then upscaled)
    const gc = document.createElement("canvas"); gc.width = 240; gc.height = 150;
    const gg = gc.getContext("2d");
    for (let y = 0; y < 150; y++) for (let x = 0; x < 240; x++) {
      const r = hsh(x, y, 1); let c = GP.g;
      if (r < 0.10) c = GP.m; else if (r > 0.60) c = GP.G;
      if (y > 120 && r < 0.5) c = GP.G;
      gg.fillStyle = c; gg.fillRect(x, y, 1, 1);
    }
    g.drawImage(gc, 0, 0, W, H);
    // night sky strip behind the north wall
    g.fillStyle = GP.K; g.fillRect(0, 0, W, 64);
    g.fillStyle = GP.N; g.fillRect(0, 30, W, 18);
    g.fillStyle = GP.V; g.fillRect(0, 48, W, 16);
    for (let i = 0; i < 110; i++) { g.fillStyle = hsh(i, 2, 3) < .4 ? GP.W : GP.v; g.fillRect((hsh(i, 1, 4) * W) | 0, (hsh(i, 7, 5) * 56) | 0, 2, 2); }
    // moon
    const mx = 858, my = 30, mr = 16;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { if (x * x + y * y <= mr * mr) { g.fillStyle = GP.W; g.fillRect(mx + x, my + y, 1, 1); } }
    g.fillStyle = GP.v; for (const c of [[-5, -3, 3], [5, 4, 3], [2, -7, 2]]) for (let y = -c[2]; y <= c[2]; y++) for (let x = -c[2]; x <= c[2]; x++) if (x * x + y * y <= c[2] * c[2]) g.fillRect(mx + c[0] + x, my + c[1] + y, 1, 1);
    drawSpr(g, S.bat, 120, 26, 4); drawSpr(g, S.bat, 360, 16, 4); drawSpr(g, S.bat, 600, 30, 4);

    // walls (stone)
    function wall(x, y, w, h) { g.fillStyle = GP.S; g.fillRect(x, y, w, h); g.fillStyle = GP.M; g.fillRect(x, y, w, Math.min(8, h)); g.fillStyle = GP.K; g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); }
    wall(0, 64, W, 24);                 // north
    wall(0, WALL.b, W, H - WALL.b);     // south
    wall(0, 64, 40, H - 64);            // west
    wall(W - 40, 64, 40, H - 64);       // east
    for (let x = 10; x < W - 10; x += 60) drawSpr(g, S.fence, x, 50, 2);   // fence atop north wall
    drawSpr(g, S.pillar, 6, 56, 4); drawSpr(g, S.pillar, W - 30, 56, 4);

    // props (depth-sorted by base y)
    const props = [];
    props.push([crypt.by, () => { const s = S.crypt, w = s.w * SC; drawSpr(g, s, crypt.cx - w / 2, crypt.by - s.h * SC, SC);
      obstacles.push({ x: crypt.cx - w * 0.42, y: crypt.by - 9 * SC, w: w * 0.84, h: 9 * SC }); }]);
    props.push([240, () => { drawSpr(g, S.tree, 60, 150, SC); obstacles.push({ x: 84, y: 214, w: 28, h: 22 }); }]);
    props.push([240, () => { drawSpr(g, S.tree, W - 132, 150, SC); obstacles.push({ x: W - 108, y: 214, w: 28, h: 22 }); }]);
    for (const [k, x, y] of STONES) props.push([y, () => stoneAt(g, k, x, y)]);
    // lanterns flanking the crypt
    for (const lx of [crypt.cx - 96, crypt.cx + 96]) props.push([300, () => {
      for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) { if (xx * xx + yy * yy <= 49 && (xx + yy) % 2 === 0 && hsh(lx + xx, 300 + yy, 9) < .5) { g.fillStyle = GP.Y; g.fillRect(lx + xx, 300 + yy, 1, 1); } }
      drawSpr(g, S.lantern, lx - S.lantern.w * SC / 2, 300 - S.lantern.h * SC, SC);
    }]);
    // scattered skulls
    for (let i = 0; i < 6; i++) props.push([200 + i, (ix => () => drawSpr(g, S.skull, 80 + hsh(ix, 3, 6) * (W - 160), 130 + hsh(ix, 9, 7) * (H - 200), SC))(i)]);
    props.sort((a, b) => a[0] - b[0]).forEach(p => p[1]());

    // light ground mist along the bottom
    for (let y = H - 60; y < H; y++) for (let x = 0; x < W; x++) { const t = (y - (H - 60)) / 60; if (hsh(x, y, 7) < 0.04 + t * 0.12) { g.fillStyle = (hsh(x, y, 11) < .15) ? GP.W : GP.v; g.fillRect(x, y, 1, 1); } }
  })();

  // ---------- entities ----------
  const PSC = 1.9, MSC = 3.1;
  function ent(name, x, y, color) { return { name, x, y, color, alive: true, face: 1, r: 14, down: 0, punch: 0, cool: 0, walkT: 0, moving: false }; }
  let p1, p2, mon, players, phase, timer, winner, t0, msg, msgT;
  function reset() {
    p1 = ent(p1name, spawn.p1.x, spawn.p1.y, P1C);
    p2 = ent(p2name, spawn.p2.x, spawn.p2.y, P2C);
    players = [p1, p2];
    mon = { x: spawn.mon.x, y: spawn.mon.y, r: 18, bob: 0, walkT: 0, moving: false, face: 1 };
    phase = "ready"; timer = 2.2; winner = null; t0 = 0; msg = ""; msgT = 0;
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    unlockAudio();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) {
      if (e.code === "Space" || e.code === "KeyF") doPunch(p1, p2);
      if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Slash") doPunch(p2, p1);
    }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function doPunch(p, other) {
    if (phase !== "play" || !p.alive || p.down > 0 || p.punch > 0 || p.cool > 0) return;
    p.punch = 0.22; p.cool = 0.55; playPunch();
    const dx = other.x - p.x, dy = other.y - p.y, dd = dx * dx + dy * dy;
    if (Math.abs(dx) > 2) p.face = dx > 0 ? 1 : -1;
    if (other.alive && other.down <= 0 && dd < 72 * 72) {        // landed a hit
      other.down = 0.7;
      const m = Math.hypot(dx, dy) || 1;
      moveEnt(other, dx / m * 16, dy / m * 16);                  // knockback
      msg = (other === p1 ? "P1" : "P2") + " GOT PUNCHED!"; msgT = 1.2;
    }
  }
  function canMove(p) { return p.alive && p.down <= 0 && p.punch <= 0; }

  // ---------- collision ----------
  function blocked(x, y, r) {
    if (x - r < WALL.l || x + r > WALL.r || y - r < WALL.t || y + r > WALL.b) return true;
    for (const o of obstacles) {
      const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    }
    return false;
  }
  function moveEnt(e, dx, dy) {
    if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy;
  }

  // ---------- update ----------
  const PSPD = 188;
  function update(dt) {
    mon.bob += dt * 4;
    // ambient zombie groan only during play
    if (phase === "play" && audioReady) { if (sndZombie.paused) sndZombie.play().catch(() => {}); }
    else if (!sndZombie.paused) sndZombie.pause();

    if (phase === "ready") { timer -= dt; if (timer <= 0) phase = "play"; setWalking(false); return; }
    if (phase === "over") { setWalking(false); return; }
    t0 += dt;
    msgT = Math.max(0, msgT - dt);
    for (const p of players) { p.down = Math.max(0, p.down - dt); p.punch = Math.max(0, p.punch - dt); p.cool = Math.max(0, p.cool - dt); }

    const ps = PSPD * dt; let anyMoving = false;
    const ctrl = [[p1, "KeyW", "KeyS", "KeyA", "KeyD"], [p2, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]];
    for (const [p, U, Dn, L, R] of ctrl) {
      p.moving = false;
      if (canMove(p)) {
        const dx = (held[R] ? 1 : 0) - (held[L] ? 1 : 0), dy = (held[Dn] ? 1 : 0) - (held[U] ? 1 : 0);
        if (dx || dy) { norm(p, dx, dy, ps); p.moving = true; anyMoving = true; p.walkT += dt * 12; }
      }
    }
    setWalking(anyMoving);

    // monster chases the nearest living player — ALWAYS slower than the players
    const alive = players.filter(p => p.alive);
    if (alive.length) {
      let tgt = alive[0], best = 1e9;
      for (const p of alive) { const d = (p.x - mon.x) ** 2 + (p.y - mon.y) ** 2; if (d < best) { best = d; tgt = p; } }
      const ms = (145 + Math.min(28, t0 * 1.1)) * dt;     // ~145 -> 173 px/s, below player 188
      const dx = tgt.x - mon.x, dy = tgt.y - mon.y, m = Math.hypot(dx, dy) || 1;
      const ox = mon.x, oy = mon.y;
      moveEnt(mon, dx / m * ms, dy / m * ms);
      mon.moving = (mon.x !== ox || mon.y !== oy); if (mon.moving) mon.walkT += dt * 9;
      if (Math.abs(dx) > 2) mon.face = dx > 0 ? 1 : -1;
      for (const p of alive) if ((p.x - mon.x) ** 2 + (p.y - mon.y) ** 2 < (p.r + mon.r - 4) ** 2) {
        p.alive = false; msg = (p === p1 ? "P1" : "P2") + " WAS CAUGHT!"; msgT = 2.5;
      }
    }
    const left = players.filter(p => p.alive);
    if (left.length <= 1) { winner = left[0] || null; phase = "over"; }
  }
  function norm(e, dx, dy, sp) {
    if (dx === 0 && dy === 0) return;
    const m = Math.hypot(dx, dy); moveEnt(e, dx / m * sp, dy / m * sp);
    if (dx) e.face = dx > 0 ? 1 : -1;
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  // walk cycle: body bob + legs (split halves) stepping opposite
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    const left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc;
    const hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0;
    const step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale);
    const legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function drawDown(s, cx, feetY, scale) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    ctx.save(); ctx.translate(cx, feetY - h * 0.38); ctx.rotate(Math.PI * 0.46);
    ctx.drawImage(s.canvas, (-w / 2) | 0, (-h / 2) | 0, w, h); ctx.restore();
  }
  function drawStars(p) {
    const cy = p.y - 34;
    for (let i = 0; i < 3; i++) { const a = p.down * 10 + i * 2.1; ctx.fillStyle = i % 2 ? "#ffd86b" : "#f4f4ee"; ctx.fillRect((p.x + Math.cos(a) * 12) | 0, (cy + Math.sin(a) * 4) | 0, 3, 3); }
  }
  function drawFist(p, lunge) {
    const fx = p.x + lunge + p.face * 17, fy = p.y - 6;
    ctx.fillStyle = "#f4f4ee";
    for (const [ox, oy] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3], [3, -3], [-3, 3]]) ctx.fillRect((fx + ox) | 0, (fy + oy) | 0, 2, 2);
    ctx.fillStyle = "#ffd86b"; ctx.fillRect(fx | 0, fy | 0, 3, 3);
  }
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    const w = Math.round(s.w * PSC), h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, w * 0.4);
    if (!p.alive) { ctx.globalAlpha = 0.45; drawDown(s, p.x, feetY, PSC); ctx.globalAlpha = 1; return; }
    if (p.down > 0) { drawDown(s, p.x, feetY, PSC); drawStars(p); }
    else {
      const lunge = p.punch > 0 ? p.face * Math.round(7 * Math.sin((1 - p.punch / 0.22) * Math.PI)) : 0;
      drawAnim(s, p.x + lunge, feetY, PSC, p.walkT, p.moving);
      if (p.punch > 0) drawFist(p, lunge);
    }
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - 6) | 0, 20, 7); text(p === p1 ? "P1" : "P2", tx + 3, (feetY - h - 5) | 0, 1, INK);
  }
  function drawMonster() {
    const s = S.monster, w = Math.round(s.w * MSC), h = Math.round(s.h * MSC);
    const feetY = mon.y + h / 2 + Math.round(Math.sin(mon.bob) * 2);
    for (let yy = -22; yy <= 22; yy++) for (let xx = -22; xx <= 22; xx++) { const d = xx * xx + yy * yy; if (d <= 484 && d > 230 && (xx + yy) % 2 === 0 && hsh(((mon.x + xx) / 2) | 0, ((mon.y + yy) / 2) | 0, (mon.bob * 2) | 0) < .10) { ctx.fillStyle = GP.E; ctx.fillRect((mon.x + xx) | 0, (mon.y + yy) | 0, 2, 2); } }
    shadow(mon.x, mon.y + 10, w * 0.4);
    drawAnim(s, mon.x, feetY, MSC, mon.walkT, mon.moving);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.drawImage(bg, 0, 0);
    // entities depth-sorted
    const ents = [{ y: mon.y, f: drawMonster }, { y: p1.y, f: () => drawPlayer(p1) }, { y: p2.y, f: () => drawPlayer(p2) }];
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());

    // HUD
    ctx.fillStyle = "rgba(16,12,28,.72)"; ctx.fillRect(0, 0, W, 26);
    text(p1name + "  " + (p1.alive ? "ALIVE" : "OUT"), 12, 9, 2, p1.alive ? P1C : "#6a6a86");
    const r2 = p2name + "  " + (p2.alive ? "ALIVE" : "OUT");
    text(r2, W - 12 - tW(r2, 2), 9, 2, p2.alive ? P2C : "#6a6a86");
    tc("GRAVEYARD  -  LAST ONE STANDING", W / 2, 4, 2, GOLD);
    tc("P1 WASD +SPACE PUNCH    P2 ARROWS +ENTER PUNCH    BACKSPACE MENU", W / 2, 17, 1, DIM);

    if (msgT > 0) tc(msg, W / 2, 70, 3, GOLD);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(timer > 0.3 ? String(Math.ceil(timer - 0.2)) : "RUN!", W / 2, H / 2 - 30, 7, GOLD);
      tc("THE MONSTER WAKES - DODGE THE GRAVES - LAST ONE ALIVE WINS", W / 2, H / 2 + 40, 2, "#cfe6ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc((winner === p1 ? "P1" : "P2") + " SURVIVES!", W / 2, 130, 6, GOLD);
        const s = fight[winner.name], scl = 200 / s.h;
        ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 210, s.w * scl, 200);
        tc(winner.name + " WINS", W / 2, 430, 4, winner.color);
      } else { tc("EVERYONE PERISHED!", W / 2, 200, 5, GOLD); tc("THE MONSTER WINS", W / 2, 270, 3, "#79d36a"); }
      tc("ENTER = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }
    window.__gv = { phase, winner: winner ? winner.name : null, a1: p1.alive, a2: p2.alive, d1: +p1.down.toFixed(2), d2: +p2.down.toFixed(2) };
    window.__hook = { tp: (ax, ay, bx, by) => { p1.x = ax; p1.y = ay; p2.x = bx; p2.y = by; }, punch: () => doPunch(p1, p2) };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
