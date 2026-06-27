/* 8-BIT PARTY — shared game ICONS. Builds a small recognisable icon canvas for
 * each minigame from the inlined sprite data (window.GAME_DATA), so screens that
 * aren't the hub (e.g. the cup's next-game roulette) can show pictures, not names.
 * window.GameIcons.canvas(file) -> a 50x50 canvas for that game's html file. */
(() => {
  const D = window.GAME_DATA; if (!D) return;
  const SZ = 50;
  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  }
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  function lighten(hex, f) { const b = hex.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(b.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }
  const P = D.palette, PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];

  // shared sprites
  const ball = build(D.ball, P), roster0 = build(D.roster[0].rows, P);
  const monster = build(D.graveyard.monster, D.graveyard.palette);
  const crown = build(D.crown.crownBig, D.crown.palette);
  const bomb = build(D.hotpotato.bomb, D.hotpotato.palette);
  const shuttle = build(D.space.shuttle, D.space.palette);
  const tankPal = Object.assign({}, D.tank.palette, { C: "#ff5d5d", o: lighten("#ff5d5d", 0.62) });
  const tank = build(D.tank.tank, tankPal);
  const catcher = build(D.rlgl.catcherFront, D.rlgl.palette);
  const carPal = b => ({ C: b, L: lighten(b, 1.18), d: lighten(b, 0.70), o: lighten(b, 0.45), W: D.traffic.win, h: D.traffic.hl, t: D.traffic.tl });
  const car = build(D.traffic.car, carPal("#e6d074"));
  const shipPal = b => Object.assign({}, D.ship.pal, { S: b, l: lighten(b, 1.22), s: lighten(b, 0.74), F: b });
  const ship = build(D.ship.ship, shipPal("#ff5d5d"));

  function blitFit(g, s, cx, cy, max) { const sc = Math.min(max / s.w, max / s.h), w = Math.round(s.w * sc), h = Math.round(s.h * sc); g.imageSmoothingEnabled = false; g.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function mk(accent, drawFn) {
    const c = document.createElement("canvas"); c.width = c.height = SZ; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.fillStyle = lighten(accent, 0.34); rr(g, 1, 1, SZ - 2, SZ - 2, 8); g.fill();
    g.strokeStyle = accent; g.lineWidth = 2; rr(g, 2, 2, SZ - 4, SZ - 4, 7); g.stroke();
    g.save(); rr(g, 2, 2, SZ - 4, SZ - 4, 7); g.clip(); drawFn(g); g.restore();
    return c;
  }
  const M = SZ / 2;
  const ICONS = {
    "football.html": mk("#6bd66b", g => blitFit(g, ball, M, M, 34)),
    "flappy.html": mk("#5db4ff", g => { g.fillStyle = "#f4f4ee"; g.beginPath(); g.moveTo(12, M); g.lineTo(20, M - 8); g.lineTo(20, M + 4); g.closePath(); g.fill(); g.beginPath(); g.moveTo(SZ - 12, M); g.lineTo(SZ - 20, M - 8); g.lineTo(SZ - 20, M + 4); g.closePath(); g.fill(); blitFit(g, roster0, M, M, 30); }),
    "graveyard.html": mk("#79d36a", g => blitFit(g, monster, M, M + 2, 38)),
    "platformer.html": mk("#5cc24c", g => { g.fillStyle = "#7a5230"; g.fillRect(4, SZ - 12, SZ - 8, 8); g.fillStyle = "#4a9646"; g.fillRect(4, SZ - 12, SZ - 8, 2); blitFit(g, roster0, M, M - 3, 30); }),
    "crown.html": mk("#ffd54a", g => blitFit(g, crown, M, M, 38)),
    "tileblitz.html": mk("#ff7ad0", g => { const t = (SZ - 8) / 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = PCOL[i * 2 + j]; g.fillRect(4 + j * t, 4 + i * t, t - 1, t - 1); } }),
    "hotpotato.html": mk("#ff8e34", g => blitFit(g, bomb, M, M, 34)),
    "space.html": mk("#7aa7ff", g => { g.fillStyle = "#cfe0ff"; for (let i = 0; i < 10; i++) g.fillRect((i * 17) % SZ, (i * 11) % SZ, 1, 1); blitFit(g, shuttle, M, M, 36); }),
    "tank.html": mk("#c0c6d2", g => blitFit(g, tank, M, M, 36)),
    "volley.html": mk("#5bd1e0", g => { g.fillStyle = "#ff5d5d"; g.fillRect(4, SZ - 10, (SZ - 8) / 2, 6); g.fillStyle = "#6bd66b"; g.fillRect(M, SZ - 10, (SZ - 8) / 2, 6); g.fillStyle = "#f4f4ee"; g.fillRect(M - 1, SZ - 18, 2, 8); blitFit(g, ball, M, M - 4, 24); }),
    "rlgl.html": mk("#ff8a8a", g => blitFit(g, catcher, M, M + 2, 40)),
    "traffic.html": mk("#e6d074", g => { g.fillStyle = "#3a3a40"; g.fillRect(2, M - 12, SZ - 4, 24); g.fillStyle = "#b6b6bc"; for (let x = 2; x < SZ; x += 10) g.fillRect(x, M - 1, 5, 2); blitFit(g, car, M, M, 40); }),
    "ship.html": mk("#4bb3e6", g => { g.fillStyle = D.ship.sea; g.fillRect(2, M + 4, SZ - 4, M - 4); blitFit(g, ship, M, M, 40); }),
  };

  window.GameIcons = { canvas: file => ICONS[file] || null };
})();
