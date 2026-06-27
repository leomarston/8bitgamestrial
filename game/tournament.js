/* 8-BIT PARTY — THE 8-BIT CUP (tournament controller).
 * Plays RANDOM minigames back-to-back. Each round's winner earns a star; the
 * standings show between rounds with a star-earned POP + chime, and the winner of
 * the round is announced. FIRST TO 5 WINS triggers a champion fanfare + trophy.
 * This page applies the last round's result, shows the board, picks the next
 * random game and launches it (each game reports back via cuphook.js). */
(() => {
  const D = window.GAME_DATA, CU = D.cup;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height, FONT = D.font;

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

  const GOLD = "#ffd54a", GOLDL = "#ffe896", DIM = "#cfc6e6";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const trophy = build(CU.trophy, CU.pal);

  // ---- audio: synthesised "star earned" chime + champion fanfare (no asset) ----
  let actx = null; window.__cupfx = { ding: 0, fanfare: 0 };
  function ac() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (actx.state === "suspended") actx.resume().catch(() => {}); return actx; }
  function tone(freq, start, dur, vol, type) {
    try { if (localStorage.getItem("sfxOff") === "1") return; } catch (e) {}
    const c = ac(); if (!c) return; const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function ding() { tone(880, 0, 0.12, 0.22); tone(1318, 0.07, 0.2, 0.22); window.__cupfx.ding++; }                 // a star earned
  function fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.22, 0.26)); tone(1046, 0.55, 0.6, 0.3); tone(1568, 0.55, 0.6, 0.22); window.__cupfx.fanfare++; }   // champion!
  addEventListener("keydown", ac); addEventListener("pointerdown", ac);

  // ---- party ----
  let count = 2; try { const c = +localStorage.getItem("partyCount"); if (c >= 2 && c <= 4) count = c; } catch (e) {}
  let picks = { p1: "PIXEL", p2: "BYTE", p3: "NOVA", p4: "CHIP" };
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s) picks = Object.assign(picks, s); } catch (e) {}
  const NAMES = [picks.p1, picks.p2, picks.p3, picks.p4].map(n => (D.roster.find(r => r.name === n) ? n : "PIXEL"));
  const SPR = NAMES.map(n => build(D.roster.find(r => r.name === n).rows, D.palette));

  // ---- the pool of real minigames (matches the hub, minus the cup) ----
  const POOL = [
    { name: "FOOTBALL", file: "football.html" }, { name: "FLAPPY", file: "flappy.html" },
    { name: "GRAVEYARD", file: "graveyard.html" }, { name: "RUNNER", file: "platformer.html" },
    { name: "CROWN GRAB", file: "crown.html" }, { name: "TILE BLITZ", file: "tileblitz.html" },
    { name: "HOT POTATO", file: "hotpotato.html" }, { name: "METEOR DERBY", file: "space.html" },
    { name: "TANK DUEL", file: "tank.html" }, { name: "SLIME VOLLEY", file: "volley.html" },
    { name: "RED LIGHT", file: "rlgl.html" }, { name: "TRAFFIC RUN", file: "traffic.html" },
    { name: "SHIP DASH", file: "ship.html" },
  ];
  const TARGET = 5, AUTO_DELAY = 3.6;   // standings auto-rolls into the next game (no button)

  // ---- cup state: init fresh from the hub, or apply the round we just returned from ----
  function load() { try { return JSON.parse(localStorage.getItem("cup")); } catch (e) { return null; } }
  function save(c) { try { localStorage.setItem("cup", JSON.stringify(c)); } catch (e) {} }
  let cup = load() || {};
  let lastDraw = false, lastWinner = -1;
  if (cup.fresh || !cup.wins) {
    cup = { active: true, count, wins: [0, 0, 0, 0], target: TARGET, lastGame: null, pendingResult: false };
  } else if (cup.pendingResult) {
    lastWinner = (typeof cup.lastWinner === "number") ? cup.lastWinner : -1;
    if (lastWinner >= 0 && lastWinner < count) cup.wins[lastWinner]++; else lastDraw = true;
    cup.pendingResult = false;
  }
  cup.active = true; cup.count = count; cup.target = TARGET;
  save(cup);

  const top = Math.max(...cup.wins.slice(0, count));
  const champ = top >= TARGET ? cup.wins.slice(0, count).indexOf(top) : -1;
  const celebrate = champ < 0 && lastWinner >= 0;         // a star was just earned

  // pick the next game (avoid an immediate repeat)
  let nextGame = null;
  if (champ < 0) {
    const opts = POOL.filter(g => g.file !== cup.lastGame);
    nextGame = (opts.length ? opts : POOL)[Math.floor(Math.random() * (opts.length ? opts.length : POOL.length))];
  }

  // ---- input ----
  let advancing = false;
  function startNext() { if (advancing || !nextGame) return; advancing = true; cup.lastGame = nextGame.file; cup.pendingResult = false; cup.fresh = false; save(cup); location.href = nextGame.file; }
  function newCup() { save({ active: true, fresh: true }); location.reload(); }
  function quit() { cup.active = false; save(cup); location.href = "gameselect.html"; }
  window.addEventListener("keydown", e => {
    if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (champ >= 0 && ["Enter", "Space", "KeyR"].includes(e.code)) newCup();   // champion: start a fresh cup
    // (between rounds the cup auto-advances — no start button)
  });

  // ---- rendering ----
  function star(cx, cy, r, fill, outline) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function pip(cx, cy, filled, scale) {
    scale = scale || 1;
    if (filled) { star(cx, cy, 12 * scale, GOLD, CU.out); star(cx, cy - scale, 4.5 * scale, "#fff8e0"); }
    else { ctx.fillStyle = "rgba(40,36,54,.9)"; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill(); ctx.strokeStyle = "#5a5570"; ctx.lineWidth = 2; ctx.stroke(); star(cx, cy, 7, "#3e3a52"); }
  }
  function drawSprite(s, cx, feetY, scl) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); }
  const easeOutBack = p => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  function stageBG(glow) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2e2248"); g.addColorStop(1, "#1c142e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (glow) { ctx.save(); ctx.globalAlpha = 0.10; for (let r = glow.r; r > 16; r -= 16) { ctx.fillStyle = "#ffdc78"; ctx.beginPath(); ctx.arc(glow.x, glow.y, r, 0, 7); ctx.fill(); } ctx.restore(); }
    ctx.fillStyle = "#191130"; ctx.fillRect(0, H - 90, W, 90); ctx.fillStyle = "#3a2f5e"; ctx.fillRect(0, H - 90, W, 3);
    for (let x = 0; x < W; x += 64) { ctx.fillStyle = "#241a40"; ctx.fillRect(x, H - 88, 30, 88); }
  }

  function drawStandings(el) {
    stageBG();
    drawSprite(trophy, 92, 116, 1.7);
    tc("8-BIT CUP", W / 2, 26, 6, GOLD);
    if (celebrate) tc(NAMES[lastWinner] + " WINS THE ROUND!  +1", W / 2, 84, 2, GOLDL);
    else if (lastDraw) tc("ROUND DRAWN  -  NO POINT", W / 2, 84, 2, "#ff9a9a");
    else tc("FIRST TO " + TARGET + " WINS", W / 2, 84, 2, DIM);

    const order = [...Array(count).keys()].sort((a, b) => cup.wins[b] - cup.wins[a]);
    const areaTop = 140, areaBot = H - 96, rowH = Math.min(108, (areaBot - areaTop) / count), pad = 8;
    order.forEach((i, slot) => {
      const y = areaTop + slot * rowH, h = rowH - pad;
      ctx.fillStyle = "rgba(20,16,34,.92)"; ctx.fillRect(40, y, W - 80, h);
      ctx.strokeStyle = PCOL[i]; ctx.lineWidth = 3; ctx.strokeRect(41, y + 1, W - 82, h - 2);
      drawSprite(SPR[i], 84, y + h - 8, Math.min(2.4, (h - 14) / SPR[i].h));
      const lead = slot === 0 && cup.wins[i] > 0;
      text("P" + (i + 1) + " " + NAMES[i], 124, y + 12, 3, PCOL[i]);
      text(cup.wins[i] + "/" + TARGET + (lead ? "   LEADER" : ""), 124, y + 40, 2, lead ? GOLD : DIM);
      const newIdx = (celebrate && i === lastWinner) ? cup.wins[i] - 1 : -1;          // the star just earned
      for (let k = 0; k < TARGET; k++) {
        const px = W - 96 - (TARGET - 1 - k) * 40, py = y + h / 2;
        let sc = 1;
        if (k === newIdx) { const p = Math.min(1, el / 0.5); sc = el < 0.5 ? Math.max(0.05, easeOutBack(p)) : 1; }
        pip(px, py, k < cup.wins[i], sc);
        if (k === newIdx && el < 0.55) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - el / 0.55); const rr = 10 + el * 70; for (let s = 0; s < 6; s++) { const a = s / 6 * 7; ctx.fillStyle = "#fff8d0"; ctx.fillRect((px + Math.cos(a) * rr) | 0, (py + Math.sin(a) * rr) | 0, 3, 3); } ctx.restore(); }
      }
    });
    ctx.fillStyle = "#15101f"; ctx.fillRect(0, H - 70, W, 70); ctx.fillStyle = GOLD; ctx.fillRect(0, H - 70, W, 3);
    tc("NEXT GAME:  " + (nextGame ? nextGame.name : "-"), W / 2, H - 58, 3, GOLDL);
    const prog = Math.max(0, Math.min(1, el / AUTO_DELAY)), bw2 = 420, bx2 = (W - bw2) / 2, by2 = H - 28;   // auto-launch countdown bar
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(bx2, by2, bw2, 9);
    ctx.fillStyle = GOLD; ctx.fillRect(bx2, by2, bw2 * prog, 9);
    tc("ESC = PAUSE", W / 2, H - 14, 1, DIM);
  }

  let confetti = null;
  function drawChampion(el) {
    stageBG({ x: W / 2, y: 230, r: 230 });
    if (!confetti) { confetti = []; for (let i = 0; i < 90; i++) confetti.push({ x: Math.random() * W, y: Math.random() * H, vy: 40 + Math.random() * 80, c: PCOL[(Math.random() * 4) | 0], ph: Math.random() * 7 }); }
    for (const f of confetti) { f.y += f.vy * 0.016; f.x += Math.sin(el * 3 + f.ph) * 0.6; if (f.y > H) { f.y = -6; f.x = Math.random() * W; } ctx.fillStyle = f.c; ctx.fillRect(f.x | 0, f.y | 0, 5, 7); }
    tc("CHAMPION!", W / 2, 36, 6, GOLD);
    const pop = el < 0.7 ? Math.max(0.15, easeOutBack(el / 0.7)) : 1;                   // trophy springs in
    drawSprite(trophy, W / 2, 360, 4.4 * pop);
    drawSprite(SPR[champ], 360, H - 40, 2.0);
    text("P" + (champ + 1) + "  " + NAMES[champ], 430, H - 64, 4, PCOL[champ]);
    text("WINS THE 8-BIT CUP", 430, H - 30, 2, DIM);
    tc("ENTER = NEW CUP      ESC = MENU", W / 2, H - 122, 2, DIM);
  }

  // ---- loop ----
  let t0 = -1, soundDone = false;
  function frame(t) {
    if (t0 < 0) t0 = t; const el = (t - t0) / 1000;
    if (!soundDone) { soundDone = true; if (champ >= 0) fanfare(); else if (celebrate) ding(); }
    if (champ >= 0) drawChampion(el);
    else { drawStandings(el); if (el >= AUTO_DELAY) startNext(); }   // auto-roll into the next game
    requestAnimationFrame(frame);
  }
  window.__cup = { phase: champ >= 0 ? "champion" : "standings", count, wins: cup.wins.slice(0, count), next: nextGame ? nextGame.file : null, lastWinner, lastDraw, celebrate, champion: champ >= 0 ? "P" + (champ + 1) : null };
  requestAnimationFrame(frame);
})();
