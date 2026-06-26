/* 8-BIT PARTY — shared background music.
 * Menu pages (character select, game select) loop the menu track, kept seamless
 * across the two menu screens. Game pages pick a RANDOM track (music1-4) on load
 * and loop it; call GameMusic.next() to re-roll a fresh random track (rematch). */
(() => {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isMenu = page === "" || page === "index.html" || page === "gameselect.html";
  const TRACKS = ["sfx/music1.mp3", "sfx/music2.mp3", "sfx/music3.mp3", "sfx/music4.mp3"];

  const audio = new Audio();
  audio.loop = true;
  audio.volume = isMenu ? 0.45 : 0.5;
  const pick = () => TRACKS[Math.floor(Math.random() * TRACKS.length)];

  function load(src, resumeAt) {
    audio.src = src;
    const start = () => { if (resumeAt) { try { audio.currentTime = Math.min(resumeAt, (audio.duration || 1e9) - 0.05); } catch (e) {} } audio.play().catch(() => {}); };
    // play only AFTER we can seek to the resume point, so a menu->menu hop doesn't blip from 0 first
    if (audio.readyState >= 1) start();
    else audio.addEventListener("loadedmetadata", start, { once: true });
  }

  if (isMenu) {
    let resume = 0;
    try { resume = parseFloat(sessionStorage.getItem("menuMusicT")) || 0; } catch (e) {}
    load("sfx/menu.mp3", resume);
    const save = () => { try { sessionStorage.setItem("menuMusicT", audio.currentTime || 0); } catch (e) {} };
    addEventListener("pagehide", save);
    addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  } else {
    load(pick());
  }

  // browsers gate autoplay until a gesture — (re)start on the first input
  const kick = () => audio.play().catch(() => {});
  addEventListener("keydown", kick);
  addEventListener("pointerdown", kick);

  window.GameMusic = {
    next() { if (!isMenu) load(pick()); },   // re-roll a random track (rematch / new round)
    src() { return audio.src; },
    audio,
  };
})();
