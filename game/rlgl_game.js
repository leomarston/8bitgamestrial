/* 8-BIT PARTY — RED LIGHT GREEN LIGHT, 2–4 players. Each player runs their own
 * lane toward the finish. A male catcher oversees: back turned = GREEN (run),
 * facing you = RED (freeze). Move while it's RED and you're snapped back to the
 * START — no elimination, you just keep racing. First to the finish wins.
 * Very low momentum; hold ANY of your cluster keys to GO, release to stop.
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, RL = D.rlgl;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;
  const FONT = D.font;

  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  }
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);

  const GOLD = "#ffd54a", DIM = "#cdbfa0", INK = "#1a1620";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const SKY = "#96cee8", DIRTA = "#b08a5c", DIRTB = "#98744a", DIRT3 = "#7c5e3a", LANE = "#68502f";
  const WHITE = "#f4f4ee", PODI = "#6c5c84", PODI2 = "#5a4c70";

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const SPR = NAMES.map(n => build(D.roster.find(r => r.name === n).rows, D.palette));
  const RP = RL.palette;
  const CATCHB = build(RL.catcherBack, RP), CATCHF = build(RL.catcherFront, RP), LAMPG = build(RL.lampGreen, RP), LAMPR = build(RL.lampRed, RP);

  // ---------- geometry ----------
  const START_X = 120, FINISH_X = 720, RUN = FINISH_X - START_X;
  const LANE_TOP = 70, LANE_BOT = 556;
  const CATCH_H = 150, CATCH_X = 856, CATCH_CY = (LANE_TOP + LANE_BOT) / 2;
  let laneH;

  // ---------- tuning ----------
  const VMAX = 130, ACCEL = 680, DECEL = 900, CATCH_V = 7;   // very low momentum
  const TURN = 0.35;
  function esc() { return Math.max(0.6, 1 - t0 * 0.006); }    // greens shrink as the round drags on
  function greenDur() { return (0.6 + Math.random() * 0.8) * esc(); }
  function redDur() { return 0.7 + Math.random() * 0.9; }
  const ROUND_CAP = 60;

  // ---------- state ----------
  let players, light, phase, ready, t0, winner, sparks, shuffleOrder;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function reset() {
    laneH = (LANE_BOT - LANE_TOP) / count;
    shuffleOrder = shuffle([0, 1, 2, 3].slice(0, count));     // randomise which lane each player gets
    players = [];
    for (let i = 0; i < count; i++) {
      const laneIdx = shuffleOrder[i];
      players.push({ i, name: NAMES[i], color: PCOL[i], tag: "P" + (i + 1), spr: SPR[i],
        x: START_X, vx: 0, laneY: LANE_TOP + (laneIdx + 0.5) * laneH, lane: laneIdx, finished: false, finishT: 0, hitFlash: 0, walkT: 0 });
    }
    light = { state: "green", t: 1.2 };
    sparks = []; winner = null; t0 = 0; phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); if (window.Results) Results.reset();
  }
  reset();

  // ---------- input: hold ANY cluster key to GO ----------
  const KEYS = [
    ["KeyW", "KeyA", "KeyS", "KeyD", "Space"],
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"],
    ["KeyI", "KeyJ", "KeyK", "KeyL", "KeyO"],
    ["KeyT", "KeyF", "KeyG", "KeyH", "KeyR"],
  ];
  const held = {};
  const goHeld = i => KEYS[i].some(k => held[k]);
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function spark(x, y, n, col) { for (let k = 0; k < n; k++) { const a = Math.random() * 7, s = 50 + Math.random() * 140; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.35 + Math.random() * 0.25, c: col }); } }

  // ---------- update ----------
  function update(dt) {
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; } sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; light = { state: "green", t: greenDur() }; if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "over") return;
    t0 += dt;

    // light state machine: green -> turn (grace) -> red(detect) -> green
    light.t -= dt;
    if (light.t <= 0) {
      if (light.state === "green") { light.state = "turn"; light.t = Math.max(0.26, TURN * (0.85 + 0.15 * esc())); }
      else if (light.state === "turn") { light.state = "red"; light.t = redDur(); }
      else { light.state = "green"; light.t = greenDur(); }
    }
    const detecting = light.state === "red";

    for (const p of players) {
      if (p.finished) continue;
      const go = goHeld(p.i);
      if (go) p.vx = Math.min(VMAX, p.vx + ACCEL * dt); else p.vx = Math.max(0, p.vx - DECEL * dt);
      if (p.vx > 1) p.walkT += dt * 12;
      p.x += p.vx * dt;
      p.hitFlash = Math.max(0, p.hitFlash - dt);
      if (p.x >= FINISH_X) { p.x = FINISH_X; p.finished = true; p.finishT = t0; if (!winner) { winner = p; phase = "over"; } continue; }
      if (detecting && p.vx > CATCH_V) {                       // moved on red -> snapped back to start, keeps racing
        spark(p.x, p.laneY, 10, p.color); spark(p.x, p.laneY, 6, "#fff");
        p.x = START_X; p.vx = 0; p.hitFlash = 0.5;
      }
    }
    if (t0 >= ROUND_CAP && !winner) {                          // safety: furthest ahead wins
      winner = players.slice().sort((a, b) => b.x - a.x)[0]; phase = "over";
    }
  }

  // ---------- draw ----------
  let court;
  function bakeCourt() {
    court = document.createElement("canvas"); court.width = W; court.height = H; const g = court.getContext("2d");
    g.fillStyle = SKY; g.fillRect(0, 0, W, LANE_TOP);
    for (let i = 0; i < count; i++) {
      const y0 = Math.round(LANE_TOP + i * laneH), y1 = Math.round(LANE_TOP + (i + 1) * laneH);
      g.fillStyle = i % 2 ? DIRTB : DIRTA; g.fillRect(0, y0, W, y1 - y0);
      for (let s = 0; s < (W * (y1 - y0)) / 90; s++) { const sx = (s * 53) % W, sy = y0 + (s * 29) % (y1 - y0); g.fillStyle = (sx + sy) % 2 ? DIRT3 : DIRTB; g.fillRect(sx, sy, 2, 2); }
      g.fillStyle = LANE; g.fillRect(0, y1 - 1, W, 2);
      for (let x = START_X; x < FINISH_X; x += 48) { g.fillStyle = LANE; g.fillRect(x, (y0 + y1) / 2 - 1, 20, 2); }   // dashed guide
      // start tag
      g.fillStyle = PCOL[shuffleOrder[i]]; g.fillRect(START_X - 30, y0 + 6, 26, 16);
    }
    // start line + finish checker
    g.fillStyle = WHITE; g.fillRect(START_X - 4, LANE_TOP, 3, LANE_BOT - LANE_TOP);
    for (let y = LANE_TOP; y < LANE_BOT; y += 12) for (let k = 0; k < 3; k++) { g.fillStyle = ((y / 12 | 0) + k) % 2 ? INK : WHITE; g.fillRect(FINISH_X + k * 4, y, 4, 12); }
  }

  function drawSprite(s, cx, feetY, scl, alpha) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); ctx.globalAlpha = 1; }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    const red = light.state === "turn" || light.state === "red";
    ctx.drawImage(court, 0, 0);

    // catcher on a podium at right-middle
    const cs = CATCH_H / CATCHF.h, cw = Math.round(CATCHF.w * cs);
    const feet = CATCH_CY + CATCH_H / 2;
    ctx.fillStyle = PODI2; ctx.fillRect(CATCH_X - cw / 2 - 6, feet, cw + 12, 18); ctx.fillStyle = PODI; ctx.fillRect(CATCH_X - cw / 2 - 6, feet, cw + 12, 5);
    drawSprite(red ? CATCHF : CATCHB, CATCH_X, feet, cs, 1);

    // players
    for (const p of players) {
      const scl = Math.min(3.4, (laneH * 0.62) / p.spr.h), bob = (!p.finished && p.vx > 4) ? Math.round(Math.abs(Math.sin(p.walkT)) * 3) : 0;
      ctx.fillStyle = "rgba(8,10,20,.25)"; ctx.beginPath(); ctx.ellipse(p.x, p.laneY + laneH * 0.30, p.spr.w * scl * 0.4, 4, 0, 0, 7); ctx.fill();
      if (p.hitFlash > 0 && (p.hitFlash * 12 | 0) % 2) ctx.globalAlpha = 0.5;
      drawSprite(p.spr, p.x, p.laneY + laneH * 0.30 - bob, scl, null);
      ctx.globalAlpha = 1;
      if (!p.finished && p.vx > 60 && !red) for (let k = 0; k < 3; k++) { ctx.fillStyle = WHITE; ctx.fillRect((p.x - p.spr.w * scl / 2 - 4 - k * 4) | 0, (p.laneY - 4 + k * 3) | 0, 3, 2); }
      const tx = (p.x - 9) | 0, ty = (p.laneY - laneH * 0.30 - 2) | 0;
      ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK);
    }
    for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.t * 2.4); ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 4, 4); } ctx.globalAlpha = 1;

    // lamp + banner
    drawSprite(red ? LAMPR : LAMPG, 40, 64, 2.0, 1);
    if (phase === "play" || phase === "ready") {
      const lbl = red ? "RED LIGHT - FREEZE!" : "GREEN LIGHT - RUN!";
      tc(lbl, W / 2, 14, 3, red ? "#ff7a7a" : "#8ff09a");
      // ---- 60s round timer, top-right, chunky pixel display ----
      const tl = phase === "ready" ? ROUND_CAP : Math.max(0, Math.ceil(ROUND_CAP - t0));
      const low = tl <= 10, TWp = 124, THp = 54, TXp = W - TWp - 16, TYp = 10, NSC = 5;
      ctx.fillStyle = "#12101a"; ctx.fillRect(TXp, TYp, TWp, THp);
      ctx.fillStyle = "#221d2e"; ctx.fillRect(TXp + 4, TYp + 4, TWp - 8, THp - 8);
      ctx.strokeStyle = low ? "#ff6b6b" : "#ffd54a"; ctx.lineWidth = 2; ctx.strokeRect(TXp + 1, TYp + 1, TWp - 2, THp - 2);
      const num = (tl < 10 ? "0" : "") + tl;
      tc(num, TXp + TWp / 2, TYp + Math.round((THp - 7 * NSC) / 2), NSC, "#ffffff");   // white, centred (font glyphs are 7px tall)
    }

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.42)"; ctx.fillRect(0, 0, W, H);
      tc(Countdown.label(ready), W / 2, 200, 7, GOLD);
      tc("RUN ON GREEN  -  FREEZE ON RED  -  CAUGHT MOVING = BACK TO START", W / 2, 320, 2, "#eef6ff");
      tc("HOLD YOUR KEYS TO RUN  -  FIRST TO THE FINISH WINS", W / 2, 350, 1, DIM);
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null); if (window.Results) Results.show(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        const crossed = !!winner.finished;                       // truly reached the line vs. only furthest when time ran out
        tc(crossed ? winner.tag + " WINS!" : "TIME'S UP!", W / 2, 150, 6, GOLD);
        drawSprite(winner.spr, W / 2, 420, 200 / winner.spr.h, 1);
        tc(crossed ? winner.name + " REACHED THE FINISH" : winner.name + " WAS FURTHEST AHEAD", W / 2, 440, 3, winner.color);
      } else tc("NOBODY FINISHED!", W / 2, 250, 5, GOLD);
      tc((window.Tournament && Tournament.active) ? "" : "ENTER = REMATCH     ESC = PAUSE", W / 2, 530, 2, DIM);
    }

    window.__rl = { phase, light: light.state, count, x: players.map(p => Math.round(p.x)), finished: players.map(p => p.finished), winner: winner ? winner.tag : null, byFinish: winner ? !!winner.finished : null, t: +t0.toFixed(2) };
    window.__rlhook = { startX: START_X, finishX: FINISH_X, vmax: VMAX,
      forceLight: (s, dur) => { light.state = s; light.t = dur == null ? 2.0 : dur; },
      x: () => players.map(p => Math.round(p.x)), tp: (i, x) => { if (players[i]) players[i].x = x; }, lightState: () => light.state, setT: v => { t0 = v; } };
    requestAnimationFrame(t => frame(now, t));
  }
  bakeCourt();
  requestAnimationFrame(t => frame(t, t));
})();
