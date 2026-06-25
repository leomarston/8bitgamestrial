/* 8-BIT PARTY — RUNNER. Forward auto-scroll platformer. The frame scrolls right
 * on its own (slower than you can run); fall behind the left edge or into a pit
 * and you're OUT. LAST ONE KEEPING UP WINS. Players are one block tall and jump
 * high. P1 = A/D + W,  P2 = Left/Right + Up.  Solid blocks actually block. */
(() => {
  const D = window.GAME_DATA, BL = D.blocks;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const CW = cv.width, CH = cv.height;

  // ---------- sprites ----------
  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]]; if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return { canvas: c, w, h };
  }
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  const BP = BL.palette;
  const TILE = { G: build(BL.ground, BP), D: build(BL.dirt, BP), T: build(BL.stoneTop, BP),
    S: build(BL.stone, BP), C: build(BL.crate, BP), W: build(BL.wood, BP), v: build(BL.vine, BP) };
  const TREE = build(BL.tree, BP);
  const fight = {}; D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) { s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; } }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffc44a", DIM = "#9fb0d0", P1C = "#ff5d5d", P2C = "#5db4ff", INK = "#14111c";

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!fight[p1name]) p1name = "PIXEL"; if (!fight[p2name]) p2name = "BYTE";

  // ---------- world ----------
  const TS = 16, SC = 3, HT = 12, GROW = 9, LOOP = 240;
  const viewW = CW / SC, viewH = CH / SC;
  const SOLID = "GDTSCW";
  const LOOPW = LOOP * TS;
  let grid, trees, towers, SEED = 1;
  function rng(i) { const v = Math.sin((i + SEED * 0.61803) * 12.9898 + 7.13) * 43758.5453; return v - Math.floor(v); }
  // Build a fresh random level — different obstacles/alignment every round.
  function genLevel(seed) {
    SEED = seed;
    grid = Array.from({ length: HT }, () => Array(LOOP).fill("."));
    trees = []; towers = [];
    let x = 0;
    const col = (xx, top) => { for (let y = top; y < HT; y++) grid[y][xx] = (y === top ? "G" : "D"); };
    const flat = (n, top = GROW) => { for (let i = 0; i < n && x < LOOP; i++) { col(x, top); x++; } };
    const gap = (n) => { x += n; };
    const ledge = (x0, x1, row) => { for (let xx = x0; xx <= x1; xx++) { if (xx < 0 || xx >= LOOP) continue; grid[row][xx] = "T"; if (row + 1 < HT) grid[row + 1][xx] = "S"; }
      grid[Math.min(HT - 1, row + 2)][Math.max(0, x0)] = "v"; };
    flat(10);
    while (x < LOOP - 14) {
      const seg = Math.floor(rng(x) * 6);
      if (seg === 0) flat(2 + (rng(x + 1) * 3 | 0));
      else if (seg === 1) { flat(1); gap(2 + (rng(x + 2) * 2 | 0)); flat(2); }            // pit
      else if (seg === 2) { const n = 4; flat(n); ledge(x - n, x - 2, GROW - 3); }         // ledge over ground
      else if (seg === 3) { const k = 1 + (rng(x + 3) * 2 | 0);                            // step up plateau
        for (let i = 0; i <= k; i++) { col(x, GROW - i); x++; } flat(3, GROW - k); for (let i = k; i >= 0; i--) { col(x, GROW - i); x++; } }
      else if (seg === 4) { flat(1); grid[GROW - 1][x - 1] = "C"; if (rng(x) > .6) grid[GROW - 2][x - 1] = "C"; flat(3); } // crate(s)
      else { flat(1); const g = 3 + (rng(x + 5) * 2 | 0); ledge(x + 1, x + 1, GROW - 2); ledge(x + g - 1, x + g - 1, GROW - 2); gap(g); flat(2); } // pit w/ platforms
    }
    flat(LOOP - x);
    for (let i = 0; i < LOOP; i += 7) if (rng(i + 99) < .5) trees.push(i * TS + (rng(i) * 40 | 0));
    for (let i = 0; i < LOOP; i += 9) if (rng(i + 33) < .5) towers.push([i * TS + (rng(i) * 30 | 0), 40 + (rng(i + 1) * 60 | 0)]);
  }
  const wrap = (tx) => ((tx % LOOP) + LOOP) % LOOP;
  function solidAt(tx, ty) { if (ty < 0 || ty >= HT) return false; return SOLID.includes(grid[ty][wrap(tx)]); }

  // ---------- entities ----------
  const PW = 12, PH = 16, GRAV = 780, JUMP = -300, RUN = 132, SCROLL = 76, MAXF = 430;
  let cam, p1, p2, players, phase, timer, winner;
  function mk(name, x, color) { return { name, color, x, y: GROW * TS - PH, vx: 0, vy: 0, onG: true, alive: true, face: 1, coy: 0, walkT: 0, dist: 0, squish: 0 }; }
  function reset() {
    genLevel(Math.floor(Math.random() * 1e9));   // new random map every round
    cam = 0; p1 = mk(p1name, 112, P1C); p2 = mk(p2name, 140, P2C); players = [p1, p2];
    phase = "ready"; timer = 2.2; winner = null;
  }
  reset();

  // ---------- input ----------
  const held = {};
  function jump(p) { if (p.alive && phase === "play" && p.squish <= 0 && (p.onG || p.coy > 0)) { p.vy = JUMP; p.onG = false; p.coy = 0; } }
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (!e.repeat) { if (e.code === "KeyW" || e.code === "Space") jump(p1); if (e.code === "ArrowUp") jump(p2); }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- physics ----------
  function moveX(p, dx) {
    p.x += dx;
    const t = Math.floor(p.y / TS), b = Math.floor((p.y + PH - 1) / TS);
    if (dx > 0) { const tx = Math.floor((p.x + PW - 1) / TS); for (let ty = t; ty <= b; ty++) if (solidAt(tx, ty)) { p.x = tx * TS - PW; break; } }
    else if (dx < 0) { const tx = Math.floor(p.x / TS); for (let ty = t; ty <= b; ty++) if (solidAt(tx, ty)) { p.x = (tx + 1) * TS; break; } }
  }
  function moveY(p, dy) {
    p.y += dy; p.onG = false;
    const l = Math.floor(p.x / TS), r = Math.floor((p.x + PW - 1) / TS);
    if (dy > 0) { const ty = Math.floor((p.y + PH) / TS); for (let tx = l; tx <= r; tx++) if (solidAt(tx, ty)) { p.y = ty * TS - PH; p.vy = 0; p.onG = true; break; } }
    else if (dy < 0) { const ty = Math.floor(p.y / TS); for (let tx = l; tx <= r; tx++) if (solidAt(tx, ty)) { p.y = (ty + 1) * TS; p.vy = 0; break; } }
  }

  function update(dt) {
    if (phase === "ready") { timer -= dt; if (timer <= 0) phase = "play"; return; }
    if (phase === "over") return;
    cam += SCROLL * dt;

    for (const [p, L, R] of [[p1, "KeyA", "KeyD"], [p2, "ArrowLeft", "ArrowRight"]]) {
      if (!p.alive) continue;
      p.squish = Math.max(0, p.squish - dt);
      const dir = p.squish > 0 ? 0 : (held[R] ? 1 : 0) - (held[L] ? 1 : 0);   // squished = can't move
      p.vx = dir * RUN; if (dir) p.face = dir;
      p.vy = Math.min(MAXF, p.vy + GRAV * dt);
      moveX(p, p.vx * dt);
      moveY(p, p.vy * dt);
      if (p.onG) p.coy = 0.09; else p.coy = Math.max(0, p.coy - dt);
      if (Math.abs(p.vx) > 1 && p.onG) p.walkT += dt * 9;
      if (p.x > cam + viewW - PW) p.x = cam + viewW - PW;   // can't leave the front
      // OUT the instant you fall behind the frame or drop into a pit (below ground level)
      if (p.x + PW < cam + 2 || p.y > 168) p.alive = false;
      p.dist = p.x;
    }
    // stomp: a player landing on the other's head squishes them (1s, immobile)
    for (const [a, b] of [[p1, p2], [p2, p1]]) {
      if (!a.alive || !b.alive || b.squish > 0) continue;
      if (a.vy > 0 && a.x < b.x + PW - 2 && a.x + PW > b.x + 2 &&
          a.y + PH >= b.y && a.y + PH <= b.y + PH * 0.7 && a.y < b.y) {
        b.squish = 1.0; a.vy = -190; a.y = b.y - PH; a.onG = false;   // squish them, bounce off
      }
    }
    const alive = players.filter(p => p.alive);
    if (alive.length <= 1) {
      winner = alive.length === 1 ? alive[0] : (p1.x >= p2.x ? p1 : p2);
      phase = "over";
    }
  }

  // ---------- draw ----------
  function drawTileSprite(s, wx, wy) { ctx.drawImage(s.canvas, Math.round((wx - cam) * SC), Math.round(wy * SC), s.w * SC, s.h * SC); }
  function drawPlayer(p) {
    if (!p.alive) return;
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    if (p.squish > 0) {                                   // squished: wide & short, can't move
      const dh = 9, dw = Math.round(s.w * 18 / s.h * 1.7);
      const sx = Math.round((p.x + PW / 2 - cam) * SC - dw * SC / 2);
      const sy = Math.round((p.y + PH - dh) * SC);
      ctx.drawImage(s.canvas, sx, sy, dw * SC, dh * SC);
      if (Math.sin(p.squish * 30) > 0) { ctx.fillStyle = "#ffd86b"; ctx.fillRect(sx + dw * SC / 2 - 2, sy - 9, 4, 4); }
      ctx.fillStyle = p.color; ctx.fillRect(sx + dw * SC / 2 - 9, sy - 17, 18, 7);
      text(p === p1 ? "P1" : "P2", sx + dw * SC / 2 - 6, sy - 16, 1, INK);
      return;
    }
    const dh = 18, dw = Math.round(s.w * dh / s.h);
    const sx = Math.round((p.x + PW / 2 - cam) * SC - dw * SC / 2);
    const bob = (p.onG && Math.abs(p.vx) > 1 && Math.sin(p.walkT) > 0) ? 1 : 0;   // gentle 1px step
    const sy = Math.round((p.y + PH - dh) * SC) - bob * SC;
    ctx.drawImage(s.canvas, sx, sy, dw * SC, dh * SC);
    ctx.fillStyle = p.color; ctx.fillRect(sx + dw * SC / 2 - 9, sy - 9, 18, 7);
    text(p === p1 ? "P1" : "P2", sx + dw * SC / 2 - 6, sy - 8, 1, INK);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    // sky
    ctx.fillStyle = BP.A; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = "#101a38"; ctx.fillRect(0, 0, CW, 60);
    // stars (parallax)
    ctx.fillStyle = "#eef2ff";
    for (let i = 0; i < 90; i++) { const sx = ((i * 53 - cam * 0.3) % CW + CW) % CW; const sy = (i * 37) % (CH - 120); ctx.fillRect(sx | 0, sy | 0, 2, 2); }
    // background towers (non-solid backdrop), parallax 0.5
    for (const [tx, th] of towers) {
      let x = ((tx - cam * 0.5) % LOOPW + LOOPW) % LOOPW; if (x > viewW + 60) continue;
      const topY = GROW * TS - th;
      ctx.fillStyle = "#1b2742"; ctx.fillRect(Math.round(x * SC), Math.round(topY * SC), 44 * SC, (GROW * TS - topY) * SC);
      ctx.fillStyle = "#243456"; ctx.fillRect(Math.round(x * SC), Math.round(topY * SC), 44 * SC, 4 * SC);
    }
    for (const tx of trees) {
      let x = (tx - cam * 0.5); x = ((x % LOOPW) + LOOPW) % LOOPW; if (x > CW / SC + 40) continue;
      const dh = TREE.h * 2; ctx.drawImage(TREE.canvas, Math.round(x * SC), Math.round((GROW * TS - dh) * SC), TREE.w * 2 * SC, dh * SC);
    }
    // tiles (solid world), draw visible columns with wrap
    const c0 = Math.floor(cam / TS) - 1, c1 = c0 + (viewW / TS) + 3;
    for (let cxi = c0; cxi <= c1; cxi++) {
      const gx = wrap(cxi);
      for (let y = 0; y < HT; y++) { const ch = grid[y][gx]; if (ch === ".") continue; drawTileSprite(TILE[ch], cxi * TS, y * TS); }
    }
    // players
    players.forEach(drawPlayer);

    // death-edge danger stripe
    const grd = ctx.createLinearGradient(0, 0, 60, 0); grd.addColorStop(0, "rgba(226,59,59,.55)"); grd.addColorStop(1, "rgba(226,59,59,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 60, CH);

    // HUD
    ctx.fillStyle = "rgba(16,17,28,.7)"; ctx.fillRect(0, 0, CW, 26);
    text(p1name + (p1.alive ? "" : "  OUT"), 12, 9, 2, p1.alive ? P1C : "#6a6a86");
    const r2 = p2name + (p2.alive ? "" : "  OUT"); text(r2, CW - 12 - tW(r2, 2), 9, 2, p2.alive ? P2C : "#6a6a86");
    tc("RUNNER  -  KEEP UP OR FALL OFF", CW / 2, 4, 2, GOLD);
    tc("P1 A/D +W      P2 ARROWS +UP      BACKSPACE MENU", CW / 2, 17, 1, DIM);

    if (phase === "ready") {
      ctx.fillStyle = "rgba(10,15,31,.5)"; ctx.fillRect(0, 0, CW, CH);
      tc(timer > 0.3 ? String(Math.ceil(timer - 0.2)) : "RUN!", CW / 2, CH / 2 - 40, 7, GOLD);
      tc("THE SCREEN MOVES - DON'T FALL BEHIND - HOLD FORWARD, JUMP THE GAPS", CW / 2, CH / 2 + 36, 2, "#cfe0ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(10,15,31,.86)"; ctx.fillRect(0, 0, CW, CH);
      if (winner) { tc((winner === p1 ? "P1" : "P2") + " SURVIVES!", CW / 2, 150, 6, GOLD);
        const s = fight[winner.name], scl = 150 / s.h; ctx.drawImage(s.canvas, CW / 2 - s.w * scl / 2, 230, s.w * scl, 150);
        tc(winner.name + " WINS", CW / 2, 400, 4, winner.color);
      } else tc("BOTH FELL!", CW / 2, 250, 6, GOLD);
      tc("ENTER = REMATCH     BACKSPACE = MENU", CW / 2, 470, 2, DIM);
    }
    window.__rn = { phase, a1: p1.alive, a2: p2.alive, winner: winner ? winner.name : null, camx: Math.round(cam), p1x: Math.round(p1.x), p1y: Math.round(p1.y), p1g: p1.onG, s1: +p1.squish.toFixed(2), s2: +p2.squish.toFixed(2), seed: SEED };
    window.__rnhook = { tp: (ax, ay, bx, by) => { p1.x = ax; p1.y = ay; p2.x = bx; p2.y = by; p1.vy = 0; p2.vy = 0; }, drop: () => { p1.vy = 120; } };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
