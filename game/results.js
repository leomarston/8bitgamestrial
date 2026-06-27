/* 8-BIT PARTY — shared end-of-game RESULT sound. Loaded by every game page.
 * When a round ends, the game calls Results.show(winnerTag): a bright victory
 * jingle if someone won, or a short "draw" womp if it's a tie. Synthesised with
 * Web Audio (no asset), honours the SOUND setting (sfxOff), and fires once per
 * round (call Results.reset() in the game's reset() to re-arm). */
(() => {
  let actx = null; window.__results = { win: 0, draw: 0 };
  function ac() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (actx.state === "suspended") actx.resume().catch(() => {}); return actx; }
  function tone(freq, start, dur, vol, type) {
    try { if (localStorage.getItem("sfxOff") === "1") return; } catch (e) {}
    const c = ac(); if (!c) return; const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const unlock = () => ac(); addEventListener("keydown", unlock); addEventListener("pointerdown", unlock);
  function win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.16, 0.26)); tone(1046, 0.42, 0.45, 0.28); tone(1568, 0.42, 0.45, 0.2); window.__results.win++; }   // victory jingle
  function draw() { tone(392, 0, 0.2, 0.22); tone(294, 0.18, 0.4, 0.22); window.__results.draw++; }   // flat descending "draw"

  let done = false;
  window.Results = {
    reset() { done = false; },
    show(winnerTag) { if (done) return; done = true; if (winnerTag) win(); else draw(); },
  };
})();
