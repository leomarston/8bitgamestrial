/* 8-BIT PARTY — HOT POTATO. Two fighters; one is stuck with a lit bomb. The fuse
 * counts down — PASS the bomb by touching (or dashing into) your rival; whoever is
 * holding it when the fuse runs out gets BLOWN UP and LOSES. Dash to catch the
 * runner or to escape. Arena is picked at random each round (yard / street / house).
 * P1 = WASD + Space(dash),  P2 = Arrows + Enter(dash). */
(() => {
  const D = window.GAME_DATA, HP = D.hotpotato;
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
  const fight = {};
  D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const bombS = build(HP.bombSmall, HP.palette), boomS = build(HP.boom, HP.palette);
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++)
        if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd03c", DIM = "#9a9ab8", P1C = "#eb483c", P2C = "#4a76c4", INK = "#15121f", CREAM = "#fff0b4", FIRE = "#ff8e34";

  // ---------- audio ----------
  const sndWalk = (() => { const a = new Audio("sfx/walk.mp3"); a.volume = 0.18; a.loop = true; return a; })();
  let audioReady = false;
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }
  function playTag() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.32; a.play().catch(() => {}); }
  function playBoom() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.6; a.play().catch(() => {}); }

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!fight[p1name]) p1name = "PIXEL"; if (!fight[p2name]) p2name = "BYTE";

  // ---------- maps ----------
  const MAPS = HP.maps.map(m => {
    const s = m.scale;
    return {
      img: (() => { const im = new Image(); im.src = m.bg; return im; })(),
      bounds: { l: m.bounds.l * s, r: m.bounds.r * s, t: m.bounds.t * s, b: m.bounds.b * s },
      obstacles: m.obstacles.map(o => o.type === "circle"
        ? { type: "circle", x: o.x * s, y: o.y * s, r: o.r * s }
        : { type: "rect", x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s }),
      spawn: { p1: [m.spawn.p1[0] * s, m.spawn.p1[1] * s], p2: [m.spawn.p2[0] * s, m.spawn.p2[1] * s] },
      name: m.bg.indexOf("map2") >= 0 ? "THE STREET" : (m.bg.indexOf("map3") >= 0 ? "THE HOUSE" : "THE YARD"),
    };
  });
  let mapsLoaded = 0;
  MAPS.forEach(m => { m.img.onload = () => mapsLoaded++; });

  // ---------- entities ----------
  const PSC = 2.4, R = 14, PSPD = 196;
  const DASH_TIME = 0.16, DASH_COOL = 0.55, DASH_SPEED = 500, PASS_COOL = 0.6;
  const FUSE_MIN = 7, FUSE_MAX = 13;
  function ent(name, color) { return { name, color, x: 0, y: 0, face: 1, dash: 0, dashDir: [1, 0], dashCool: 0, walkT: 0, moving: false, r: R }; }
  let p1, p2, players, map, mapIdx, bomb, fuse, fuseMax, passCool, phase, ready, boomT, winner, loser, flick;

  function reset() {
    mapIdx = Math.floor(Math.random() * MAPS.length); map = MAPS[mapIdx];
    p1 = ent(p1name, P1C); p2 = ent(p2name, P2C); players = [p1, p2];
    const sp = [map.spawn.p1, map.spawn.p2]; if (Math.random() < 0.5) sp.reverse();   // random sides
    p1.x = sp[0][0]; p1.y = sp[0][1]; p1.face = 1;
    p2.x = sp[1][0]; p2.y = sp[1][1]; p2.face = -1;
    bomb = { holder: Math.random() < 0.5 ? p1 : p2 };
    fuseMax = FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN); fuse = fuseMax;
    passCool = 0.4; phase = "ready"; ready = 2.4; boomT = 0; winner = loser = null; flick = 0;
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) {
      if (e.code === "Space" || e.code === "KeyF") doDash(p1);
      if (e.code === "Enter" || e.code === "NumpadEnter") doDash(p2);
    }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function dirFor(p) {
    const k = p === p1 ? ["KeyD", "KeyA", "KeyS", "KeyW"] : ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    return [(held[k[0]] ? 1 : 0) - (held[k[1]] ? 1 : 0), (held[k[2]] ? 1 : 0) - (held[k[3]] ? 1 : 0)];
  }
  function doDash(p) {
    if (phase !== "play" || p.dashCool > 0 || p.dash > 0) return;
    let [dx, dy] = dirFor(p); if (dx === 0 && dy === 0) { dx = p.face; dy = 0; }
    const m = Math.hypot(dx, dy) || 1; p.dashDir = [dx / m, dy / m];
    p.dash = DASH_TIME; p.dashCool = DASH_COOL; p.face = dx > 0 ? 1 : (dx < 0 ? -1 : p.face);
  }

  // ---------- collision ----------
  function blocked(x, y, r) {
    const b = map.bounds;
    if (x - r < b.l || x + r > b.r || y - r < b.t || y + r > b.b) return true;
    for (const o of map.obstacles) {
      if (o.type === "circle") { if ((x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2) return true; }
      else { const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
    }
    return false;
  }
  function moveEnt(e, dx, dy) {
    if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy;
  }

  // ---------- update ----------
  function update(dt) {
    flick += dt;
    if (phase === "ready") { ready -= dt; if (ready <= 0) phase = "play"; setWalking(false); return; }
    if (phase === "boom") { boomT -= dt; setWalking(false); if (boomT <= 0) phase = "over"; return; }
    if (phase === "over") { setWalking(false); return; }

    passCool = Math.max(0, passCool - dt);
    fuse = Math.max(0, fuse - dt);
    let anyMoving = false;
    for (const p of players) {
      p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt);
      p.moving = false;
      if (p.dash > 0) { moveEnt(p, p.dashDir[0] * DASH_SPEED * dt, p.dashDir[1] * DASH_SPEED * dt); p.moving = true; p.walkT += dt * 20; }
      else { const [dx, dy] = dirFor(p);
        if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * dt, dy / m * PSPD * dt);
          if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; } }
    }
    setWalking(anyMoving);

    // pass the bomb on contact (touch OR dash), with a short grace so it can't ping-pong
    if (passCool <= 0 && (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 < (p1.r + p2.r + 4) ** 2) {
      bomb.holder = bomb.holder === p1 ? p2 : p1; passCool = PASS_COOL; playTag();
    }

    if (fuse <= 0) {                         // BOOM — the holder is blown up
      loser = bomb.holder; winner = loser === p1 ? p2 : p1;
      phase = "boom"; boomT = 1.1; playBoom();
    }
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  function drawSprRaw(s, cx, feetY, scale, alpha) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), feetY - h, w, h); ctx.globalAlpha = 1; }
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    const left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc;
    const hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0;
    const step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale), legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function carriedBomb(p, feetY, h) {
    const bs = 2.2, bw = Math.round(bombS.w * bs), bh = Math.round(bombS.h * bs);
    const y = feetY - h - bh + 3;
    ctx.drawImage(bombS.canvas, Math.round(p.x - bw / 2), y, bw, bh);
    // sparking fuse glints faster as the fuse shortens
    const rate = 6 + (1 - fuse / fuseMax) * 22;
    if (Math.sin(flick * rate) > 0) { ctx.fillStyle = (Math.sin(flick * rate * 1.7) > 0) ? CREAM : FIRE;
      ctx.fillRect((p.x + 6) | 0, (y - 2) | 0, 3, 3); }
  }
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    const h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    if (phase === "boom" && p === loser) { drawSprRaw(s, p.x, feetY, PSC, 0.25); return; }   // vanishing in the blast
    if (p.dash > 0) for (let i = 1; i <= 3; i++) drawSprRaw(s, p.x - p.dashDir[0] * i * 7, feetY - p.dashDir[1] * i * 7, PSC, 0.12 * (4 - i));
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    if (bomb.holder === p) carriedBomb(p, feetY, h);
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - (bomb.holder === p ? 22 : 7)) | 0, 20, 7);
    text(p === p1 ? "P1" : "P2", tx + 3, (feetY - h - (bomb.holder === p ? 21 : 6)) | 0, 1, INK);
  }
  function drawBoom() {
    const k = 1 - boomT / 1.1, sc = 3 + k * 6, w = Math.round(boomS.w * sc), hh = Math.round(boomS.h * sc);
    ctx.globalAlpha = Math.max(0, 1 - k * 0.6);
    ctx.drawImage(boomS.canvas, Math.round(loser.x - w / 2), Math.round(loser.y - hh / 2), w, hh);
    ctx.globalAlpha = 1;
    if (k < 0.4) { ctx.fillStyle = "rgba(255,220,150," + (0.5 - k) + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function fuseStr() { return fuse.toFixed(1); }
  function hud() {
    ctx.fillStyle = "rgba(16,12,28,.82)"; ctx.fillRect(0, 0, W, 32);
    ctx.drawImage(bombS.canvas, 8, 5, bombS.w * 2, bombS.h * 2);
    text(p1name, 34, 4, 2, bomb.holder === p1 ? GOLD : P1C);
    if (bomb.holder === p1) text("BOMB!", 34, 19, 1, FIRE);
    const rl = p2name, rw = tW(rl, 2);
    text(rl, W - 12 - rw, 4, 2, bomb.holder === p2 ? GOLD : P2C);
    if (bomb.holder === p2) text("BOMB!", W - 12 - tW("BOMB!", 1), 19, 1, FIRE);
    const low = fuse < 3, col = low && Math.sin(flick * 18) > 0 ? "#ff3b30" : GOLD;
    tc("FUSE " + fuseStr(), W / 2, 5, 3, col);
    const bw = 220, bx = (W - bw) / 2, by = 27, f = fuse / fuseMax;
    ctx.fillStyle = "#2a2440"; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = low ? "#ff3b30" : FIRE; ctx.fillRect(bx, by, Math.round(bw * f), 4);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (mapsLoaded < MAPS.length || !map.img.complete) { ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(map.img, 0, 0, W, H);
    [{ y: p1.y, f: () => drawPlayer(p1) }, { y: p2.y, f: () => drawPlayer(p2) }].sort((a, b) => a.y - b.y).forEach(e => e.f());
    if (phase === "boom") drawBoom();
    hud();
    if (phase === "play") tc("PASS BY TOUCH/DASH  -  P1 WASD+SPACE   P2 ARROWS+ENTER   BACKSPACE MENU", W / 2, H - 15, 1, DIM);

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(map.name, W / 2, H / 2 - 96, 3, CREAM);
      tc(ready > 0.4 ? String(Math.ceil(ready - 0.4)) : "GO!", W / 2, H / 2 - 40, 8, GOLD);
      tc("DON'T BE HOLDING THE BOMB WHEN THE FUSE RUNS OUT!", W / 2, H / 2 + 44, 2, "#ffd9b0");
      tc("PASS IT — TOUCH OR DASH INTO YOUR RIVAL", W / 2, H / 2 + 66, 2, DIM);
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      tc((winner === p1 ? "P1" : "P2") + " SURVIVES!", W / 2, 120, 6, GOLD);
      const s = fight[winner.name], scl = 190 / s.h;
      ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 200, s.w * scl, 190);
      tc(loser.name + " GOT BLOWN UP", W / 2, 410, 3, FIRE);
      tc("ENTER / SPACE = REMATCH     BACKSPACE = MENU", W / 2, 470, 2, DIM);
    }

    window.__hp = { phase, map: mapIdx, holder: bomb.holder === p1 ? "p1" : "p2", fuse: +fuse.toFixed(2),
      winner: winner ? (winner === p1 ? "p1" : "p2") : null };
    window.__hphook = {
      tp: (ax, ay, bx, by) => { p1.x = ax; p1.y = ay; p2.x = bx; p2.y = by; },
      dash1: () => doDash(p1), dash2: () => doDash(p2),
      give: who => { bomb.holder = who === "p1" ? p1 : p2; },
      setFuse: t => { fuse = t; }, passReady: () => { passCool = 0; },
      pos: () => ({ p1: [Math.round(p1.x), Math.round(p1.y)], p2: [Math.round(p2.x), Math.round(p2.y)] }),
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
