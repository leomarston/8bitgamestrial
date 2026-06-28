/* 8-BIT PARTY — couch character select for 2–4 players.
 * Pick the player count with number keys 2/3/4, then each player drives their own
 * cursor over the 4x2 roster and locks in. Mirror picks allowed. Saves the count
 * and every pick to localStorage, then heads to the game select.
 */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  const BG = "#1a1626", PANEL = "#272138", PANEL2 = "#201b30";
  const INK = "#f4f4ee", DIM = "#9a9cb2", GOLD = "#ffd54a";

  // per-player config: colour, controls, and a short control hint
  const PCONF = [
    { tag: "P1", color: "#ff5d5d", keys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }, ok: ["Space"], ctl: "WASD / SPACE", def: 0 },
    { tag: "P2", color: "#5db4ff", keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, ok: ["Enter", "Numpad0"], ctl: "ARROWS / ENTER", def: 3 },
    { tag: "P3", color: "#6bd66b", keys: { up: "KeyI", down: "KeyK", left: "KeyJ", right: "KeyL" }, ok: ["KeyO", "KeyU"], ctl: "IJKL / O", def: 4 },
    { tag: "P4", color: "#ffd54a", keys: { up: "KeyT", down: "KeyG", left: "KeyF", right: "KeyH" }, ok: ["KeyR", "KeyY"], ctl: "TFGH / R", def: 7 },
  ];
  let count = 2;
  try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  const players = PCONF.map(c => ({ tag: c.tag, color: c.color, keys: c.keys, ok: c.ok, ctl: c.ctl, idx: c.def, locked: false }));
  const act = () => players.slice(0, count);

  // ---- sprites + font ----
  const sprites = D.roster.map(ch => {
    const rows = ch.rows, w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) { const col = D.palette[rows[y][x]]; if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return { canvas: c, w, h };
  });
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const chr of s) { const g = FONT[chr] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const ts = (s, x, y, sc, c, sp = 1) => { text(s, x + sc, y + sc, sc, "#15121f", sp); text(s, x, y, sc, c, sp); };

  // ---- grid ----
  const COLS = 4, ROWS = 2, CW = 150, CH = 168, GX = 16, GY = 16;
  const GRIDW = COLS * CW + (COLS - 1) * GX, GX0 = Math.round((W - GRIDW) / 2), GY0 = 92;
  function cellRect(i) { const c = i % COLS, r = (i / COLS) | 0; return { x: GX0 + c * (CW + GX), y: GY0 + r * (CH + GY), w: CW, h: CH }; }

  let readyAt = 0; const START_DELAY = 1400;
  function move(p, dx, dy) {
    if (p.locked) { p.locked = false; return; }
    let c = p.idx % COLS, r = (p.idx / COLS) | 0;
    c = (c + dx + COLS) % COLS; r = (r + dy + ROWS) % ROWS; p.idx = r * COLS + c;
  }

  // ---- input ----
  window.addEventListener("keydown", e => {
    if (e.code === "Escape") { e.preventDefault(); location.href = "index.html"; return; }   // back to main menu
    if (e.code === "Backspace") { e.preventDefault(); players.forEach(p => p.locked = false); return; }
    if (["Digit2", "Digit3", "Digit4", "Numpad2", "Numpad3", "Numpad4"].includes(e.code)) {
      if (!act().every(p => p.locked)) { count = +e.code.slice(-1); players.forEach(p => p.locked = false); }
      e.preventDefault(); return;
    }
    if (act().every(p => p.locked)) return;     // ready; only reselect/back
    for (let i = 0; i < count; i++) {
      const p = players[i];
      if (e.code === p.keys.up) { e.preventDefault(); return move(p, 0, -1); }
      if (e.code === p.keys.down) { e.preventDefault(); return move(p, 0, 1); }
      if (e.code === p.keys.left) { e.preventDefault(); return move(p, -1, 0); }
      if (e.code === p.keys.right) { e.preventDefault(); return move(p, 1, 0); }
      if (p.ok.includes(e.code)) { e.preventDefault(); if (!e.repeat) p.locked = true; return; }
    }
  });

  // ---- drawing ----
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function spriteInto(s, rx, ry, rw, rh) { const sc = Math.min(rw / s.w, rh / s.h), dw = Math.round(s.w * sc), dh = Math.round(s.h * sc); ctx.drawImage(s.canvas, Math.round(rx + (rw - dw) / 2), Math.round(ry + (rh - dh)), dw, dh); }

  function drawCell(i) {
    const r = cellRect(i), ch = D.roster[i], s = sprites[i];
    ctx.fillStyle = PANEL2; rr(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = "#3a3352"; ctx.lineWidth = 2; rr(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 9); ctx.stroke();
    ctx.fillStyle = "rgba(15,12,24,.45)"; ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h - 40, 42, 8, 0, 0, 7); ctx.fill();
    spriteInto(s, r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    ctx.fillStyle = "#15121f"; rr(r.x + 10, r.y + r.h - 34, r.w - 20, 24, 6); ctx.fill();
    tc(ch.name, r.x + r.w / 2, r.y + r.h - 29, 2, ch.accent);
  }
  function drawCursor(p, t, inset) {
    const r = cellRect(p.idx), pulse = p.locked ? 1 : 0.55 + 0.45 * Math.sin(t / 140);
    ctx.save(); ctx.globalAlpha = p.locked ? 1 : 0.5 + 0.5 * pulse; ctx.strokeStyle = p.color; ctx.lineWidth = p.locked ? 6 : 4;
    rr(r.x - 2 + inset, r.y - 2 + inset, r.w + 4 - inset * 2, r.h + 4 - inset * 2, 12); ctx.stroke(); ctx.restore();
    const tagW = 30, tx = r.x - 4 + inset; ctx.fillStyle = p.color; rr(tx, r.y - 12 + inset, tagW, 18, 5); ctx.fill();
    text(p.tag, tx + 5, r.y - 8 + inset, 2, "#15121f");
    if (p.locked) { ctx.fillStyle = p.color; rr(r.x + r.w / 2 - 28, r.y + 4, 56, 15, 5); ctx.fill(); tc("READY", r.x + r.w / 2, r.y + 6, 1.6 | 0, "#15121f"); }
  }
  function drawPanel(p, x, y, w, h) {
    const ch = D.roster[p.idx];
    ctx.fillStyle = PANEL; rr(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = p.color; ctx.lineWidth = 3; rr(x + 1.5, y + 1.5, w - 3, h - 3, 9); ctx.stroke();
    text(p.tag, x + 12, y + 10, 2, p.color);
    text(p.locked ? "LOCKED" : "PICKING", x + 12, y + 28, 1, p.locked ? GOLD : DIM);
    ts(ch.name, x + 12, y + 44, 2.4 | 0, ch.accent);
    text(p.ctl, x + 12, y + h - 16, 1, DIM);
  }

  function frame(t) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = "#1e1930"; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = "#5db4ff"; ctx.fillRect(0, 0, W, 6); ctx.fillStyle = "#ff5d5d"; ctx.fillRect(0, H - 6, W, 6);

    const allLocked = act().every(p => p.locked);
    if (allLocked) {
      if (!readyAt) readyAt = t;
      ts("FIGHTERS READY!", W / 2 - tW("FIGHTERS READY!", 5) / 2, 60, 5, GOLD);
      const n = count, cw = Math.min(300, (W - 60) / n - 16), gap = ((W - 60) - cw * n) / (n - 1 || 1);
      let x = 30;
      for (const p of act()) {
        const ch = D.roster[p.idx], s = sprites[p.idx], y = 170, chh = 360;
        ctx.fillStyle = PANEL; rr(x, y, cw, chh, 12); ctx.fill();
        ctx.strokeStyle = p.color; ctx.lineWidth = 4; rr(x + 2, y + 2, cw - 4, chh - 4, 10); ctx.stroke();
        ctx.fillStyle = p.color; rr(x + 14, y + 14, cw - 28, 28, 7); ctx.fill(); tc(p.tag + " READY", x + cw / 2, y + 20, 1.8 | 0, "#15121f");
        spriteInto(s, x + 24, y + 54, cw - 48, chh - 130); tc(ch.name, x + cw / 2, y + chh - 50, 3, ch.accent);
        x += cw + gap;
      }
      const left = Math.max(0, Math.ceil((START_DELAY - (t - readyAt)) / 1000));
      tc("CHOOSING GAME IN " + left + "...", W / 2, H - 54, 2, GOLD);
      tc("BACKSPACE = RESELECT", W / 2, H - 28, 2, DIM);
      if (t - readyAt > START_DELAY) {
        const picks = {}; players.forEach((p, i) => picks["p" + (i + 1)] = D.roster[p.idx].name);
        localStorage.setItem("partyCount", String(count));
        localStorage.setItem("partyPicks", JSON.stringify(picks));
        location.href = "gameselect.html"; return;
      }
      requestAnimationFrame(frame); return;
    }
    readyAt = 0;

    ts("CHOOSE YOUR FIGHTER", W / 2 - tW("CHOOSE YOUR FIGHTER", 4) / 2, 16, 4, GOLD);
    // player-count selector
    let lab = "PLAYERS:  "; tc(lab, W / 2 - 70, 62, 2, DIM);
    for (let n = 2; n <= 4; n++) { const bx = W / 2 - 6 + (n - 2) * 34; ctx.fillStyle = n === count ? GOLD : "#3a3352"; rr(bx, 58, 26, 20, 5); ctx.fill(); tc(String(n), bx + 13, 62, 2, n === count ? "#15121f" : DIM); }
    tc("(PRESS 2 / 3 / 4)", W / 2 + 130, 64, 1, DIM);
    tc("ESC = MAIN MENU", W / 2, H - 16, 1, DIM);

    for (let i = 0; i < D.roster.length; i++) drawCell(i);
    // cursors: nest by order when several share a cell
    for (let i = count - 1; i >= 0; i--) {
      const p = players[i]; let nest = 0;
      for (let j = 0; j < i; j++) if (players[j].idx === p.idx) nest++;
      drawCursor(p, t, nest * 6);
    }
    // bottom panels (one per active player)
    const n = count, pw = (W - 40 - (n - 1) * 12) / n;
    for (let i = 0; i < n; i++) drawPanel(players[i], 20 + i * (pw + 12), H - 132, pw, 110);

    window.__cs = { count, idx: players.map(p => p.idx), locked: players.map(p => p.locked) };
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
