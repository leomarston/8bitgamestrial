/* 8-BIT PARTY — SLIME VOLLEY, 2–4 players. Beach court split into one colored
 * HOLE per player, divided by nets. Bump the big ball with move + jump; keep it
 * out of YOUR hole and knock it over a net into someone else's. Each fall in your
 * hole costs a point — start at 2, hit 0 and you're OUT (your hole seals up).
 * Last player standing wins. Serve is thrown at a random angle each rally.
 * Move L/R + JUMP: P1 A/D/W · P2 ←/→/↑ · P3 J/L/I · P4 F/H/T  (action also jumps) */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;            // 960 x 600
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
  function hx(h, f) { h = h.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(h.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }

  const GOLD = "#ffd54a", DIM = "#9aa6c2", INK = "#15121f";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const SKY = "#76c4ec", SKY2 = "#96d6f6", SUN = "#fff7ce", CLOUD = "#f0f6ff";
  const SAND = "#e0cc9c", SAND2 = "#c6ae78", SANDD = "#9e8254", EDGE = "#4a3622", NETP = "#4074d0", NETW = "#ecf0fa";

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const SPR = NAMES.map(n => build(D.roster.find(r => r.name === n).rows, D.palette));
  const SPRF = SPR.map(s => { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; });
  const BALL = build(D.ball, D.palette);

  // ---------- geometry ----------
  const PX0 = 88, PX1 = 872, FLOOR_TOP = 424, FLOOR_BOT = 496, NET_TOP = 232, NW = 14, CEIL = 8;
  const BR = 40, PR = 26, PH = 56;                              // ball radius, player radius, player draw height
  const PSPD = 320, PJUMP = 640, PGRAV = 1800, BGRAV = 900, BMAX = 880;
  let zoneW;
  function zoneOf(x) { return Math.max(0, Math.min(count - 1, Math.floor((x - PX0) / zoneW))); }
  function zoneBounds(i) { return [PX0 + i * zoneW, PX0 + (i + 1) * zoneW]; }

  // ---------- state ----------
  let players, ball, phase, timer, winner, msg, msgT, served, sparks, court;

  function bakeCourt() {                                        // static sky + frame (cheap parts drawn each frame)
    court = document.createElement("canvas"); court.width = W; court.height = H;
    const g = court.getContext("2d");
    g.fillStyle = SKY; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) { const x = (i * 71) % W, y = (i * 37) % 360; if ((x + y) % 7 === 0) { g.fillStyle = SKY2; g.fillRect(x, y, 4, 4); } }
    g.fillStyle = SUN; g.beginPath(); g.arc(704, 120, 48, 0, 7); g.fill();
    g.fillStyle = "#fffce6"; g.beginPath(); g.arc(704, 120, 36, 0, 7); g.fill();
    const cloud = (cx, cy, s) => { g.fillStyle = CLOUD; for (const [ox, oy, r] of [[0, 0, 2], [3, 1, 1.6], [-3, 1, 1.5]]) { g.beginPath(); g.arc(cx + ox * s * 4, cy + oy * s * 4, r * s * 4, 0, 7); g.fill(); } g.fillRect(cx - 4 * s * 4, cy + s * 4, 8 * s * 4, s * 4); };
    cloud(300, 150, 4); cloud(600, 96, 3);
    // sand frame: walls, top corners, bottom band
    g.fillStyle = SAND;
    g.fillRect(0, 0, PX0, H); g.fillRect(PX1, 0, W - PX1, H); g.fillRect(0, FLOOR_TOP, W, H - FLOOR_TOP);
    g.fillRect(0, 0, 160, 104); g.fillRect(W - 160, 0, 160, 104);
    const inSand = (x, y) => (x < PX0 || x >= PX1 || y >= FLOOR_TOP || (y < 104 && (x < 160 || x >= W - 160)));
    for (let i = 0; i < 4200; i++) { const x = (i * 53) % W, y = (i * 29) % H; if (inSand(x, y)) { g.fillStyle = (x + y) % 3 ? SAND2 : SANDD; g.fillRect(x, y, 2, 2); } }
    g.fillStyle = EDGE; g.fillRect(PX0 - 2, 0, 2, FLOOR_TOP); g.fillRect(PX1, 0, 2, FLOOR_TOP); g.fillRect(PX0 - 2, FLOOR_TOP - 2, PX1 - PX0 + 4, 2);
  }

  function serve() {
    const cx = PX0 + zoneW * (0.5 + Math.random() * (count - 1));   // random launch column
    const dir = Math.random() < 0.5 ? -1 : 1;                       // always thrown clearly sideways — never a straight drop
    ball = { x: cx, y: 88, vx: dir * (190 + Math.random() * 180), vy: 30 + Math.random() * 60, r: BR, spin: 0 };
    served = true;
  }
  function reset() {
    zoneW = (PX1 - PX0) / count;
    bakeCourt();
    players = [];
    for (let i = 0; i < count; i++) {
      const [zl, zr] = zoneBounds(i);
      players.push({ i, name: NAMES[i], color: PCOL[i], tag: "P" + (i + 1), spr: SPR[i], sprf: SPRF[i],
        x: (zl + zr) / 2, y: FLOOR_TOP - PR, vx: 0, vy: 0, onG: true, pts: 2, alive: true, face: i < count / 2 ? 1 : -1 });
    }
    sparks = []; winner = null; msg = ""; msgT = 0; served = false;
    ball = { x: W / 2, y: 90, vx: 0, vy: 0, r: BR, spin: 0 };
    phase = "ready"; timer = 2.4;
  }
  reset();

  // ---------- input ----------
  const KEYS = [
    { L: "KeyA", R: "KeyD", J: ["KeyW", "Space"] },
    { L: "ArrowLeft", R: "ArrowRight", J: ["ArrowUp", "Enter"] },
    { L: "KeyJ", R: "KeyL", J: ["KeyI", "KeyO"] },
    { L: "KeyF", R: "KeyH", J: ["KeyT", "KeyR"] },
  ];
  const held = {};
  function jump(p) { if (p.alive && p.onG && phase === "play") { p.vy = -PJUMP; p.onG = false; } }
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
    if (e.repeat) return;
    for (let i = 0; i < count; i++) if (KEYS[i].J.includes(e.code)) { jump(players[i]); break; }
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- physics ----------
  function spark(x, y, n, col) { for (let k = 0; k < n; k++) { const a = Math.random() * 7, s = 40 + Math.random() * 150; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.3, c: col }); } }

  function bumpPlayer(p) {
    const dx = ball.x - p.x, dy = ball.y - p.y, d = Math.hypot(dx, dy) || 1;
    if (d >= BR + PR) return false;
    const nx = dx / d, ny = dy / d;
    ball.x = p.x + nx * (BR + PR); ball.y = p.y + ny * (BR + PR);
    const sp = Math.min(BMAX, Math.max(470, Math.hypot(ball.vx, ball.vy)));
    ball.vx = nx * sp * 0.92 + p.vx * 0.55;
    ball.vy = ny * sp * 0.92 + p.vy * 0.45;
    if (ball.vy > -180) ball.vy = -180 - Math.random() * 80;        // always pop UP off a player
    ball.spin = ball.vx * 0.02;
    spark(ball.x, ball.y - BR, 5, p.color);
    return true;
  }
  function ballNet(dx) {                                            // circle vs a net rect at divider x=dx
    const l = dx - NW / 2, r = dx + NW / 2, t = NET_TOP, b = FLOOR_TOP;
    const nx = Math.max(l, Math.min(ball.x, r)), ny = Math.max(t, Math.min(ball.y, b));
    const ddx = ball.x - nx, ddy = ball.y - ny, d2 = ddx * ddx + ddy * ddy;
    if (d2 >= BR * BR) return;
    if (ball.y < t) { ball.y = t - BR; ball.vy = -Math.abs(ball.vy) * 0.9; }   // over the top
    else { if (ball.x < dx) { ball.x = l - BR; } else { ball.x = r + BR; } ball.vx = -ball.vx * 0.92; }
  }
  function concede(i) {
    const p = players[i];
    if (!p.alive) { ball.vy = -Math.abs(ball.vy) * 0.8; ball.y = FLOOR_TOP - BR; return; }  // sealed hole bounces
    p.pts--; spark(ball.x, FLOOR_TOP, 16, p.color); msg = p.tag + " −1!"; msgT = 1.0;
    if (p.pts <= 0) { p.pts = 0; p.alive = false; msg = p.tag + " IS OUT!"; }
    const alive = players.filter(q => q.alive);
    if (alive.length <= 1) { winner = alive[0] || null; phase = "over"; return; }
    phase = "point"; timer = 0.9; served = false;
  }

  function update(dt) {
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 600 * dt; } sparks = sparks.filter(s => s.t > 0);
    msgT = Math.max(0, msgT - dt);
    if (phase === "ready") { timer -= dt; if (timer <= 0) { phase = "play"; serve(); } return; }
    if (phase === "point") { timer -= dt; if (timer <= 0) { phase = "play"; serve(); } return; }
    if (phase === "over") return;

    // players
    for (let i = 0; i < count; i++) {
      const p = players[i]; if (!p.alive) continue;
      const k = KEYS[i];
      p.vx = (held[k.R] ? 1 : 0) * PSPD - (held[k.L] ? 1 : 0) * PSPD;
      if (p.vx) p.face = p.vx > 0 ? 1 : -1;
      p.x += p.vx * dt;
      const [zl, zr] = zoneBounds(i), lo = zl + PR + (i > 0 ? NW / 2 : 4), hi = zr - PR - (i < count - 1 ? NW / 2 : 4);
      if (p.x < lo) p.x = lo; if (p.x > hi) p.x = hi;
      p.vy += PGRAV * dt; p.y += p.vy * dt;
      if (p.y >= FLOOR_TOP - PR) { p.y = FLOOR_TOP - PR; p.vy = 0; p.onG = true; }
    }

    if (!served) return;
    // ball — substep to avoid tunneling through nets at speed
    const SUB = 3, ddt = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      ball.vy += BGRAV * ddt;
      const v = Math.hypot(ball.vx, ball.vy); if (v > BMAX) { ball.vx *= BMAX / v; ball.vy *= BMAX / v; }
      ball.x += ball.vx * ddt; ball.y += ball.vy * ddt; ball.spin += ball.vx * 0.0006;
      if (ball.x - BR < PX0) { ball.x = PX0 + BR; ball.vx = Math.abs(ball.vx) * 0.96; }
      if (ball.x + BR > PX1) { ball.x = PX1 - BR; ball.vx = -Math.abs(ball.vx) * 0.96; }
      if (ball.y - BR < CEIL) { ball.y = CEIL + BR; ball.vy = Math.abs(ball.vy) * 0.9; }
      for (let i = 1; i < count; i++) ballNet(PX0 + i * zoneW);
      for (const p of players) if (p.alive) bumpPlayer(p);
      if (ball.y + BR >= FLOOR_TOP) { concede(zoneOf(ball.x)); break; }
    }
  }

  // ---------- draw ----------
  function drawHoles() {
    for (let i = 0; i < count; i++) {
      const [zl, zr] = zoneBounds(i), x0 = Math.round(zl) + (i === 0 ? 3 : 2), x1 = Math.round(zr) - (i === count - 1 ? 3 : 2);
      const p = players[i];
      if (!p.alive) { ctx.fillStyle = SAND2; ctx.fillRect(x0, FLOOR_TOP, x1 - x0, FLOOR_BOT - FLOOR_TOP);   // sealed
        ctx.fillStyle = SANDD; for (let x = x0; x < x1; x += 6) ctx.fillRect(x, FLOOR_TOP, 3, FLOOR_BOT - FLOOR_TOP); continue; }
      const rim = hx(p.color, 1.25), deep = hx(p.color, 0.5);
      for (let y = FLOOR_TOP; y < FLOOR_BOT; y++) {
        const t = (y - FLOOR_TOP) / (FLOOR_BOT - FLOOR_TOP);
        ctx.fillStyle = lerpc(rim, deep, t); ctx.fillRect(x0, y, x1 - x0, 1);
      }
      ctx.fillStyle = EDGE; ctx.fillRect(x0, FLOOR_TOP, 2, FLOOR_BOT - FLOOR_TOP); ctx.fillRect(x1 - 2, FLOOR_TOP, 2, FLOOR_BOT - FLOOR_TOP);
    }
  }
  function lerpc(a, b, t) { const pa = a.replace("#", ""), pb = b.replace("#", ""); const c = [0, 2, 4].map(i => Math.round(parseInt(pa.substr(i, 2), 16) + (parseInt(pb.substr(i, 2), 16) - parseInt(pa.substr(i, 2), 16)) * t)); return "rgb(" + c.join(",") + ")"; }
  function drawNets() {
    for (let i = 1; i < count; i++) {
      const dx = Math.round(PX0 + i * zoneW);
      ctx.fillStyle = SANDD; ctx.fillRect(dx - 3, FLOOR_TOP - 4, 6, FLOOR_BOT - FLOOR_TOP + 4);
      ctx.fillStyle = NETP; ctx.fillRect(dx - 2, NET_TOP, 4, FLOOR_TOP - NET_TOP); ctx.fillRect(dx - 14, NET_TOP - 4, 28, 5);
      for (let y = NET_TOP; y < NET_TOP + 86; y += 4) for (let x = dx - 12; x < dx + 12; x += 4) { ctx.fillStyle = ((x + y) / 4 % 2 | 0) ? NETW : "rgba(0,0,0,0)"; ctx.fillRect(x, y, 4, 4); }
    }
  }
  function drawSprite(s, cx, feetY, scl, alpha) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); ctx.globalAlpha = 1; }
  function drawPlayer(p) {
    const scl = PH / p.spr.h, feetY = p.y + PR;
    ctx.fillStyle = "rgba(8,10,20,.28)"; ctx.beginPath(); ctx.ellipse(p.x, FLOOR_TOP, PR * 0.9, 5, 0, 0, 7); ctx.fill();
    drawSprite(p.face < 0 ? p.sprf : p.spr, p.x, feetY, scl, p.alive ? 1 : 0.3);
    const tx = (p.x - 9) | 0, ty = (feetY - PH - 9) | 0;
    ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK);
  }
  function drawBall() {
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.spin);
    const s = BALL, scl = (BR * 2) / s.w; ctx.drawImage(s.canvas, -s.w * scl / 2, -s.h * scl / 2, s.w * scl, s.h * scl);
    ctx.restore();
  }
  function drawScores() {
    for (let i = 0; i < count; i++) {
      const cx = PX0 + (i + 0.5) * zoneW, bw = Math.min(150, zoneW - 24), bx = cx - bw / 2, by = 520;
      ctx.fillStyle = "#1c1824"; ctx.fillRect(bx, by, bw, 56); ctx.fillStyle = players[i].color; ctx.fillRect(bx, by, bw, 6);
      drawSprite(players[i].spr, bx + 26, by + 52, 36 / players[i].spr.h, players[i].alive ? 1 : 0.4);
      tc(players[i].alive ? String(players[i].pts) : "OUT", bx + bw - 36, by + 18, players[i].alive ? 4 : 2, players[i].alive ? "#fff" : "#6a6478");
    }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.drawImage(court, 0, 0);
    drawHoles(); drawNets();
    for (const p of players) drawPlayer(p);
    if (served && phase !== "over") drawBall();
    for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.t * 2); ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 4, 4); } ctx.globalAlpha = 1;
    drawScores();

    if (msgT > 0 && phase !== "over") tc(msg, W / 2, 70, 4, GOLD);
    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.42)"; ctx.fillRect(0, 0, W, H);
      tc(timer > 0.3 ? String(Math.ceil(timer - 0.2)) : "GO!", W / 2, 180, 7, GOLD);
      tc("KEEP THE BALL OUT OF YOUR HOLE  -  LAST ONE STANDING WINS", W / 2, 300, 2, "#eef6ff");
      tc("MOVE = YOUR KEYS    JUMP = " + ["W", "UP", "I", "T"].slice(0, count).join(" / "), W / 2, 330, 1, DIM);
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.84)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " WINS!", W / 2, 130, 6, GOLD);
        drawSprite(winner.spr, W / 2, 400, 200 / winner.spr.h, 1); tc(winner.name + " — LAST ONE STANDING", W / 2, 420, 3, winner.color);
      } else tc("DRAW!", W / 2, 240, 6, GOLD);
      tc("ENTER = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }

    window.__vb = { phase, count, pts: players.map(p => p.pts), alive: players.map(p => p.alive),
      winner: winner ? winner.tag : null, ball: served ? [Math.round(ball.x), Math.round(ball.y)] : null, ppos: players.map(p => [Math.round(p.x), Math.round(p.y)]) };
    window.__vbhook = {
      setball: (x, y, vx, vy) => { ball.x = x; ball.y = y; ball.vx = vx || 0; ball.vy = vy || 0; served = true; },
      tp: (i, x) => { if (players[i]) players[i].x = x; },
      jump: i => players[i] && jump(players[i]),
      drop: (i, fx) => { const [zl, zr] = zoneBounds(i); ball.x = zl + (zr - zl) * (fx == null ? 0.5 : fx); ball.y = FLOOR_TOP - BR - 1; ball.vx = 0; ball.vy = 260; served = true; },
      zoneOf, zoneW: () => zoneW, FLOOR_TOP, PX0, PX1,
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
