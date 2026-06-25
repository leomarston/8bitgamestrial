/* 8-BIT PARTY — Mortal-Kombat-style couch character select.
 * Two players, two flashing cursors over a 4x2 grid, lock-in to ready up.
 * Mirror picks allowed (both players may choose the same fighter).
 */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // ---- colors ----
  const BG = "#1a1626", PANEL = "#272138", PANEL2 = "#201b30";
  const INK = "#f4f4ee", DIM = "#9a9cb2", GOLD = "#ffd54a";
  const P1C = "#ff5d5d", P2C = "#5db4ff";

  // ---- pre-render each fighter sprite to its own tiny canvas ----
  const sprites = D.roster.map(ch => {
    const rows = ch.rows;
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const col = D.palette[row[x]];
        if (!col) continue;
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    }
    return { canvas: c, w, h };
  });

  // ---- pixel font ----
  const FONT = D.font;
  function textWidth(s, sc, sp = 1) { return (s.length * (5 + sp) - sp) * sc; }
  function drawText(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase();
    ctx.fillStyle = color;
    let cx = x;
    for (const chr of s) {
      const g = FONT[chr] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) {
        const row = g[ry];
        for (let rx = 0; rx < row.length; rx++)
          if (row[rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      }
      cx += (5 + sp) * sc;
    }
  }
  function textCentered(s, cx, y, sc, color, sp = 1) {
    drawText(s, Math.round(cx - textWidth(s, sc, sp) / 2), y, sc, color, sp);
  }
  function textShadow(s, x, y, sc, color, sp = 1) {
    drawText(s, x + sc, y + sc, sc, "#15121f", sp);
    drawText(s, x, y, sc, color, sp);
  }

  // ---- grid layout ----
  const COLS = 4, ROWS = 2;
  const CW = 150, CH = 170, GX = 16, GY = 16;
  const GRIDW = COLS * CW + (COLS - 1) * GX;
  const GX0 = Math.round((W - GRIDW) / 2), GY0 = 96;
  function cellRect(i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    return { x: GX0 + col * (CW + GX), y: GY0 + row * (CH + GY), w: CW, h: CH };
  }

  // ---- state ----
  const state = {
    p1: { idx: 0, locked: false, color: P1C, name: "PLAYER 1" },
    p2: { idx: 3, locked: false, color: P2C, name: "PLAYER 2" },
  };

  function move(p, dx, dy) {
    if (p.locked) { p.locked = false; return; }   // moving cancels a lock
    let col = p.idx % COLS, row = Math.floor(p.idx / COLS);
    col = (col + dx + COLS) % COLS;
    row = (row + dy + ROWS) % ROWS;
    p.idx = row * COLS + col;
  }

  // ---- input ----
  const KEYMAP = {
    KeyW: ["p1", "up"], KeyS: ["p1", "down"], KeyA: ["p1", "left"], KeyD: ["p1", "right"],
    Space: ["p1", "ok"], KeyF: ["p1", "ok"],
    ArrowUp: ["p2", "up"], ArrowDown: ["p2", "down"], ArrowLeft: ["p2", "left"],
    ArrowRight: ["p2", "right"], Enter: ["p2", "ok"], Numpad0: ["p2", "ok"],
  };
  window.addEventListener("keydown", (e) => {
    if (e.code === "Backspace") { e.preventDefault(); state.p1.locked = state.p2.locked = false; return; }
    if (state.p1.locked && state.p2.locked) {
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        localStorage.setItem("partyPicks", JSON.stringify({
          p1: D.roster[state.p1.idx].name, p2: D.roster[state.p2.idx].name }));
        location.href = "football.html";
      }
      return;
    }
    const m = KEYMAP[e.code];
    if (!m) return;
    e.preventDefault();
    const [pk, act] = m, p = state[pk];
    if (act === "ok") { if (!e.repeat) p.locked = true; return; }
    if (act === "up") move(p, 0, -1);
    if (act === "down") move(p, 0, 1);
    if (act === "left") move(p, -1, 0);
    if (act === "right") move(p, 1, 0);
  });

  // ---- drawing helpers ----
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function drawSpriteInto(s, rx, ry, rw, rh) {
    const scale = Math.min(rw / s.w, rh / s.h);
    const dw = Math.round(s.w * scale), dh = Math.round(s.h * scale);
    ctx.drawImage(s.canvas, Math.round(rx + (rw - dw) / 2), Math.round(ry + (rh - dh)), dw, dh);
  }

  function drawCell(i, t) {
    const r = cellRect(i), ch = D.roster[i], s = sprites[i];
    // base tile
    ctx.fillStyle = PANEL2;
    rrect(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = "#3a3352"; ctx.lineWidth = 2;
    rrect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 9); ctx.stroke();
    // floor shadow
    ctx.fillStyle = "rgba(15,12,24,.45)";
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h - 40, 42, 8, 0, 0, Math.PI * 2); ctx.fill();
    // sprite
    drawSpriteInto(s, r.x + 12, r.y + 12, r.w - 24, r.h - 56);
    // name strip
    ctx.fillStyle = "#15121f";
    rrect(r.x + 10, r.y + r.h - 34, r.w - 20, 24, 6); ctx.fill();
    textCentered(ch.name, r.x + r.w / 2, r.y + r.h - 29, 2, ch.accent);
  }

  function drawCursor(p, t, inset, label) {
    const r = cellRect(p.idx);
    const pulse = p.locked ? 1 : 0.55 + 0.45 * Math.sin(t / 140);
    ctx.save();
    ctx.globalAlpha = p.locked ? 1 : 0.5 + 0.5 * pulse;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.locked ? 6 : 4;
    rrect(r.x - 2 + inset, r.y - 2 + inset, r.w + 4 - inset * 2, r.h + 4 - inset * 2, 12);
    ctx.stroke();
    ctx.restore();
    // player tag — left corner for P1, right corner for P2
    const tagW = 34, tagH = 18;
    const tx = label === "P1" ? r.x - 4 : r.x + r.w - tagW + 4;
    ctx.fillStyle = p.color;
    rrect(tx, r.y - 12, tagW, tagH, 5); ctx.fill();
    drawText(label, tx + 6, r.y - 8, 2, "#15121f");
    if (p.locked) {
      ctx.fillStyle = p.color;
      rrect(r.x + r.w / 2 - 30, r.y + 4, 60, 16, 5); ctx.fill();
      textCentered("READY", r.x + r.w / 2, r.y + 7, 2, "#15121f");
    }
  }

  function drawPanel(p, px, py, pw, ph, align) {
    const ch = D.roster[p.idx];
    ctx.fillStyle = PANEL;
    rrect(px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = p.color; ctx.lineWidth = 3;
    rrect(px + 1.5, py + 1.5, pw - 3, ph - 3, 11); ctx.stroke();
    // header
    drawText(p.name, px + 16, py + 14, 2, p.color);
    drawText(p.locked ? "LOCKED IN" : "CHOOSING...", px + 16, py + 36, 1.6 | 0,
             p.locked ? GOLD : DIM);
    // big name
    textShadow(ch.name, px + 16, py + 58, 4, ch.accent);
    // controls
    const keys = p === state.p1 ? "MOVE WASD   PICK SPACE" : "MOVE ARROWS   PICK ENTER";
    drawText(keys, px + 16, py + ph - 22, 1.4 | 0, DIM);
  }

  function drawReadyCard(p, label, cx) {
    const ch = D.roster[p.idx], s = sprites[p.idx];
    const cw = 300, chh = 380, x = cx - cw / 2, y = 150;
    ctx.fillStyle = PANEL; rrect(x, y, cw, chh, 14); ctx.fill();
    ctx.strokeStyle = p.color; ctx.lineWidth = 4; rrect(x + 2, y + 2, cw - 4, chh - 4, 12); ctx.stroke();
    ctx.fillStyle = p.color; rrect(x + 18, y + 16, cw - 36, 34, 8); ctx.fill();
    textCentered(label + " READY", cx, y + 25, 2, "#15121f");
    ctx.fillStyle = "rgba(15,12,24,.45)";
    ctx.beginPath(); ctx.ellipse(cx, y + 290, 90, 12, 0, 0, Math.PI * 2); ctx.fill();
    drawSpriteInto(s, x + 50, y + 60, cw - 100, 240);
    textCentered(ch.name, cx, y + chh - 56, 4, ch.accent);
  }

  function drawReadyScreen(t) {
    textShadow("BOTH FIGHTERS READY!", W / 2 - textWidth("BOTH FIGHTERS READY!", 5) / 2, 60, 5, GOLD);
    drawReadyCard(state.p1, "P1", W / 2 - 200);
    drawReadyCard(state.p2, "P2", W / 2 + 200);
    // VS badge in the middle
    const cy = 340;
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(W / 2, cy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#15121f"; ctx.lineWidth = 5; ctx.stroke();
    textCentered("VS", W / 2, cy - 18, 5, "#15121f");
    textCentered("SPACE / ENTER  =  KICK OFF", W / 2, H - 58, 2, GOLD);
    textCentered("BACKSPACE  =  RESELECT", W / 2, H - 30, 2, DIM);
  }

  // ---- main loop ----
  function frame(t) {
    // background
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = "#1e1930"; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = P2C; ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = P1C; ctx.fillRect(0, H - 6, W, 6);

    if (state.p1.locked && state.p2.locked) {
      drawReadyScreen(t);
      requestAnimationFrame(frame);
      return;
    }

    // title
    textShadow("CHOOSE YOUR FIGHTER", W / 2 - textWidth("CHOOSE YOUR FIGHTER", 5) / 2, 24, 5, GOLD);
    textCentered("8-BIT PARTY  *  4-BIT BUILD  *  LOCAL COUCH CO-OP", W / 2, 70, 2, DIM);

    // grid
    for (let i = 0; i < D.roster.length; i++) drawCell(i, t);

    // cursors (when both hover the same cell, P2 nests inside so both stay visible)
    const same = state.p1.idx === state.p2.idx;
    drawCursor(state.p2, t, same ? 7 : 0, "P2");
    drawCursor(state.p1, t, 0, "P1");

    // info panels
    drawPanel(state.p1, 20, 470, 460, 150, "left");
    drawPanel(state.p2, 500, 470, 460, 150, "right");

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
