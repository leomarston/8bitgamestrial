/* 8-BIT PARTY — shared end-of-game RESULT announce. Loaded by every game page.
 * When a round ends — win OR draw, doesn't matter — the game calls Results.show()
 * and we play sfx/resultannounce.mp3 once, alongside the on-screen "P# WINS!" /
 * draw message. Fires once per round; call Results.reset() in the game's reset()
 * to re-arm. (SOUND off is honoured via the muted Audio wrapper in pause.js.) */
(() => {
  let done = false; window.__results = { played: 0 };
  function play() { const a = new Audio("sfx/resultannounce.mp3"); a.volume = 0.7; a.play().catch(() => {}); window.__results.played++; }
  window.Results = {
    reset() { done = false; },
    show() { if (done) return; done = true; play(); },   // same announce whether someone won or it's a draw
  };
})();
