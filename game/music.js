/* 8-BIT PARTY — shared background music.
 * Menu pages (character select + game select) loop the menu track immediately,
 * kept seamless across the two menu screens via sessionStorage.
 * GAME pages PRELOAD a random track but stay SILENT through the 3·2·1 countdown —
 * the game calls GameMusic.start() at GO (when play actually begins). On a rematch
 * the game calls GameMusic.next() (re-roll a fresh track, still silent) and the
 * next countdown's GO starts it again. */
(() => {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isMenu = page === "" || page === "index.html" || page === "fighters.html" || page === "gameselect.html" || page === "tournament.html";
  const TRACKS = ["sfx/music1.mp3", "sfx/music2.mp3", "sfx/music3.mp3", "sfx/music4.mp3"];

  const audio = new Audio();
  audio.loop = true;
  audio.volume = isMenu ? 0.45 : 0.5;
  try { if (localStorage.getItem("musicOff") === "1") audio.muted = true; } catch (e) {}
  let curTrack = "", started = false;
  const pick = () => { const opts = TRACKS.filter(t => t !== curTrack); curTrack = opts[Math.floor(Math.random() * opts.length)] || TRACKS[0]; return curTrack; };   // never re-roll the same track back-to-back

  if (isMenu) {
    // The tournament standings screen has its OWN looping track; the regular menus
    // (title + game select) share the main menu track. Each keeps a separate resume
    // key so the two never seek into each other when you cross between them.
    const isCup = page === "tournament.html";
    const menuSrc = isCup ? "sfx/tournament.mp3" : "sfx/menu.mp3";
    const resumeKey = isCup ? "cupMusicT" : "menuMusicT";
    let resume = 0;
    try { resume = parseFloat(sessionStorage.getItem(resumeKey)) || 0; } catch (e) {}
    audio.src = menuSrc;
    const start = () => { if (resume) { try { audio.currentTime = Math.min(resume, (audio.duration || 1e9) - 0.05); } catch (e) {} } audio.play().catch(() => {}); };
    if (audio.readyState >= 1) start(); else audio.addEventListener("loadedmetadata", start, { once: true });
    const save = () => { try { sessionStorage.setItem(resumeKey, audio.currentTime || 0); } catch (e) {} };
    addEventListener("pagehide", save);
    addEventListener("visibilitychange", () => { if (document.hidden) save(); });
    const kick = () => audio.play().catch(() => {});
    addEventListener("keydown", kick);
    addEventListener("pointerdown", kick);
  } else {
    audio.src = pick(); audio.load();                              // preload only — do NOT play until the countdown ends
    const kick = () => { if (started) audio.play().catch(() => {}); };   // a gesture only (re)starts music once the round is underway
    addEventListener("keydown", kick);
    addEventListener("pointerdown", kick);
  }

  window.GameMusic = {
    start() { if (!isMenu) { started = true; audio.play().catch(() => {}); } },     // call at GO (play begins)
    stop()  { if (!isMenu) { started = false; try { audio.pause(); } catch (e) {} } },   // call in reset() so the countdown is silent
    next()  { if (!isMenu) { started = false; try { audio.pause(); } catch (e) {} audio.src = pick(); audio.load(); } },   // rematch: re-roll, stay silent until start()
    get started() { return started; },
    src() { return audio.src; },
    audio,
  };
})();
