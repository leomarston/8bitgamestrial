/* 8-BIT PARTY — HOT POTATO, 2–4 player elimination. One player holds a lit bomb;
 * the fuse counts down. PASS it by touching (or dashing into) another player. When
 * the fuse blows, whoever holds it is ELIMINATED — a fresh bomb goes to a random
 * survivor and it repeats until ONE remains = winner.
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, HP = D.hotpotato;
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
  const fight = {}; D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const bombS = build(HP.bombSmall, HP.palette), boomS = build(HP.boom, HP.palette);
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd03c", DIM = "#9a9ab8", INK = "#15121f", CREAM = "#fff0b4", FIRE = "#ff8e34";
  const PCOL = ["#eb483c", "#4a76c4", "#6bd66b", "#ffd54a"];

  const sndWalk = (() => { const a = new Audio("sfx/walk.mp3"); a.volume = 0.18; a.loop = true; return a; })();
  let audioReady = false;
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }
  function playTag() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.32; a.play().catch(() => {}); }
  function playBoom() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.6; a.play().catch(() => {}); }

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => fight[n] ? n : "PIXEL");
  const CTRL = [
    { U: "KeyW", Dn: "KeyS", L: "KeyA", Rt: "KeyD", dash: ["Space"] },
    { U: "ArrowUp", Dn: "ArrowDown", L: "ArrowLeft", Rt: "ArrowRight", dash: ["Enter", "NumpadEnter"] },
    { U: "KeyI", Dn: "KeyK", L: "KeyJ", Rt: "KeyL", dash: ["KeyO", "KeyU"] },
    { U: "KeyT", Dn: "KeyG", L: "KeyF", Rt: "KeyH", dash: ["KeyR", "KeyY"] },
  ];

  // ---------- maps ----------
  const MAPS = HP.maps.map(m => {
    const s = m.scale;
    return {
      img: (() => { const im = new Image(); im.src = m.bg; return im; })(),
      bounds: { l: m.bounds.l * s, r: m.bounds.r * s, t: m.bounds.t * s, b: m.bounds.b * s },
      obstacles: m.obstacles.map(o => o.type === "circle" ? { type: "circle", x: o.x * s, y: o.y * s, r: o.r * s } : { type: "rect", x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s }),
      spawns: m.spawn.p.map(q => [q[0] * s, q[1] * s]),
      name: m.bg.indexOf("map2") >= 0 ? "THE STREET" : (m.bg.indexOf("map3") >= 0 ? "THE HOUSE" : "THE YARD"),
    };
  });
  let mapsLoaded = 0; MAPS.forEach(m => { m.img.onload = () => mapsLoaded++; });

  // ---------- entities ----------
  const PSC = 2.4, R = 14, PSPD = 196, DASH_TIME = 0.16, DASH_COOL = 0.55, DASH_SPEED = 500, PASS_COOL = 0.6, FUSE_MIN = 7, FUSE_MAX = 13, HOLDER_BOOST = 1.05;
  function ent(name, color, tag) { return { name, color, tag, alive: true, x: 0, y: 0, face: 1, dash: 0, dashDir: [1, 0], dashCool: 0, walkT: 0, moving: false, r: R }; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let players, map, mapIdx, bomb, fuse, fuseMax, passCool, phase, ready, boomT, loser, winner, flick, msg, msgT, sparks;

  function newBomb() {
    const alive = players.filter(p => p.alive);
    bomb.holder = alive[Math.floor(Math.random() * alive.length)];
    fuseMax = FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN); fuse = fuseMax; passCool = 0.7;
  }
  function reset() {
    mapIdx = Math.floor(Math.random() * MAPS.length); map = MAPS[mapIdx];
    const order = shuffle([0, 1, 2, 3].slice(0, count)); players = [];
    for (let i = 0; i < count; i++) { const p = ent(NAMES[i], PCOL[i], "P" + (i + 1)); const s = map.spawns[order[i]]; p.x = s[0]; p.y = s[1]; p.face = s[0] < W / 2 ? 1 : -1; players.push(p); }
    bomb = { holder: null }; newBomb();
    phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); boomT = 0; loser = winner = null; flick = 0; msg = ""; msgT = 0; sparks = [];
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) { for (let i = 0; i < count; i++) if (players[i].alive && CTRL[i].dash.includes(e.code)) { doDash(players[i]); break; } }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function dirFor(i) { const c = CTRL[i]; return [(held[c.Rt] ? 1 : 0) - (held[c.L] ? 1 : 0), (held[c.Dn] ? 1 : 0) - (held[c.U] ? 1 : 0)]; }
  function doDash(p) {
    if (phase !== "play" || p.dashCool > 0 || p.dash > 0) return;
    const i = players.indexOf(p); let [dx, dy] = dirFor(i); if (dx === 0 && dy === 0) { dx = p.face; dy = 0; }
    const m = Math.hypot(dx, dy) || 1; p.dashDir = [dx / m, dy / m]; p.dash = DASH_TIME; p.dashCool = DASH_COOL; p.face = dx > 0 ? 1 : (dx < 0 ? -1 : p.face);
  }

  // ---------- collision ----------
  function blocked(x, y, r) {
    const b = map.bounds;
    if (x - r < b.l || x + r > b.r || y - r < b.t || y + r > b.b) return true;
    for (const o of map.obstacles) {
      if (o.type === "circle") { if ((x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2) return true; }
      else { const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h)); if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
    }
    return false;
  }
  function moveEnt(e, dx, dy) { if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx; if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy; }

  // ---------- update ----------
  function update(dt) {
    flick += dt; msgT = Math.max(0, msgT - dt);
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; } sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } setWalking(false); return; }
    if (phase === "boom") {
      boomT -= dt; setWalking(false);
      if (boomT <= 0) {                                   // resolve: holder is eliminated
        loser.alive = false;
        const alive = players.filter(p => p.alive);
        if (alive.length <= 1) { winner = alive[0] || null; phase = "over"; }
        else { newBomb(); phase = "play"; msg = loser.tag + " BLEW UP!"; msgT = 1.6; }
      }
      return;
    }
    if (phase === "over") { setWalking(false); return; }

    passCool = Math.max(0, passCool - dt); fuse = Math.max(0, fuse - dt);
    let anyMoving = false;
    for (let i = 0; i < count; i++) {
      const p = players[i]; if (!p.alive) continue;
      p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt); p.moving = false;
      const boost = bomb.holder === p ? HOLDER_BOOST : 1;   // whoever holds the bomb scrambles a bit faster
      if (p.dash > 0) { moveEnt(p, p.dashDir[0] * DASH_SPEED * dt, p.dashDir[1] * DASH_SPEED * dt); p.moving = true; p.walkT += dt * 20; }
      else { const [dx, dy] = dirFor(i); if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * boost * dt, dy / m * PSPD * boost * dt); if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; } }
    }
    setWalking(anyMoving);

    // pass: the holder touching any other alive player hands the bomb over.
    // Guard on fuse>0 so a pass on the exact tick the fuse hits 0 can't dump the blast on the receiver.
    if (passCool <= 0 && fuse > 0 && bomb.holder && bomb.holder.alive) {
      for (const o of players) {
        if (o === bomb.holder || !o.alive) continue;
        if ((bomb.holder.x - o.x) ** 2 + (bomb.holder.y - o.y) ** 2 < (bomb.holder.r + o.r + 4) ** 2) { bomb.holder = o; passCool = PASS_COOL; playTag(); break; }
      }
    }
    if (fuse <= 0) { loser = bomb.holder; phase = "boom"; boomT = 1.0; playBoom(); }
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  function drawSprRaw(s, cx, feetY, scale, alpha) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), feetY - h, w, h); ctx.globalAlpha = 1; }
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale), left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc, hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0, step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale), legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function carriedBomb(p, feetY, h) {
    const bs = 2.2, bw = Math.round(bombS.w * bs), bh = Math.round(bombS.h * bs), y = feetY - h - bh + 3;
    ctx.drawImage(bombS.canvas, Math.round(p.x - bw / 2), y, bw, bh);
    const rate = 6 + (1 - fuse / fuseMax) * 22;
    if (Math.sin(flick * rate) > 0) { ctx.fillStyle = (Math.sin(flick * rate * 1.7) > 0) ? CREAM : FIRE; ctx.fillRect((p.x + 6) | 0, (y - 2) | 0, 3, 3); }
  }
  function drawPlayer(p) {
    if (!p.alive) return;
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name], h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    if (phase === "boom" && p === loser) { drawSprRaw(s, p.x, feetY, PSC, 0.25); return; }
    if (p.dash > 0) for (let i = 1; i <= 3; i++) drawSprRaw(s, p.x - p.dashDir[0] * i * 7, feetY - p.dashDir[1] * i * 7, PSC, 0.12 * (4 - i));
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    if (bomb.holder === p) carriedBomb(p, feetY, h);
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - (bomb.holder === p ? 22 : 7)) | 0, 20, 7); text(p.tag, tx + 3, (feetY - h - (bomb.holder === p ? 21 : 6)) | 0, 1, INK);
  }
  function drawBoom() {
    if (!loser) return;
    const k = 1 - boomT / 1.0, sc = 3 + k * 6, w = Math.round(boomS.w * sc), hh = Math.round(boomS.h * sc);
    ctx.globalAlpha = Math.max(0, 1 - k * 0.6); ctx.drawImage(boomS.canvas, Math.round(loser.x - w / 2), Math.round(loser.y - hh / 2), w, hh); ctx.globalAlpha = 1;
    if (k < 0.4) { ctx.fillStyle = "rgba(255,220,150," + (0.5 - k) + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function hud() {
    ctx.fillStyle = "rgba(10,12,26,.78)"; ctx.fillRect(0, 0, W, 32);
    const colW = (W - 8) / count;
    for (let i = 0; i < count; i++) {
      const p = players[i], px = 6 + i * colW, hold = bomb.holder === p && p.alive;
      if (hold) ctx.drawImage(bombS.canvas, px, 5, bombS.w * 2, bombS.h * 2);
      const nx = hold ? px + 18 : px;
      text(p.tag + " " + p.name, nx, 5, 1.6 | 0, !p.alive ? "#6a6a78" : p.color);
      if (!p.alive) text("OUT", nx, 19, 1.6 | 0, "#6a6a78"); else if (hold) text("BOMB!", nx, 19, 1.6 | 0, FIRE);
    }
    const low = fuse < 3, col = low && Math.sin(flick * 18) > 0 ? "#ff3b30" : GOLD;
    tc("FUSE " + fuse.toFixed(1), W / 2, H - 18, 3, col);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (mapsLoaded < MAPS.length || !map.img.complete) { ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(map.img, 0, 0, W, H);
    players.map(p => ({ y: p.y, f: () => drawPlayer(p) })).sort((a, b) => a.y - b.y).forEach(e => e.f());
    if (phase === "boom") drawBoom();
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }
    hud();
    if (phase === "play") tc("PASS BY TOUCH/DASH  -  DON'T HOLD IT AT ZERO  -  BACKSPACE MENU", W / 2, H - 38, 1, DIM);
    if (msgT > 0) tc(msg, W / 2, 80, 3, GOLD);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(map.name, W / 2, H / 2 - 96, 3, CREAM);
      tc(Countdown.label(ready), W / 2, H / 2 - 40, 8, GOLD);
      tc(count + " PLAYERS  -  HOLDING IT AT THE BLAST = OUT  -  LAST ONE WINS", W / 2, H / 2 + 44, 2, "#ffd9b0");
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " SURVIVES!", W / 2, 130, 6, GOLD); const s = fight[winner.name], scl = 200 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 210, s.w * scl, 200); tc(winner.name + " WINS", W / 2, 430, 4, winner.color); }
      else tc("EVERYONE BLEW UP!", W / 2, 240, 5, GOLD);
      tc((window.Tournament && Tournament.active) ? "RETURNING TO THE 8-BIT CUP" : "ENTER = REMATCH      BACKSPACE = MENU", W / 2, 500, 2, DIM);
    }
    window.__hp = { phase, count, map: mapIdx, holder: bomb.holder ? players.indexOf(bomb.holder) : null, alive: players.map(p => p.alive), fuse: +fuse.toFixed(2), winner: winner ? winner.tag : null };
    window.__hphook = { tp: (i, x, y) => { if (players[i]) { players[i].x = x; players[i].y = y; } }, dash: i => players[i] && doDash(players[i]), give: i => { bomb.holder = players[i]; }, setFuse: t => { fuse = t; }, pos: () => players.map(p => [Math.round(p.x), Math.round(p.y)]) };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
