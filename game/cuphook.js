/* 8-BIT PARTY — tournament link. Loaded by every minigame page. When the 8-BIT
 * CUP is running (localStorage.cup.active), a finished game reports its winner
 * back to the cup and returns to the standings. When the cup is NOT running this
 * does nothing, so every game still plays/rematches exactly as normal. */
(() => {
  let cup = null;
  try { cup = JSON.parse(localStorage.getItem("cup")); } catch (e) {}
  const active = !!(cup && cup.active);


  let done = false;
  window.Tournament = {
    active,
    // call once the game is over; winnerTag = "P1".."P4", or null for a draw
    finish(winnerTag) {
      if (!active || done) return; done = true;
      try {
        const c = JSON.parse(localStorage.getItem("cup")) || {};
        c.pendingResult = true;
        c.lastWinner = winnerTag ? (parseInt(String(winnerTag).slice(1), 10) - 1) : -1;   // -1 = draw (no point)
        localStorage.setItem("cup", JSON.stringify(c));
      } catch (e) {}
      // show the game's own win screen briefly, swallowing input so a rematch
      // can't restart the round, then return to the cup standings.
      const swallow = e => { if (e.code !== "Backspace") { e.stopImmediatePropagation(); e.preventDefault(); } };
      addEventListener("keydown", swallow, true);
      setTimeout(() => { location.href = "tournament.html"; }, 3600);
    },
  };
})();
