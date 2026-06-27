/* 8-BIT PARTY — Flappy Duel for 2–4 players (couch).
 * Every fighter flies the SAME pipes at once, staggered front-to-back. Each has
 * their own flap button; a crash takes that flyer out. When everyone is down,
 * whoever passed the MOST pipes wins.
 * P1 WASD/Space · P2 Arrows · P3 IJKL/O · P4 TGHR.
 */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  function buildSprite(rows) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = D.palette[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  }
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  const spr = {}; D.roster.forEach(c => spr[c.name] = buildSprite(c.rows));
  const wUpR = buildSprite(D.wingUp), wDnR = buildSprite(D.wingDown), wUpL = flip(wUpR), wDnL = flip(wDnR);
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);

  const SKY1 = "#8fd0ff", CLOUD = "#f4f4ee";
  const PIPE = "#6bd66b", PIPE_D = "#2f8c50", PIPE_L = "#a7eea0", OUT = "#1d3a23";
  const GRASS = "#6bd66b", DIRT = "#8a5a32", DIRT_D = "#683a1e";
  const GOLD = "#ffd54a", DIM = "#cfe6f5";

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => spr[n] ? n : "PIXEL");
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const PKEYS = [
    ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyF"],
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Numpad0"],
    ["KeyI", "KeyJ", "KeyK", "KeyL", "KeyO", "KeyU"],
    ["KeyT", "KeyG", "KeyH", "KeyR", "KeyY", "KeyV"],
  ];
  const CTL = ["WASD/SPACE", "ARROWS", "IJKL/O", "TGHR"];

  // ---------- tuning ----------
  const groundY = H - 70, ceil = 26;
  const GRAV = 1800, FLAP = -480, MAXV = 720;
  const PW = 74, GAP = 196, SPACING = 300, SCROLL = 188, BSCALE = 1.8;

  function mkBird(i) {
    const s = spr[NAMES[i]];
    return { i, name: NAMES[i], color: PCOL[i], x: 380 - i * 56, y: H * 0.42, vy: 0, alive: true, score: 0, flap: 0, angle: 0, bw: Math.round(s.w * BSCALE), bh: Math.round(s.h * BSCALE), s };
  }
  let birds = [];
  let pipes = [], scroll = 0, clouds = [];
  for (let i = 0; i < 7; i++) clouds.push({ x: Math.random() * W, y: 30 + Math.random() * 180, s: 1 + Math.random() });
  let phase = "ready", timer = 2.2, winner = null;

  function spawnPipe(x) { const gy = ceil + GAP / 2 + 30 + Math.random() * (groundY - ceil - GAP - 70); pipes.push({ x, gapY: gy, passed: [false, false, false, false] }); }
  function reset() {
    pipes = []; scroll = 0; winner = null;
    let x = W + 140; for (let i = 0; i < 5; i++) { spawnPipe(x); x += SPACING; }
    birds = []; for (let i = 0; i < count; i++) birds.push(mkBird(i));
    phase = "ready"; timer = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop();
  }
  reset();

  // ---------- input ----------
  function doFlap(b) { if (b && b.alive && phase === "play") { b.vy = FLAP; b.flap = 0.18; } }
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { e.preventDefault(); location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (e.repeat) return;
    for (let i = 0; i < count; i++) if (PKEYS[i].includes(e.code)) { doFlap(birds[i]); break; }
  });

  // ---------- physics ----------
  function hit(b, p) {
    const hw = b.bw * 0.32, hh = b.bh * 0.40, l = b.x - hw, r = b.x + hw, t = b.y - hh, bo = b.y + hh;
    const gapTop = p.gapY - GAP / 2, gapBot = p.gapY + GAP / 2;
    return r > p.x && l < p.x + PW && (t < gapTop || bo > gapBot);
  }
  function kill(b) {
    if (!b.alive) return; b.alive = false;
    if (birds.every(x => !x.alive)) {
      const best = Math.max(...birds.map(x => x.score));
      const top = birds.filter(x => x.score === best);
      winner = top.length === 1 ? top[0] : null;
      phase = "over";
    }
  }
  function update(dt) {
    clouds.forEach(c => { c.x -= 14 * c.s * dt; if (c.x < -60) { c.x = W + 40; c.y = 30 + Math.random() * 180; } });
    if (phase === "ready") { timer -= dt; if (timer <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "over") return;
    scroll += SCROLL * dt;
    pipes.forEach(p => p.x -= SCROLL * dt);
    if (pipes.length && pipes[pipes.length - 1].x < W - SPACING) spawnPipe(pipes[pipes.length - 1].x + SPACING);
    if (pipes.length && pipes[0].x < -PW) pipes.shift();
    birds.forEach(b => {
      b.flap = Math.max(0, b.flap - dt);
      if (b.alive) {
        b.vy = Math.min(MAXV, b.vy + GRAV * dt); b.y += b.vy * dt;
        b.angle = Math.max(-0.45, Math.min(0.85, b.vy / 700));
        if (b.y < ceil) { b.y = ceil; b.vy = 0; }
        // score a pipe only once the bird is FULLY past it (trailing edge clears the pipe's
        // right edge). Past that point a collision is impossible, so you can never both score
        // a pipe and die on it — die on a pipe = you didn't pass it = no point for it.
        const hw = b.bw * 0.32;
        pipes.forEach(p => { if (!p.passed[b.i] && p.x + PW <= b.x - hw) { p.passed[b.i] = true; b.score++; } });
        if (b.y + b.bh * 0.40 >= groundY) { b.y = groundY - b.bh * 0.40; kill(b); }
        else { for (const p of pipes) if (hit(b, p)) { kill(b); break; } }
      }
      // dead birds stay frozen exactly where they died — no falling, no rolling
    });
  }

  // ---------- draw ----------
  function drawBird(b) {
    const up = b.flap > 0 ? [wDnL, wDnR] : [wUpL, wUpR];
    ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.angle);
    if (!b.alive) ctx.globalAlpha = 0.7;
    const ww = Math.round(up[1].w * 2.3), wh = Math.round(up[1].h * 2.3), wy = -wh / 2 - Math.round(b.bh * 0.16);
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
    pipeSeg(p.x, 0, gapTop - 26); pipeSeg(p.x, gapBot + 26, groundY - (gapBot + 26));
    pipeCap(p.x, gapTop - 26); pipeCap(p.x, gapBot);
  }
  function rectTag(x, y, w, h) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill(); }
  function drawHUD() {
    const colW = (W - 24) / count;
    for (let i = 0; i < count; i++) {
      const b = birds[i], x = 12 + i * colW;
      ctx.fillStyle = b.color; rectTag(x, 10, 8, 26);
      text(b.name, x + 12, 10, 1.6 | 0, b.alive ? b.color : "#7f8aaa");
      text("PIPES " + b.score, x + 12, 28, 1.4 | 0, "#eef6ff");
    }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.fillStyle = SKY1; ctx.fillRect(0, 0, W, H);
    clouds.forEach(c => { ctx.fillStyle = CLOUD; const s = Math.round(6 * c.s); ctx.fillRect(c.x, c.y, s * 5, s * 2); ctx.fillRect(c.x + s, c.y - s, s * 3, s * 2); });
    pipes.forEach(drawPipe);
    ctx.fillStyle = DIRT; ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = GRASS; ctx.fillRect(0, groundY, W, 12);
    ctx.fillStyle = DIRT_D; for (let x = -((scroll | 0) % 32); x < W; x += 32) ctx.fillRect(x, groundY + 22, 16, 8);
    birds.filter(b => !b.alive).forEach(drawBird);
    birds.filter(b => b.alive).forEach(drawBird);
    drawHUD();

    if (phase === "ready") {
      tc(Countdown.label(timer), W / 2, H / 2 - 110, 7, GOLD);
      tc("FLAP TO STAY UP  -  MOST PIPES WINS", W / 2, H / 2 - 150, 2, "#eef6ff");
      tc(count + " PLAYERS", W / 2, H / 2 - 40, 2, DIM);
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(8,14,24,.86)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc(winner.name + " WINS!", W / 2, 110, 6, GOLD);
        const s = winner.s, scl = 190 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 190, s.w * scl, 190);
      } else tc("DRAW!", W / 2, 200, 6, GOLD);
      const order = birds.slice().sort((a, b) => b.score - a.score);
      let y = 410; for (const b of order) { tc(b.name + "   " + b.score + " PIPES", W / 2, y, 2, b.color); y += 26; }
      tc((window.Tournament && Tournament.active) ? "RETURNING TO THE 8-BIT CUP" : "ENTER = REMATCH     BACKSPACE = MENU", W / 2, y + 16, 2, DIM);
    }
    window.__dbg = { phase, count, scores: birds.map(b => b.score), alive: birds.map(b => b.alive), winner: winner ? winner.name : null };
    window.__fhook = {
      bird: i => birds[i] ? { x: birds[i].x, y: Math.round(birds[i].y), vy: Math.round(birds[i].vy), angle: +birds[i].angle.toFixed(3), alive: birds[i].alive, score: birds[i].score, bw: birds[i].bw, bh: birds[i].bh } : null,
      set: (i, x, y, vy) => { const b = birds[i]; if (b) { if (x != null) b.x = x; if (y != null) b.y = y; if (vy != null) b.vy = vy; } },
      pipes: () => pipes.map(p => ({ x: Math.round(p.x), gapY: Math.round(p.gapY) })),
      clearpipes: () => { pipes = []; },
      addpipe: (x, gapY) => { pipes.push({ x, gapY, passed: [false, false, false, false] }); return pipes.length - 1; },
      kill: i => birds[i] && kill(birds[i]),
      consts: () => ({ PW, GAP, groundY, ceil }),
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
