/* 8-BIT PARTY — METEOR DERBY, 2–4 players. All pods share one wrapping lane,
 * move LEFT/RIGHT only, and BUMP each other like billiard balls (never overlap).
 * Meteors rain down; 3 hits and a pod is destroyed and leaves the lane. Last pod
 * flying wins. Pods + meteors shrink as more players join so it isn't cramped.
 * P1 A/D · P2 Left/Right · P3 J/L · P4 F/H */
(() => {
  const D = window.GAME_DATA, SP = D.space, M = SP.meta;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;
  const S = M.scale;

  function drawRows(g, rows, pal, ox, oy) { for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const c = pal[rows[y][x]]; if (!c) continue; g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1); } }
  const SHU = SP.shuttle, SW = SHU[0].length, SH = SHU.length, MET = SP.meteor, MW = MET[0].length, MH = MET.length;
  const SEG1 = [[7, 21], [8, 22], [7, 23], [9, 23], [8, 24], [14, 20], [15, 21], [14, 22]];
  const SEG2 = [[6, 24], [10, 25], [11, 26], [16, 22], [13, 24], [9, 20], [12, 22], [7, 25]];
  const SCORCH = [[5, 23], [17, 22], [6, 26], [16, 25]];
  function headRows(name) { const c = D.roster.find(r => r.name === name) || D.roster[0]; return c.rows.slice(0, 10); }
  function buildPod(name, dmg) {
    const c = document.createElement("canvas"); c.width = SW; c.height = SH; const g = c.getContext("2d");
    const hr = headRows(name), hw = hr[0].length;
    drawRows(g, hr, D.palette, Math.round(SW / 2 - hw / 2) - 1, 13 - 5);
    drawRows(g, SHU, SP.palette, 0, 0);
    const K = SP.palette.K, t = SP.palette.t;
    if (dmg >= 1) for (const [dx, dy] of SEG1) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); g.fillStyle = t; g.fillRect(dx + 1, dy, 1, 1); }
    if (dmg >= 2) { for (const [dx, dy] of SEG2) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); g.fillStyle = t; g.fillRect(dx + 1, dy, 1, 1); } for (const [dx, dy] of SCORCH) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); } }
    return c;
  }
  const meteorC = (() => { const c = document.createElement("canvas"); c.width = MW; c.height = MH; drawRows(c.getContext("2d"), MET, SP.palette, 0, 0); return c; })();
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd03c", DIM = "#9aa0c0", FIRE = "#ff8e34", OK = "#6bd66b", BAD = "#3a3f5c";
  const PCOL = ["#ff5d6c", "#5db4ff", "#6bd66b", "#ffd54a"];

  let audioReady = false;
  function playHit() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.45; a.play().catch(() => {}); }

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const MOVE = [{ L: "KeyA", R: "KeyD" }, { L: "ArrowLeft", R: "ArrowRight" }, { L: "KeyJ", R: "KeyL" }, { L: "KeyF", R: "KeyH" }];
  const POD = {}; for (let i = 0; i < count; i++) POD[NAMES[i]] = [buildPod(NAMES[i], 0), buildPod(NAMES[i], 1), buildPod(NAMES[i], 2)];

  const bg = new Image(); bg.src = M.bg; let bgOk = false; bg.onload = () => bgOk = true;

  // ---------- scaling: smaller pods + meteors with more players ----------
  const SCALE = count <= 2 ? 1.0 : (count === 3 ? 0.85 : 0.72);
  const podScale = S * SCALE, laneY = M.laneY * S, podTop = laneY - 14 * podScale;
  const POD_R = 25 * SCALE, POD_MIN = 58 * SCALE, MAXHP = 3;
  const DRAG = 1.8, MAXV = 340, ACCEL = MAXV * DRAG, BOUNCE = 1.5, KICK = 110, HARDMAX = 1000, INV = 1.1;
  function wdelta(a) { a = ((a % W) + W) % W; return a > W / 2 ? a - W : a; }
  function wrapx(x) { return ((x % W) + W) % W; }

  // ---------- state ----------
  let players, meteors, spawnT, phase, ready, winner, sparks, t0;
  function pl(name, color, tag, x) { return { name, color, tag, x, vx: 0, hp: MAXHP, inv: 0, alive: true }; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function reset() {
    const order = shuffle([0, 1, 2, 3].slice(0, count)); players = [];
    for (let i = 0; i < count; i++) players.push(pl(NAMES[i], PCOL[i], "P" + (i + 1), (order[i] + 0.5) / count * W));
    meteors = []; sparks = []; spawnT = 0.7; t0 = 0; phase = "ready"; ready = 2.4; winner = null;
  }
  reset();

  // ---------- input ----------
  const held = {};
  window.addEventListener("keydown", e => {
    audioReady = true;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });
  function moveInput(i) { const k = MOVE[i]; return (held[k.R] ? 1 : 0) - (held[k.L] ? 1 : 0); }

  function spawnMeteor(x) {
    const sc = (Math.random() < 0.4 ? 4 : 3) * SCALE;
    meteors.push({ x: x == null ? 40 + Math.random() * (W - 80) : x, y: -MH * sc, vy: 150 + Math.random() * 140 + t0 * 4, sc, ang: Math.random() * 7, av: (Math.random() - 0.5) * 2 });
  }
  function damage(p) {
    if (p.inv > 0 || !p.alive || phase !== "play") return;
    p.hp--; p.inv = INV; playHit();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 7, s = 90 + (i % 3) * 60; sparks.push({ x: p.x, y: laneY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5, c: i % 2 ? FIRE : "#fff" }); }
    if (p.hp <= 0) { p.alive = false; for (let i = 0; i < 16; i++) { const a = i / 16 * 7, s = 120 + (i % 4) * 50; sparks.push({ x: p.x, y: laneY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.7, c: i % 2 ? GOLD : FIRE }); } }
  }

  function update(dt) {
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; } sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= 0) phase = "play"; return; }
    if (phase === "over") return;
    t0 += dt;
    const alive = players.filter(p => p.alive);
    // momentum movement
    for (const p of alive) { p.inv = Math.max(0, p.inv - dt); p.vx += moveInput(players.indexOf(p)) * ACCEL * dt; p.vx *= Math.max(0, 1 - DRAG * dt); p.vx = Math.max(-HARDMAX, Math.min(HARDMAX, p.vx)); p.x = wrapx(p.x + p.vx * dt); }
    // N-body ball bumps: resolve pairwise (enough passes that even a 3–4 way
    // pile-up onto one spot separates within the frame), exchange momentum once
    // per contact on the first pass so the bump feel is unchanged.
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j], sep = wdelta(b.x - a.x), ad = Math.abs(sep);
        if (ad < POD_MIN) {
          const side = sep === 0 ? (a.vx >= b.vx ? 1 : -1) : Math.sign(sep), overlap = POD_MIN - ad;
          a.x = wrapx(a.x - side * overlap / 2); b.x = wrapx(b.x + side * overlap / 2);
          if (iter === 0 && (b.vx - a.vx) * side < 0) { const av = a.vx, bv = b.vx; a.vx = bv * BOUNCE - side * KICK; b.vx = av * BOUNCE + side * KICK; }
        }
      }
    }
    // meteors
    spawnT -= dt; if (spawnT <= 0) { spawnMeteor(); spawnT = Math.max(0.28, (0.7 - t0 * 0.02) / (count > 2 ? 1.25 : 1)); }
    for (const m of meteors) { m.y += m.vy * dt; m.ang += m.av * dt; }
    for (const m of meteors) {
      if (m.dead) continue; const r = (MW * m.sc) / 2 * 0.62;
      for (const p of alive) { if (p.inv > 0) continue; if ((m.x - p.x) ** 2 + (m.y - laneY) ** 2 < (r + POD_R) ** 2) { m.dead = true; damage(p); break; } }
    }
    meteors = meteors.filter(m => !m.dead && m.y < H + 40);
    const left = players.filter(p => p.alive);
    if (left.length <= 1) { winner = left[0] || null; phase = "over"; }
  }

  // ---------- draw ----------
  function drawPodAt(p, x) { const dmg = Math.min(2, MAXHP - p.hp); if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0 && phase === "play") return; ctx.drawImage(POD[p.name][dmg], Math.round(x - SW * podScale / 2), podTop, SW * podScale, SH * podScale); }
  function drawPod(p) { if (!p.alive) return; drawPodAt(p, p.x); if (p.x < SW * podScale / 2) drawPodAt(p, p.x + W); if (p.x > W - SW * podScale / 2) drawPodAt(p, p.x - W); }
  function drawMeteor(m) { const w = MW * m.sc, h = MH * m.sc; ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.ang); ctx.drawImage(meteorC, -w / 2, -h / 2, w, h); ctx.restore(); }
  function pips(p, x, y) { for (let i = 0; i < MAXHP; i++) { ctx.fillStyle = i < p.hp ? OK : BAD; ctx.fillRect(x + i * 14, y, 11, 11); } }
  function hud() {
    ctx.fillStyle = "rgba(10,12,26,.6)"; ctx.fillRect(0, 0, W, 30);
    const colW = (W - 8) / count;
    for (let i = 0; i < count; i++) { const p = players[i], px = 6 + i * colW; text(p.tag + " " + p.name, px, 5, 1.6 | 0, p.alive ? p.color : "#6a6a78"); if (p.alive) pips(p, px, 18); else text("OUT", px, 18, 1.6 | 0, "#6a6a78"); }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (!bgOk) { ctx.fillStyle = "#0a0a1c"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(bg, 0, 0, W, H);
    for (const m of meteors) drawMeteor(m);
    players.forEach(drawPod);
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }
    hud();
    if (phase === "play") tc("LEFT / RIGHT - SHOVE RIVALS UNDER METEORS - DODGE OR DIE", W / 2, H - 16, 1, DIM);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(8,8,22,.5)"; ctx.fillRect(0, 0, W, H);
      tc("METEOR DERBY", W / 2, H / 2 - 96, 4, "#cfe0ff");
      tc(ready > 0.4 ? String(Math.ceil(ready - 0.4)) : "GO!", W / 2, H / 2 - 40, 8, GOLD);
      tc(count + " PODS  -  3 HITS AND YOU'RE SPACE DUST  -  LAST POD WINS", W / 2, H / 2 + 46, 2, "#cfe6ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(8,8,22,.82)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " WINS!", W / 2, 140, 6, GOLD); ctx.drawImage(POD[winner.name][0], W / 2 - SW * 5 / 2, 220, SW * 5, SH * 5); tc(winner.name, W / 2, 470, 3, winner.color); }
      else tc("ALL PODS LOST!", W / 2, 260, 5, GOLD);
      tc("ENTER / SPACE = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }
    window.__sp = { phase, count, hp: players.map(p => p.hp), alive: players.map(p => p.alive), x: players.map(p => Math.round(p.x)), gapMin: minGap(), winner: winner ? winner.tag : null, met: meteors.length };
    window.__sphook = { setx: a => { for (let i = 0; i < a.length && i < count; i++) players[i].x = wrapx(a[i]); }, hit: i => damage(players[i]), pos: () => players.map(p => Math.round(p.x)), podMin: () => POD_MIN, alive: () => players.filter(p => p.alive).length };
    requestAnimationFrame(t => frame(now, t));
  }
  function minGap() { const a = players.filter(p => p.alive); let m = 9999; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) m = Math.min(m, Math.abs(wdelta(a[j].x - a[i].x))); return a.length < 2 ? 9999 : Math.round(m); }
  requestAnimationFrame(t => frame(t, t));
})();
