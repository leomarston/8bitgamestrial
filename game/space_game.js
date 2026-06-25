/* 8-BIT PARTY — METEOR DERBY. Two pilot pods share one lane in deep space; each
 * moves LEFT/RIGHT only and WRAPS around the screen edges. The pods are SOLID —
 * ram your rival to SHOVE them (they can never overlap) so a falling meteor lands
 * on them. Each hit wrecks your pod a little; 3 hits and you're destroyed, the
 * other pilot wins. P1 = A/D,  P2 = Left/Right arrows. */
(() => {
  const D = window.GAME_DATA, SP = D.space, M = SP.meta;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;
  const S = M.scale;

  // ---------- low-level raster helpers ----------
  function drawRows(g, rows, pal, ox, oy) {
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      const c = pal[rows[y][x]]; if (!c) continue;
      g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  const SHU = SP.shuttle, SW = SHU[0].length, SH = SHU.length;
  const MET = SP.meteor, MW = MET[0].length, MH = MET.length;

  // pre-compose each pilot's pod at native res for damage states 0/1/2
  const SEG1 = [[7,21],[8,22],[7,23],[9,23],[8,24],[14,20],[15,21],[14,22]];
  const SEG2 = [[6,24],[10,25],[11,26],[16,22],[13,24],[9,20],[12,22],[7,25]];
  const SCORCH = [[5,23],[17,22],[6,26],[16,25]];
  function headRows(name) { const c = D.roster.find(r => r.name === name) || D.roster[0]; return c.rows.slice(0, 10); }
  function buildPod(name, dmg) {
    const c = document.createElement("canvas"); c.width = SW; c.height = SH; const g = c.getContext("2d");
    const hr = headRows(name), hw = hr[0].length;            // pilot head in the dome
    drawRows(g, hr, D.palette, Math.round(SW / 2 - hw / 2) - 1, 13 - 5);
    drawRows(g, SHU, SP.palette, 0, 0);                       // hull (window is transparent)
    const K = SP.palette.K, t = SP.palette.t;
    const cr = dmg >= 1 ? SEG1 : [], cr2 = dmg >= 2 ? SEG2 : [];
    for (const [dx, dy] of cr) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); g.fillStyle = t; g.fillRect(dx + 1, dy, 1, 1); }
    for (const [dx, dy] of cr2) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); g.fillStyle = t; g.fillRect(dx + 1, dy, 1, 1); }
    if (dmg >= 2) for (const [dx, dy] of SCORCH) { g.fillStyle = K; g.fillRect(dx, dy, 1, 1); }
    return c;
  }
  const meteorC = (() => { const c = document.createElement("canvas"); c.width = MW; c.height = MH; drawRows(c.getContext("2d"), MET, SP.palette, 0, 0); return c; })();

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
  const GOLD = "#ffd03c", DIM = "#9aa0c0", P1C = "#ff5d6c", P2C = "#5db4ff", FIRE = "#ff8e34", OK = "#6bd66b", BAD = "#3a3f5c";

  // ---------- audio ----------
  let audioReady = false;
  function playHit() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.45; a.play().catch(() => {}); }

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!D.roster.find(r => r.name === p1name)) p1name = "PIXEL";
  if (!D.roster.find(r => r.name === p2name)) p2name = "BYTE";
  const POD = { [p1name]: [buildPod(p1name, 0), buildPod(p1name, 1), buildPod(p1name, 2)],
                [p2name]: [buildPod(p2name, 0), buildPod(p2name, 1), buildPod(p2name, 2)] };

  // ---------- background ----------
  const bg = new Image(); bg.src = M.bg; let bgOk = false; bg.onload = () => bgOk = true;

  // ---------- geometry / tuning ----------
  const laneY = M.laneY * S;                 // pod-centre y
  const podTop = laneY - 14 * S;             // sprite top so the body sits on the lane
  const POD_R = 25, POD_MIN = 58;            // hit radius, min centre distance (no overlap)
  const PSPD = 250, INV = 1.1, MAXHP = 3;
  function wdelta(a) { a = ((a % W) + W) % W; return a > W / 2 ? a - W : a; }
  function wrapx(x) { return ((x % W) + W) % W; }

  // ---------- state ----------
  let p1, p2, players, meteors, spawnT, phase, ready, boomT, winner, loser, sparks, t0;
  function pl(name, color, x) { return { name, color, x, hp: MAXHP, inv: 0, hitx: 0 }; }
  function reset() {
    p1 = pl(p1name, P1C, M.spawn[0] * S); p2 = pl(p2name, P2C, M.spawn[1] * S); players = [p1, p2];
    meteors = []; sparks = []; spawnT = 0.7; t0 = 0;
    phase = "ready"; ready = 2.4; boomT = 0; winner = loser = null;
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
  function moveInput(p) {
    const k = p === p1 ? ["KeyD", "KeyA"] : ["ArrowRight", "ArrowLeft"];
    return (held[k[0]] ? 1 : 0) - (held[k[1]] ? 1 : 0);
  }

  // ---------- update ----------
  function spawnMeteor(x) {
    const sc = (Math.random() < 0.4 ? 4 : 3);
    meteors.push({ x: x == null ? 40 + Math.random() * (W - 80) : x, y: -MH * sc, vy: 150 + Math.random() * 140 + t0 * 4,
      sc, ang: Math.random() * 7, av: (Math.random() - 0.5) * 2 });
  }
  function damage(p) {
    if (p.inv > 0 || phase !== "play") return;
    p.hp--; p.inv = INV; p.hitx = 0.4; playHit();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 7, s = 90 + (i % 3) * 60; sparks.push({ x: p.x, y: laneY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5, c: i % 2 ? FIRE : "#fff" }); }
    if (p.hp <= 0) { loser = p; winner = p === p1 ? p2 : p1; phase = "boom"; boomT = 1.0; }
  }
  function update(dt) {
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= 0) phase = "play"; return; }
    if (phase === "boom") { boomT -= dt; for (const m of meteors) m.y += m.vy * dt; if (boomT <= 0) phase = "over"; return; }
    if (phase === "over") return;
    t0 += dt;
    for (const p of players) p.inv = Math.max(0, p.inv - dt), p.hitx = Math.max(0, p.hitx - dt);

    // move on the ring
    for (const p of players) p.x = wrapx(p.x + moveInput(p) * PSPD * dt);
    // SOLID pods: separate so they can never overlap (wrap-aware). A driver shoves
    // the other — the pushed pod is displaced while the pusher keeps coming.
    let sep = wdelta(p2.x - p1.x);
    const ad = Math.abs(sep);
    if (ad < POD_MIN) {
      const side = sep === 0 ? (moveInput(p1) >= 0 ? 1 : -1) : Math.sign(sep);
      const push = (POD_MIN - ad) / 2;
      p1.x = wrapx(p1.x - side * push);
      p2.x = wrapx(p2.x + side * push);
    }

    // meteors
    spawnT -= dt;
    if (spawnT <= 0) { spawnMeteor(); spawnT = Math.max(0.3, 0.7 - t0 * 0.02); }
    for (const m of meteors) { m.y += m.vy * dt; m.ang += m.av * dt; }
    for (const m of meteors) {
      if (m.dead) continue;
      const r = (MW * m.sc) / 2 * 0.62;
      for (const p of players) {
        if (p.inv > 0) continue;
        if ((m.x - p.x) ** 2 + (m.y - laneY) ** 2 < (r + POD_R) ** 2) { m.dead = true; damage(p); break; }
      }
    }
    meteors = meteors.filter(m => !m.dead && m.y < H + 40);
  }

  // ---------- draw ----------
  function drawPodAt(p, x) {
    const dmg = Math.min(2, MAXHP - p.hp);
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0 && phase === "play") return;   // blink while invulnerable
    ctx.drawImage(POD[p.name][dmg], Math.round(x - SW * S / 2), podTop, SW * S, SH * S);
  }
  function drawPod(p) {
    if (phase === "boom" && p === loser) return;
    drawPodAt(p, p.x);
    if (p.x < SW * S / 2) drawPodAt(p, p.x + W);          // wrap seam
    if (p.x > W - SW * S / 2) drawPodAt(p, p.x - W);
  }
  function drawMeteor(m) {
    const w = MW * m.sc, h = MH * m.sc;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.ang);
    ctx.drawImage(meteorC, -w / 2, -h / 2, w, h); ctx.restore();
  }
  function drawBoom() {
    const k = 1 - boomT / 1.0, R = 20 + k * 90;
    ctx.globalAlpha = Math.max(0, 1 - k);
    for (const [rr, c] of [[R, FIRE], [R * 0.7, GOLD], [R * 0.4, "#fff"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(loser.x, laneY, rr, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function pips(p, x, y) {
    for (let i = 0; i < MAXHP; i++) { ctx.fillStyle = i < p.hp ? OK : BAD; ctx.fillRect(x + i * 16, y, 12, 12); ctx.fillStyle = "#10131f"; ctx.strokeStyle = "#10131f"; }
  }
  function hud() {
    ctx.fillStyle = "rgba(10,12,26,.55)"; ctx.fillRect(0, 0, W, 30);
    text(p1name, 10, 7, 2, P1C); pips(p1, 14 + tW(p1name, 2), 6);
    const rx = W - 10 - tW(p2name, 2); text(p2name, rx, 7, 2, P2C); pips(p2, rx - 14 - MAXHP * 16, 6);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    if (!bgOk) { ctx.fillStyle = "#0a0a1c"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD); requestAnimationFrame(t => frame(now, t)); return; }
    ctx.drawImage(bg, 0, 0, W, H);
    for (const m of meteors) drawMeteor(m);
    [p1, p2].forEach(drawPod);
    if (phase === "boom") drawBoom();
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }
    hud();
    if (phase === "play") tc("MOVE LEFT/RIGHT  -  SHOVE YOUR RIVAL UNDER THE METEORS  -  P1 A/D   P2 ARROWS", W / 2, H - 16, 1, DIM);

    if (phase === "ready") {
      ctx.fillStyle = "rgba(8,8,22,.5)"; ctx.fillRect(0, 0, W, H);
      tc("METEOR DERBY", W / 2, H / 2 - 96, 4, "#cfe0ff");
      tc(ready > 0.4 ? String(Math.ceil(ready - 0.4)) : "GO!", W / 2, H / 2 - 40, 8, GOLD);
      tc("DODGE THE METEORS  -  SHOVE YOUR RIVAL INTO THEM", W / 2, H / 2 + 46, 2, "#cfe6ff");
      tc("3 HITS AND YOUR POD IS SPACE DUST", W / 2, H / 2 + 70, 2, DIM);
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(8,8,22,.82)"; ctx.fillRect(0, 0, W, H);
      tc((winner === p1 ? "P1" : "P2") + " WINS!", W / 2, 130, 6, GOLD);
      ctx.drawImage(POD[winner.name][0], W / 2 - SW * 5 / 2, 200, SW * 5, SH * 5);
      tc(loser.name + "'S POD WAS WRECKED", W / 2, 470, 3, FIRE);
      tc("ENTER / SPACE = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }

    window.__sp = { phase, hp1: p1.hp, hp2: p2.hp, x1: Math.round(p1.x), x2: Math.round(p2.x),
      gap: Math.round(Math.abs(wdelta(p2.x - p1.x))), winner: winner ? (winner === p1 ? "p1" : "p2") : null, met: meteors.length };
    window.__sphook = {
      setx: (a, b) => { p1.x = wrapx(a); p2.x = wrapx(b); },
      drop: x => spawnMeteor(x), hit: who => damage(who === "p1" ? p1 : p2),
      pos: () => ({ p1: Math.round(p1.x), p2: Math.round(p2.x) }), podMin: () => POD_MIN,
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
