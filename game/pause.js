/* 8-BIT PARTY — shared in-game PAUSE menu (loaded by every game page).
 * Press ESC or P to pause: it freezes the game (gating requestAnimationFrame),
 * snapshots the screen and draws an 8-bit menu over it in the game's own pixel
 * font — CONTINUE / SETTINGS / MAIN MENU. SETTINGS toggles MUSIC and SOUND.
 * This replaces the old "Backspace = menu". MAIN MENU also ends any running cup. */
(() => {
  const cv = document.getElementById("stage"); if (!cv) return;
  const ctx = cv.getContext("2d"); const W = cv.width, H = cv.height;
  const FONT = (window.GAME_DATA && window.GAME_DATA.font) || {};
  const GOLD = "#ffd54a", INK = "#15121f", CREAM = "#f4f4ee", DIM = "#b9b3cf", PANEL = "#1c1730";

  // ---- pixel text (same font the games use) ----
  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "] || [];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++) if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);

  // ---- freeze the game by gating requestAnimationFrame while paused ----
  const realRAF = window.requestAnimationFrame.bind(window);
  let paused = false; const queued = [];
  window.requestAnimationFrame = cb => { if (paused) { queued.push(cb); return -1; } return realRAF(cb); };
  function resumeLoop() { const q = queued.splice(0); for (const cb of q) realRAF(cb); }

  // ---- settings (persisted) ----
  const getOff = k => { try { return localStorage.getItem(k) === "1"; } catch (e) { return false; } };
  const setOff = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) {} };
  // SOUND: mute every <audio> SFX (music is handled separately via musicOff)
  const audios = []; const RealAudio = window.Audio;
  window.Audio = function (src) { const a = new RealAudio(src); a.muted = getOff("sfxOff"); audios.push(a); return a; };
  window.Audio.prototype = RealAudio.prototype;
  function applySfx() { for (const a of audios) a.muted = getOff("sfxOff"); }
  function applyMusic() { if (window.GameMusic && GameMusic.audio) GameMusic.audio.muted = getOff("musicOff"); }
  applyMusic();

  // ---- snapshot of the frozen frame, drawn under the menu ----
  const snap = document.createElement("canvas"); snap.width = W; snap.height = H; const sctx = snap.getContext("2d");
  let view = "main", sel = 0, wasPlaying = false;
  const MAIN = ["CONTINUE", "SETTINGS", "MAIN MENU"], SET = ["MUSIC", "SOUND", "BACK"];

  function draw() {
    ctx.drawImage(snap, 0, 0);                    // restore the frozen frame, then dim + menu
    ctx.fillStyle = "rgba(8,6,16,.74)"; ctx.fillRect(0, 0, W, H);
    const pw = 460, ph = 344, px = (W - pw) / 2, py = (H - ph) / 2;
    ctx.fillStyle = PANEL; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = GOLD; ctx.fillRect(px, py, pw, 6); ctx.fillRect(px, py + ph - 6, pw, 6); ctx.fillRect(px, py, 6, ph); ctx.fillRect(px + pw - 6, py, 6, ph);
    if (view === "main") {
      tc("PAUSED", W / 2, py + 30, 6, GOLD);
      MAIN.forEach((m, i) => { const y = py + 134 + i * 54; if (i === sel) { ctx.fillStyle = GOLD; ctx.fillRect(px + 34, y - 9, pw - 68, 42); } tc(m, W / 2, y, 3, i === sel ? INK : CREAM); });
    } else {
      tc("SETTINGS", W / 2, py + 30, 5, GOLD);
      const vals = [getOff("musicOff") ? "OFF" : "ON", getOff("sfxOff") ? "OFF" : "ON", ""];
      SET.forEach((lab, i) => { const y = py + 126 + i * 54; if (i === sel) { ctx.fillStyle = GOLD; ctx.fillRect(px + 30, y - 9, pw - 60, 42); } const c = i === sel ? INK : CREAM; text(lab, px + 52, y, 3, c); if (vals[i]) text(vals[i], px + pw - 52 - tW(vals[i], 3), y, 3, i === sel ? INK : GOLD); });
    }
  }

  function pump() { if (!paused) return; draw(); realRAF(pump); }   // keep the menu on top of any in-flight game frame
  function open() {
    if (paused) return; paused = true; view = "main"; sel = 0;
    sctx.clearRect(0, 0, W, H); sctx.drawImage(cv, 0, 0);   // capture the frozen frame
    if (window.GameMusic && GameMusic.audio && !GameMusic.audio.paused) { wasPlaying = true; GameMusic.audio.pause(); } else wasPlaying = false;
    pump();
  }
  function close() {
    if (!paused) return; paused = false;
    if (wasPlaying && window.GameMusic && GameMusic.audio && !getOff("musicOff")) GameMusic.audio.play().catch(() => {});
    resumeLoop();   // the game redraws over the menu on its next frame
  }
  function mainMenu() { try { const c = JSON.parse(localStorage.getItem("cup") || "{}"); c.active = false; localStorage.setItem("cup", JSON.stringify(c)); } catch (e) {} location.href = "gameselect.html"; }

  window.addEventListener("keydown", e => {
    if (e.code === "Backspace") { e.preventDefault(); return; }                 // old quit key is now inert
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); e.stopImmediatePropagation(); paused ? close() : open(); return; }
    if (!paused) return;
    e.preventDefault(); e.stopImmediatePropagation();                            // while paused, swallow all game input
    const list = view === "main" ? MAIN : SET;
    if (e.code === "ArrowUp" || e.code === "KeyW") { sel = (sel + list.length - 1) % list.length; draw(); }
    else if (e.code === "ArrowDown" || e.code === "KeyS") { sel = (sel + 1) % list.length; draw(); }
    else if (e.code === "Enter" || e.code === "Space") {
      if (view === "main") { if (sel === 0) close(); else if (sel === 1) { view = "settings"; sel = 0; draw(); } else mainMenu(); }
      else { if (sel === 0) { setOff("musicOff", !getOff("musicOff")); applyMusic(); draw(); } else if (sel === 1) { setOff("sfxOff", !getOff("sfxOff")); applySfx(); draw(); } else { view = "main"; sel = 1; draw(); } }
    }
  }, true);

  window.__pause = { isPaused: () => paused, open, close };
})();
