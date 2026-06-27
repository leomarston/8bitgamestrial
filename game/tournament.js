/* 8-BIT PARTY — THE 8-BIT CUP (tournament controller).
 * Plays RANDOM minigames back-to-back. Each round's winner earns a point; the
 * standings show between rounds. FIRST TO 5 WINS lifts the cup. This page is the
 * hub of the loop: it applies the last round's result, shows the board, picks the
 * next random game, and launches it (each game reports back via cuphook.js). */
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

  const GOLD = "#ffd54a", GOLDL = "#ffe896", DIM = "#cfc6e6", INK = "#15121f";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const trophy = build(CU.trophy, CU.pal);

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
  const TARGET = 5;

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

  // champion?
  const top = Math.max(...cup.wins.slice(0, count));
  const champ = top >= TARGET ? cup.wins.slice(0, count).indexOf(top) : -1;

  // pick the next game (avoid an immediate repeat)
  let nextGame = null;
  if (champ < 0) {
    const opts = POOL.filter(g => g.file !== cup.lastGame);
    nextGame = (opts.length ? opts : POOL)[Math.floor(Math.random() * (opts.length ? opts.length : POOL.length))];
  }

  // ---- input ----
  let advancing = false;
  function startNext() {
    if (advancing || !nextGame) return; advancing = true;
    cup.lastGame = nextGame.file; cup.pendingResult = false; cup.fresh = false; save(cup);
    location.href = nextGame.file;
  }
  function newCup() { save({ active: true, fresh: true }); location.reload(); }
  function quit() { cup.active = false; save(cup); location.href = "gameselect.html"; }
  window.addEventListener("keydown", e => {
    if (["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { quit(); return; }
    if (champ >= 0) { if (["Enter", "Space", "KeyR"].includes(e.code)) newCup(); return; }
    startNext();                                   // any other key advances to the next game
  });

  // ---- rendering ----
  function star(cx, cy, r, fill, outline) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (outline) { ctx.strokeStyle = outline; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function pip(cx, cy, filled) {
    if (filled) { star(cx, cy, 12, GOLD, CU.out); star(cx, cy - 1, 4.5, "#fff8e0"); }
    else { ctx.fillStyle = "rgba(40,36,54,.9)"; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill(); ctx.strokeStyle = "#5a5570"; ctx.lineWidth = 2; ctx.stroke(); star(cx, cy, 7, "#3e3a52"); }
  }
  function drawSprite(s, cx, feetY, scl) { const w = Math.round(s.w * scl), h = Math.round(s.h * scl); ctx.drawImage(s.canvas, Math.round(cx - w / 2), Math.round(feetY - h), w, h); }

  function stageBG(glow) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2e2248"); g.addColorStop(1, "#1c142e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (glow) { ctx.save(); ctx.globalAlpha = 0.10; for (let r = glow.r; r > 16; r -= 16) { ctx.fillStyle = "#ffdc78"; ctx.beginPath(); ctx.arc(glow.x, glow.y, r, 0, 7); ctx.fill(); } ctx.restore(); }
    ctx.fillStyle = "#191130"; ctx.fillRect(0, H - 90, W, 90); ctx.fillStyle = "#3a2f5e"; ctx.fillRect(0, H - 90, W, 3);
    for (let x = 0; x < W; x += 64) { ctx.fillStyle = "#241a40"; ctx.fillRect(x, H - 88, 30, 88); }
  }

  let confetti = null;
  function frame(t) {
    if (champ >= 0) drawChampion(t); else drawStandings();
    requestAnimationFrame(frame);
  }

  function drawStandings() {
    stageBG();
    // header: small trophy + title
    drawSprite(trophy, 92, 116, 1.7);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0)";
    tc("8-BIT CUP", W / 2, 26, 6, GOLD); tc("FIRST TO " + TARGET + " WINS", W / 2, 84, 2, DIM); ctx.restore();
    // rows
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
      for (let k = 0; k < TARGET; k++) pip(W - 96 - (TARGET - 1 - k) * 40, y + h / 2, k < cup.wins[i]);
    });
    // bottom banner: next game + hint
    ctx.fillStyle = "#15101f"; ctx.fillRect(0, H - 70, W, 70); ctx.fillStyle = GOLD; ctx.fillRect(0, H - 70, W, 3);
    if (lastDraw) tc("LAST ROUND WAS A DRAW — NO POINT", W / 2, H - 64, 1.6 | 0, "#ff9a9a");
    tc("NEXT GAME:  " + (nextGame ? nextGame.name : "-"), W / 2, H - 50, 3, GOLDL);
    tc("PRESS ANY KEY = START      BACKSPACE = QUIT CUP", W / 2, H - 18, 2, DIM);
  }

  function drawChampion(t) {
    stageBG({ x: W / 2, y: 230, r: 230 });
    if (!confetti) { confetti = []; for (let i = 0; i < 90; i++) confetti.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 80, c: PCOL[(Math.random() * 4) | 0], ph: Math.random() * 7 }); }
    for (const f of confetti) { f.y += f.vy * 0.016; f.x += Math.sin(t / 300 + f.ph) * 0.6; if (f.y > H) { f.y = -6; f.x = Math.random() * W; } ctx.fillStyle = f.c; ctx.fillRect(f.x | 0, f.y | 0, 5, 7); }
    tc("CHAMPION!", W / 2, 36, 6, GOLD);
    drawSprite(trophy, W / 2, 360, 4.4);
    drawSprite(SPR[champ], 360, H - 40, 2.0);
    text("P" + (champ + 1) + "  " + NAMES[champ], 430, H - 64, 4, PCOL[champ]);
    text("WINS THE 8-BIT CUP", 430, H - 30, 2, DIM);
    tc("ENTER = NEW CUP      BACKSPACE = MENU", W / 2, H - 122, 2, DIM);
  }

  window.__cup = { phase: champ >= 0 ? "champion" : "standings", count, wins: cup.wins.slice(0, count), next: nextGame ? nextGame.file : null, lastWinner, lastDraw, champion: champ >= 0 ? "P" + (champ + 1) : null };
  requestAnimationFrame(frame);
})();
