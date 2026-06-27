/* 8-BIT PARTY — CROWN GRAB (King-of-the-Crown), 2–4 players. Grab the crown and
 * carry it on your head; DASH into anyone to black them out 1s and (if they held
 * it) STEAL the crown. Live millisecond hold timers; most cumulative hold when the
 * 30s clock ends WINS. Random arena each round.
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, CR = D.crown;
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
  const crownBig = build(CR.crownBig, CR.palette), crownSmall = build(CR.crownSmall, CR.palette);
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd86b", DIM = "#9a9ab8", INK = "#100c1c", CREAM = "#ffe9a0";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];

  function mkAudio(src, vol, loop) { const a = new Audio(src); a.volume = vol; a.loop = !!loop; return a; }
  const sndWalk = mkAudio("sfx/walk.mp3", 0.18, true);
  let audioReady = false;
  function playHit() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.5; a.play().catch(() => {}); }
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }

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
  const MAPS = CR.maps.map(m => {
    const s = m.scale;
    return {
      img: (() => { const im = new Image(); im.src = m.bg; return im; })(),
      bounds: { l: m.bounds.l * s, r: m.bounds.r * s, t: m.bounds.t * s, b: m.bounds.b * s },
      obstacles: m.obstacles.map(o => o.type === "circle" ? { type: "circle", x: o.x * s, y: o.y * s, r: o.r * s } : { type: "rect", x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s }),
      spawns: m.spawn.p.map(q => [q[0] * s, q[1] * s]),
      crown: [m.spawn.crown[0] * s, m.spawn.crown[1] * s],
      name: m.bg.indexOf("map2") >= 0 ? "THE WALL" : "THE COURT",
    };
  });
  let mapsLoaded = 0; MAPS.forEach(m => { m.img.onload = () => mapsLoaded++; });

  // ---------- entities ----------
  const PSC = 2.4, R = 14, PSPD = 196, DASH_TIME = 0.16, DASH_COOL = 0.55, DASH_SPEED = 500, BLACKOUT = 1.0, GRAB = 12, MATCH = 30;
  function ent(name, color, tag) { return { name, color, tag, x: 0, y: 0, face: 1, holdMs: 0, dash: 0, dashDir: [1, 0], dashCool: 0, black: 0, walkT: 0, moving: false, r: R }; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let players, crown, map, mapIdx, phase, ready, timeLeft, winner, sparks, flick;

  function reset() {
    mapIdx = Math.floor(Math.random() * MAPS.length); map = MAPS[mapIdx];
    const order = shuffle([0, 1, 2, 3].slice(0, count));   // randomised spawn slots — fair
    players = [];
    for (let i = 0; i < count; i++) { const p = ent(NAMES[i], PCOL[i], "P" + (i + 1)); const s = map.spawns[order[i]]; p.x = s[0]; p.y = s[1]; p.face = s[0] < W / 2 ? 1 : -1; players.push(p); }
    crown = { holder: null, fx: map.crown[0], fy: map.crown[1], bob: 0 };
    phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); timeLeft = MATCH; winner = null; sparks = []; flick = 0;
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) { for (let i = 0; i < count; i++) if (CTRL[i].dash.includes(e.code)) { doDash(players[i]); break; } }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function dirFor(p, i) { const c = CTRL[i]; return [(held[c.Rt] ? 1 : 0) - (held[c.L] ? 1 : 0), (held[c.Dn] ? 1 : 0) - (held[c.U] ? 1 : 0)]; }
  function doDash(p) {
    if (phase !== "play" || p.black > 0 || p.dashCool > 0 || p.dash > 0) return;
    const i = players.indexOf(p); let [dx, dy] = dirFor(p, i); if (dx === 0 && dy === 0) { dx = p.face; dy = 0; }
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
    crown.bob += dt * 5; flick += dt;
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; } sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } setWalking(false); return; }
    if (phase === "over") { setWalking(false); return; }
    timeLeft = Math.max(0, timeLeft - dt);
    let anyMoving = false;
    for (let i = 0; i < count; i++) {
      const p = players[i];
      p.black = Math.max(0, p.black - dt); p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt);
      p.moving = false;
      if (p.black > 0) continue;
      if (p.dash > 0) { moveEnt(p, p.dashDir[0] * DASH_SPEED * dt, p.dashDir[1] * DASH_SPEED * dt); p.moving = true; p.walkT += dt * 20; }
      else { const [dx, dy] = dirFor(p, i); if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * dt, dy / m * PSPD * dt); if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; } }
    }
    setWalking(anyMoving);

    // dash impacts: a dasher blacks out the FIRST rival it hits (one per dash) and
    // steals the crown if that rival held it. Guards stop double / blacked-out hits.
    const startHolder = crown.holder;   // snapshot: only the holder AT THE START of this frame can be robbed,
    for (const att of players) {        // so a chain of same-frame dashers can't relay the crown off a fresh holder
      if (att.dash <= 0 || att.black > 0) continue;
      for (const vic of players) {
        if (vic === att || vic.black > 0) continue;
        if ((att.x - vic.x) ** 2 + (att.y - vic.y) ** 2 < (att.r + vic.r + 6) ** 2) {
          vic.black = BLACKOUT; att.dash = 0; att.dashCool = Math.min(att.dashCool, 0.25);
          const stole = vic === startHolder; if (stole) crown.holder = att;
          moveEnt(vic, att.dashDir[0] * 20, att.dashDir[1] * 20);
          const mx = (att.x + vic.x) / 2, my = (att.y + vic.y) / 2;
          for (let k = 0; k < 10; k++) { const a = k / 10 * 7, sp = 80 + (k % 3) * 60; sparks.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.4, c: stole ? GOLD : "#fff" }); }
          playHit(); msg = att.tag + (stole ? " STOLE THE CROWN!" : " BLACKOUT!"); msgT = 1.0;
          break;
        }
      }
    }

    // free crown pickup (only ever free before the first grab)
    if (crown.holder === null) for (const p of players) if (p.black <= 0 && (p.x - crown.fx) ** 2 + (p.y - crown.fy) ** 2 < (p.r + GRAB) ** 2) { crown.holder = p; msg = p.tag + " GRABBED THE CROWN!"; msgT = 1.0; break; }
    if (crown.holder) crown.holder.holdMs += dt * 1000;
    msgT = Math.max(0, msgT - dt);

    if (timeLeft <= 0) {
      const best = Math.max(...players.map(p => p.holdMs)), top = players.filter(p => p.holdMs === best);
      winner = (best > 0 && top.length === 1) ? top[0] : null; phase = "over";
    }
  }
  let msg = "", msgT = 0;

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
  function drawDown(s, cx, feetY, scale, alpha) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(cx, feetY - h * 0.38); ctx.rotate(Math.PI * 0.46); ctx.drawImage(s.canvas, (-w / 2) | 0, (-h / 2) | 0, w, h); ctx.restore(); ctx.globalAlpha = 1; }
  function drawStars(p, cy) { for (let i = 0; i < 3; i++) { const a = p.black * 9 + i * 2.1; ctx.fillStyle = i % 2 ? GOLD : "#f4f4ee"; ctx.fillRect((p.x + Math.cos(a) * 13) | 0, (cy + Math.sin(a) * 4) | 0, 3, 3); } }
  function carriedCrown(p, feetY, h) { const cs = 2.4, cw = Math.round(crownSmall.w * cs), ch = Math.round(crownSmall.h * cs); const y = feetY - h - ch + 1 - Math.round(Math.abs(Math.sin(crown.bob)) * 1); ctx.drawImage(crownSmall.canvas, Math.round(p.x - cw / 2), y, cw, ch); }
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name], h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    if (p.black > 0) { drawDown(s, p.x, feetY, PSC, 0.7); drawStars(p, p.y - 30); return; }
    if (p.dash > 0) for (let i = 1; i <= 3; i++) drawSprRaw(s, p.x - p.dashDir[0] * i * 7, feetY - p.dashDir[1] * i * 7, PSC, 0.12 * (4 - i));
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    if (crown.holder === p) carriedCrown(p, feetY, h);
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - (crown.holder === p ? 19 : 7)) | 0, 20, 7); text(p.tag, tx + 3, (feetY - h - (crown.holder === p ? 18 : 6)) | 0, 1, INK);
  }
  function drawFreeCrown() {
    if (crown.holder !== null) return;
    const cs = 2.4, cw = Math.round(crownBig.w * cs), ch = Math.round(crownBig.h * cs), yb = Math.round(Math.sin(crown.bob) * 3);
    shadow(crown.fx, crown.fy + 12, 22); ctx.drawImage(crownBig.canvas, Math.round(crown.fx - cw / 2), crown.fy - ch + yb, cw, ch);
    for (let i = 0; i < 4; i++) { const a = crown.bob * 1.5 + i * 1.57; ctx.fillStyle = i % 2 ? CREAM : "#fff"; ctx.fillRect((crown.fx + Math.cos(a) * 22) | 0, (crown.fy - 6 + Math.sin(a) * 12) | 0, 3, 3); }
  }
  function ms(v) { return (v / 1000).toFixed(2); }
  function hud() {
    ctx.fillStyle = "rgba(16,12,28,.8)"; ctx.fillRect(0, 0, W, 34);
    const total = players.reduce((a, p) => a + p.holdMs, 0); let x = 0;   // share bar
    for (const p of players) { const w = total > 0 ? (p.holdMs / total) * W : W / count; ctx.fillStyle = p.color; ctx.fillRect(x | 0, 0, Math.ceil(w), 3); x += w; }
    const colW = (W - 8) / count;
    for (let i = 0; i < count; i++) {
      const p = players[i], px = 6 + i * colW, hold = crown.holder === p;
      if (hold) ctx.drawImage(crownSmall.canvas, px, 7, Math.round(crownSmall.w * 1.8), Math.round(crownSmall.h * 1.8));
      const nx = hold ? px + 16 : px;
      text(p.tag + " " + p.name, nx, 6, 1, p.color);
      text(ms(p.holdMs), nx, 18, 2, hold ? GOLD : "#f4f4ee");
    }
    const low = timeLeft < 5; tc("TIME " + Math.ceil(timeLeft) + "S", W / 2, H - 18, 2, low && Math.sin(flick * 18) > 0 ? "#ff3b30" : GOLD);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (mapsLoaded < MAPS.length || !map.img.complete) { ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(map.img, 0, 0, W, H);
    drawFreeCrown();
    players.map((p, i) => ({ y: p.y, f: () => drawPlayer(p) })).sort((a, b) => a.y - b.y).forEach(e => e.f());
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }
    hud();
    if (phase === "play") tc("DASH TO STEAL  -  HOLD THE CROWN LONGEST", W / 2, H - 36, 1, DIM);
    if (msgT > 0) tc(msg, W / 2, 80, 3, GOLD);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(map.name, W / 2, H / 2 - 96, 3, CREAM);
      tc(Countdown.label(ready), W / 2, H / 2 - 40, 8, GOLD);
      tc(count + " PLAYERS  -  GRAB THE CROWN, HOLD IT LONGEST", W / 2, H / 2 + 44, 2, "#cfe6ff");
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc(winner.tag + " IS THE KING!", W / 2, 110, 6, GOLD);
        const s = fight[winner.name], scl = 180 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 190, s.w * scl, 180);
        tc(winner.name + "  HELD " + ms(winner.holdMs) + "S", W / 2, 390, 3, winner.color);
      } else tc("A DEAD HEAT!", W / 2, 200, 6, GOLD);
      const order = players.slice().sort((a, b) => b.holdMs - a.holdMs); let y = 430;
      for (const p of order) { tc(p.tag + " " + p.name + "  " + ms(p.holdMs) + "S", W / 2, y, 2, p.color); y += 24; }
      tc("ENTER = REMATCH     BACKSPACE = MENU", W / 2, y + 12, 2, DIM);
    }
    window.__cg = { phase, map: mapIdx, count, holder: crown.holder ? players.indexOf(crown.holder) : null, hold: players.map(p => Math.round(p.holdMs)), black: players.map(p => +p.black.toFixed(2)), t: +timeLeft.toFixed(1), winner: winner ? winner.tag : null };
    window.__cghook = {
      tp: (i, x, y) => { if (players[i]) { players[i].x = x; players[i].y = y; } },
      dash: i => players[i] && doDash(players[i]),
      give: i => { crown.holder = i == null ? null : players[i]; },
      pos: () => players.map(p => [Math.round(p.x), Math.round(p.y)]),
      end: () => { timeLeft = 0; },
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
