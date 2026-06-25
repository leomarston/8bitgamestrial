/* 8-BIT PARTY — TILE BLITZ (our take on Party Panic's "Tile Bangers"). Top-down
 * couch duel: roam the grid and PAINT every tile you step on your colour, stealing
 * the rival's tiles by walking over them. Solid bumpers to juke around. When the
 * clock runs out, whoever owns the MOST tiles wins. Live counts + a territory bar.
 * P1 = WASD,  P2 = Arrows. */
(() => {
  const D = window.GAME_DATA, TB = D.tileblitz, M = TB.meta;
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
  function buildTile(colors) {                       // recolour the shared template
    const t = TB.tileTemplate, w = t[0].length, h = t.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = colors[t[y][x]]; if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    return { canvas: c, w, h };
  }
  const tileN = buildTile(TB.tileColors.N), tileR = buildTile(TB.tileColors.R), tileB = buildTile(TB.tileColors.B);
  const bumperS = build(TB.bumper, TB.palette);
  const fight = {}; D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
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
  const GOLD = "#ffd54a", DIM = "#9a9ab8", P1C = "#ff5d6c", P2C = "#4fb8ff", INK = "#15121f", CREAM = "#ffe9a0";

  // ---------- audio ----------
  const sndWalk = (() => { const a = new Audio("sfx/walk.mp3"); a.volume = 0.18; a.loop = true; return a; })();
  let audioReady = false;
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!fight[p1name]) p1name = "PIXEL"; if (!fight[p2name]) p2name = "BYTE";

  // ---------- geometry (scaled to screen) ----------
  const S = M.scale, CELL = M.cell * S, OXs = M.ox * S, OYs = M.oy * S, COLS = M.cols, ROWS = M.rows;
  const bounds = { l: M.bounds.l * S, r: M.bounds.r * S, t: M.bounds.t * S, b: M.bounds.b * S };
  const bumpers = M.bumpers.map(b => ({ x: b.x * S, y: b.y * S, r: b.r * S, cell: b.cell }));
  const bg = new Image(); bg.src = M.bg; let bgOk = false; bg.onload = () => bgOk = true;
  const BUMP_CELL = new Set(bumpers.map(b => b.cell[0] + "," + b.cell[1]));

  // ---------- entities ----------
  const PSC = 1.9, R = 13, PSPD = 188, MATCH = 30;
  function ent(name, color, c) { return { name, color, x: 0, y: 0, face: 1, walkT: 0, moving: false, r: R, paint: c }; }
  let p1, p2, players, grid, phase, ready, timeLeft, winner, c1, c2;

  function reset() {
    p1 = ent(p1name, P1C, 1); p2 = ent(p2name, P2C, 2); players = [p1, p2];
    p1.x = M.spawn.p1[0] * S; p1.y = M.spawn.p1[1] * S; p1.face = 1;
    p2.x = M.spawn.p2[0] * S; p2.y = M.spawn.p2[1] * S; p2.face = -1;
    grid = []; for (let r = 0; r < ROWS; r++) { const row = []; for (let c = 0; c < COLS; c++) row.push(BUMP_CELL.has(c + "," + r) ? -1 : 0); grid.push(row); }
    phase = "ready"; ready = 2.4; timeLeft = MATCH; winner = null; c1 = 0; c2 = 0;
    paintAt(p1); paintAt(p2);
  }

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- collision + paint ----------
  function blocked(x, y, r) {
    if (x - r < bounds.l || x + r > bounds.r || y - r < bounds.t || y + r > bounds.b) return true;
    for (const b of bumpers) if ((x - b.x) ** 2 + (y - b.y) ** 2 < (r + b.r) ** 2) return true;
    return false;
  }
  function moveEnt(e, dx, dy) {
    if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy;
  }
  function paintAt(p) {
    const c = Math.floor((p.x - OXs) / CELL), r = Math.floor((p.y - OYs) / CELL);
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS && grid[r][c] !== -1) grid[r][c] = p.paint;
  }
  function counts() { let a = 0, b = 0; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (grid[r][c] === 1) a++; else if (grid[r][c] === 2) b++; } c1 = a; c2 = b; }

  // ---------- update ----------
  function update(dt) {
    if (phase === "ready") { ready -= dt; if (ready <= 0) phase = "play"; setWalking(false); return; }
    if (phase === "over") { setWalking(false); return; }
    timeLeft = Math.max(0, timeLeft - dt);
    let anyMoving = false;
    const ctrl = [[p1, "KeyW", "KeyS", "KeyA", "KeyD"], [p2, "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]];
    for (const [p, U, Dn, L, Rt] of ctrl) {
      p.moving = false;
      const dx = (held[Rt] ? 1 : 0) - (held[L] ? 1 : 0), dy = (held[Dn] ? 1 : 0) - (held[U] ? 1 : 0);
      if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * dt, dy / m * PSPD * dt);
        if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; paintAt(p); }
    }
    setWalking(anyMoving);
    counts();
    if (timeLeft <= 0) { phase = "over"; winner = c1 > c2 ? p1 : (c2 > c1 ? p2 : null); }
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
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
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    const h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - 7) | 0, 20, 7);
    text(p === p1 ? "P1" : "P2", tx + 3, (feetY - h - 6) | 0, 1, INK);
  }
  function drawGrid() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = grid[r][c]; if (v === -1) continue;
      const t = v === 1 ? tileR : (v === 2 ? tileB : tileN);
      ctx.drawImage(t.canvas, OXs + c * CELL, OYs + r * CELL, CELL, CELL);
    }
    for (const b of bumpers) ctx.drawImage(bumperS.canvas, (b.x - bumperS.w * S / 2) | 0, (b.y - bumperS.h * S / 2) | 0, bumperS.w * S, bumperS.h * S);
  }
  function hud() {
    ctx.fillStyle = "rgba(16,12,28,.82)"; ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = P1C; ctx.fillRect(8, 6, 16, 16);
    text(p1name + "  " + c1, 30, 8, 2, P1C);
    const rl = p2name + "  " + c2, rw = tW(rl, 2);
    ctx.fillStyle = P2C; ctx.fillRect(W - 24, 6, 16, 16);
    text(rl, W - 30 - rw, 8, 2, P2C);
    tc(Math.ceil(timeLeft) + "S", W / 2, 3, 3, GOLD);
    const bw = 260, bx = (W - bw) / 2, by = 25, tot = c1 + c2 || 1, f1 = c1 / tot;
    ctx.fillStyle = "#2a2440"; ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = P1C; ctx.fillRect(bx, by, Math.round(bw * f1), 4);
    ctx.fillStyle = P2C; ctx.fillRect(bx + Math.round(bw * f1), by, bw - Math.round(bw * f1), 4);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (!bgOk) { ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(bg, 0, 0, W, H);
    drawGrid();
    [{ y: p1.y, f: () => drawPlayer(p1) }, { y: p2.y, f: () => drawPlayer(p2) }].sort((a, b) => a.y - b.y).forEach(e => e.f());
    hud();
    if (phase === "play") tc("P1 WASD    P2 ARROWS    PAINT THE MOST TILES    BACKSPACE MENU", W / 2, H - 16, 1, DIM);

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc("TILE BLITZ", W / 2, H / 2 - 96, 4, CREAM);
      tc(ready > 0.4 ? String(Math.ceil(ready - 0.4)) : "GO!", W / 2, H / 2 - 40, 8, GOLD);
      tc("ROAM AND PAINT THE FLOOR  -  MOST TILES WHEN TIME ENDS WINS", W / 2, H / 2 + 44, 2, "#cfe6ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc((winner === p1 ? "P1" : "P2") + " PAINTS THE TOWN!", W / 2, 120, 5, GOLD);
        const s = fight[winner.name], scl = 190 / s.h;
        ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 200, s.w * scl, 190);
        tc(winner.name + "  " + (winner === p1 ? c1 : c2) + " TILES", W / 2, 410, 3, winner.color);
      } else { tc("DEAD HEAT!", W / 2, 200, 6, GOLD); tc("EQUAL TERRITORY", W / 2, 280, 3, CREAM); }
      tc("P1 " + c1 + " TILES      P2 " + c2 + " TILES", W / 2, 460, 2, DIM);
      tc("ENTER / SPACE = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }

    window.__tb = { phase, c1, c2, t: +timeLeft.toFixed(1), winner: winner ? (winner === p1 ? "p1" : "p2") : null };
    window.__tbhook = {
      tp: (ax, ay, bx, by) => { p1.x = ax; p1.y = ay; p2.x = bx; p2.y = by; },
      pos: () => ({ p1: [Math.round(p1.x), Math.round(p1.y)], p2: [Math.round(p2.x), Math.round(p2.y)] }),
      end: () => { timeLeft = 0; },
      grid: () => grid,
    };
    requestAnimationFrame(t => frame(now, t));
  }
  reset();
  requestAnimationFrame(t => frame(t, t));
})();
