/* 8-BIT PARTY — Game select hub. 6x2 grid of 12 live minigames, each playable by
 * 2-4 players. P1 moves the shared cursor (WASD) and confirms (Space / F); the
 * player strip shows everyone in the party. Backspace returns to character select. */
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
  const TBT = D.tileblitz.tileTemplate, TBC = D.tileblitz.tileColors;
  function buildTile(colors) { const w = TBT[0].length, h = TBT.length, c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = colors[TBT[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } } return { canvas: c, w, h }; }
  const tbR = buildTile(TBC.R), tbB = buildTile(TBC.B), tbN = buildTile(TBC.N);
  const hpBomb = buildSprite(D.hotpotato.bomb, D.hotpotato.palette);
  const spMet = buildSprite(D.space.meteor, D.space.palette);
  const TKP = D.tank.palette;
  const tkBrick = buildSprite(D.tank.brick, TKP), tkSteel = buildSprite(D.tank.steel, TKP);
  function buildTank(hex) { const b = hex.replace("#", ""); const shade = "#" + [0, 2, 4].map(i => Math.round(parseInt(b.substr(i, 2), 16) * 0.62).toString(16).padStart(2, "0")).join(""); return buildSprite(D.tank.tank, Object.assign({}, TKP, { C: hex, o: shade })); }
  const tkTank = buildTank("#ff5d5d");
  const rlCatch = buildSprite(D.rlgl.catcherFront, D.rlgl.palette), rlLampR = buildSprite(D.rlgl.lampRed, D.rlgl.palette);
  function lighten(hex, f) { const b = hex.replace("#", ""); return "#" + [0, 2, 4].map(i => Math.max(0, Math.min(255, Math.round(parseInt(b.substr(i, 2), 16) * f))).toString(16).padStart(2, "0")).join(""); }
  const TR = D.traffic;
  const trCarPal = base => ({ C: base, L: lighten(base, 1.18), d: lighten(base, 0.70), o: lighten(base, 0.45), W: TR.win, h: TR.hl, t: TR.tl });
  const trCar = buildSprite(TR.car, trCarPal("#e6d074")), trCarL = flip(trCar), trCar2 = buildSprite(TR.car, trCarPal("#aab6e0"));
  const trCoin = buildSprite(TR.coin, TR.coinPal);
  let _podIcon = null;
  function podIcon() {                                  // shuttle hull + pilot head
    if (_podIcon) return _podIcon;
    const SHU = D.space.shuttle, SW = SHU[0].length, SH = SHU.length;
    const c = document.createElement("canvas"); c.width = SW; c.height = SH; const g = c.getContext("2d");
    const rc = D.roster.find(r => r.name === p1name) || D.roster[0]; const hr = rc.rows.slice(0, 10), hw = hr[0].length;
    const put = (rows, pal, ox, oy) => { for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const col = pal[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1); } } };
    put(hr, D.palette, Math.round(SW / 2 - hw / 2) - 1, 8); put(SHU, D.space.palette, 0, 0);
    _podIcon = { canvas: c, w: SW, h: SH }; return _podIcon;
  }
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
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];

  // ---- party count + picks (from character select) ----
  let count = 2;
  try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let names = ["PIXEL", "BYTE", "NOVA", "CHIP"];
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) names = [s.p1, s.p2, s.p3, s.p4].map((n, i) => n || names[i]); } catch (e) {}
  names = names.map(n => (spr[n] ? n : "PIXEL"));
  const p1name = names[0];   // used by the icon previews (flappy / runner / space pod)

  // ---- the roster of minigames ----
  const GAMES = [
    { name: "FOOTBALL", file: "football.html", accent: "#6bd66b", icon: "football" },
    { name: "FLAPPY", file: "flappy.html", accent: "#5db4ff", icon: "flappy" },
    { name: "GRAVEYARD", file: "graveyard.html", accent: "#79d36a", icon: "graveyard" },
    { name: "RUNNER", file: "platformer.html", accent: "#5cc24c", icon: "runner" },
    { name: "CROWN GRAB", file: "crown.html", accent: "#ffd54a", icon: "crown" },
    { name: "TILE BLITZ", file: "tileblitz.html", accent: "#ff7ad0", icon: "tileblitz" },
    { name: "HOT POTATO", file: "hotpotato.html", accent: "#ff8e34", icon: "hotpotato" },
    { name: "METEOR DERBY", file: "space.html", accent: "#7aa7ff", icon: "space" },
    { name: "TANK DUEL", file: "tank.html", accent: "#c0c6d2", icon: "tank" },
    { name: "SLIME VOLLEY", file: "volley.html", accent: "#5bd1e0", icon: "volley" },
    { name: "RED LIGHT", file: "rlgl.html", accent: "#ff8a8a", icon: "rlgl" },
    { name: "TRAFFIC RUN", file: "traffic.html", accent: "#e6d074", icon: "traffic" },
  ];

  // ---- grid (6x2 holds the growing roster; empty slots show COMING SOON) ----
  const COLS = 6, ROWS = 2, CW = 148, CH = 150, GX = 10, GY = 18;
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
  function iconTileBlitz(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    const cs = Math.ceil(iw / 5);
    for (let yy = 0; yy < ih; yy += cs) for (let xx = 0; xx < iw; xx += cs) {
      const k = (((xx / cs) | 0) + ((yy / cs) | 0)) % 3, t = k === 0 ? tbR : (k === 1 ? tbB : tbN);
      ctx.drawImage(t.canvas, ix + xx, iy + yy, cs, cs);
    }
    ctx.restore();
    ctx.strokeStyle = "#ff7ad0"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconHotPotato(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#4a5060"; ctx.fillRect(ix, iy, iw, ih);
    for (let yy = 0; yy < ih; yy += 16) for (let xx = 0; xx < iw; xx += 16) if ((((xx / 16) | 0) + ((yy / 16) | 0)) % 2) { ctx.fillStyle = "#3f4556"; ctx.fillRect(ix + xx, iy + yy, 16, 16); }
    for (let xx = 0; xx < iw; xx += 14) { ctx.fillStyle = (((xx / 14) | 0) % 2) ? "#1c1a22" : "#ffce3c"; ctx.fillRect(ix + xx, iy, 14, 7); ctx.fillRect(ix + xx, iy + ih - 7, 14, 7); }
    fitDraw(hpBomb, r.x + r.w / 2 - 28, iy + ih * 0.22, 56, 56);
    ctx.restore();
    ctx.strokeStyle = "#ffce3c"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconSpace(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#10122e"; ctx.fillRect(ix, iy, iw, ih);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 4 ? "#cfe0ff" : "#5db4ff"; ctx.fillRect(ix + (i * 53 % iw), iy + (i * 37 % ih), 2, 2); }
    fitDraw(spMet, ix + 10, iy + 10, 40, 40);
    fitDraw(spMet, ix + iw - 44, iy + ih - 50, 34, 34);
    fitDraw(podIcon(), r.x + r.w / 2 - 30, iy + ih - 70, 60, 70);
    ctx.restore();
    ctx.strokeStyle = "#7aa7ff"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconTank(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#34322b"; ctx.fillRect(ix, iy, iw, ih);
    for (let i = 0; i < 7; i++) fitDraw(i % 3 === 0 ? tkSteel : tkBrick, ix + 6 + (i * 41 % (iw - 26)), iy + 8 + (i * 53 % (ih - 30)), 24, 24);
    fitDraw(tkTank, r.x + r.w / 2 - 23, iy + ih - 48, 46, 46);
    ctx.restore();
    ctx.strokeStyle = "#8a8f9e"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconVolley(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#76c4ec"; ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = "#fff7ce"; ctx.beginPath(); ctx.arc(ix + iw - 20, iy + 18, 10, 0, 7); ctx.fill();
    const zc = ["#ff5d5d", "#5db4ff", "#6bd66b"], zw = iw / 3;
    for (let i = 0; i < 3; i++) { ctx.fillStyle = zc[i]; ctx.fillRect(ix + i * zw + 1, iy + ih - 22, zw - 2, 22); }
    ctx.fillStyle = "#4074d0"; for (let i = 1; i < 3; i++) ctx.fillRect(ix + i * zw - 1, iy + ih - 46, 3, 24);
    fitDraw(ballS, ix + iw / 2 - 16, iy + ih * 0.28, 32, 32);
    ctx.restore();
    ctx.strokeStyle = "#e0cc9c"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconRLGL(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#96cee8"; ctx.fillRect(ix, iy, iw, ih * 0.32);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? "#98744a" : "#b08a5c"; ctx.fillRect(ix, iy + ih * 0.32 + k * (ih * 0.227), iw, ih * 0.227); ctx.fillStyle = "#68502f"; ctx.fillRect(ix, iy + ih * 0.32 + (k + 1) * (ih * 0.227) - 1, iw, 2); }
    for (let y = iy; y < iy + ih; y += 8) { ctx.fillStyle = ((y / 8 | 0) % 2) ? "#15121f" : "#f4f4ee"; ctx.fillRect(ix + iw - 8, y, 4, 8); }   // finish
    fitDraw(rlCatch, ix + iw - 40, iy + ih / 2 - 22, 30, 44);
    fitDraw(spr[p1name], ix + 8, iy + ih - 36, 26, 34);
    fitDraw(rlLampR, ix + 4, iy + 2, 10, 24);
    ctx.restore();
    ctx.strokeStyle = "#ff8a8a"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function iconTraffic(r) {
    const ix = r.x + 12, iy = r.y + 12, iw = r.w - 24, ih = r.h - 56;
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    ctx.fillStyle = "#606068"; ctx.fillRect(ix, iy, iw, 14);                 // stone wall band
    ctx.fillStyle = "#3a3a40"; ctx.fillRect(ix, iy + 14, iw, ih - 28);       // asphalt
    ctx.fillStyle = "#b6b6bc";                                               // dashed lane lines
    for (let ly = iy + 14 + 18; ly < iy + ih - 16; ly += 18) for (let x = ix; x < ix + iw; x += 16) ctx.fillRect(x, ly - 1, 8, 2);
    ctx.fillStyle = "#4a9646"; ctx.fillRect(ix, iy + ih - 14, iw, 14);       // grass start strip
    fitDraw(trCar, ix + 6, iy + 20, 46, 20);
    fitDraw(flip(trCar2), ix + iw - 52, iy + 48, 46, 20);
    fitDraw(trCoin, ix + iw - 34, iy + 22, 20, 20);
    fitDraw(spr[p1name], ix + iw / 2 - 14, iy + ih - 46, 28, 36);
    ctx.restore();
    ctx.strokeStyle = "#e6d074"; ctx.lineWidth = 3; ctx.strokeRect(ix, iy, iw, ih);
  }
  function tile(i, t) {
    const r = cell(i), g = GAMES[i];
    if (g) {
      ctx.fillStyle = "#272138"; rr(r.x, r.y, r.w, r.h, 12); ctx.fill();
      const ic = { football: iconFootball, flappy: iconFlappy, graveyard: iconGraveyard, runner: iconRunner, crown: iconCrown, tileblitz: iconTileBlitz, hotpotato: iconHotPotato, space: iconSpace, tank: iconTank, volley: iconVolley, rlgl: iconRLGL, traffic: iconTraffic }[g.icon] || iconGraveyard;
      ic(r);
      ctx.fillStyle = "#15121f"; rr(r.x + 8, r.y + r.h - 34, r.w - 16, 24, 7); ctx.fill();
      const ns = Math.min(2, (r.w - 18) / tW(g.name, 1));      // auto-fit long names to the narrower tiles
      tc(g.name, r.x + r.w / 2, r.y + r.h - 24 - 5 * ns, ns, g.accent);
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
    const cellW = (W - 80) / count;                 // one slot per active player
    for (let i = 0; i < count; i++) {
      const cx = 40 + i * cellW;
      const tagW = tW("P" + (i + 1), 2), nameW = tW(names[i], 2), textW = Math.max(tagW, nameW);
      const blockW = 46 + 8 + textW, sx = cx + (cellW - blockW) / 2;   // centre the portrait+text block
      fitDraw(spr[names[i]], sx, y + 8, 46, 58);
      const tx = sx + 54;
      text("P" + (i + 1), tx, y + 16, 2, PCOL[i]);
      text(names[i], tx, y + 38, 2, "#f4f4ee");
      if (i) { ctx.fillStyle = "#332b48"; ctx.fillRect(cx, y + 14, 2, 60); }  // divider
    }
    tc("P1 CHOOSES  -  MOVE  WASD      PICK  SPACE      BACK  BACKSPACE", W / 2, y + 80, 1.6 | 0, DIM);
  }

  function frame(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = "#1e1930"; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = P2C; ctx.fillRect(0, 0, W, 6); ctx.fillStyle = P1C; ctx.fillRect(0, H - 6, W, 6);

    ts("CHOOSE A GAME", W / 2 - tW("CHOOSE A GAME", 5) / 2, 30, 5, GOLD);
    tc("8-BIT PARTY  *  PICK A MINIGAME", W / 2, 78, 2, DIM);

    for (let i = 0; i < COLS * ROWS; i++) tile(i, t);
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
