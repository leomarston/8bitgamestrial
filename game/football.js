/* 8-BIT PARTY — Football (Pong-style).
 * Two keepers move UP/DOWN only and defend their net. Bigger football, real
 * pitch lines, goals with nets, and a pixel crowd. First to 5 wins.
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
  const spr = {}; D.roster.forEach(c => spr[c.name] = buildSprite(c.rows));
  const ballSpr = buildSprite(D.ball);
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
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#0c1a0e", sp); text(s, x, y, sc, c, sp); };

  // ---------- colors ----------
  const LINE = "#f4f4ee", NET = "#c2c7d0", GRASS = "#2f8c50", GRASS2 = "#6bd66b";
  const P1C = "#ff5d5d", P2C = "#5db4ff", GOLD = "#ffd54a", DIM = "#9aa6ad";

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!spr[p1name]) p1name = "PIXEL";
  if (!spr[p2name]) p2name = "BYTE";
  const ch1 = D.roster.find(c => c.name === p1name), ch2 = D.roster.find(c => c.name === p2name);

  // ---------- layout ----------
  const HUD = 54, STAND = 46;
  const FX = 14, FY = HUD + STAND, FW = W - 28, FH = H - HUD - STAND - STAND;
  const fieldTop = FY, fieldBot = FY + FH, cxC = FX + FW / 2, cyC = FY + FH / 2;
  const GOAL_H = 210, goalTop = cyC - GOAL_H / 2, goalBot = cyC + GOAL_H / 2;
  const NET_DEPTH = 34;
  const leftLine = FX + NET_DEPTH, rightLine = FX + FW - NET_DEPTH;

  const PADW = 40, PADH = 96, PADVIS = 100;
  const p1 = { x: leftLine + 46, y: cyC, color: P1C, name: p1name, ch: ch1 };
  const p2 = { x: rightLine - 46, y: cyC, color: P2C, name: p2name, ch: ch2 };
  const ball = { x: cxC, y: cyC, r: 16, vx: 0, vy: 0, spin: 0 };

  let score1 = 0, score2 = 0, target = 5;
  let phase = "kickoff", timer = 1.4, msg = "GET READY", flash = 0, winner = null, lastConceded = "p1";

  function resetBall(toward) {
    ball.x = cxC; ball.y = cyC; ball.vx = 0; ball.vy = 0; ball.spin = 0;
    phase = "kickoff"; timer = 1.2; msg = "GET READY"; ball.toward = toward;
  }
  function launch() {
    const dir = ball.toward === "p1" ? -1 : 1;
    const ang = (Math.random() * 0.7 - 0.35);
    const sp = 360;
    ball.vx = dir * sp * Math.cos(ang);
    ball.vy = sp * Math.sin(ang);
    phase = "play";
  }
  function scoreGoal(who) {
    if (who === "p1") { score1++; lastConceded = "p2"; } else { score2++; lastConceded = "p1"; }
    flash = 0.0; msg = "GOAL!"; phase = "goal"; timer = 1.3;
    if (score1 >= target || score2 >= target) { winner = score1 > score2 ? p1 : p2; phase = "win"; }
    window.__score = [score1, score2];
  }
  window.__score = [0, 0];

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    held[e.code] = true;
    if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { e.preventDefault(); location.href = "index.html"; }
    if (phase === "win" && (e.code === "KeyR" || e.code === "Enter" || e.code === "Space")) {
      score1 = score2 = 0; winner = null; resetBall("p1");
    }
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- update ----------
  function clampPad(p) { const half = PADH / 2; p.y = Math.max(fieldTop + half, Math.min(fieldBot - half, p.y)); }
  function update(dt) {
    const spd = 380 * dt;
    if (phase === "play" || phase === "kickoff" || phase === "goal") {
      if (held.KeyW) p1.y -= spd; if (held.KeyS) p1.y += spd;
      if (held.ArrowUp) p2.y -= spd; if (held.ArrowDown) p2.y += spd;
      clampPad(p1); clampPad(p2);
    }
    if (phase === "kickoff") { timer -= dt; if (timer <= 0) launch(); return; }
    if (phase === "goal") { timer -= dt; flash += dt; if (timer <= 0) resetBall(lastConceded); return; }
    if (phase === "win") return;

    // move ball
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.spin += ball.vx * dt * 0.05;
    // walls (touchlines)
    if (ball.y - ball.r < fieldTop) { ball.y = fieldTop + ball.r; ball.vy = Math.abs(ball.vy); }
    if (ball.y + ball.r > fieldBot) { ball.y = fieldBot - ball.r; ball.vy = -Math.abs(ball.vy); }

    // paddle collisions
    const hit = (p, dir) => {
      const hx = p.x - PADW / 2, hy = p.y - PADH / 2;
      if (ball.x + ball.r > hx && ball.x - ball.r < hx + PADW &&
          ball.y + ball.r > hy && ball.y - ball.r < hy + PADH) {
        if ((dir < 0 && ball.vx < 0) || (dir > 0 && ball.vx > 0)) {
          const off = (ball.y - p.y) / (PADH / 2);
          const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 760);
          const ang = off * 0.9;
          ball.vx = -dir * Math.abs(sp * Math.cos(ang));
          ball.vy = sp * Math.sin(ang);
          ball.x = dir < 0 ? hx + PADW + ball.r : hx - ball.r;
        }
      }
    };
    hit(p1, -1); hit(p2, 1);

    // goal lines
    if (ball.x - ball.r < leftLine) {
      if (ball.y > goalTop && ball.y < goalBot) { if (ball.x < FX + ball.r + 6) scoreGoal("p2"); }
      else { ball.x = leftLine + ball.r; ball.vx = Math.abs(ball.vx); }
    }
    if (ball.x + ball.r > rightLine) {
      if (ball.y > goalTop && ball.y < goalBot) { if (ball.x > FX + FW - ball.r - 6) scoreGoal("p1"); }
      else { ball.x = rightLine - ball.r; ball.vx = -Math.abs(ball.vx); }
    }
  }

  // ---------- draw ----------
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function drawChar(p) {
    const s = spr[p.name], scale = PADVIS / s.h, dw = Math.round(s.w * scale), dh = PADVIS;
    // shadow
    ctx.fillStyle = "rgba(10,20,12,.35)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + PADH / 2 - 2, dw * 0.4, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(s.canvas, Math.round(p.x - dw / 2), Math.round(p.y - PADH / 2), dw, dh);
  }

  function drawStands(y0, h) {
    ctx.fillStyle = "#241f33"; ctx.fillRect(0, y0, W, h);
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const yy = y0 + 7 + r * Math.floor((h - 10) / rows);
      for (let x = 6; x < W - 6; x += 11) {
        const k = (x * 7 + r * 13) % 9;
        const pal = ["#ff5d5d", "#5db4ff", "#ffd54a", "#6bd66b", "#f4f4ee", "#ffce9e", "#c2c7d0", "#be3238", "#2f64af"][k];
        ctx.fillStyle = pal; ctx.fillRect(x, yy, 6, 6);
      }
    }
    ctx.fillStyle = "#15121f"; ctx.fillRect(0, y0 + h - 4, W, 4);
  }

  function drawNet(side) {
    const x0 = side < 0 ? FX : rightLine, x1 = side < 0 ? leftLine : FX + FW;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, goalTop, x1 - x0, goalBot - goalTop); ctx.clip();
    ctx.fillStyle = "rgba(20,30,22,.55)"; ctx.fillRect(x0, goalTop, x1 - x0, goalBot - goalTop);
    ctx.strokeStyle = NET; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
    for (let gx = x0; gx <= x1; gx += 8) { ctx.beginPath(); ctx.moveTo(gx, goalTop); ctx.lineTo(gx, goalBot); ctx.stroke(); }
    for (let gy = goalTop; gy <= goalBot; gy += 8) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }
    ctx.restore();
    // posts (crossbar lines + goal-line uprights)
    ctx.strokeStyle = LINE; ctx.lineWidth = 5; ctx.lineCap = "round";
    const gl = side < 0 ? leftLine : rightLine;
    ctx.beginPath(); ctx.moveTo(gl, goalTop); ctx.lineTo(gl, goalBot); ctx.stroke();   // upright on goal line
    ctx.beginPath(); ctx.moveTo(x0, goalTop); ctx.lineTo(gl, goalTop); ctx.stroke();    // top bar
    ctx.beginPath(); ctx.moveTo(x0, goalBot); ctx.lineTo(gl, goalBot); ctx.stroke();    // bottom bar
  }

  function box(x, y, w, h) { ctx.strokeRect(x, y, w, h); }
  function drawPitch() {
    // grass stripes
    ctx.fillStyle = GRASS; ctx.fillRect(FX, FY, FW, FH);
    ctx.globalAlpha = 0.18; ctx.fillStyle = GRASS2;
    for (let x = FX; x < FX + FW; x += 64 * 2) ctx.fillRect(x, FY, 64, FH);
    ctx.globalAlpha = 1;
    // lines
    ctx.strokeStyle = LINE; ctx.lineWidth = 3;
    box(leftLine, fieldTop + 6, rightLine - leftLine, FH - 12);                 // touchlines
    ctx.beginPath(); ctx.moveTo(cxC, fieldTop + 6); ctx.lineTo(cxC, fieldBot - 6); ctx.stroke(); // halfway
    ctx.beginPath(); ctx.arc(cxC, cyC, 70, 0, Math.PI * 2); ctx.stroke();        // centre circle
    ctx.fillStyle = LINE; ctx.beginPath(); ctx.arc(cxC, cyC, 4, 0, Math.PI * 2); ctx.fill();
    // penalty + 6yd boxes
    box(leftLine, cyC - 150, 116, 300); box(leftLine, cyC - 84, 54, 168);
    box(rightLine - 116, cyC - 150, 116, 300); box(rightLine - 54, cyC - 84, 54, 168);
    // penalty arcs
    ctx.beginPath(); ctx.arc(leftLine + 78, cyC, 40, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(rightLine - 78, cyC, 40, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    // penalty spots
    ctx.fillStyle = LINE;
    ctx.beginPath(); ctx.arc(leftLine + 78, cyC, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(rightLine - 78, cyC, 3, 0, 7); ctx.fill();
    // corner arcs
    [[leftLine, fieldTop + 6, 0, 0.5], [rightLine, fieldTop + 6, 0.5, 1], [leftLine, fieldBot - 6, 1.5, 2], [rightLine, fieldBot - 6, 1, 1.5]]
      .forEach(c => { ctx.beginPath(); ctx.arc(c[0], c[1], 12, c[2] * Math.PI, c[3] * Math.PI); ctx.stroke(); });
    // nets
    drawNet(-1); drawNet(1);
  }

  function drawBall() {
    const d = ball.r * 2;
    ctx.fillStyle = "rgba(8,18,10,.30)";
    ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + ball.r * 0.7, ball.r * 0.85, ball.r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(ballSpr.canvas, Math.round(ball.x - ball.r), Math.round(ball.y - ball.r), d, d);
  }

  function drawHUD() {
    ctx.fillStyle = "#13100f"; ctx.fillRect(0, 0, W, HUD);
    ctx.fillStyle = GRASS2; ctx.globalAlpha = .25; ctx.fillRect(0, HUD - 3, W, 3); ctx.globalAlpha = 1;
    // P1
    ctx.fillStyle = P1C; rrect(14, 12, 10, 30, 3); ctx.fill();
    text(p1.name, 32, 12, 2, P1C); text(String(score1), 32, 30, 3, "#f4f4ee");
    // P2
    const rx = W - 14;
    ctx.fillStyle = P2C; rrect(rx - 10, 12, 10, 30, 3); ctx.fill();
    const n2w = tW(p2.name, 2); text(p2.name, rx - 18 - n2w, 12, 2, P2C);
    const s2 = String(score2); text(s2, rx - 18 - tW(s2, 3), 30, 3, "#f4f4ee");
    tc("FOOTBALL  -  FIRST TO " + target, W / 2, 10, 2, GOLD);
    tc("P1  W / S      P2  UP / DOWN      BACKSPACE  MENU", W / 2, 34, 1, DIM);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);

    ctx.fillStyle = "#0e1410"; ctx.fillRect(0, 0, W, H);
    drawStands(HUD, STAND);
    drawStands(H - STAND, STAND);
    drawPitch();
    drawChar(p1); drawChar(p2);
    if (phase !== "win") drawBall();
    drawHUD();

    if (phase === "kickoff") tc(msg, W / 2, cyC - 130, 4, GOLD);
    if (phase === "goal") {
      const big = 4 + Math.sin(flash * 12) * 0.6;
      tc("GOAL!", W / 2, cyC - 140, Math.round(big * 1.4), GOLD);
    }
    if (phase === "win") {
      ctx.fillStyle = "rgba(8,14,9,.84)"; ctx.fillRect(0, 0, W, H);
      tc((winner === p1 ? "P1" : "P2") + "  WINS!", W / 2, 120, 6, GOLD);
      const s = spr[winner.name], sc = 220 / s.h;
      ctx.drawImage(s.canvas, W / 2 - s.w * sc / 2, 210, s.w * sc, 220);
      tc(winner.name, W / 2, 450, 4, winner.color);
      tc(score1 + "  -  " + score2, W / 2, 500, 3, "#f4f4ee");
      tc("ENTER = REMATCH      BACKSPACE = CHARACTER SELECT", W / 2, 560, 2, DIM);
    }
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
