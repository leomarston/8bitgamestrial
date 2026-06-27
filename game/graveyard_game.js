/* 8-BIT PARTY — Graveyard (die-and-haunt tag), 2–4 players. One AI monster starts
 * in the middle and hunts the nearest LIVING player. Get caught — by the monster
 * OR by a player-soul — and you DIE: your body drops and stays where it fell, and
 * YOU now control your SOUL (a floating spirit) to hunt the survivors. LAST PLAYER
 * ALIVE WINS. The living can punch rivals (knock down 0.7s); souls can lunge to grab.
 * Each soul keeps its owner's colour ring + tag. (The soul twist only changes play
 * at 3–4 players; 2-player is plain last-one-alive.)
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, GY = D.graveyard;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    return { canvas: c, w, h };
  }
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  function tint(s, col) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.drawImage(s.canvas, 0, 0); g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.55; g.fillStyle = col; g.fillRect(0, 0, s.w, s.h); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; return { canvas: c, w: s.w, h: s.h }; }
  const GP = GY.palette;
  const S = {}; for (const k of ["monster", "crypt", "headstone", "broken", "tomb", "tree", "fence", "pillar", "lantern", "skull", "bat"]) S[k] = build(GY[k], GP);
  const fight = {}, soul = {}, dead = {};
  const SOUL_TINT = "#bfe6ff", DEAD_TINT = "#463f52";   // soul = pale spectral blue, corpse = drained grey-purple
  D.roster.forEach(c => {
    fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(fight[c.name]);
    soul[c.name] = tint(fight[c.name], SOUL_TINT); soul[c.name + "_f"] = tint(fight[c.name + "_f"], SOUL_TINT);
    dead[c.name] = tint(fight[c.name], DEAD_TINT); dead[c.name + "_f"] = tint(fight[c.name + "_f"], DEAD_TINT);
  });
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd86b", DIM = "#9a9ab8", INK = "#100c1c", ZC = "#bfe6ff";   // ZC = soul colour
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  function hsh(x, y, s) { const v = Math.sin(x * 127.1 + y * 311.7 + s * 53.7) * 43758.5; return v - Math.floor(v); }

  function mkAudio(src, vol, loop) { const a = new Audio(src); a.volume = vol; a.loop = !!loop; return a; }
  const sndWalk = mkAudio("sfx/walk.mp3", 0.2, true), sndZombie = mkAudio("sfx/zombie.mp3", 0.18, true);
  let audioReady = false; function unlockAudio() { audioReady = true; }
  function playPunch() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.5; a.play().catch(() => {}); }
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => fight[n] ? n : "PIXEL");

  // ---------- arena ----------
  const SC = 4, WALL = { l: 40, r: 920, t: 84, b: 560 };
  const obstacles = [];
  function drawSpr(g, s, x, y, sc) { g.drawImage(s.canvas, x | 0, y | 0, (s.w * sc) | 0, (s.h * sc) | 0); }
  function stoneAt(g, key, cx, by) { const s = S[key], w = s.w * SC, h = s.h * SC; drawSpr(g, s, cx - w / 2, by - h, SC); obstacles.push({ x: cx - w * 0.34, y: by - h * 0.55, w: w * 0.68, h: h * 0.55 }); }
  const STONES = [
    ["broken", 150, 250], ["headstone", 300, 232], ["tomb", 660, 236], ["headstone", 832, 258],
    ["tomb", 235, 392], ["headstone", 720, 372], ["broken", 850, 446],
    ["headstone", 150, 486], ["broken", 372, 520], ["tomb", 560, 522], ["headstone", 770, 512],
  ];
  const crypt = { cx: 480, by: 224 };
  const spawnMon = { x: 480, y: 350 };
  const SPAWN = [[110, 512], [850, 512], [110, 168], [850, 168]];

  const bg = document.createElement("canvas"); bg.width = W; bg.height = H;
  (function buildBG() {
    const g = bg.getContext("2d"); g.imageSmoothingEnabled = false;
    const gc = document.createElement("canvas"); gc.width = 240; gc.height = 150; const gg = gc.getContext("2d");
    for (let y = 0; y < 150; y++) for (let x = 0; x < 240; x++) { const r = hsh(x, y, 1); let c = GP.g; if (r < 0.10) c = GP.m; else if (r > 0.60) c = GP.G; if (y > 120 && r < 0.5) c = GP.G; gg.fillStyle = c; gg.fillRect(x, y, 1, 1); }
    g.drawImage(gc, 0, 0, W, H);
    g.fillStyle = GP.K; g.fillRect(0, 0, W, 64); g.fillStyle = GP.N; g.fillRect(0, 30, W, 18); g.fillStyle = GP.V; g.fillRect(0, 48, W, 16);
    for (let i = 0; i < 110; i++) { g.fillStyle = hsh(i, 2, 3) < .4 ? GP.W : GP.v; g.fillRect((hsh(i, 1, 4) * W) | 0, (hsh(i, 7, 5) * 56) | 0, 2, 2); }
    const mx = 858, my = 30, mr = 16;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr) { g.fillStyle = GP.W; g.fillRect(mx + x, my + y, 1, 1); }
    g.fillStyle = GP.v; for (const c of [[-5, -3, 3], [5, 4, 3], [2, -7, 2]]) for (let y = -c[2]; y <= c[2]; y++) for (let x = -c[2]; x <= c[2]; x++) if (x * x + y * y <= c[2] * c[2]) g.fillRect(mx + c[0] + x, my + c[1] + y, 1, 1);
    drawSpr(g, S.bat, 120, 26, 4); drawSpr(g, S.bat, 360, 16, 4); drawSpr(g, S.bat, 600, 30, 4);
    function wall(x, y, w, h) { g.fillStyle = GP.S; g.fillRect(x, y, w, h); g.fillStyle = GP.M; g.fillRect(x, y, w, Math.min(8, h)); g.fillStyle = GP.K; g.fillRect(x, y, w, 2); g.fillRect(x, y + h - 2, w, 2); }
    wall(0, 64, W, 24); wall(0, WALL.b, W, H - WALL.b); wall(0, 64, 40, H - 64); wall(W - 40, 64, 40, H - 64);
    for (let x = 10; x < W - 10; x += 60) drawSpr(g, S.fence, x, 50, 2);
    drawSpr(g, S.pillar, 6, 56, 4); drawSpr(g, S.pillar, W - 30, 56, 4);
    const props = [];
    props.push([crypt.by, () => { const s = S.crypt, w = s.w * SC; drawSpr(g, s, crypt.cx - w / 2, crypt.by - s.h * SC, SC); obstacles.push({ x: crypt.cx - w * 0.42, y: crypt.by - 9 * SC, w: w * 0.84, h: 9 * SC }); }]);
    props.push([240, () => { drawSpr(g, S.tree, 60, 150, SC); obstacles.push({ x: 84, y: 214, w: 28, h: 22 }); }]);
    props.push([240, () => { drawSpr(g, S.tree, W - 132, 150, SC); obstacles.push({ x: W - 108, y: 214, w: 28, h: 22 }); }]);
    for (const [k, x, y] of STONES) props.push([y, () => stoneAt(g, k, x, y)]);
    for (const lx of [crypt.cx - 96, crypt.cx + 96]) props.push([300, () => {
      for (let yy = -7; yy <= 7; yy++) for (let xx = -7; xx <= 7; xx++) if (xx * xx + yy * yy <= 49 && (xx + yy) % 2 === 0 && hsh(lx + xx, 300 + yy, 9) < .5) { g.fillStyle = GP.Y; g.fillRect(lx + xx, 300 + yy, 1, 1); }
      drawSpr(g, S.lantern, lx - S.lantern.w * SC / 2, 300 - S.lantern.h * SC, SC);
    }]);
    for (let i = 0; i < 6; i++) props.push([200 + i, (ix => () => drawSpr(g, S.skull, 80 + hsh(ix, 3, 6) * (W - 160), 130 + hsh(ix, 9, 7) * (H - 200), SC))(i)]);
    props.sort((a, b) => a[0] - b[0]).forEach(p => p[1]());
    for (let y = H - 60; y < H; y++) for (let x = 0; x < W; x++) { const t = (y - (H - 60)) / 60; if (hsh(x, y, 7) < 0.04 + t * 0.12) { g.fillStyle = (hsh(x, y, 11) < .15) ? GP.W : GP.v; g.fillRect(x, y, 1, 1); } }
  })();

  // ---------- entities ----------
  const PSC = 1.9, MSC = 3.1, PSPD = 188, ZSPD = 166, FLOAT = 16;   // FLOAT = how high a soul hovers
  function ent(name, x, y, color, tag) { return { name, x, y, color, tag, state: "human", face: 1, r: 14, down: 0, punch: 0, cool: 0, lunge: 0, walkT: 0, moving: false }; }
  const CTRL = [
    { U: "KeyW", Dn: "KeyS", L: "KeyA", Rt: "KeyD", act: ["Space"] },
    { U: "ArrowUp", Dn: "ArrowDown", L: "ArrowLeft", Rt: "ArrowRight", act: ["Enter", "NumpadEnter"] },
    { U: "KeyI", Dn: "KeyK", L: "KeyJ", Rt: "KeyL", act: ["KeyO", "KeyU"] },
    { U: "KeyT", Dn: "KeyG", L: "KeyF", Rt: "KeyH", act: ["KeyR", "KeyY"] },
  ];
  let players, mon, phase, timer, winner, t0, msg, msgT, corpses;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function reset() {
    players = []; corpses = [];
    const slots = shuffle([0, 1, 2, 3].slice(0, count));   // randomised corners — no fixed spot
    for (let i = 0; i < count; i++) { const sp = SPAWN[slots[i]]; players.push(ent(NAMES[i], sp[0], sp[1], PCOL[i], "P" + (i + 1))); }
    mon = { x: spawnMon.x, y: spawnMon.y, r: 18, bob: 0, walkT: 0, moving: false, face: 1, avoid: 0 };
    phase = "ready"; timer = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); winner = null; t0 = 0; msg = ""; msgT = 0;
  }
  reset();

  const held = {};
  window.addEventListener("keydown", e => {
    unlockAudio();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) { for (let i = 0; i < count; i++) if (CTRL[i].act.includes(e.code)) { const p = players[i]; p.state === "human" ? doPunch(p) : doLunge(p); break; } }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function doPunch(p) {
    if (phase !== "play" || p.down > 0 || p.punch > 0 || p.cool > 0) return;
    p.punch = 0.22; p.cool = 0.55; playPunch();
    let tgt = null, bd = 1e9;
    for (const o of players) if (o !== p && o.state === "human" && o.down <= 0) { const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d < bd) { bd = d; tgt = o; } }
    if (tgt && bd < 72 * 72) { const dx = tgt.x - p.x, dy = tgt.y - p.y; if (Math.abs(dx) > 2) p.face = dx > 0 ? 1 : -1; tgt.down = 0.7; const m = Math.hypot(dx, dy) || 1; moveEnt(tgt, dx / m * 16, dy / m * 16); msg = tgt.tag + " GOT PUNCHED!"; msgT = 1.2; }
  }
  function doLunge(z) { if (phase !== "play" || z.cool > 0 || z.lunge > 0) return; z.lunge = 0.22; z.cool = 0.5; }
  function blocked(x, y, r) {
    if (x - r < WALL.l || x + r > WALL.r || y - r < WALL.t || y + r > WALL.b) return true;
    for (const o of obstacles) { const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h)); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
    return false;
  }
  function moveEnt(e, dx, dy) { if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx; if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy; }
  function norm(e, dx, dy, sp) { if (!dx && !dy) return; const m = Math.hypot(dx, dy); moveEnt(e, dx / m * sp, dy / m * sp); if (dx) e.face = dx > 0 ? 1 : -1; }

  function monStep(spd) {
    const humans = players.filter(p => p.state === "human"); if (!humans.length) { mon.moving = false; return; }
    let tgt = humans[0], best = 1e9;
    for (const p of humans) { const d = (p.x - mon.x) ** 2 + (p.y - mon.y) ** 2; if (d < best) { best = d; tgt = p; } }
    const base = Math.atan2(tgt.y - mon.y, tgt.x - mon.x), ox = mon.x;
    const tryA = a => { const nx = mon.x + Math.cos(a) * spd, ny = mon.y + Math.sin(a) * spd; if (!blocked(nx, ny, mon.r)) { mon.x = nx; mon.y = ny; return true; } return false; };
    mon.moving = false;
    if (tryA(base)) { mon.avoid = 0; mon.moving = true; }
    else { const sides = mon.avoid >= 0 ? [1, -1] : [-1, 1]; for (const s of sides) { let done = false; for (const off of [0.6, 1.0, 1.45, 1.9, 2.4]) if (tryA(base + s * off)) { mon.avoid = s; mon.moving = true; done = true; break; } if (done) break; } }
    if (Math.abs(mon.x - ox) > 0.2) mon.face = mon.x > ox ? 1 : -1;
  }

  function update(dt) {
    mon.bob += dt * 4;
    if (phase === "play" && audioReady) { if (sndZombie.paused) sndZombie.play().catch(() => {}); } else if (!sndZombie.paused) sndZombie.pause();
    if (phase === "ready") { timer -= dt; if (timer <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } setWalking(false); return; }
    if (phase === "over") { setWalking(false); return; }
    t0 += dt; msgT = Math.max(0, msgT - dt);
    for (const p of players) { p.down = Math.max(0, p.down - dt); p.punch = Math.max(0, p.punch - dt); p.cool = Math.max(0, p.cool - dt); p.lunge = Math.max(0, p.lunge - dt); }

    let anyMoving = false;
    for (let i = 0; i < count; i++) {
      const p = players[i], c = CTRL[i], isZ = p.state === "zombie"; p.moving = false;
      const movable = isZ || (p.down <= 0 && p.punch <= 0);
      if (movable) { const dx = (held[c.Rt] ? 1 : 0) - (held[c.L] ? 1 : 0), dy = (held[c.Dn] ? 1 : 0) - (held[c.U] ? 1 : 0);
        if (dx || dy) { const sp = isZ ? (p.lunge > 0 ? ZSPD * 2.0 : ZSPD) : PSPD; norm(p, dx, dy, sp * dt); p.moving = true; if (!isZ) anyMoving = true; p.walkT += dt * 12; } }   // souls glide silently — no footstep SFX
    }
    setWalking(anyMoving);

    const ms = (108 + Math.min(28, t0 * 0.8)) * dt; monStep(ms); if (mon.moving) mon.walkT += dt * 9;

    // conversions: the AI monster OR any player-soul that touches a human kills it —
    // the body drops and stays, and that player now controls the rising soul.
    const turn = new Set();
    for (const p of players) if (p.state === "human" && (p.x - mon.x) ** 2 + (p.y - mon.y) ** 2 < (p.r + mon.r - 4) ** 2) turn.add(p);
    for (const z of players) if (z.state === "zombie") for (const h of players) if (h.state === "human" && (h.x - z.x) ** 2 + (h.y - z.y) ** 2 < (h.r + z.r - 2) ** 2) turn.add(h);
    for (const p of turn) {
      corpses.push({ x: p.x, y: p.y, name: p.name, face: p.face });   // the body stays where it fell
      p.state = "zombie"; p.down = 0; p.punch = 0; p.lunge = 0; p.cool = 0; msg = p.tag + " DIED!"; msgT = 1.8;
    }

    const humans = players.filter(p => p.state === "human");
    if (humans.length <= 1) { winner = humans[0] || null; phase = "over"; }
  }

  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale), left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc, hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0, step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale), legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function drawDown(s, cx, feetY, scale) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.save(); ctx.translate(cx, feetY - h * 0.38); ctx.rotate(Math.PI * 0.46); ctx.drawImage(s.canvas, (-w / 2) | 0, (-h / 2) | 0, w, h); ctx.restore(); }
  function drawStars(p) { const cy = p.y - 34; for (let i = 0; i < 3; i++) { const a = p.down * 10 + i * 2.1; ctx.fillStyle = i % 2 ? "#ffd86b" : "#f4f4ee"; ctx.fillRect((p.x + Math.cos(a) * 12) | 0, (cy + Math.sin(a) * 4) | 0, 3, 3); } }
  function drawFist(p, lunge) { const fx = p.x + lunge + p.face * 17, fy = p.y - 6; ctx.fillStyle = "#f4f4ee"; for (const [ox, oy] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3], [3, -3], [-3, 3]]) ctx.fillRect((fx + ox) | 0, (fy + oy) | 0, 2, 2); ctx.fillStyle = "#ffd86b"; ctx.fillRect(fx | 0, fy | 0, 3, 3); }
  function ownerRing(p, gy) {   // colour-coded ground marker so each dead player can spot THEIR soul
    const rw = 15, rh = rw * 0.42;
    ctx.save();
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(8,8,16,.6)";   // dark halo = contrast on grass
    ctx.beginPath(); ctx.ellipse(p.x, gy, rw, rh, 0, 0, 7); ctx.stroke();
    ctx.globalAlpha = 0.34; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.ellipse(p.x, gy, rw, rh, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = p.color;
    ctx.beginPath(); ctx.ellipse(p.x, gy, rw, rh, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }
  function drawCorpse(c) {       // the body, fallen and lying where it died
    const s = c.face < 0 ? dead[c.name + "_f"] : dead[c.name];
    shadow(c.x, c.y + 8, s.w * PSC * 0.46);
    drawDown(s, c.x, c.y + 8, PSC);
  }
  function drawSoul(p) {         // the player-controlled spirit: translucent, floating above the body
    const s = p.face < 0 ? soul[p.name + "_f"] : soul[p.name];
    const w = Math.round(s.w * PSC), h = Math.round(s.h * PSC);
    const feetY = p.y + 8 - FLOAT + Math.sin(p.walkT * 0.4 + p.x * 0.04) * 2;   // hovers + gently bobs
    ownerRing(p, p.y + 7);
    ctx.save();
    const wy = (feetY - 2) | 0, wh = Math.max(0, (p.y + 4) - wy);
    ctx.globalAlpha = 0.16; ctx.fillStyle = ZC; ctx.fillRect((p.x - 1) | 0, wy, 3, wh);   // faint wisp tether to the ground
    ctx.globalAlpha = 0.66; ctx.drawImage(s.canvas, (p.x - w / 2) | 0, (feetY - h) | 0, w, h);   // glides (no footsteps)
    ctx.restore();
    const tx = (p.x - 9) | 0, ty = (feetY - h - 6) | 0;
    ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK);
  }
  function drawPlayer(p) {
    if (p.state === "zombie") return drawSoul(p);
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    const w = Math.round(s.w * PSC), h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, w * 0.4);
    if (p.down > 0) { drawDown(s, p.x, feetY, PSC); drawStars(p); }
    else { const lunge = p.punch > 0 ? p.face * Math.round(7 * Math.sin((1 - p.punch / 0.22) * Math.PI)) : 0; drawAnim(s, p.x + lunge, feetY, PSC, p.walkT, p.moving); if (p.punch > 0) drawFist(p, lunge); }
    const tx = (p.x - 9) | 0, ty = (feetY - h - 6) | 0;
    ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK);
  }
  function drawMonster() {
    const s = S.monster, w = Math.round(s.w * MSC), h = Math.round(s.h * MSC), feetY = mon.y + h / 2 + Math.round(Math.sin(mon.bob) * 2);
    for (let yy = -22; yy <= 22; yy++) for (let xx = -22; xx <= 22; xx++) { const d = xx * xx + yy * yy; if (d <= 484 && d > 230 && (xx + yy) % 2 === 0 && hsh(((mon.x + xx) / 2) | 0, ((mon.y + yy) / 2) | 0, (mon.bob * 2) | 0) < .10) { ctx.fillStyle = GP.E; ctx.fillRect((mon.x + xx) | 0, (mon.y + yy) | 0, 2, 2); } }
    shadow(mon.x, mon.y + 10, w * 0.4); drawAnim(s, mon.x, feetY, MSC, mon.walkT, mon.moving);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.drawImage(bg, 0, 0);
    for (const c of corpses) drawCorpse(c);   // bodies lie on the ground, under everything that still moves
    const ents = [{ y: mon.y, f: drawMonster }]; players.forEach(p => ents.push({ y: p.y, f: () => drawPlayer(p) }));
    ents.sort((a, b) => a.y - b.y).forEach(e => e.f());

    ctx.fillStyle = "rgba(16,12,28,.72)"; ctx.fillRect(0, 0, W, 26);
    const colW = (W - 24) / count;
    for (let i = 0; i < count; i++) { const p = players[i], x = 12 + i * colW, z = p.state === "zombie";
      text(p.tag, x, 9, 1, p.color);                                   // identity always in player colour
      text(z ? "SOUL" : "ALIVE", x + tW(p.tag + " ", 1), 9, 1, z ? ZC : DIM); }

    if (msgT > 0) tc(msg, W / 2, 70, 3, GOLD);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(Countdown.label(timer, "RUN!"), W / 2, H / 2 - 30, 7, GOLD);
      tc(count + " ALIVE - GET CAUGHT = YOU DIE & CONTROL YOUR SOUL - LAST ALIVE WINS", W / 2, H / 2 + 40, 2, "#cfe6ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " SURVIVES!", W / 2, 120, 6, GOLD); const s = fight[winner.name], scl = 200 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 200, s.w * scl, 200); tc(winner.name + " WINS", W / 2, 420, 4, winner.color); }
      else { tc("THE DEAD WIN!", W / 2, 200, 5, GOLD); tc("EVERY SOUL ESCAPED", W / 2, 270, 3, ZC); }
      tc("ENTER = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }
    window.__gv = { phase, count, winner: winner ? winner.tag : null, states: players.map(p => p.state) };
    window.__hook = { tp: (i, x, y) => { if (players[i]) { players[i].x = x; players[i].y = y; } }, punch: i => players[i] && (players[i].state === "human" ? doPunch(players[i]) : doLunge(players[i])), setMon: (x, y) => { mon.x = x; mon.y = y; }, mon: () => ({ x: Math.round(mon.x), y: Math.round(mon.y) }), states: () => players.map(p => p.state) };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
