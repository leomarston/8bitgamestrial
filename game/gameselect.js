/* 8-BIT PARTY — Game select hub. 4x2 grid of minigames (2 live, 6 coming soon).
 * One shared cursor; either player moves it (WASD / arrows) and confirms
 * (Space / Enter). Backspace returns to the character select. */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  function buildSprite(rows, pal = D.palette) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]]; if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return { canvas: c, w, h };
  }
  function flip(s) {
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h };
  }
  const spr = {}; D.roster.forEach(c => spr[c.name] = buildSprite(c.rows));
  const ballS = buildSprite(D.ball), wUp = buildSprite(D.wingUp), wUpL = flip(wUp);
  const GYP = D.graveyard.palette;
  const gMon = buildSprite(D.graveyard.monster, GYP), gHead = buildSprite(D.graveyard.headstone, GYP), gBroken = buildSprite(D.graveyard.broken, GYP);
  const BLP = D.blocks.palette;
  const bGround = buildSprite(D.blocks.ground, BLP), bStoneTop = buildSprite(D.blocks.stoneTop, BLP), bStone = buildSprite(D.blocks.stone, BLP);
  const CRP = D.crown.palette;
  const cCrown = buildSprite(D.crown.crownBig, CRP), cPillar = buildSprite(D.crown.pillar, CRP);
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++)
        if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#15121f", sp); text(s, x, y, sc, c, sp); };

  const BG = "#1a1626", DIM = "#9a9cb2", GOLD = "#ffd54a", INK = "#15121f";
  const P1C = "#ff5d5d", P2C = "#5db4ff";

  // ---- picks (from character select) ----
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!spr[p1name]) p1name = "PIXEL"; if (!spr[p2name]) p2name = "BYTE";

  // ---- the roster of minigames ----
  const GAMES = [
    { name: "FOOTBALL", file: "football.html", accent: "#6bd66b", icon: "football" },
    { name: "FLAPPY", file: "flappy.html", accent: "#5db4ff", icon: "flappy" },
    { name: "GRAVEYARD", file: "graveyard.html", accent: "#79d36a", icon: "graveyard" },
    { name: "RUNNER", file: "platformer.html", accent: "#5cc24c", icon: "runner" },
    { name: "CROWN GRAB", file: "crown.html", accent: "#ffd54a", icon: "crown" },
    null, null, null,
  ];

  // ---- grid ----
  const COLS = 4, ROWS = 2, CW = 200, CH = 150, GX = 16, GY = 18;
  const GW = COLS * CW + (COLS - 1) * GX, GX0 = Math.round((W - GW) / 2), GY0 = 150;
  function cell(i) { const c = i % COLS, r = (i / COLS) | 0;
    return { x: GX0 + c * (CW + GX), y: GY0 + r * (CH + GY), w: CW, h: CH }; }

  let idx = 0, lockMsg = 0;

  // ---- input: PLAYER 1 chooses the game (WASD move, Space/F pick) ----
  const MOVE = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };
  window.addEventListener("keydown", e => {
    if (["Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "index.html"; return; }
    if (e.code === "Space" || e.code === "KeyF") {
      const g = GAMES[idx];
      if (g) location.href = g.file; else lockMsg = 1.1;
      return;
    }
    const m = MOVE[e.code]; if (!m) return;
    let c = idx % COLS, r = (idx / COLS) | 0;
    c = (c + m[0] + COLS) % COLS; r = (r + m[1] + ROWS) % ROWS;
    idx = r * COLS + c;
  });

  // ---- icons ----
  function fitDraw(s, x, y, w, h) {
    const sc = Math.min(w / s.w, h / s.h), dw = (s.w * sc) | 0, dh = (s.h * sc) | 0;
    ctx.drawImage(s.canvas, (x + (w - dw) / 2) | 0, (y + (h - dh) / 2) | 0, dw, dh);
  }
  function iconFootball(r) {
    ctx.fillStyle = "#2f8c50"; ctx.fillRect(r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    ctx.fillStyle = "#379d5a";
    for (let x = r.x + 12; x < r.x + r.w - 12; x += 36) ctx.fillRect(x, r.y + 12, 18, r.h - 56);
    ctx.strokeStyle = "#f4f4ee"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y + 14); ctx.lineTo(r.x + r.w / 2, r.y + r.h - 46); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + (r.h - 44) / 2 + 6, 26, 0, 7); ctx.stroke();
    fitDraw(ballS, r.x + r.w / 2 - 26, r.y + (r.h - 44) / 2 - 20, 52, 52);
  }
  function iconFlappy(r) {
    ctx.fillStyle = "#8fd0ff"; ctx.fillRect(r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    // a pipe pair with a gap
    const px = r.x + r.w - 58, gpTop = r.y + 12, gpH = r.h - 56;
    ctx.fillStyle = "#6bd66b"; ctx.fillRect(px, gpTop, 34, 30); ctx.fillRect(px, gpTop + gpH - 34, 34, 34);
    ctx.fillStyle = "#2f8c50"; ctx.fillRect(px + 26, gpTop, 8, 30); ctx.fillRect(px + 26, gpTop + gpH - 34, 8, 34);
    ctx.strokeStyle = "#1d3a23"; ctx.lineWidth = 2;
    ctx.strokeRect(px, gpTop, 34, 30); ctx.strokeRect(px, gpTop + gpH - 34, 34, 34);
    // winged fighter
    const fb = spr[p1name], cy = r.y + (r.h - 44) / 2;
    ctx.drawImage(wUpL.canvas, r.x + 30, cy - 6, 24, 18);
    ctx.drawImage(wUp.canvas, r.x + 30 + 44, cy - 6, 24, 18);
    fitDraw(fb, r.x + 36, r.y + 14, 50, r.h - 64);
  }

  function iconGraveyard(r) {
    ctx.fillStyle = "#1b1730"; ctx.fillRect(r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    ctx.fillStyle = "#234a2e"; ctx.fillRect(r.x + 12, r.y + r.h - 60, r.w - 24, 14);
    // moon
    ctx.fillStyle = "#cfe6ff"; ctx.beginPath(); ctx.arc(r.x + r.w - 30, r.y + 28, 8, 0, 7); ctx.fill();
    fitDraw(gHead, r.x + 18, r.y + 30, 34, 56);
    fitDraw(gBroken, r.x + r.w - 56, r.y + 30, 34, 56);
    fitDraw(gMon, r.x + r.w / 2 - 28, r.y + 22, 56, 64);
  }
  function iconRunner(r) {
    ctx.fillStyle = "#18244a"; ctx.fillRect(r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    ctx.fillStyle = "#eef2ff";
    for (let i = 0; i < 10; i++) ctx.fillRect(r.x + 18 + (i * 37 % (r.w - 40)), r.y + 18 + (i * 23 % 40), 2, 2);
    const gy = r.y + r.h - 70;
    for (let x = r.x + 12; x < r.x + r.w - 12; x += 24) ctx.drawImage(bGround.canvas, x, gy, 24, 24);
    ctx.drawImage(bStoneTop.canvas, r.x + r.w - 64, gy - 36, 24, 24);
    ctx.drawImage(bStone.canvas, r.x + r.w - 64, gy - 12, 24, 24);
    const f = spr[p1name]; fitDraw(f, r.x + 26, gy - 52, 34, 46);
  }
  function iconCrown(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    for (let yy = 0; yy < ih; yy += 16) for (let xx = 0; xx < iw; xx += 16) {
      ctx.fillStyle = ((((xx / 16) | 0) + ((yy / 16) | 0)) % 2) ? "#c89a52" : "#e0bd76"; ctx.fillRect(ix + xx, iy + yy, 16, 16);
    }
    ctx.fillStyle = "#d23a4f"; ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, iy + ih * 0.66, 46, 19, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, iy + ih * 0.66, 46, 19, 0, 0, 7); ctx.lineWidth = 2; ctx.strokeStyle = "#ffd54a"; ctx.stroke();
    fitDraw(cPillar, ix + 4, iy + ih * 0.34, 22, 56);
    fitDraw(cPillar, ix + iw - 26, iy + ih * 0.34, 22, 56);
    fitDraw(cCrown, r.x + r.w / 2 - 32, iy + ih * 0.30, 64, 40);
    ctx.restore();
    ctx.strokeStyle = "#ffd54a"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function tile(i, t) {
    const r = cell(i), g = GAMES[i];
    if (g) {
      ctx.fillStyle = "#272138"; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
      const ic = { football: iconFootball, flappy: iconFlappy, graveyard: iconGraveyard, runner: iconRunner, crown: iconCrown }[g.icon] || iconGraveyard;
      ic(r);
      ctx.fillStyle = "#15121f"; rr(r.x + 10, r.y + r.h - 36, r.w - 20, 26, 7); ctx.fill();
      tc(g.name, r.x + r.w / 2, r.y + r.h - 31, 3, g.accent);
    } else {
      ctx.fillStyle = "#201b30"; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
      ctx.strokeStyle = "#3a3352"; ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
      rr(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 9); ctx.stroke(); ctx.setLineDash([]);
      tc("?", r.x + r.w / 2, r.y + 34, 7, "#3f3a57");
      tc("COMING SOON", r.x + r.w / 2, r.y + r.h - 34, 2, "#5a5570");
    }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function cursor(t) {
    const r = cell(idx), pulse = 0.5 + 0.5 * Math.sin(t / 150);
    ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * pulse;
    ctx.strokeStyle = P1C; ctx.lineWidth = 5; rr(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 14); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = P1C; rr(r.x - 4, r.y - 13, 36, 18, 5); ctx.fill();
    text("P1", r.x + 3, r.y - 9, 2, INK);
  }

  function playerStrip() {
    const y = GY0 + ROWS * (CH + GY) + 6;
    ctx.fillStyle = "#221d34"; rr(40, y, W - 80, 96, 12); ctx.fill();
    // P1
    fitDraw(spr[p1name], 70, y + 6, 60, 84);
    text("P1", 140, y + 20, 2, P1C); text(p1name, 140, y + 42, 3, "#f4f4ee");
    // P2
    fitDraw(spr[p2name], W - 130, y + 6, 60, 84);
    const nw = tW(p2name, 3);
    text("P2", W - 200 - 10, y + 20, 2, P2C); text(p2name, W - 150 - nw, y + 42, 3, "#f4f4ee");
    tc("P1 CHOOSES  -  MOVE  WASD      PICK  SPACE      BACK  BACKSPACE", W / 2, y + 74, 1.6 | 0, DIM);
  }

  function frame(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = "#1e1930"; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = P2C; ctx.fillRect(0, 0, W, 6); ctx.fillStyle = P1C; ctx.fillRect(0, H - 6, W, 6);

    ts("CHOOSE A GAME", W / 2 - tW("CHOOSE A GAME", 5) / 2, 30, 5, GOLD);
    tc("8-BIT PARTY  *  PICK A MINIGAME", W / 2, 78, 2, DIM);

    for (let i = 0; i < 8; i++) tile(i, t);
    cursor(t);
    playerStrip();

    if (lockMsg > 0) { lockMsg -= 0.016;
      const r = cell(idx);
      ctx.fillStyle = "#be3238"; rr(r.x + r.w / 2 - 70, r.y + r.h / 2 - 16, 140, 32, 8); ctx.fill();
      tc("NOT READY YET", r.x + r.w / 2, r.y + r.h / 2 - 9, 2, "#f4f4ee");
    }
    window.__sel = { idx, game: GAMES[idx] ? GAMES[idx].name : null };
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
