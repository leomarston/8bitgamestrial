/* 8-BIT PARTY — TANK DUEL, 2–4 players (Battle City / Atari Combat style).
 * A fresh mirror-symmetric battlefield every round. Drive a tank (4 directions),
 * fire your cannon: shells DESTROY brick, are STOPPED by steel/the border, fly
 * OVER water and THROUGH bushes. One hit and you're scrap — LAST TANK ROLLING WINS.
 * 2P = diagonal corners · 3P = three random corners · 4P = all four (reshuffled).
 * Move with your cluster keys, FIRE with your action key:
 * P1 WASD/Space · P2 Arrows/Enter · P3 IJKL/O · P4 TFGH/R */
(() => {
  const D = window.GAME_DATA, TK = D.tank;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;            // 960 x 600
  const FONT = D.font;

  // ---------- pixel helpers ----------
  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  }
  function rot(s, quarter) {                      // crisp 90° rotations
    if (!quarter) return s;
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d");
    g.imageSmoothingEnabled = false; g.translate(s.w / 2, s.h / 2); g.rotate(quarter * Math.PI / 2); g.drawImage(s.canvas, -s.w / 2, -s.h / 2);
    return { canvas: c, w: s.w, h: s.h };
  }
  function tankSprite(bodyHex) {                  // recolour C/o, build 4 facings (0=up,1=right,2=down,3=left)
    const b = bodyHex.replace("#", ""), body = [parseInt(b.slice(0, 2), 16), parseInt(b.slice(2, 4), 16), parseInt(b.slice(4, 6), 16)];
    const shade = "#" + body.map(v => Math.round(v * 0.62).toString(16).padStart(2, "0")).join("");
    const pal = Object.assign({}, TK.palette, { C: bodyHex, o: shade });
    const up = build(TK.tank, pal);
    return [up, rot(up, 1), rot(up, 2), rot(up, 3)];
  }
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);

  const GOLD = "#ffd54a", DIM = "#9aa6c2", INK = "#15121f";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];

  // ---------- count + picks ----------
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4];
  const ROSTER = {}; D.roster.forEach(c => ROSTER[c.name] = c);

  // ---------- arena geometry ----------
  const COLS = TK.meta.cols, ROWS = TK.meta.rows, CELL = TK.meta.cell, SC = TK.meta.scale;   // 15,9,16,4
  const CS = CELL * SC;                          // 64px cell on screen
  const MAPW = COLS * CS, MAPH = ROWS * CS;      // 960 x 576
  const OY = Math.floor((H - MAPH) / 2);         // 12px band top & bottom
  const SPAWNS = TK.meta.spawns;                 // 4 corners (cell coords)

  // tile canvases: 1 brick, 2 steel, 3 water, 4 bush
  const TILE = { 1: build(TK.brick, TK.palette), 2: build(TK.steel, TK.palette), 3: build(TK.water, TK.palette), 4: build(TK.bush, TK.palette) };
  const SPR = NAMES.map((n, i) => tankSprite(PCOL[i]));

  // baked speckled-ground layer (regenerated each round so it varies)
  let floorCv = document.createElement("canvas"); floorCv.width = MAPW; floorCv.height = MAPH;
  function bakeFloor() {
    const g = floorCv.getContext("2d");
    const base = TK.palette.f, sp1 = TK.palette.g, sp2 = TK.palette.e;
    g.fillStyle = base; g.fillRect(0, 0, MAPW, MAPH);
    for (let i = 0; i < MAPW * MAPH / 70; i++) {
      const x = (Math.random() * COLS * CELL) | 0, y = (Math.random() * ROWS * CELL) | 0;
      g.fillStyle = Math.random() < 0.5 ? sp1 : sp2; g.fillRect(x * SC, y * SC, SC, SC);
    }
  }

  // ---------- map generator (mirror-symmetric, fair, connected) ----------
  function genMap() {
    const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    for (let x = 0; x < COLS; x++) { g[0][x] = 2; g[ROWS - 1][x] = 2; }
    for (let y = 0; y < ROWS; y++) { g[y][0] = 2; g[y][COLS - 1] = 2; }
    const cx = COLS >> 1, cy = ROWS >> 1;
    const place = (x, y, v) => { for (const [mx, my] of [[x, y], [COLS - 1 - x, y], [x, ROWS - 1 - y], [COLS - 1 - x, ROWS - 1 - y]]) if (mx > 0 && mx < COLS - 1 && my > 0 && my < ROWS - 1) g[my][mx] = v; };
    const pocket = new Set(["1,1", "2,1", "1,2"]);
    for (let y = 1; y < cy; y++) for (let x = 1; x < cx; x++) {
      if (pocket.has(x + "," + y)) continue;
      const r = Math.random();
      if (r < 0.28) place(x, y, 1); else if (r < 0.40) place(x, y, 2); else if (r < 0.45) place(x, y, 4);
    }
    for (let y = 1; y < cy; y++) if (Math.random() < 0.45) place(cx, y, Math.random() < 0.45 ? 2 : 1);
    for (let x = 1; x < cx; x++) if (Math.random() < 0.35) place(x, cy, Math.random() < 0.7 ? 1 : 2);
    if (Math.random() < 0.6) { place(cx - 1, cy, 3); place(cx, cy - 1, 3); }
    g[cy][cx] = [0, 2, 1][(Math.random() * 3) | 0];
    for (const k of pocket) { const [sx, sy] = k.split(",").map(Number); place(sx, sy, 0); }
    // connectivity over non steel/water from a spawn; carve steel if a spawn is sealed
    const spawns = SPAWNS;
    const reach = () => {
      const seen = new Set([spawns[0][0] + "," + spawns[0][1]]), st = [spawns[0]];
      while (st.length) { const [x, y] = st.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, key = nx + "," + ny;
          if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && !seen.has(key) && g[ny][nx] !== 2 && g[ny][nx] !== 3) { seen.add(key); st.push([nx, ny]); } } }
      return seen;
    };
    for (let it = 0; it < 40; it++) {
      const seen = reach(); if (spawns.every(s => seen.has(s[0] + "," + s[1]))) break;
      let carved = false;
      for (let y = 1; y < ROWS - 1 && !carved; y++) for (let x = 1; x < COLS - 1 && !carved; x++)
        if (g[y][x] === 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (seen.has((x + dx) + "," + (y + dy))) { place(x, y, 0); carved = true; break; }
    }
    return g;
  }

  // ---------- collision ----------
  function blocksTank(v) { return v === 1 || v === 2 || v === 3; }
  function tileAt(px, py) {
    const cx = Math.floor(px / CS), cy = Math.floor((py - OY) / CS);
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return 2;   // outside = steel
    return grid[cy][cx];
  }
  function hitsWall(x, y, r) {
    if (x - r < 0 || x + r > MAPW || y - r < OY || y + r > OY + MAPH) return true;
    const cx0 = Math.floor((x - r) / CS), cx1 = Math.floor((x + r) / CS);
    const cy0 = Math.floor((y - r - OY) / CS), cy1 = Math.floor((y + r - OY) / CS);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
      if (!blocksTank(grid[cy][cx])) continue;
      const rx = cx * CS, ry = OY + cy * CS, nx = Math.max(rx, Math.min(x, rx + CS)), ny = Math.max(ry, Math.min(y, ry + CS));
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
    }
    return false;
  }
  function blocked(self, x, y, r) {
    if (hitsWall(x, y, r)) return true;
    for (const o of tanks) if (o !== self && o.alive && (x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2) return true;
    return false;
  }
  function moveTank(p, dx, dy) {
    if (dx && !blocked(p, p.x + dx, p.y, p.r)) p.x += dx;
    if (dy && !blocked(p, p.x, p.y + dy, p.r)) p.y += dy;
  }

  // ---------- entities ----------
  const TR = 22, TSPD = 132, SHELL_SPD = 360, FIRE_COOL = 0.42, SHELL_R = 6, OWN_GRACE = 0.28;
  const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // up,right,down,left
  let tanks, grid, phase, ready, winner, t0, shells, sparks, shake;

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function cellCenter(c) { return { x: c[0] * CS + CS / 2, y: OY + c[1] * CS + CS / 2 }; }

  function reset() {
    grid = genMap(); bakeFloor();
    // choose corners for this count, shuffled; assign to players
    let corners = SPAWNS.map((_, i) => i);
    if (count === 2) corners = Math.random() < 0.5 ? [0, 3] : [1, 2];   // a random diagonal pair
    else corners = shuffle(corners).slice(0, count);
    shuffle(corners);
    tanks = [];
    for (let i = 0; i < count; i++) {
      const c = cellCenter(SPAWNS[corners[i]]);
      // face toward arena centre
      const dir = (c.x < W / 2 ? 1 : 3);
      tanks.push({ i, name: NAMES[i], color: PCOL[i], tag: "P" + (i + 1), spr: SPR[i],
        x: c.x, y: c.y, r: TR, dir, alive: true, fireCool: 0, shell: null, hitT: 0 });
    }
    shells = []; sparks = []; shake = 0;
    phase = "ready"; ready = 3.0; if (window.Countdown) Countdown.reset(); if (window.GameMusic) GameMusic.stop(); if (window.Results) Results.reset(); winner = null; t0 = 0;
  }

  // ---------- input ----------
  const KEYS = [
    { up: "KeyW", dn: "KeyS", lf: "KeyA", rt: "KeyD", fire: "Space" },
    { up: "ArrowUp", dn: "ArrowDown", lf: "ArrowLeft", rt: "ArrowRight", fire: "Enter" },
    { up: "KeyI", dn: "KeyK", lf: "KeyJ", rt: "KeyL", fire: "KeyO" },
    { up: "KeyT", dn: "KeyG", lf: "KeyF", rt: "KeyH", fire: "KeyR" },
  ];
  const held = {};
  function dirOf(i, code) { const k = KEYS[i]; if (code === k.up) return 0; if (code === k.rt) return 1; if (code === k.dn) return 2; if (code === k.lf) return 3; return -1; }
  function fire(p) {
    if (!p.alive || phase !== "play" || p.fireCool > 0 || p.shell) return;
    const d = DIRV[p.dir]; p.fireCool = FIRE_COOL;
    p.shell = { x: p.x + d[0] * (p.r + 6), y: p.y + d[1] * (p.r + 6), vx: d[0] * SHELL_SPD, vy: d[1] * SHELL_SPD, owner: p, life: 0, dead: false };
    shells.push(p.shell);
  }
  window.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    held[e.code] = true;
    if (e.repeat) return;
    for (let i = 0; i < count; i++) {
      const d = dirOf(i, e.code); if (d >= 0) { if (tanks[i].alive) tanks[i].dir = d; break; }      // turn-on-press
      if (e.code === KEYS[i].fire) { fire(tanks[i]); break; }
    }
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  // ---------- update ----------
  function spark(x, y, n, col) { for (let k = 0; k < n; k++) { const a = Math.random() * 7, s = 40 + Math.random() * 150; sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.3, c: col }); } }
  function destroyTank(p) { if (!p.alive) return; p.alive = false; spark(p.x, p.y, 22, "#ffcf6b"); spark(p.x, p.y, 10, p.color); shake = Math.max(shake, 9); }

  function stepShell(s, dt) {
    const SUB = 2; const ddt = dt / SUB;
    for (let k = 0; k < SUB && !s.dead; k++) {
      s.life += ddt; s.x += s.vx * ddt; s.y += s.vy * ddt;
      const v = tileAt(s.x, s.y);
      if (v === 2 || s.x < 0 || s.x > MAPW || s.y < OY || s.y > OY + MAPH) {   // steel / border → absorbed (no bounce)
        s.x -= s.vx * ddt; s.y -= s.vy * ddt;
        s.dead = true; spark(s.x, s.y, 5, "#cfe0ff"); break;
      } else if (v === 1) {                                                    // brick → destroy
        const cx = Math.floor(s.x / CS), cy = Math.floor((s.y - OY) / CS);
        if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) grid[cy][cx] = 0;
        s.dead = true; spark(s.x, s.y, 8, "#e0a060"); shake = Math.max(shake, 3); break;
      }
      for (const o of tanks) {                                                 // tanks
        if (!o.alive || o.dead) continue;
        if (o === s.owner && s.life < OWN_GRACE) continue;
        if ((s.x - o.x) ** 2 + (s.y - o.y) ** 2 < (o.r + SHELL_R) ** 2) { destroyTank(o); s.dead = true; break; }
      }
    }
  }

  function update(dt) {
    if (shake > 0) shake = Math.max(0, shake - dt * 60);
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; } sparks = sparks.filter(s => s.t > 0);
    if (phase === "ready") { ready -= dt; if (ready <= -0.5) { phase = "play"; if (window.GameMusic) GameMusic.start(); } return; }
    if (phase === "over") return;
    t0 += dt;
    for (let i = 0; i < count; i++) {
      const p = tanks[i]; if (!p.alive) continue;
      p.fireCool = Math.max(0, p.fireCool - dt);
      const k = KEYS[i];
      let moving = held[k[["up", "rt", "dn", "lf"][p.dir]]];
      if (!moving) { const order = ["up", "rt", "dn", "lf"]; for (let d = 0; d < 4; d++) if (held[k[order[d]]]) { p.dir = d; moving = true; break; } }
      if (moving) { const d = DIRV[p.dir]; moveTank(p, d[0] * TSPD * dt, d[1] * TSPD * dt); }
    }
    for (const s of shells) if (!s.dead) stepShell(s, dt);
    for (const p of tanks) if (p.shell && p.shell.dead) p.shell = null;
    shells = shells.filter(s => !s.dead);
    if (phase === "play") { const alive = tanks.filter(p => p.alive); if (alive.length <= 1) { winner = alive.length === 1 ? alive[0] : null; phase = "over"; } }
  }

  // ---------- draw ----------
  function drawTile(v, cx, cy) { if (TILE[v]) ctx.drawImage(TILE[v].canvas, cx * CS, OY + cy * CS, CS, CS); }
  function drawTank(p) {
    const s = p.spr[p.dir], scl = (p.r * 2 + 8) / s.w;
    const w = Math.round(s.w * scl), h = Math.round(s.h * scl);
    if (!p.alive) ctx.globalAlpha = 0.32;
    if (p.alive && phase === "ready") { ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t0 * 8 + ready * 8)); }
    ctx.drawImage(s.canvas, Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h);
    ctx.globalAlpha = 1;
    if (p.alive) { const tx = (p.x - 9) | 0, ty = (p.y - h / 2 - 9) | 0; ctx.fillStyle = p.color; ctx.fillRect(tx, ty, 20, 7); text(p.tag, tx + 3, ty + 1, 1, INK); }
    else { ctx.strokeStyle = "#20202a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x - 10, p.y - 10); ctx.lineTo(p.x + 10, p.y + 10); ctx.moveTo(p.x + 10, p.y - 10); ctx.lineTo(p.x - 10, p.y + 10); ctx.stroke(); }
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.fillStyle = "#0d0c12"; ctx.fillRect(-12, -12, W + 24, H + 24);
    ctx.drawImage(floorCv, 0, OY);
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) { const v = grid[cy][cx]; if (v && v !== 4) drawTile(v, cx, cy); }   // walls/water (not bush yet)
    for (const s of shells) { ctx.fillStyle = "#ffe9a8"; ctx.fillRect((s.x - 3) | 0, (s.y - 3) | 0, 6, 6); ctx.fillStyle = "#fff"; ctx.fillRect((s.x - 1) | 0, (s.y - 1) | 0, 2, 2); }
    for (const p of tanks) drawTank(p);
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) if (grid[cy][cx] === 4) drawTile(4, cx, cy);    // bush over tanks (concealment)
    for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.t * 2); ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); } ctx.globalAlpha = 1;
    ctx.restore();

    // top HUD band
    ctx.fillStyle = "rgba(12,11,20,.82)"; ctx.fillRect(0, 0, W, OY);
    const colW = (W - 16) / count;
    for (let i = 0; i < count; i++) { const p = tanks[i], x = 10 + i * colW; text(p.tag, x, 3, 1, p.color); text(p.alive ? "ALIVE" : "WRECK", x + tW(p.tag + " ", 1), 3, 1, p.alive ? DIM : "#6a6478"); }

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.5)"; ctx.fillRect(0, 0, W, H);
      tc(Countdown.label(ready, "FIGHT!"), W / 2, H / 2 - 36, 7, GOLD);
      tc("DESTROY THE OTHER TANKS  -  LAST TANK ROLLING WINS", W / 2, H / 2 + 44, 2, "#cfe0ff");
      tc("MOVE = YOUR KEYS    FIRE = " + ["SPACE", "ENTER", "O", "R"].slice(0, count).join(" / "), W / 2, H / 2 + 70, 1, DIM);
    }
    if (phase === "over") {
      if (window.Tournament) Tournament.finish(winner ? winner.tag : null); if (window.Results) Results.show(winner ? winner.tag : null);
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) { tc(winner.tag + " WINS!", W / 2, 120, 6, GOLD);
        const s = winner.spr[0], scl = 150 / s.h; ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 210, s.w * scl, 150);
        tc(winner.name + " — LAST TANK ROLLING", W / 2, 396, 3, winner.color);
      } else tc("MUTUAL DESTRUCTION!", W / 2, 220, 5, GOLD);
      tc((window.Tournament && Tournament.active) ? "" : "ENTER = REMATCH     ESC = PAUSE", W / 2, 520, 2, DIM);
    }

    window.__tk = { phase, count, alive: tanks.map(p => p.alive), winner: winner ? winner.tag : null,
      shells: shells.length, sv: shells.map(s => [Math.round(s.vx), Math.round(s.vy)]),
      dirs: tanks.map(p => p.dir), pos: tanks.map(p => [Math.round(p.x), Math.round(p.y)]) };
    window.__tkhook = {
      tp: (i, x, y) => { if (tanks[i]) { tanks[i].x = x; tanks[i].y = y; } },
      setdir: (i, d) => { if (tanks[i]) tanks[i].dir = d; },
      fire: i => tanks[i] && fire(tanks[i]),
      kill: i => tanks[i] && destroyTank(tanks[i]),
      grid: () => grid, tileAt, cellCenter: c => cellCenter(c), spawns: SPAWNS, cs: CS, oy: OY,
    };
    requestAnimationFrame(t => frame(now, t));
  }
  reset();
  requestAnimationFrame(t => frame(t, t));
})();
