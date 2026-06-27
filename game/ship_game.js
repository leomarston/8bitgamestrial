/* 8-BIT PARTY — SHIP DASH, 2–4 players (one-button masher).
 * Each player owns a sea lane. The ONLY control is your one button: every press
 * is an oar stroke that surges your boat right. Stop pressing and you coast to a
 * stop. FIRST BOAT TO THE FINISH WINS. One key each:
 *   P1 = SPACE   P2 = ENTER   P3 = O   P4 = R
 * (Press repeatedly — holding does nothing; you must actually mash.) */
(() => {
  const D = window.GAME_DATA, S = D.ship;
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
  function lighten(hex, f) { const b = hex.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(b.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#16314e", sp); text(s, x, y, sc, c, sp); };

  const GOLD = "#ffd54a", DIM = "#d6e6f2", INK = "#16314e";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const SEA = S.sea, SEAD = S.seaD, SEAL = S.seaL, FOAM = S.foam, SKYT = S.skyT, SKYB = S.skyB;

  let audioReady = false;
  function playSplash() { if (!audioReady) return; const a = new Audio("sfx/splash.mp3"); a.volume = 0.28; a.play().catch(() => {}); }   // light oar splash

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const SPR = NAMES.map(n => build(D.roster.find(r => r.name === n).rows, D.palette));

  // ---------- boat sprites (sail recoloured per player) ----------
  function shipPal(base) { return Object.assign({}, S.pal, { S: base, l: lighten(base, 1.22), s: lighten(base, 0.74), F: base }); }
  const SHIP = PCOL.map(b => build(S.ship, shipPal(b)));
  const WL = 28;                                   // waterline row inside the 34px boat sprite

  // ---------- geometry ----------
  const SKY_H = 96, START_X = 150, FIN_X = W - 150;
  const KEYLABEL = ["SPACE", "ENTER", "O", "R"];
  const KEYS = ["Space", "Enter", "KeyO", "KeyR"];
  // mash tuning: each press is a velocity impulse; speed decays so you must keep mashing
  const STROKE = 19, DECAY = 2.3, VMAX = 170;

  let laneH, laneY, SC;
  function layout() {
    laneH = (H - SKY_H) / count;
    laneY = L => SKY_H + (L + 0.5) * laneH;        // lane water-centre y
    SC = Math.max(2.0, Math.min(3.8, laneH * 0.6 / S.shipH));
  }
  layout();

  // ---------- state ----------
  let players, blood, phase, ready, winner, foams;
  function reset() {
    players = [];
    for (let i = 0; i < count; i++) players.push({ i, name: NAMES[i], color: PCOL[i], tag: "P" + (i + 1), spr: SPR[i], ship: SHIP[i],
      x: START_X, v: 0, bob: Math.random() * 6, lurch: 0, done: false, place: 0 });
    foams = []; winner = null; phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop();
  }
  reset();

  // ---------- input: ONE button per player = one oar stroke ----------
  function stroke(p) {
    if (phase !== "play" || p.done) return;
    p.v = Math.min(VMAX, p.v + STROKE); p.lurch = 0.14;
    const sternX = p.x - (S.shipW / 2) * SC + 4;   // splash off the back of the boat
    foams.push({ x: sternX, y: laneY(p.i) + 6 * SC * 0.0 + (laneH * 0.06), t: 0, c: p.color });
    if (foams.length > 80) foams.shift();
    playSplash();
  }
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && !e.repeat && (KEYS.includes(e.code) || e.code === "Enter" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (e.repeat) return;                           // holding the key is NOT a stroke — you must mash
    held[e.code] = true;
    for (let i = 0; i < count; i++) if (e.code === KEYS[i]) { stroke(players[i]); break; }
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- update ----------
  function update(dt) {
    for (const p of players) p.bob += dt * 2.2;
    for (const f of foams) f.t += dt;
    while (foams.length && foams[0].t > 0.6) foams.shift();
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "over") return;

    let finishedThisFrame = null;
    for (const p of players) {
      if (p.done) continue;
      p.v = Math.max(0, p.v - DECAY * p.v * dt);    // coast / drag
      p.x += p.v * dt;
      p.lurch = Math.max(0, p.lurch - dt);
      if (p.x >= FIN_X) { p.x = FIN_X; p.done = true; if (!finishedThisFrame) finishedThisFrame = p; }
    }
    if (finishedThisFrame) { winner = finishedThisFrame; phase = "over"; }   // first boat across wins
  }

  // ---------- background (sky + sea lanes + dividers + finish) ----------
  let bg;
  function bakeBG() {
    bg = document.createElement("canvas"); bg.width = W; bg.height = H; const g = bg.getContext("2d");
    // sky gradient
    let sg = g.createLinearGradient(0, 0, 0, SKY_H); sg.addColorStop(0, SKYT); sg.addColorStop(1, SKYB);
    g.fillStyle = sg; g.fillRect(0, 0, W, SKY_H);
    // sun
    g.fillStyle = "rgba(255,236,170,.45)"; g.beginPath(); g.arc(96, 60, 42, 0, 7); g.fill();
    g.fillStyle = "#ffe278"; g.beginPath(); g.arc(96, 60, 34, 0, 7); g.fill();
    g.strokeStyle = "#ffc850"; g.lineWidth = 3; g.beginPath(); g.arc(96, 60, 34, 0, 7); g.stroke();
    // clouds
    const cloud = (x, y, s) => { g.fillStyle = "#f8fcff"; for (const [ox, oy, r] of [[-s, 8, s], [0, 0, s * 1.3], [s, 8, s], [0, 12, s * 1.5]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); } };
    cloud(320, 52, 22); cloud(610, 40, 17);
    // sea lanes
    for (let L = 0; L < count; L++) {
      const y0 = SKY_H + L * laneH, y1 = SKY_H + (L + 1) * laneH;
      const wg = g.createLinearGradient(0, y0, 0, y1); wg.addColorStop(0, SEAL); wg.addColorStop(1, SEAD);
      g.fillStyle = wg; g.fillRect(0, y0, W, y1 - y0);
      // wavy crest + foam lines (per-lane phase)
      const rows = Math.max(3, Math.round((y1 - y0) / 26)), ph = L * 1.7;
      for (let r = 0; r < rows; r++) {
        const baseY = y0 + (r + 0.6) * (y1 - y0) / rows;
        g.strokeStyle = SEAL; g.lineWidth = 2; g.beginPath();
        for (let x = 0; x <= W; x += 4) { const yy = baseY + 7 * Math.sin(x * 0.05 + ph + r * 1.3); if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
        g.stroke();
        g.fillStyle = FOAM;
        for (let x = (r * 13) % 22; x < W; x += 22) { const yy = baseY + 7 * Math.sin(x * 0.05 + ph + r * 1.3); g.fillRect(x, yy - 1, 3, 2); }
      }
    }
    // lane divider ropes + buoys
    for (let L = 1; L < count; L++) {
      const y = SKY_H + L * laneH;
      g.fillStyle = "rgba(244,244,238,.8)"; for (let x = 0; x < W; x += 14) g.fillRect(x, y - 1, 5, 2);
      for (let x = 18; x < W; x += 96) { g.fillStyle = "#ff8c3c"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.strokeStyle = "#7a3210"; g.lineWidth = 1.5; g.stroke(); g.fillStyle = "#ffe0b4"; g.fillRect(x - 2, y - 3, 2, 2); }
    }
    // start buoys
    for (let y = SKY_H + 12; y < H; y += 30) { g.fillStyle = "#ffd246"; g.beginPath(); g.arc(START_X - 64, y, 5, 0, 7); g.fill(); g.strokeStyle = "#96701a"; g.lineWidth = 1.5; g.stroke(); }
    // finish: checkered band + poles
    const fx = FIN_X + 40, cs = 14;
    for (let j = 0, yy = SKY_H; yy < H; yy += cs, j++) for (let i = 0, xx = fx; xx < fx + 28; xx += cs, i++) { g.fillStyle = (i + j) % 2 ? "#28282e" : "#f4f4ee"; g.fillRect(xx, yy, cs, cs); }
    g.fillStyle = "#3c3c46"; g.fillRect(fx - 2, SKY_H - 4, 3, H); g.fillRect(fx + 27, SKY_H - 4, 3, H);
    g.fillStyle = "#be2834"; g.fillRect(fx - 4, SKY_H - 12, 36, 8);
  }
  bakeBG();

  // ---------- draw ----------
  function drawSprite(s, cx, feetY, scl, alpha) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); ctx.globalAlpha = 1; }
  function drawBoat(p) {
    const cy = laneY(p.i), bob = Math.sin(p.bob) * 2 + (p.lurch > 0 ? -2 : 0);
    const bw = S.shipW * SC, bh = S.shipH * SC;
    const bx = Math.round(p.x - bw / 2), by = Math.round(cy - WL * SC + bob);
    // bow wake
    ctx.fillStyle = "rgba(226,244,252,.85)"; ctx.beginPath(); ctx.ellipse(p.x + bw * 0.42, cy + 2 + bob, 14, 5, 0, 0, 7); ctx.fill();
    ctx.drawImage(p.ship.canvas, bx, by, bw, bh);
    // sailor aboard
    drawSprite(p.spr, bx + S.fx * SC, by + S.fy * SC, SC * S.fscale, null);
  }
  function laneHUD(p) {
    const y0 = SKY_H + p.i * laneH;
    // P# tag + the player's ONE key
    const tagW = 30; ctx.fillStyle = p.color; ctx.fillRect(6, y0 + 6, tagW, 16); text(p.tag, 10, y0 + 10, 2, INK);
    ctx.fillStyle = "rgba(10,24,40,.55)"; const kl = KEYLABEL[p.i], kw = tW(kl, 1) + 8;
    ctx.fillRect(6, y0 + 24, kw, 11); text(kl, 10, y0 + 26, 1, "#fff");
    // slim progress track for this lane
    const px0 = 44, px1 = W - 70, frac = Math.max(0, Math.min(1, (p.x - START_X) / (FIN_X - START_X)));
    ctx.fillStyle = "rgba(10,24,40,.4)"; ctx.fillRect(px0, y0 + 7, px1 - px0, 6);
    ctx.fillStyle = p.color; ctx.fillRect(px0, y0 + 7, (px1 - px0) * frac, 6);
    ctx.fillStyle = "#fff"; ctx.fillRect(px0 + (px1 - px0) * frac - 1, y0 + 5, 2, 10);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.drawImage(bg, 0, 0);
    // foam splashes from strokes
    for (const f of foams) { const a = 0.6 * (1 - f.t / 0.6); ctx.fillStyle = "rgba(226,244,252," + a.toFixed(2) + ")"; const r = 3 + f.t * 14; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 7); ctx.fill(); }
    // boats (draw far lanes first is irrelevant; lanes don't overlap)
    for (const p of players) { drawBoat(p); laneHUD(p); }

    // title
    ts("SHIP DASH", W / 2 - tW("SHIP DASH", 5) / 2, 10, 5, "#f4f4ee");

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,24,40,.45)"; ctx.fillRect(0, SKY_H, W, H - SKY_H);
      tc(Countdown.label(ready), W / 2, 250, 8, GOLD);
      tc("MASH YOUR BUTTON TO ROW  -  FIRST TO THE FINISH WINS", W / 2, 380, 2, "#eef6ff");
      tc(players.map((p, i) => p.tag + "=" + KEYLABEL[i]).join("   "), W / 2, 414, 2, DIM);
    }
    if (phase === "over" && winner) {
      ctx.fillStyle = "rgba(11,22,38,.85)"; ctx.fillRect(0, 0, W, H);
      tc(winner.tag + " WINS!", W / 2, 140, 6, GOLD);
      drawSprite(winner.spr, W / 2, 430, 200 / winner.spr.h, 1);
      tc(winner.name + " ROWED HOME FIRST", W / 2, 450, 3, winner.color);
      tc("MASH / ENTER = REMATCH     BACKSPACE = MENU", W / 2, 540, 2, DIM);
    }

    window.__sh = { phase, count, winner: winner ? winner.tag : null,
      x: players.map(p => Math.round(p.x)), v: players.map(p => +p.v.toFixed(1)),
      prog: players.map(p => +Math.max(0, Math.min(1, (p.x - START_X) / (FIN_X - START_X))).toFixed(3)), done: players.map(p => p.done) };
    window.__shhook = { stroke: i => players[i] && stroke(players[i]), startX: START_X, finishX: FIN_X,
      setX: (i, x) => { if (players[i]) players[i].x = x; }, keys: KEYS };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
