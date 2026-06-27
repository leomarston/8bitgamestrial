/* 8-BIT PARTY — shared game ICONS. Builds a polished little SCENE icon for every
 * minigame from the inlined sprite data (window.GAME_DATA): a framed mini-thumbnail
 * (background + signature art) per game, so the cup roulette (and anything else
 * off the hub) can show real pictures. window.GameIcons.canvas(file) -> 64x64. */
(() => {
  const D = window.GAME_DATA; if (!D) return;
  const SZ = 64, M = 32;

  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  }
  function flip(s) { const c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h }; }
  function lighten(hex, f) { const b = hex.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(b.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }
  const P = D.palette, PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];

  // ---- focal sprites ----
  const ball = build(D.ball, P), hero = build(D.roster[0].rows, P), wUp = build(D.wingUp, P), wUpL = flip(wUp);
  const GYP = D.graveyard.palette, monster = build(D.graveyard.monster, GYP), headstone = build(D.graveyard.headstone, GYP), broken = build(D.graveyard.broken, GYP);
  const CRP = D.crown.palette, crown = build(D.crown.crownBig, CRP), pillar = build(D.crown.pillar, CRP);
  const bomb = build(D.hotpotato.bomb, D.hotpotato.palette);
  const SPP = D.space.palette, shuttle = build(D.space.shuttle, SPP), meteor = build(D.space.meteor, SPP);
  const TKP = D.tank.palette, brick = build(D.tank.brick, TKP), steel = build(D.tank.steel, TKP);
  const tank = build(D.tank.tank, Object.assign({}, TKP, { C: "#ff5d5d", o: lighten("#ff5d5d", 0.62) }));
  const catcher = build(D.rlgl.catcherFront, D.rlgl.palette), lampR = build(D.rlgl.lampRed, D.rlgl.palette);
  const carPal = b => ({ C: b, L: lighten(b, 1.18), d: lighten(b, 0.70), o: lighten(b, 0.45), W: D.traffic.win, h: D.traffic.hl, t: D.traffic.tl });
  const car = build(D.traffic.car, carPal("#e6d074")), coin = build(D.traffic.coin, D.traffic.coinPal);
  const shipPal = b => Object.assign({}, D.ship.pal, { S: b, l: lighten(b, 1.22), s: lighten(b, 0.74), F: b });
  const ship = build(D.ship.ship, shipPal("#ff5d5d"));
  const BLP = D.blocks.palette, ground = build(D.blocks.ground, BLP), stoneTop = build(D.blocks.stoneTop, BLP), stone = build(D.blocks.stone, BLP);
  const tile = cols => build(D.tileblitz.tileTemplate, cols), tbR = tile(D.tileblitz.tileColors.R), tbB = tile(D.tileblitz.tileColors.B), tbN = tile(D.tileblitz.tileColors.N);

  // ---- helpers ----
  function blit(g, s, x, y, w, h) { g.imageSmoothingEnabled = false; g.drawImage(s.canvas, Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function fit(g, s, cx, feetY, h, shadow) {                       // draw sprite to height h, centred on cx, sitting on feetY
    const w = s.w * (h / s.h);
    if (shadow) { g.fillStyle = "rgba(6,6,14,.32)"; g.beginPath(); g.ellipse(cx, feetY - 1, w * 0.42, 2.5, 0, 0, 7); g.fill(); }
    blit(g, s, cx - w / 2, feetY - h, w, h);
  }
  function vgrad(g, c0, c1, y0, y1) { const lg = g.createLinearGradient(0, y0, 0, y1); lg.addColorStop(0, c0); lg.addColorStop(1, c1); g.fillStyle = lg; g.fillRect(0, y0, SZ, y1 - y0); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function dots(g, n, col, seed) { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect((i * 53 + seed) % SZ, (i * 37 + seed * 7) % SZ, 1, 1); }

  function mk(border, drawFn) {
    const c = document.createElement("canvas"); c.width = c.height = SZ; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.save(); rr(g, 0, 0, SZ, SZ, 9); g.clip(); drawFn(g); g.restore();
    g.strokeStyle = border; g.lineWidth = 3; rr(g, 1.5, 1.5, SZ - 3, SZ - 3, 8); g.stroke();
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; rr(g, 3, 3, SZ - 6, SZ - 6, 6); g.stroke();
    return c;
  }

  const ICONS = {
    "football.html": mk("#8be0a0", g => {
      vgrad(g, "#3aa564", "#2c7d4c", 0, SZ);
      g.fillStyle = "#379d5a"; for (let x = 4; x < SZ; x += 18) g.fillRect(x, 0, 9, SZ);
      g.strokeStyle = "rgba(244,244,238,.85)"; g.lineWidth = 2; g.beginPath(); g.moveTo(M, 4); g.lineTo(M, SZ - 4); g.stroke(); g.beginPath(); g.arc(M, M, 13, 0, 7); g.stroke();
      g.fillStyle = "#f4f4ee"; g.fillRect(M - 12, 3, 24, 4); g.fillRect(M - 12, SZ - 7, 24, 4);   // goal mouths
      fit(g, ball, M, M + 17, 30, true);
    }),
    "flappy.html": mk("#bfe6ff", g => {
      vgrad(g, "#8fd0ff", "#bfe8ff", 0, SZ);
      g.fillStyle = "#f4fbff"; g.beginPath(); g.arc(16, 14, 7, 0, 7); g.arc(23, 14, 6, 0, 7); g.fill();   // cloud
      const px = SZ - 20, gap = 22, gy = 14;
      g.fillStyle = "#6bd66b"; g.fillRect(px, 0, 16, gy); g.fillRect(px, gy + gap, 16, SZ - gy - gap);
      g.fillStyle = "#2f8c50"; g.fillRect(px - 2, gy - 5, 20, 5); g.fillRect(px - 2, gy + gap, 20, 5);
      g.strokeStyle = "#1d3a23"; g.lineWidth = 1; g.strokeRect(px, 0, 16, gy); g.strokeRect(px, gy + gap, 16, SZ - gy - gap);
      blit(g, wUpL, 12, M - 7, 12, 9); blit(g, wUp, 30, M - 7, 12, 9);
      fit(g, hero, 26, M + 13, 30);
    }),
    "graveyard.html": mk("#8fd0a0", g => {
      vgrad(g, "#241a3a", "#15102a", 0, SZ);
      g.fillStyle = "#cfe6ff"; g.beginPath(); g.arc(SZ - 14, 14, 7, 0, 7); g.fill(); g.fillStyle = "#241a3a"; g.beginPath(); g.arc(SZ - 11, 12, 6, 0, 7); g.fill();
      g.fillStyle = "#234a2e"; g.fillRect(0, SZ - 12, SZ, 12);
      fit(g, headstone, 14, SZ - 8, 30); fit(g, broken, SZ - 14, SZ - 8, 26);
      fit(g, monster, M, SZ - 6, 40, true);
    }),
    "platformer.html": mk("#8ad77a", g => {
      vgrad(g, "#1b2a52", "#101a36", 0, SZ); dots(g, 22, "#cfe0ff", 9);
      const gy = SZ - 16; for (let x = 0; x < SZ; x += 16) blit(g, ground, x, gy, 16, 16);
      blit(g, stoneTop, SZ - 20, gy - 16, 14, 14); blit(g, stone, SZ - 20, gy - 2, 14, 14);
      fit(g, hero, 22, gy + 2, 30, true);
    }),
    "crown.html": mk("#ffe27a", g => {
      for (let yy = 0; yy < SZ; yy += 10) for (let xx = 0; xx < SZ; xx += 10) { g.fillStyle = (((xx / 10) | 0) + ((yy / 10) | 0)) % 2 ? "#c89a52" : "#e0bd76"; g.fillRect(xx, yy, 10, 10); }
      g.fillStyle = "#d23a4f"; g.beginPath(); g.ellipse(M, 44, 26, 9, 0, 0, 7); g.fill();
      fit(g, pillar, 9, 50, 30); fit(g, pillar, SZ - 9, 50, 30);
      fit(g, crown, M, 40, 30, true);
      g.fillStyle = "#fff6c0"; g.fillRect(M + 14, 14, 2, 2); g.fillRect(M - 18, 22, 2, 2);
    }),
    "tileblitz.html": mk("#ff9ad8", g => {
      const t = [tbR, tbB, tbN]; const cs = Math.ceil(SZ / 4);
      for (let yy = 0; yy < SZ; yy += cs) for (let xx = 0; xx < SZ; xx += cs) blit(g, t[(((xx / cs) | 0) + ((yy / cs) | 0)) % 3], xx, yy, cs, cs);
      g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 0, SZ, SZ);
    }),
    "hotpotato.html": mk("#ffb066", g => {
      g.fillStyle = "#3f4556"; g.fillRect(0, 0, SZ, SZ);
      for (let yy = 0; yy < SZ; yy += 12) for (let xx = 0; xx < SZ; xx += 12) if ((((xx / 12) | 0) + ((yy / 12) | 0)) % 2) { g.fillStyle = "#4a5062"; g.fillRect(xx, yy, 12, 12); }
      for (let xx = 0; xx < SZ; xx += 12) { g.fillStyle = (((xx / 12) | 0) % 2) ? "#1c1a22" : "#ffce3c"; g.fillRect(xx, 0, 12, 6); g.fillRect(xx, SZ - 6, 12, 6); }
      fit(g, bomb, M, M + 19, 34, true);
      g.fillStyle = "#ffd86a"; g.fillRect(M + 9, 12, 2, 2); g.fillStyle = "#ff7a3a"; g.fillRect(M + 11, 10, 2, 2);   // fuse spark
    }),
    "space.html": mk("#9cc0ff", g => {
      g.fillStyle = "#0e1030"; g.fillRect(0, 0, SZ, SZ); dots(g, 40, "#cfe0ff", 3); dots(g, 14, "#5db4ff", 19);
      fit(g, meteor, 14, 20, 18); fit(g, meteor, SZ - 12, SZ - 14, 14);
      fit(g, shuttle, M, SZ - 6, 40, true);
    }),
    "tank.html": mk("#d2d7e2", g => {
      g.fillStyle = "#34322b"; g.fillRect(0, 0, SZ, SZ);
      blit(g, brick, 6, 8, 14, 14); blit(g, steel, SZ - 22, 10, 14, 14); blit(g, brick, SZ - 20, SZ - 22, 14, 14); blit(g, brick, 8, SZ - 24, 14, 14);
      fit(g, tank, M, SZ - 12, 38, true);
      g.fillStyle = "#ffd86a"; g.fillRect(M - 1, 16, 2, 2);   // a shell
    }),
    "volley.html": mk("#8be4ef", g => {
      vgrad(g, "#76c4ec", "#9fdcf2", 0, SZ);
      g.fillStyle = "#fff7ce"; g.beginPath(); g.arc(SZ - 13, 13, 6, 0, 7); g.fill();
      const zc = ["#ff5d5d", "#5db4ff", "#6bd66b"], zw = SZ / 3;
      for (let i = 0; i < 3; i++) { g.fillStyle = zc[i]; g.fillRect(i * zw, SZ - 14, zw - 1, 14); }
      g.fillStyle = "#e9f6fb"; for (let i = 1; i < 3; i++) g.fillRect(i * zw - 1, SZ - 28, 2, 16);
      fit(g, ball, M, M + 8, 24, true);
    }),
    "rlgl.html": mk("#ffb0b0", g => {
      g.fillStyle = "#96cee8"; g.fillRect(0, 0, SZ, SZ * 0.32);
      for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? "#98744a" : "#b08a5c"; g.fillRect(0, SZ * 0.32 + k * SZ * 0.227, SZ, SZ * 0.227); g.fillStyle = "#68502f"; g.fillRect(0, SZ * 0.32 + (k + 1) * SZ * 0.227 - 1, SZ, 1); }
      for (let y = 0; y < SZ; y += 8) { g.fillStyle = ((y / 8 | 0) % 2) ? "#15121f" : "#f4f4ee"; g.fillRect(SZ - 6, y, 3, 8); }
      fit(g, catcher, SZ - 20, M + 18, 38);
      fit(g, hero, 14, SZ - 8, 24);
      blit(g, lampR, 3, 3, 8, 18);
    }),
    "traffic.html": mk("#efd98a", g => {
      g.fillStyle = "#606068"; g.fillRect(0, 0, SZ, 9);
      g.fillStyle = "#3a3a40"; g.fillRect(0, 9, SZ, SZ - 18);
      g.fillStyle = "#b6b6bc"; for (let ly = 22; ly < SZ - 12; ly += 14) for (let x = 0; x < SZ; x += 12) g.fillRect(x, ly, 6, 2);
      g.fillStyle = "#4a9646"; g.fillRect(0, SZ - 9, SZ, 9);
      fit(g, coin, SZ - 13, 30, 12);
      blit(g, car, 8, 22, car.w * (16 / car.h), 16);
    }),
    "ship.html": mk("#8ad3f0", g => {
      vgrad(g, D.ship.skyT, D.ship.skyB, 0, 22);
      g.fillStyle = "#ffe278"; g.beginPath(); g.arc(13, 13, 6, 0, 7); g.fill();
      g.fillStyle = D.ship.sea; g.fillRect(0, 22, SZ, SZ - 22);
      g.strokeStyle = D.ship.seaL; g.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const yy = 32 + k * 9; g.beginPath(); for (let x = 0; x <= SZ; x += 4) g.lineTo(x, yy + 2 * Math.sin(x * 0.4 + k)); g.stroke(); }
      for (let y = 22; y < SZ; y += 8) for (let kk = 0; kk < 2; kk++) { g.fillStyle = ((y / 8 | 0) + kk) % 2 ? "#28282e" : "#f4f4ee"; g.fillRect(SZ - 8 + kk * 4, y, 4, 8); }
      fit(g, ship, 26, 52, 34, true);
    }),
  };

  window.GameIcons = { canvas: file => ICONS[file] || null, size: SZ };
})();
