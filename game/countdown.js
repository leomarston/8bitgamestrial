/* 8-BIT PARTY — shared race-start countdown: "3 · 2 · 1 · GO!" with Formula-1
 * starting-light beeps (WebAudio synth, no audio asset needed).
 *
 * Every game runs a ~3.5s ready phase. Each frame it calls
 *   Countdown.label(remaining [, goWord])
 * which returns the on-screen text ("3"/"2"/"1"/GO word) AND plays the beeps:
 * three identical red-light beeps for 3·2·1, then a higher "lights-out" tone on
 * GO. Call Countdown.reset() in the game's reset() so the sequence replays each
 * round. The AudioContext is created/resumed on the first key or pointer. */
(() => {
  let actx = null, last = null;
  window.__cdbeeps = 0; window.__cdgo = 0;        // test counters

  function ac() {
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (actx.state === "suspended") actx.resume().catch(() => {});
    return actx;
  }
  function tone(freq, dur, vol, type) {
    try { if (localStorage.getItem("sfxOff") === "1") return; } catch (e) {}
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + 0.001;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const unlock = () => ac();
  addEventListener("keydown", unlock); addEventListener("pointerdown", unlock);

  window.Countdown = {
    reset() { last = null; },
    // remaining counts down from ~3.0 toward 0; returns "3"/"2"/"1" then the GO word.
    label(rem, goWord) {
      goWord = goWord || "GO!";
      const lab = rem > 0 ? String(Math.max(1, Math.min(3, Math.ceil(rem)))) : goWord;
      if (lab !== last) {
        last = lab;
        if (rem > 0) { tone(620, 0.17, 0.22, "square"); window.__cdbeeps++; }              // red-light beep (same tone for 3/2/1)
        else { tone(660, 0.06, 0.20, "square"); tone(1040, 0.5, 0.28, "square"); window.__cdgo++; }   // lights out -> GO!
      }
      return lab;
    },
  };
})();
