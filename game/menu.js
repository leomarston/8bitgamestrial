/* 8-BIT PARTY — MAIN MENU (title screen).
 * Party-Panic-flavoured: a bouncy colourful wordmark, the roster characters
 * milling about and bumping each other on a lit stage, and three big chunky
 * buttons — PLAY, SETTINGS, QUIT. PLAY heads to the fighter select; SETTINGS
 * opens a sub-panel (music / sound / fullscreen); QUIT is intentionally inert
 * for now (you can't leave the party). Keyboard + mouse both work. */
(() => {
  const D = window.GAME_DATA;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  const BG = "#1a1626", PANEL = "#241d35", PANEL2 = "#201b30", INK = "#15121f";
  const LIGHT = "#f4f4ee", DIM = "#9a9cb2", GOLD = "#ffd54a", GOLDL = "#ffe896";
  const PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"];
  const OK = "#6bd66b", NO = "#ff7a7a";

  // ---- font ----
  const FONT = D.font;
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function glyph(g, x, y, sc, color) { ctx.fillStyle = color; for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(x + rx * sc, y + ry * sc, sc, sc); }
  function text(s, x, y, sc, color, sp = 1) { s = String(s).toUpperCase(); let cx = x; for (const ch of s) { glyph(FONT[ch] || FONT[" "], cx, y, sc, color); cx += (5 + sp) * sc; } }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // ---- little WebAudio blips (honour SOUND OFF) ----
  let actx = null;
  function ac() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (actx.state === "suspended") actx.resume().catch(() => {}); return actx; }
  function tone(freq, start, dur, vol, type) {
    try { if (localStorage.getItem("sfxOff") === "1") return; } catch (e) {}
    const c = ac(); if (!c) return; const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const blip = () => tone(520, 0, 0.05, 0.12);
  const okSfx = () => { tone(680, 0, 0.06, 0.16); tone(1020, 0.06, 0.12, 0.16); };
  const noSfx = () => { tone(200, 0, 0.16, 0.16, "sawtooth"); };

  // ---- settings helpers (persist to the same keys the games + pause menu read) ----
  const musicOn = () => { try { return localStorage.getItem("musicOff") !== "1"; } catch (e) { return true; } };
  const soundOn = () => { try { return localStorage.getItem("sfxOff") !== "1"; } catch (e) { return true; } };
  const fsOn = () => !!document.fullscreenElement;
  function setMusic(on) { try { localStorage.setItem("musicOff", on ? "0" : "1"); } catch (e) {} if (window.GameMusic && GameMusic.audio) GameMusic.audio.muted = !on; }
  function setSound(on) { try { localStorage.setItem("sfxOff", on ? "0" : "1"); } catch (e) {} }
  function toggleFS() { try { if (document.fullscreenElement) document.exitFullscreen(); else (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement); } catch (e) {} }

  // ---- menu model ----
  const ITEMS = [
    { key: "play", label: "PLAY", accent: OK },
    { key: "settings", label: "SETTINGS", accent: "#5db4ff" },
    { key: "quit", label: "QUIT", accent: "#ff5d5d", disabled: true },
  ];
  const SET = [{ key: "music" }, { key: "sound" }, { key: "fullscreen" }, { key: "back" }];
  let sel = 0, inSettings = false, ssel = 0, shake = 0, tease = 0;

  // ---- layout (pure, so input + draw agree) ----
  const BW = 384, BH = 64, BGAP = 22, BTOP = 226;
  const itemRect = i => ({ x: (W - BW) / 2, y: BTOP + i * (BH + BGAP), w: BW, h: BH });
  const SPX = (W - 560) / 2, SPY = 138, SPW = 560, SPH = 372;
  const setRowRect = i => ({ x: SPX + 28, y: SPY + 96 + i * 62, w: SPW - 56, h: 50 });
  const hit = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function activate() {
    if (!inSettings) {
      const it = ITEMS[sel];
      if (it.key === "play") { okSfx(); location.href = "fighters.html"; }
      else if (it.key === "settings") { okSfx(); inSettings = true; ssel = 0; }
      else { noSfx(); shake = 0.55; tease = 2.4; }                   // QUIT — inert, just wiggle
    } else {
      const s = SET[ssel];
      if (s.key === "music") { setMusic(!musicOn()); blip(); }
      else if (s.key === "sound") { const next = !soundOn(); setSound(next); if (next) blip(); }   // blip only when turning ON
      else if (s.key === "fullscreen") { toggleFS(); blip(); }
      else { okSfx(); inSettings = false; }
    }
  }
  function moveSel(d) { if (inSettings) ssel = (ssel + d + SET.length) % SET.length; else sel = (sel + d + ITEMS.length) % ITEMS.length; blip(); }

  // ---- keyboard ----
  window.addEventListener("keydown", e => {
    ac();
    const k = e.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(k)) e.preventDefault();
    if (inSettings) {
      if (k === "Escape" || k === "Backspace") { okSfx(); inSettings = false; return; }
      if (k === "ArrowUp" || k === "KeyW") return moveSel(-1);
      if (k === "ArrowDown" || k === "KeyS") return moveSel(1);
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "Enter"].includes(k)) return activate();
      return;
    }
    if (k === "ArrowUp" || k === "KeyW") return moveSel(-1);
    if (k === "ArrowDown" || k === "KeyS") return moveSel(1);
    if (k === "Space" || k === "Enter") return activate();
  });

  // ---- mouse ----
  function evtXY(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; }
  cv.addEventListener("mousemove", e => {
    const [x, y] = evtXY(e); let over = false;
    if (inSettings) { for (let i = 0; i < SET.length; i++) if (hit(setRowRect(i), x, y)) { if (ssel !== i) { ssel = i; blip(); } over = true; break; } }
    else { for (let i = 0; i < ITEMS.length; i++) if (hit(itemRect(i), x, y)) { if (sel !== i) { sel = i; blip(); } over = true; break; } }
    cv.style.cursor = over ? "pointer" : "default";
  });
  cv.addEventListener("mousedown", e => {
    ac(); const [x, y] = evtXY(e);
    if (inSettings) { for (let i = 0; i < SET.length; i++) if (hit(setRowRect(i), x, y)) { ssel = i; activate(); return; } }
    else { for (let i = 0; i < ITEMS.length; i++) if (hit(itemRect(i), x, y)) { sel = i; activate(); return; } }
  });

  // ---- backdrop ----
  function backdrop(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#2a2046"); g.addColorStop(0.62, "#1d1630"); g.addColorStop(1, "#140f22");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.06;                                              // stage spotlights behind the logo
    for (let i = 0; i < 3; i++) { const sx = W / 2 + (i - 1) * 230; ctx.fillStyle = PCOL[i]; ctx.beginPath(); ctx.moveTo(sx, 8); ctx.lineTo(sx - 150, 360); ctx.lineTo(sx + 150, 360); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = "rgba(8,6,16,.10)"; ctx.fillRect(0, y, W, 1); }   // scanlines
    ctx.fillStyle = "#5db4ff"; ctx.fillRect(0, 0, W, 6); ctx.fillStyle = "#ff5d5d"; ctx.fillRect(0, H - 6, W, 6);
  }

  function drawTitle(t) {
    const s = "8-BIT PARTY", sc = 9, total = tW(s, sc, 1); let x = Math.round(W / 2 - total / 2);
    const baseY = 70 + Math.sin(t / 600) * 4;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], wob = Math.sin(t / 240 + i * 0.55) * 7;
      if (ch !== " ") { glyph(FONT[ch] || FONT[" "], x + sc, baseY + wob + sc, sc, INK); glyph(FONT[ch] || FONT[" "], x, baseY + wob, sc, PCOL[i % PCOL.length]); }
      x += (5 + 1) * sc;
    }
    tc("LOCAL COUCH PARTY  -  2-4 PLAYERS", W / 2, baseY + 86, 2, GOLDL);
  }

  function drawButton(i, t) {
    const it = ITEMS[i], r = itemRect(i), seld = i === sel && !inSettings;
    const ox = (it.key === "quit" && shake > 0) ? Math.sin(shake * 52) * 6 : 0;
    const x = r.x + ox, y = r.y, w = r.w, h = r.h, lsc = 4, ly = y + (h - 7 * lsc) / 2;
    if (it.disabled) {
      ctx.fillStyle = "#1f1930"; rr(x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = seld ? GOLD : "#332b48"; ctx.lineWidth = seld ? 4 : 3; rr(x + 2, y + 2, w - 4, h - 4, 10); ctx.stroke();
      tc(it.label, x + w / 2, ly, lsc, "#6b647e");
      tc("(SOON)", x + w - 46, y + h - 16, 1, "#564f6e");
    } else if (seld) {
      ctx.fillStyle = GOLD; rr(x, y, w, h, 12); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.18)"; rr(x + 3, y + 3, w - 6, h / 2 - 3, 9); ctx.fill();
      tc(it.label, x + w / 2, ly, lsc, INK);
      const a = Math.round(Math.abs(Math.sin(t / 160)) * 6);                         // bouncing chevrons
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.moveTo(x + 18 - a, y + h / 2); ctx.lineTo(x + 32 - a, y + h / 2 - 11); ctx.lineTo(x + 32 - a, y + h / 2 + 11); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w - 18 + a, y + h / 2); ctx.lineTo(x + w - 32 + a, y + h / 2 - 11); ctx.lineTo(x + w - 32 + a, y + h / 2 + 11); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = PANEL; rr(x, y, w, h, 12); ctx.fill();
      ctx.fillStyle = it.accent; rr(x + 4, y + 8, 7, h - 16, 3); ctx.fill();           // colour tab
      ctx.strokeStyle = "#352c4e"; ctx.lineWidth = 3; rr(x + 2, y + 2, w - 4, h - 4, 10); ctx.stroke();
      tc(it.label, x + w / 2, ly, lsc, LIGHT);
    }
  }

  function pill(cx, cy, on) {
    const txt = on ? "ON" : "OFF", col = on ? OK : NO, w = tW(txt, 2) + 22, x = cx - w / 2;
    ctx.fillStyle = col; rr(x, cy - 15, w, 30, 9); ctx.fill(); tc(txt, cx, cy - 7, 2, INK);
  }
  function drawSettings(t) {
    ctx.fillStyle = "rgba(8,6,16,.74)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PANEL2; rr(SPX, SPY, SPW, SPH, 16); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; rr(SPX + 2, SPY + 2, SPW - 4, SPH - 4, 14); ctx.stroke();
    tc("SETTINGS", W / 2, SPY + 26, 5, GOLD);
    const LAB = { music: "MUSIC", sound: "SOUND", fullscreen: "FULLSCREEN", back: "BACK" };
    for (let i = 0; i < SET.length; i++) {
      const s = SET[i], r = setRowRect(i), seld = i === ssel;
      ctx.fillStyle = seld ? "#322a4c" : "#241e36"; rr(r.x, r.y, r.w, r.h, 10); ctx.fill();
      if (seld) { ctx.strokeStyle = GOLD; ctx.lineWidth = 3; rr(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 9); ctx.stroke(); }
      if (s.key === "back") { tc("BACK", r.x + r.w / 2, r.y + (r.h - 14) / 2, 2, seld ? GOLDL : LIGHT); }
      else {
        text(LAB[s.key], r.x + 18, r.y + (r.h - 14) / 2, 2, seld ? GOLDL : LIGHT);
        pill(r.x + r.w - 56, r.y + r.h / 2, s.key === "music" ? musicOn() : s.key === "sound" ? soundOn() : fsOn());
      }
    }
    tc("UP / DOWN MOVE     ENTER TOGGLE     ESC BACK", W / 2, SPY + SPH - 30, 1.6 | 0, DIM);
  }

  // ---- floating confetti ----
  const confetti = []; for (let i = 0; i < 46; i++) confetti.push({ x: (i * 211) % W, y: (i * 137) % H, vy: 24 + (i % 5) * 12, c: PCOL[i % 4], ph: i });

  let prev = -1;
  function frame(t) {
    if (prev < 0) prev = t; const dt = Math.min((t - prev) / 1000, 0.05); prev = t;
    shake = Math.max(0, shake - dt); tease = Math.max(0, tease - dt);

    backdrop(t);
    for (const f of confetti) { f.y += f.vy * dt; f.x += Math.sin(t / 700 + f.ph) * 0.3; if (f.y > H) { f.y = -6; f.x = (f.x * 7 + 137) % W; } ctx.fillStyle = f.c; ctx.globalAlpha = 0.5; ctx.fillRect(f.x | 0, f.y | 0, 4, 6); ctx.globalAlpha = 1; }

    drawTitle(t);
    for (let i = 0; i < ITEMS.length; i++) drawButton(i, t);
    tc("UP / DOWN  SELECT      ENTER / CLICK  CONFIRM", W / 2, BTOP + ITEMS.length * (BH + BGAP) + 6, 2, DIM);
    if (tease > 0) { ctx.globalAlpha = Math.min(1, tease); tc("YOU CAN'T LEAVE THE PARTY!", W / 2, itemRect(2).y + BH + 22, 2, NO); ctx.globalAlpha = 1; }
    if (inSettings) drawSettings(t);

    window.__menu = { sel, inSettings, ssel, music: musicOn(), sound: soundOn(), fs: fsOn() };
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
