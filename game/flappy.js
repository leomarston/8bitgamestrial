/* 8-BIT PARTY — Flappy Duel (2 players, couch).
 * Both fighters fly the SAME pipes at once, one staggered in front. A crash
 * takes you out. When a flyer goes down, a coloured line marks the spot; the
 * other must fly PAST that line to win — otherwise the one who got further wins.
 * Furthest distance wins.  P1 = W / Space,  P2 = Up arrow.
 */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // ---------- assets ----------
  function buildSprite(rows) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = D.palette[rows[y][x]]; if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return { canvas: c, w, h };
  }
  function flip(s) {
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0);
    return { canvas: c, w: s.w, h: s.h };
  }
  const spr = {}; D.roster.forEach(c => spr[c.name] = buildSprite(c.rows));
  const wUpR = buildSprite(D.wingUp), wDnR = buildSprite(D.wingDown);
  const wUpL = flip(wUpR), wDnL = flip(wDnR);
  const FONT = D.font;

  // ---------- pixel text ----------
  function tW(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++)
        if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#0a1020", sp); text(s, x, y, sc, c, sp); };

  // ---------- colors ----------
  const SKY_TOP = "#bfe9ff", SKY1 = "#8fd0ff", HILL = "#3f9e63", CLOUD = "#f4f4ee";
  const PIPE = "#6bd66b", PIPE_D = "#2f8c50", PIPE_L = "#a7eea0", OUT = "#1d3a23";
  const GRASS = "#6bd66b", DIRT = "#8a5a32", DIRT_D = "#683a1e";
  const GOLD = "#ffd54a", DIM = "#cfe6f5", INK = "#0c1320";
  const P1C = "#ff5d5d", P2C = "#5db4ff";
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, SKY_TOP); skyGrad.addColorStop(1, SKY1);

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!spr[p1name]) p1name = "PIXEL"; if (!spr[p2name]) p2name = "BYTE";

  // ---------- layout / tuning ----------
  const groundY = H - 70, ceil = 26;
  const GRAV = 1800, FLAP = -480, MAXV = 720;
  const PW = 74, GAP = 196, SPACING = 300;
  const SCROLL = 188;
  const BSCALE = 1.8;

  function mkBird(name, color, x) {
    const s = spr[name];
    return { name, color, x, y: H * 0.42, vy: 0, alive: true, score: 0,
      flap: 0, angle: 0, dead: false, deathScroll: 0, dist: 0,
      bw: Math.round(s.w * BSCALE), bh: Math.round(s.h * BSCALE), s };
  }
  // P1 flies in front (further right), P2 trails behind
  const p1 = mkBird(p1name, P1C, 380);
  const p2 = mkBird(p2name, P2C, 250);
  const birds = [p1, p2];

  let pipes = [], scroll = 0, clouds = [];
  for (let i = 0; i < 7; i++) clouds.push({ x: Math.random() * W, y: 30 + Math.random() * 180, s: 1 + Math.random() });

  let phase = "ready", timer = 2.2, winner = null, deadFirst = null;

  function spawnPipe(x) {
    const gy = ceil + GAP / 2 + 30 + Math.random() * (groundY - ceil - GAP - 70);
    pipes.push({ x, gapY: gy, p1: false, p2: false });
  }
  function reset() {
    pipes = []; scroll = 0; winner = null; deadFirst = null;
    let x = W + 140; for (let i = 0; i < 5; i++) { spawnPipe(x); x += SPACING; }
    [p1, p2].forEach(b => { b.y = H * 0.42; b.vy = 0; b.alive = true; b.dead = false; b.score = 0; b.flap = 0; b.angle = 0; });
    phase = "ready"; timer = 2.2;
  }
  reset();

  // ---------- input ----------
  function doFlap(b) { if (b.alive && (phase === "play" || phase === "chase")) { b.vy = FLAP; b.flap = 0.18; } }
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "Space", "ArrowDown"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { e.preventDefault(); location.href = "index.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { reset(); return; }
    if (e.repeat) return;
    if (e.code === "KeyW" || e.code === "Space") doFlap(p1);
    if (e.code === "ArrowUp") doFlap(p2);
  });

  // ---------- physics ----------
  function hit(b, p) {
    const hw = b.bw * 0.32, hh = b.bh * 0.40;
    const l = b.x - hw, r = b.x + hw, t = b.y - hh, bo = b.y + hh;
    const gapTop = p.gapY - GAP / 2, gapBot = p.gapY + GAP / 2;
    if (r > p.x && l < p.x + PW) { if (t < gapTop || bo > gapBot) return true; }
    return false;
  }
  function kill(b) {
    if (!b.alive) return;
    b.alive = false; b.dead = true; b.deathScroll = scroll; b.dist = scroll + b.x;
    const other = b === p1 ? p2 : p1;
    if (!other.alive) {                       // both down -> compare
      winner = (p1.dist >= p2.dist) ? p1 : p2; phase = "over"; return;
    }
    deadFirst = b;                            // start the chase
    phase = "chase";
    if (scroll + other.x >= b.dist) { winner = other; phase = "over"; }  // other already past
  }

  function update(dt) {
    // clouds drift always
    clouds.forEach(c => { c.x -= 14 * c.s * dt; if (c.x < -60) { c.x = W + 40; c.y = 30 + Math.random() * 180; } });
    if (phase === "ready") { timer -= dt; if (timer <= 0) phase = "play"; return; }
    if (phase === "over") return;

    scroll += SCROLL * dt;
    // pipes
    pipes.forEach(p => p.x -= SCROLL * dt);
    if (pipes.length && pipes[pipes.length - 1].x < W - SPACING) spawnPipe(pipes[pipes.length - 1].x + SPACING);
    if (pipes.length && pipes[0].x < -PW) pipes.shift();

    birds.forEach(b => {
      b.flap = Math.max(0, b.flap - dt);
      if (b.alive) {
        b.vy = Math.min(MAXV, b.vy + GRAV * dt);
        b.y += b.vy * dt;
        b.angle = Math.max(-0.45, Math.min(0.85, b.vy / 700));
        if (b.y < ceil) { b.y = ceil; b.vy = 0; }
        // scoring
        pipes.forEach(p => { const key = b === p1 ? "p1" : "p2";
          if (!p[key] && p.x + PW < b.x) { p[key] = true; b.score++; } });
        // collisions
        if (b.y + b.bh * 0.40 >= groundY) { b.y = groundY - b.bh * 0.40; kill(b); }
        else { for (const p of pipes) if (hit(b, p)) { kill(b); break; } }
      } else {
        // falling corpse
        b.vy = Math.min(MAXV, b.vy + GRAV * dt); b.y += b.vy * dt;
        b.angle += 3 * dt;
        if (b.y > groundY - b.bh * 0.3) b.y = groundY - b.bh * 0.3;
      }
    });

    if (phase === "chase" && deadFirst) {
      const alive = deadFirst === p1 ? p2 : p1;
      if (alive.alive && scroll + alive.x >= deadFirst.dist) { winner = alive; phase = "over"; }
    }
  }

  // ---------- draw ----------
  function drawBird(b) {
    const up = b.flap > 0 ? [wDnL, wDnR] : [wUpL, wUpR];
    ctx.save();
    ctx.translate(Math.round(b.x), Math.round(b.y));
    ctx.rotate(b.angle);
    const ww = Math.round(up[1].w * 2.3), wh = Math.round(up[1].h * 2.3);
    const wy = -wh / 2 - Math.round(b.bh * 0.16);   // attach near the shoulders/back
    ctx.drawImage(up[0].canvas, -b.bw / 2 - ww + 9, wy, ww, wh);
    ctx.drawImage(up[1].canvas, b.bw / 2 - 9, wy, ww, wh);
    ctx.drawImage(b.s.canvas, -b.bw / 2, -b.bh / 2, b.bw, b.bh);
    ctx.restore();
  }

  function pipeSeg(x, y, h) {
    if (h <= 0) return;
    ctx.fillStyle = PIPE; ctx.fillRect(x, y, PW, h);
    ctx.fillStyle = PIPE_L; ctx.fillRect(x + 6, y, 8, h);
    ctx.fillStyle = PIPE_D; ctx.fillRect(x + PW - 12, y, 10, h);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y, PW - 3, h);
  }
  function pipeCap(x, y) {
    ctx.fillStyle = PIPE; ctx.fillRect(x - 5, y, PW + 10, 26);
    ctx.fillStyle = PIPE_L; ctx.fillRect(x - 1, y + 3, 8, 20);
    ctx.fillStyle = PIPE_D; ctx.fillRect(x + PW - 7, y + 3, 8, 20);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.strokeRect(x - 5 + 1.5, y + 1.5, PW + 10 - 3, 26 - 3);
  }
  function drawPipe(p) {
    const gapTop = p.gapY - GAP / 2, gapBot = p.gapY + GAP / 2;
    pipeSeg(p.x, 0, gapTop - 26);
    pipeSeg(p.x, gapBot + 26, groundY - (gapBot + 26));
    pipeCap(p.x, gapTop - 26);
    pipeCap(p.x, gapBot);
  }

  function drawMarker() {
    if (!deadFirst) return;
    const mx = deadFirst.x - (scroll - deadFirst.deathScroll);
    if (mx < -10 || mx > W) return;
    ctx.strokeStyle = deadFirst.color; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(mx, ceil); ctx.lineTo(mx, groundY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = deadFirst.color; rectTag(mx - 26, ceil + 6, 52, 18);
    text("PASS!", mx - 22, ceil + 10, 1.6 | 0, INK);
  }
  function rectTag(x, y, w, h) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill(); }

  function drawHUD() {
    // P1 left
    ctx.fillStyle = P1C; rectTag(12, 12, 10, 26);
    text(p1.name, 28, 12, 2, P1C); text("PIPES " + p1.score, 28, 30, 1.5 | 0, "#eef6ff");
    // P2 right
    const rx = W - 12;
    ctx.fillStyle = P2C; rectTag(rx - 10, 12, 10, 26);
    const nw = tW(p2.name, 2); text(p2.name, rx - 16 - nw, 12, 2, P2C);
    const sc = "PIPES " + p2.score; text(sc, rx - 16 - tW(sc, 1.5 | 0), 30, 1.5 | 0, "#eef6ff");
    tc("FLAPPY DUEL", W / 2, 12, 2, GOLD);
    tc("P1 W / SPACE      P2 UP      BACKSPACE MENU", W / 2, 32, 1, DIM);
  }

  // deterministic per-index pseudo-random so scenery tiles without flicker
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function drawBuildings() {
    const par = 0.22, bw = 66, base = groundY - 16;
    const startWX = scroll * par;
    const i0 = Math.floor(startWX / bw) - 1;
    for (let i = i0; i < i0 + Math.ceil(W / bw) + 2; i++) {
      const sx = Math.round(i * bw - startWX);
      const h = 80 + rnd(i) * 150, top = base - h;
      ctx.fillStyle = "#7fa8c6"; ctx.fillRect(sx, top, bw - 8, h);
      ctx.fillStyle = "#6e96b6"; ctx.fillRect(sx + bw - 8 - 7, top, 7, h);
      ctx.fillStyle = "#9fc3dc"; ctx.fillRect(sx, top, bw - 8, 4); // roof rim
      ctx.fillStyle = "#ffe49a";
      for (let wy = top + 12; wy < base - 12; wy += 18)
        for (let wx = sx + 8; wx < sx + bw - 18; wx += 16)
          if (rnd(i * 53.1 + wy * 1.7 + wx) > 0.42) ctx.fillRect(wx, wy, 7, 9);
    }
  }

  function drawTrees() {
    const par = 0.5, sp = 104;
    const startWX = scroll * par;
    const i0 = Math.floor(startWX / sp) - 1;
    for (let i = i0; i < i0 + Math.ceil(W / sp) + 2; i++) {
      const sx = Math.round(i * sp - startWX) + 50, r = 26 + rnd(i * 7.3) * 12;
      ctx.fillStyle = "#5a3418"; ctx.fillRect(sx - 5, groundY - r + 4, 10, r + 8);
      ctx.fillStyle = "#2f8c50"; ctx.beginPath(); ctx.arc(sx, groundY - r, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3fae66"; ctx.beginPath(); ctx.arc(sx - r * 0.3, groundY - r - r * 0.25, r * 0.62, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);

    // sky (smooth gradient — no waterline)
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    clouds.forEach(c => { ctx.fillStyle = CLOUD;
      const s = Math.round(6 * c.s);
      ctx.fillRect(c.x, c.y, s * 5, s * 2); ctx.fillRect(c.x + s, c.y - s, s * 3, s * 2);
      ctx.fillRect(c.x + s * 2, c.y + s, s * 2, s);
    });
    drawBuildings();
    drawTrees();
    // pipes
    pipes.forEach(drawPipe);
    drawMarker();
    // ground
    ctx.fillStyle = DIRT; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = GRASS; ctx.fillRect(0, groundY, W, 12);
    ctx.fillStyle = DIRT_D;
    for (let x = -((scroll | 0) % 32); x < W; x += 32) ctx.fillRect(x, groundY + 22, 16, 8);

    // birds: draw dead one(s) first, then alive on top
    birds.filter(b => !b.alive).forEach(drawBird);
    birds.filter(b => b.alive).forEach(drawBird);

    drawHUD();

    if (phase === "ready") {
      const n = Math.max(1, Math.ceil(timer - 0.2));
      tc(timer > 0.25 ? String(n) : "GO!", W / 2, H / 2 - 120, 7, GOLD);
      tc("FLAP TO STAY UP - FURTHEST FLYER WINS", W / 2, H / 2 - 150, 2, "#eef6ff");
    }
    if (phase === "chase" && deadFirst) {
      const downName = deadFirst.name, chaser = (deadFirst === p1 ? p2 : p1);
      tc(downName + " DOWN!  " + chaser.name + " - PASS THE LINE!", W / 2, 70, 2, GOLD);
    }
    if (phase === "over" && winner) {
      ctx.fillStyle = "rgba(8,14,24,.84)"; ctx.fillRect(0, 0, W, H);
      tc((winner === p1 ? "P1" : "P2") + " WINS!", W / 2, 120, 6, GOLD);
      const s = winner.s, scl = 210 / s.h;
      ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 205, s.w * scl, 210);
      tc(winner.name, W / 2, 440, 4, winner.color);
      tc("PIPES   " + p1.name + " " + p1.score + "   -   " + p2.name + " " + p2.score, W / 2, 495, 2, "#eef6ff");
      tc("ENTER = REMATCH     BACKSPACE = MENU", W / 2, 545, 2, DIM);
    }

    window.__dbg = { phase, winner: winner ? winner.name : null, s1: p1.score, s2: p2.score };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
