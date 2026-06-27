/* 8-BIT PARTY — TRAFFIC RUN, 2–4 players (Frogger-style coin dodge).
 * Start on the grass at the bottom. Cross the lanes of traffic to grab coins —
 * the further UP they are, the more they're worth. Get run over and you're flung
 * back to the grass (no points lost). FIRST TO 15 TOTAL POINTS WINS.
 * Move 4 ways with your cluster + DASH with your action key:
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, T = D.traffic;
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
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  function lighten(hex, f) { const b = hex.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(b.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }
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
  let audioReady = false;
  function playSplash() { if (!audioReady) return; const a = new Audio("sfx/splash.mp3"); a.volume = 0.6; a.play().catch(() => {}); }   // someone got run over
  const ASPH = "#3a3a40", STONE = "#787880", STONE2 = "#606068", MORT = "#3a3a42", GRASS = "#4a9646", GRASS2 = "#34702e", GRASS3 = "#60b054";

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const SPR = NAMES.map(n => build(D.roster.find(r => r.name === n).rows, D.palette));

  // ---------- car + coin art ----------
  const CAR_BASE = ["#e6d074", "#96d66e", "#e896cd", "#c8e06e", "#aab6e0", "#c896d6", "#f082c4", "#ff9a6e"];
  function carPal(base) { return { C: base, L: lighten(base, 1.18), d: lighten(base, 0.70), o: lighten(base, 0.45), W: T.win, h: T.hl, t: T.tl }; }
  const CARR = CAR_BASE.map(b => build(T.car, carPal(b))), CARL = CARR.map(flip);
  const COIN = build(T.coin, T.coinPal);

  // ---------- geometry ----------
  const WALL_H = 88, GRASS_H = 32, ROAD_TOP = WALL_H, ROAD_BOT = H - GRASS_H, LANES = 8;
  const laneH = (ROAD_BOT - ROAD_TOP) / LANES;
  const laneY = L => ROAD_TOP + (L + 0.5) * laneH;
  const CAR_SC = (laneH - 8) / T.carH, CW = Math.round(T.carW * CAR_SC), CHt = Math.round(T.carH * CAR_SC);
  const PSC = 1.6, PR = 14, COIN_SC = 2, CR = (T.coin.length * COIN_SC) / 2;
  const PSPD = 330, DASH_SPEED = 940, DASH_TIME = 0.16, DASH_COOL = 0.6, WIN_SCORE = 15;

  // ---------- state ----------
  let players, cars, coins, blood, phase, ready, winner, t0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function coinValue(cy) { const frac = (cy - ROAD_TOP) / (ROAD_BOT - ROAD_TOP); return Math.max(1, Math.min(6, Math.round(1 + (1 - frac) * 5))); }  // 1 near the grass .. 6 at the far end
  function spawnCoin() { const L = (Math.random() * LANES) | 0, cy = laneY(L); return { x: rnd(60, W - 60), y: cy, v: coinValue(cy), t: 0 }; }

  function reset() {
    players = [];
    for (let i = 0; i < count; i++) {
      const hx = (W / (count + 1)) * (i + 1);
      players.push({ i, name: NAMES[i], color: PCOL[i], tag: "P" + (i + 1), spr: SPR[i], homeX: hx,
        x: hx, y: ROAD_BOT + GRASS_H / 2, vx: 0, vy: 0, face: 1, score: 0, dash: 0, dashCool: 0, ddx: 0, ddy: 0, walkT: 0 });
    }
    cars = [];
    for (let L = 0; L < LANES; L++) {
      const dir = L % 2 ? 1 : -1, base = (92 + L * 9) * 4, n = (L % 3 === 0) ? 2 : 1;
      for (let k = 0; k < n; k++) cars.push({ L, y: laneY(L), x: rnd(-CW, W), dir, spd: base + rnd(-48, 72), col: (Math.random() * CAR_BASE.length) | 0 });
    }
    coins = []; for (let k = 0; k < Math.max(3, count); k++) coins.push(spawnCoin());   // fewer coins on screen at once
    blood = []; winner = null; t0 = 0; phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); if (window.Results) Results.reset();
  }
  reset();

  // ---------- input ----------
  const KEYS = [
    { u: "KeyW", dn: "KeyS", l: "KeyA", r: "KeyD", dash: "Space" },
    { u: "ArrowUp", dn: "ArrowDown", l: "ArrowLeft", r: "ArrowRight", dash: "Enter" },
    { u: "KeyI", dn: "KeyK", l: "KeyJ", r: "KeyL", dash: "KeyO" },
    { u: "KeyT", dn: "KeyG", l: "KeyF", r: "KeyH", dash: "KeyR" },
  ];
  const held = {};
  function doDash(p) {
    if (p.dash > 0 || p.dashCool > 0 || phase !== "play") return;
    p.dash = DASH_TIME; p.dashCool = DASH_COOL;
    const k = KEYS[p.i];                                       // dash in the direction held right now
    let dx = (held[k.r] ? 1 : 0) - (held[k.l] ? 1 : 0), dy = (held[k.dn] ? 1 : 0) - (held[k.u] ? 1 : 0);
    if (!dx && !dy) { dx = p.face; dy = 0; }                   // nothing held -> dash the way you face
    const m = Math.hypot(dx, dy) || 1; p.ddx = dx / m; p.ddy = dy / m;
  }
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
    if (e.repeat) return;
    for (let i = 0; i < count; i++) if (e.code === KEYS[i].dash) { doDash(players[i]); break; }
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function splat(x, y) { blood.push({ x, y, s: rnd(0.8, 1.4) }); if (blood.length > 14) blood.shift(); playSplash(); }

  // ---------- update ----------
  function update(dt) {
    for (const c of coins) c.t += dt;
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "over") return;
    t0 += dt;

    // cars
    for (const c of cars) {
      c.x += c.dir * c.spd * dt;
      if (c.dir > 0 && c.x > W + CW) c.x = -CW; else if (c.dir < 0 && c.x < -CW) c.x = W + CW;
    }
    // players
    for (let i = 0; i < count; i++) {
      const p = players[i], k = KEYS[i];
      p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt);
      let dx = (held[k.r] ? 1 : 0) - (held[k.l] ? 1 : 0), dy = (held[k.dn] ? 1 : 0) - (held[k.u] ? 1 : 0);
      if (dx) p.face = dx > 0 ? 1 : -1;
      if (p.dash > 0) {                                   // dash burst along the captured held direction
        p.x += p.ddx * DASH_SPEED * dt; p.y += p.ddy * DASH_SPEED * dt;
      } else if (dx || dy) {
        const m = Math.hypot(dx, dy); p.x += dx / m * PSPD * dt; p.y += dy / m * PSPD * dt; p.walkT += dt * 12;
      }
      p.x = Math.max(PR, Math.min(W - PR, p.x));
      p.y = Math.max(ROAD_TOP + PR, Math.min(ROAD_BOT + GRASS_H / 2, p.y));
      const onGrass = p.y > ROAD_BOT;
      // car collisions (only on the road — no death cooldown; the grass is always safe)
      if (!onGrass) {
        for (const c of cars) {
          const l = c.x, r = c.x + CW, t = c.y - CHt / 2, b = c.y + CHt / 2;
          const nx = Math.max(l, Math.min(p.x, r)), ny = Math.max(t, Math.min(p.y, b));
          if ((p.x - nx) ** 2 + (p.y - ny) ** 2 < PR * PR) { splat(p.x, p.y); p.x = p.homeX; p.y = ROAD_BOT + GRASS_H / 2; p.vx = p.vy = 0; break; }
        }
      }
      // coin pickup
      for (let ci = 0; ci < coins.length; ci++) {
        const co = coins[ci];
        if ((p.x - co.x) ** 2 + (p.y - co.y) ** 2 < (PR + CR) ** 2) { p.score += co.v; coins[ci] = spawnCoin();
          if (p.score >= WIN_SCORE) { winner = p; phase = "over"; } break; }
      }
    }
  }

  // ---------- draw ----------
  let bg;
  function bakeBG() {
    bg = document.createElement("canvas"); bg.width = W; bg.height = H; const g = bg.getContext("2d");
    // stone wall
    g.fillStyle = MORT; g.fillRect(0, 0, W, WALL_H);
    const bw = 88, bh = 44;
    for (let r = 0; r <= WALL_H / bh; r++) for (let c = -1; c <= W / bw; c++) {
      const off = r % 2 ? bw / 2 : 0, x = c * bw + off, y = r * bh;
      g.fillStyle = (c + r) % 2 ? STONE : STONE2; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = "#9a9aa2"; g.fillRect(x + 2, y + 2, bw - 4, 4);
    }
    // road + noise
    g.fillStyle = ASPH; g.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
    for (let i = 0; i < 9000; i++) { const x = (i * 71) % W, y = ROAD_TOP + (i * 37) % (ROAD_BOT - ROAD_TOP); g.fillStyle = (x + y) % 2 ? "#333339" : "#42424a"; g.fillRect(x, y, 2, 2); }
    g.fillStyle = "#b6b6bc"; for (let L = 1; L < LANES; L++) { const ly = ROAD_TOP + L * laneH; for (let x = 0; x < W; x += 56) g.fillRect(x, ly - 1, 30, 3); }
    // grass
    g.fillStyle = GRASS; g.fillRect(0, ROAD_BOT, W, GRASS_H);
    for (let i = 0; i < 1600; i++) { const x = (i * 53) % W, y = ROAD_BOT + (i * 29) % GRASS_H; g.fillStyle = (x + y) % 2 ? GRASS2 : GRASS3; g.fillRect(x, y, 2, 2); }
    g.fillStyle = GRASS3; for (let x = 0; x < W; x += 10) g.fillRect(x + ((x * 7) % 5), ROAD_BOT, 2, 5);
  }
  bakeBG();

  function drawSprite(s, cx, feetY, scl, alpha) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); ctx.globalAlpha = 1; }
  function drawScoreboard() {
    const slot = W / count;
    for (let i = 0; i < count; i++) {
      const p = players[i], x = slot * i + slot / 2, bw = Math.min(190, slot - 24), bx = x - bw / 2, by = 16;
      ctx.fillStyle = "#1a1622"; ctx.fillRect(bx, by, bw, 52); ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.strokeRect(bx + 1, by + 1, bw - 2, bw < 0 ? 0 : 50);
      drawSprite(p.spr, bx + 30, by + 48, 40 / p.spr.h, 1);
      tc(String(p.score), bx + bw - 38, by + 14, 4, "#fff");
    }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.drawImage(bg, 0, 0);
    for (const b of blood) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = "#6e1a1a"; for (let k = 0; k < 6; k++) { const a = k / 6 * 7; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * 10 * b.s, b.y + Math.sin(a) * 6 * b.s, 4 * b.s, 0, 7); ctx.fill(); } ctx.restore(); }
    // coins
    for (const co of coins) { drawSprite(COIN, co.x, co.y + CR, COIN_SC, 1); tc(String(co.v), co.x, co.y - 4, 1, "#6a4a0c"); }
    // cars
    for (const c of cars) { const s = c.dir > 0 ? CARR[c.col] : CARL[c.col]; ctx.drawImage(s.canvas, Math.round(c.x), Math.round(c.y - CHt / 2), CW, CHt); }
    // players (sorted by y so lower draws in front)
    for (const p of players.slice().sort((a, b) => a.y - b.y)) {
      ctx.fillStyle = "rgba(8,10,20,.28)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + PR * 0.7, PR * 0.9, 4, 0, 0, 7); ctx.fill();
      drawSprite(p.spr, p.x, p.y + PR + 4, PSC, null);
      const tx = (p.x - 9) | 0, ty = (p.y - PR - 22) | 0; ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK);
    }
    drawScoreboard();

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.42)"; ctx.fillRect(0, ROAD_TOP, W, H - ROAD_TOP);
      tc(Countdown.label(ready), W / 2, 240, 7, GOLD);
      tc("CROSS FOR COINS - HIGHER = WORTH MORE - DON'T GET RUN OVER", W / 2, 360, 2, "#eef6ff");
      tc("MOVE = YOUR KEYS    DASH = " + ["SPACE", "ENTER", "O", "R"].slice(0, count).join(" / ") + "    FIRST TO 15 WINS", W / 2, 388, 1, DIM);
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null); if (window.Results) Results.show(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      tc(winner.tag + " WINS!", W / 2, 150, 6, GOLD); drawSprite(winner.spr, W / 2, 420, 200 / winner.spr.h, 1);
      tc(winner.name + " - " + winner.score + " POINTS", W / 2, 440, 3, winner.color);
      tc((window.Tournament && Tournament.active) ? "RETURNING TO THE 8-BIT CUP" : "ENTER = REMATCH     ESC = PAUSE", W / 2, 530, 2, DIM);
    }

    window.__tr = { phase, count, scores: players.map(p => p.score), winner: winner ? winner.tag : null,
      pos: players.map(p => [Math.round(p.x), Math.round(p.y)]), dash: players.map(p => [+p.ddx.toFixed(2), +p.ddy.toFixed(2), +p.dash.toFixed(2)]), coins: coins.map(c => [Math.round(c.x), Math.round(c.y), c.v]) };
    window.__trhook = {
      tp: (i, x, y) => { if (players[i]) { players[i].x = x; players[i].y = y; } },
      dash: i => players[i] && doDash(players[i]),
      addCoinAt: (i, v) => { const p = players[i]; coins[0] = { x: p.x, y: p.y, v, t: 0 }; },
      car0: () => cars[0], roadTop: ROAD_TOP, roadBot: ROAD_BOT, grassY: ROAD_BOT + GRASS_H / 2, laneY: L => laneY(L), cv: cy => coinValue(cy), lanes: LANES, CW, CHt,
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
