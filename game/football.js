/* 8-BIT PARTY — FOOTBALL, now 2–4 player "defend your wall" pong.
 * A square pitch; each player guards one side (P1 bottom, P2 top, P3 left,
 * P4 right). Unused sides are solid walls. Each paddle slides on its own and
 * bounces corner-to-corner; tap your button to REVERSE it and block the ball.
 * Miss and you lose a life; 3 lives gone = your side walls up and you're out.
 * Last player standing wins.  P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
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
  const spr = {}; D.roster.forEach(c => spr[c.name] = buildSprite(c.rows));
  const ballSpr = buildSprite(D.ball);
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const LINE = "#f4f4ee", GRASS = "#2f8c50", GRASS2 = "#6bd66b", GOLD = "#ffd54a", DIM = "#9aa6ad", WALLC = "#8a8f9e", WALLD = "#4b4f60";

  // ---- count + picks ----
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => spr[n] ? n : "PIXEL");

  // ---- arena (square) ----
  const A = 520, ax = (W - A) / 2, ay = 50, L = ax, R = ax + A, T = ay, B = ay + A;
  const CXc = (L + R) / 2, CYc = (T + B) / 2;
  const CORNER = 36, OFF = 26, PADLEN = 116, PADTH = 18, PADSPD = 0.82, BR = 14;
  const lerp = (a, b, t) => a + (b - a) * t;

  // sides: 0 bottom, 1 top, 2 left, 3 right
  const SIDES = ["bottom", "top", "left", "right"];
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const PKEYS = [
    ["KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyF"],
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Numpad0"],
    ["KeyI", "KeyJ", "KeyK", "KeyL", "KeyO", "KeyU"],
    ["KeyT", "KeyG", "KeyH", "KeyR", "KeyY", "KeyV"],   // P4: T/G/H cluster (+ R/Y/V), no F clash with P1
  ];
  const CTL = ["WASD/SPACE", "ARROWS/ENTER", "IJKL/O", "TGHR"];

  let players, ball, phase, timer, msg, winner, t0;
  function mkPlayer(i) {
    return { name: NAMES[i], color: PCOL[i], side: SIDES[i], lives: 3, alive: true, active: i < count, t: 0.5, dir: i % 2 ? 1 : -1 };
  }
  function reset(full) {
    players = [0, 1, 2, 3].map(mkPlayer);
    ball = { x: CXc, y: CYc, vx: 0, vy: 0, r: BR };
    phase = "ready"; timer = 3.0; msg = ""; winner = null; t0 = 0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop();
  }
  reset(true);

  function activeAlive() { return players.filter(p => p.active && p.alive); }
  function launch() {
    let a = Math.random() * Math.PI * 2, sp = 330;
    // push the angle ≥15° off the cardinals so the ball always travels diagonally toward a
    // goal — never a flat rally bouncing forever along a side that happens to be a wall.
    const near = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(a - near) < 0.26) a = near + (a >= near ? 0.26 : -0.26);
    ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp; phase = "play";
  }

  // paddle geometry for a side at param t
  function padRect(p) {
    if (p.side === "bottom") { const cx = lerp(L + CORNER + PADLEN / 2, R - CORNER - PADLEN / 2, p.t); return { x: cx - PADLEN / 2, y: B - OFF - PADTH / 2, w: PADLEN, h: PADTH, cx, cy: B - OFF, horiz: true }; }
    if (p.side === "top") { const cx = lerp(L + CORNER + PADLEN / 2, R - CORNER - PADLEN / 2, p.t); return { x: cx - PADLEN / 2, y: T + OFF - PADTH / 2, w: PADLEN, h: PADTH, cx, cy: T + OFF, horiz: true }; }
    if (p.side === "left") { const cy = lerp(T + CORNER + PADLEN / 2, B - CORNER - PADLEN / 2, p.t); return { x: L + OFF - PADTH / 2, y: cy - PADLEN / 2, w: PADTH, h: PADLEN, cx: L + OFF, cy, horiz: false }; }
    const cy = lerp(T + CORNER + PADLEN / 2, B - CORNER - PADLEN / 2, p.t); return { x: R - OFF - PADTH / 2, y: cy - PADLEN / 2, w: PADTH, h: PADLEN, cx: R - OFF, cy, horiz: false };
  }

  // ---- input: any of a player's keys flips that paddle ----
  window.addEventListener("keydown", e => {
    if (e.code === "Backspace") { e.preventDefault(); location.href = "gameselect.html"; return; }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (phase === "win" && (e.code === "KeyR" || e.code === "Enter" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(true); return; }
    if (e.repeat) return;
    for (let i = 0; i < count; i++) {
      const p = players[i];
      if (p.alive && PKEYS[i].includes(e.code)) { p.dir = -p.dir || 1; break; }
    }
  });

  // ---- update ----
  function concede(p) {
    p.lives--; if (p.lives <= 0) { p.lives = 0; p.alive = false; }
    const aa = activeAlive();
    if (aa.length <= 1) { winner = aa[0] || null; phase = "win"; return; }
    ball.x = CXc; ball.y = CYc; ball.vx = ball.vy = 0; phase = "kickoff"; timer = 1.0; msg = "";
  }
  function reflectPaddle(p) {
    const r = padRect(p);
    if (!(ball.x + ball.r > r.x && ball.x - ball.r < r.x + r.w && ball.y + ball.r > r.y && ball.y - ball.r < r.y + r.h)) return;
    const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, 880);
    if (p.side === "bottom" && ball.vy > 0) { const o = (ball.x - r.cx) / (PADLEN / 2); ball.vy = -Math.abs(sp * Math.cos(o * 0.9)); ball.vx = sp * Math.sin(o * 0.9); ball.y = r.y - ball.r; }
    else if (p.side === "top" && ball.vy < 0) { const o = (ball.x - r.cx) / (PADLEN / 2); ball.vy = Math.abs(sp * Math.cos(o * 0.9)); ball.vx = sp * Math.sin(o * 0.9); ball.y = r.y + r.h + ball.r; }
    else if (p.side === "left" && ball.vx < 0) { const o = (ball.y - r.cy) / (PADLEN / 2); ball.vx = Math.abs(sp * Math.cos(o * 0.9)); ball.vy = sp * Math.sin(o * 0.9); ball.x = r.x + r.w + ball.r; }
    else if (p.side === "right" && ball.vx > 0) { const o = (ball.y - r.cy) / (PADLEN / 2); ball.vx = -Math.abs(sp * Math.cos(o * 0.9)); ball.vy = sp * Math.sin(o * 0.9); ball.x = r.x - ball.r; }
  }
  function wall(side) { // is this side solid (inactive or eliminated)?
    const p = players[SIDES.indexOf(side)]; return !(p.active && p.alive);
  }
  function update(dt) {
    // paddles always slide + bounce off corners
    for (let i = 0; i < count; i++) { const p = players[i]; if (!p.alive) continue;
      p.t += p.dir * PADSPD * dt; if (p.t < 0) { p.t = 0; p.dir = 1; } if (p.t > 1) { p.t = 1; p.dir = -1; } }
    if (phase === "ready") { timer -= dt; if (timer <= -0.5) { launch(); if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "kickoff") { timer -= dt; if (timer <= 0) launch(); return; }
    if (phase === "win") return;
    t0 += dt;
    const bsp = Math.hypot(ball.vx, ball.vy); if (bsp > 1 && bsp < 880) { const k = 1 + 0.04 * dt; ball.vx *= k; ball.vy *= k; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    for (let i = 0; i < count; i++) if (players[i].alive) reflectPaddle(players[i]);

    // edges: concede on an active side's goal span, else wall-bounce
    const inX = ball.x > L + CORNER && ball.x < R - CORNER, inY = ball.y > T + CORNER && ball.y < B - CORNER;
    if (ball.y + ball.r > B) { if (!wall("bottom") && inX) return concede(players[0]); ball.y = B - ball.r; ball.vy = -Math.abs(ball.vy); }
    if (ball.y - ball.r < T) { if (!wall("top") && inX) return concede(players[1]); ball.y = T + ball.r; ball.vy = Math.abs(ball.vy); }
    if (ball.x - ball.r < L) { if (!wall("left") && inY) return concede(players[2]); ball.x = L + ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > R) { if (!wall("right") && inY) return concede(players[3]); ball.x = R - ball.r; ball.vx = -Math.abs(ball.vx); }
  }

  // ---- draw ----
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function drawWall(side) {
    ctx.fillStyle = WALLC; ctx.strokeStyle = WALLD; ctx.lineWidth = 2; const TH = 16;
    if (side === "bottom") { ctx.fillRect(L, B - TH, A, TH); for (let x = L; x < R; x += 22) { ctx.strokeStyle = WALLD; ctx.beginPath(); ctx.moveTo(x, B - TH); ctx.lineTo(x, B); ctx.stroke(); } }
    if (side === "top") { ctx.fillRect(L, T, A, TH); for (let x = L; x < R; x += 22) { ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + TH); ctx.stroke(); } }
    if (side === "left") { ctx.fillRect(L, T, TH, A); for (let y = T; y < B; y += 22) { ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + TH, y); ctx.stroke(); } }
    if (side === "right") { ctx.fillRect(R - TH, T, TH, A); for (let y = T; y < B; y += 22) { ctx.beginPath(); ctx.moveTo(R - TH, y); ctx.lineTo(R, y); ctx.stroke(); } }
  }
  function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function drawGoalNet(side, color) {
    const NETD = 24, NET = "#c7ccd6";
    let x0, y0, w, h;
    if (side === "bottom") { x0 = L + CORNER; y0 = B - NETD; w = A - 2 * CORNER; h = NETD; }
    else if (side === "top") { x0 = L + CORNER; y0 = T; w = A - 2 * CORNER; h = NETD; }
    else if (side === "left") { x0 = L; y0 = T + CORNER; w = NETD; h = A - 2 * CORNER; }
    else { x0 = R - NETD; y0 = T + CORNER; w = NETD; h = A - 2 * CORNER; }
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = "rgba(16,24,18,.62)"; ctx.fillRect(x0, y0, w, h);          // goal mouth
    ctx.strokeStyle = NET; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;          // crosshatch net
    for (let gx = x0; gx <= x0 + w; gx += 7) line(gx, y0, gx, y0 + h);
    for (let gy = y0; gy <= y0 + h; gy += 7) line(x0, gy, x0 + w, gy);
    ctx.restore();
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = "round";        // posts (player colour)
    if (side === "bottom" || side === "top") {
      const ye = side === "bottom" ? B : T, yi = side === "bottom" ? B - NETD : T + NETD;
      line(x0, ye, x0 + w, ye); line(x0, yi, x0, ye); line(x0 + w, yi, x0 + w, ye);
    } else {
      const xe = side === "left" ? L : R, xi = side === "left" ? L + NETD : R - NETD;
      line(xe, y0, xe, y0 + h); line(xi, y0, xe, y0); line(xi, y0 + h, xe, y0 + h);
    }
    ctx.lineCap = "butt";
  }
  function drawPitch() {
    ctx.fillStyle = GRASS; ctx.fillRect(L, T, A, A);
    ctx.globalAlpha = 0.16; ctx.fillStyle = GRASS2; for (let x = L; x < R; x += 96) ctx.fillRect(x, T, 48, A); ctx.globalAlpha = 1;
    ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.strokeRect(L + 4, T + 4, A - 8, A - 8);
    ctx.beginPath(); ctx.arc(CXc, CYc, 64, 0, 7); ctx.stroke();
    ctx.fillStyle = LINE; ctx.beginPath(); ctx.arc(CXc, CYc, 4, 0, 7); ctx.fill();
    for (let i = 0; i < 4; i++) { const p = players[i]; if (p.active && p.alive) drawGoalNet(p.side, p.color); else drawWall(p.side); }
  }
  function drawPaddle(p) {
    const r = padRect(p), s = spr[p.name];
    ctx.fillStyle = "rgba(8,16,10,.32)"; ctx.beginPath(); ctx.ellipse(r.cx, r.cy + 4, r.w / 2, r.h / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = p.color; rr(r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = "#15121f"; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 6); ctx.stroke();
    const sc = 70 / s.h, dw = s.w * sc, dh = 70; ctx.drawImage(s.canvas, Math.round(r.cx - dw / 2), Math.round(r.cy - dh / 2), dw, dh);
  }
  function drawBall() {
    ctx.fillStyle = "rgba(8,18,10,.30)"; ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + ball.r * 0.7, ball.r * 0.85, ball.r * 0.34, 0, 0, 7); ctx.fill();
    ctx.drawImage(ballSpr.canvas, Math.round(ball.x - ball.r), Math.round(ball.y - ball.r), ball.r * 2, ball.r * 2);
  }
  function pips(p, cx, cy) {
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i < p.lives ? p.color : "#3a3f4c"; ctx.fillRect(cx - 22 + i * 16, cy, 12, 12); }
  }
  function drawHUD() {
    // P1 bottom-centre, P2 top-centre, P3 left, P4 right
    const slots = [[CXc, B + 8, "h"], [CXc, T - 26, "h"], [L / 2, CYc - 30, "v"], [(R + W) / 2, CYc - 30, "v"]];
    for (let i = 0; i < count; i++) { const p = players[i], [x, y] = slots[i];
      tc(p.name, x, y, 2, p.alive ? p.color : "#6a6a78");
      if (p.alive) pips(p, x, y + 18); else tc("OUT", x, y + 18, 2, "#6a6a78");
    }
    tc(count + "-PLAYER PONG  -  LAST WALL STANDING", CXc, 6, 2, GOLD);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.fillStyle = "#0e1410"; ctx.fillRect(0, 0, W, H);
    drawPitch();
    for (let i = 0; i < count; i++) if (players[i].alive) drawPaddle(players[i]);
    if (phase !== "win") drawBall();
    drawHUD();
    if (phase === "ready") tc(Countdown.label(timer), CXc, CYc - 90, 7, GOLD);
    if (phase === "kickoff" && msg) tc(msg, CXc, CYc - 90, 4, GOLD);
    if (phase === "win") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(8,14,9,.84)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc(winner.name + " WINS!", W / 2, 120, 6, GOLD);
        const s = spr[winner.name], sc = 210 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * sc / 2, 200, s.w * sc, 210);
        tc("LAST WALL STANDING", W / 2, 440, 3, winner.color);
      } else tc("DRAW!", W / 2, 240, 6, GOLD);
      tc("ENTER = REMATCH      BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }
    window.__pong = { phase, count, lives: players.slice(0, count).map(p => p.lives), alive: players.slice(0, count).map(p => p.alive), dir: players.slice(0, count).map(p => p.dir), winner: winner ? winner.name : null };
    window.__pghook = {
      flip: i => { if (players[i] && players[i].alive) players[i].dir = -players[i].dir; },
      setBall: (x, y, vx, vy) => { ball.x = x; ball.y = y; ball.vx = vx; ball.vy = vy; phase = "play"; },
      ball: () => ({ x: Math.round(ball.x), y: Math.round(ball.y) }),
      arena: () => ({ L, R, T, B, CXc, CYc, CORNER }),
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
