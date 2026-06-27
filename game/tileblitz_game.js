/* 8-BIT PARTY — TILE BLITZ, 2–4 players. Roam the grid and PAINT every tile you
 * step on your colour, stealing rivals' tiles by walking over them. DASH into a
 * rival to black them out 1s. Most tiles when the clock ends WINS.
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, TB = D.tileblitz, M = TB.meta;
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
  function buildTile(colors) {
    const t = TB.tileTemplate, w = t[0].length, h = t.length, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = colors[t[y][x]]; if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    return { canvas: c, w, h };
  }
  // tile sprites indexed by owner: 0 neutral, 1 P1(red), 2 P2(blue), 3 P3(green), 4 P4(gold)
  const TILES = ["N", "R", "B", "G", "Y"].map(k => buildTile(TB.tileColors[k]));
  const fight = {}; D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd54a", DIM = "#9a9ab8", INK = "#15121f", CREAM = "#ffe9a0";
  const PCOL = ["#ff5d6c", "#4fb8ff", "#6bd66b", "#ffd54a"];

  const sndWalk = (() => { const a = new Audio("sfx/walk.mp3"); a.volume = 0.18; a.loop = true; return a; })();
  let audioReady = false;
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }
  function playHit() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.5; a.play().catch(() => {}); }

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

  // ---------- geometry ----------
  const S = M.scale, CELL = M.cell * S, OXs = M.ox * S, OYs = M.oy * S, COLS = M.cols, ROWS = M.rows, CELLS = COLS * ROWS;
  const bounds = { l: M.bounds.l * S, r: M.bounds.r * S, t: M.bounds.t * S, b: M.bounds.b * S };
  const SPAWNS = M.spawn.p.map(q => [q[0] * S, q[1] * S]);
  const bg = new Image(); bg.src = M.bg; let bgOk = false; bg.onload = () => bgOk = true;

  // ---------- entities ----------
  const PSC = 2.4, R = 14, PSPD = 188, MATCH = 30, DASH_TIME = 0.16, DASH_COOL = 0.55, DASH_SPEED = 500, BLACKOUT = 1.0;
  function ent(name, color, tag, paint) { return { name, color, tag, paint, x: 0, y: 0, face: 1, walkT: 0, moving: false, r: R, dash: 0, dashDir: [1, 0], dashCool: 0, black: 0 }; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let players, grid, cnt, phase, ready, timeLeft, winner, sparks, flick;

  function reset() {
    players = []; const order = shuffle([0, 1, 2, 3].slice(0, count));
    for (let i = 0; i < count; i++) { const p = ent(NAMES[i], PCOL[i], "P" + (i + 1), i + 1); const s = SPAWNS[order[i]]; p.x = s[0]; p.y = s[1]; p.face = s[0] < W / 2 ? 1 : -1; players.push(p); }
    grid = []; for (let r = 0; r < ROWS; r++) grid.push(Array(COLS).fill(0));
    cnt = Array(count).fill(0);
    phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); timeLeft = MATCH; winner = null; sparks = []; flick = 0;
    for (const p of players) paintAt(p);
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) { for (let i = 0; i < count; i++) if (CTRL[i].dash.includes(e.code)) { doDash(players[i]); break; } }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function dirFor(i) { const c = CTRL[i]; return [(held[c.Rt] ? 1 : 0) - (held[c.L] ? 1 : 0), (held[c.Dn] ? 1 : 0) - (held[c.U] ? 1 : 0)]; }
  function doDash(p) {
    if (phase !== "play" || p.black > 0 || p.dashCool > 0 || p.dash > 0) return;
    const i = players.indexOf(p); let [dx, dy] = dirFor(i); if (dx === 0 && dy === 0) { dx = p.face; dy = 0; }
    const m = Math.hypot(dx, dy) || 1; p.dashDir = [dx / m, dy / m]; p.dash = DASH_TIME; p.dashCool = DASH_COOL; p.face = dx > 0 ? 1 : (dx < 0 ? -1 : p.face);
  }

  // ---------- collision + paint ----------
  function blocked(x, y, r) { return x - r < bounds.l || x + r > bounds.r || y - r < bounds.t || y + r > bounds.b; }
  function moveEnt(e, dx, dy) { if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx; if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy; }
  function paintAt(p) { const c = Math.floor((p.x - OXs) / CELL), r = Math.floor((p.y - OYs) / CELL); if (c >= 0 && c < COLS && r >= 0 && r < ROWS) grid[r][c] = p.paint; }
  function counts() { cnt = Array(count).fill(0); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const v = grid[r][c]; if (v >= 1 && v <= count) cnt[v - 1]++; } }

  // ---------- update ----------
  function update(dt) {
    flick += dt;
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
      if (p.dash > 0) { moveEnt(p, p.dashDir[0] * DASH_SPEED * dt, p.dashDir[1] * DASH_SPEED * dt); p.moving = true; p.walkT += dt * 20; paintAt(p); }
      else { const [dx, dy] = dirFor(i); if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * dt, dy / m * PSPD * dt); if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; paintAt(p); } }
    }
    setWalking(anyMoving);
    // dash stun: a dasher blacks out the first rival it hits (one per dash)
    for (const att of players) {
      if (att.dash <= 0 || att.black > 0) continue;
      for (const vic of players) {
        if (vic === att || vic.black > 0) continue;
        if ((att.x - vic.x) ** 2 + (att.y - vic.y) ** 2 < (att.r + vic.r + 6) ** 2) {
          vic.black = BLACKOUT; att.dash = 0; att.dashCool = Math.min(att.dashCool, 0.25);
          const mx = (att.x + vic.x) / 2, my = (att.y + vic.y) / 2;
          for (let k = 0; k < 10; k++) { const a = k / 10 * 7, sp = 90 + (k % 3) * 60; sparks.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.45, c: k % 2 ? "#fff" : att.color }); }
          moveEnt(vic, att.dashDir[0] * 18, att.dashDir[1] * 18); playHit(); break;
        }
      }
    }
    counts();
    if (timeLeft <= 0) { const best = Math.max(...cnt), top = cnt.filter(c => c === best).length; winner = top === 1 ? players[cnt.indexOf(best)] : null; phase = "over"; }
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  function drawSprRaw(s, cx, feetY, scale, alpha) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), feetY - h, w, h); ctx.globalAlpha = 1; }
  function drawDown(s, cx, feetY, scale, alpha) { const w = Math.round(s.w * scale), h = Math.round(s.h * scale); ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(cx, feetY - h * 0.38); ctx.rotate(Math.PI * 0.46); ctx.drawImage(s.canvas, (-w / 2) | 0, (-h / 2) | 0, w, h); ctx.restore(); ctx.globalAlpha = 1; }
  function drawStars(p, cy) { for (let i = 0; i < 3; i++) { const a = p.black * 9 + i * 2.1; ctx.fillStyle = i % 2 ? GOLD : "#f4f4ee"; ctx.fillRect((p.x + Math.cos(a) * 13) | 0, (cy + Math.sin(a) * 4) | 0, 3, 3); } }
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale), left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc, hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0, step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale), legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name], h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    if (p.black > 0) { drawDown(s, p.x, feetY, PSC, 0.7); drawStars(p, p.y - 30); return; }
    if (p.dash > 0) for (let i = 1; i <= 3; i++) drawSprRaw(s, p.x - p.dashDir[0] * i * 7, feetY - p.dashDir[1] * i * 7, PSC, 0.12 * (4 - i));
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - 7) | 0, 20, 7); text(p.tag, tx + 3, (feetY - h - 6) | 0, 1, INK);
  }
  function drawGrid() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const v = grid[r][c]; ctx.drawImage(TILES[v].canvas, OXs + c * CELL, OYs + r * CELL, CELL, CELL); }
  }
  function hud() {
    ctx.fillStyle = "rgba(16,12,28,.82)"; ctx.fillRect(0, 0, W, 30);
    let x = 0; for (let i = 0; i < count; i++) { const w = cnt[i] / CELLS * W; ctx.fillStyle = players[i].color; ctx.fillRect(x | 0, 0, Math.ceil(w), 4); x += w; }
    const colW = (W - 8) / count;
    for (let i = 0; i < count; i++) { const p = players[i], px = 6 + i * colW; ctx.fillStyle = p.color; ctx.fillRect(px, 8, 14, 14); text(p.tag + " " + cnt[i], px + 18, 10, 2, p.color); }
    const low = timeLeft < 5; tc("TIME " + Math.ceil(timeLeft) + "S", W / 2, H - 16, 2, low && Math.sin(flick * 18) > 0 ? "#ff3b30" : GOLD);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (!bgOk) { ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(bg, 0, 0, W, H);
    drawGrid();
    players.map(p => ({ y: p.y, f: () => drawPlayer(p) })).sort((a, b) => a.y - b.y).forEach(e => e.f());
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }
    hud();
    if (phase === "play") tc("PAINT THE MOST  -  DASH TO STUN  -  ESC PAUSE", W / 2, H - 34, 1, DIM);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc("TILE BLITZ", W / 2, H / 2 - 96, 4, CREAM);
      tc(Countdown.label(ready), W / 2, H / 2 - 40, 8, GOLD);
      tc(count + " PLAYERS  -  PAINT THE FLOOR, MOST TILES WINS", W / 2, H / 2 + 44, 2, "#cfe6ff");
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " PAINTS THE TOWN!", W / 2, 110, 5, GOLD); const s = fight[winner.name], scl = 180 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 190, s.w * scl, 180); }
      else tc("DEAD HEAT!", W / 2, 200, 6, GOLD);
      const order = players.map((p, i) => [p, cnt[i]]).sort((a, b) => b[1] - a[1]); let y = 390;
      for (const [p, c] of order) { tc(p.tag + " " + p.name + "  " + c + " TILES", W / 2, y, 2, p.color); y += 24; }
      tc((window.Tournament && Tournament.active) ? "RETURNING TO THE 8-BIT CUP" : "ENTER = REMATCH     ESC = PAUSE", W / 2, y + 12, 2, DIM);
    }
    window.__tb = { phase, count, c: cnt.slice(), black: players.map(p => +p.black.toFixed(2)), t: +timeLeft.toFixed(1), winner: winner ? winner.tag : null };
    window.__tbhook = { tp: (i, x, y) => { if (players[i]) { players[i].x = x; players[i].y = y; } }, dash: i => players[i] && doDash(players[i]), pos: () => players.map(p => [Math.round(p.x), Math.round(p.y)]), end: () => { timeLeft = 0; }, grid: () => grid };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
