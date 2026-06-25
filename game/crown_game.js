/* 8-BIT PARTY — CROWN GRAB (our King-of-the-Crown). Top-down couch duel:
 * grab the golden crown, carry it on your head, and HOLD IT LONGEST. No punching —
 * each player has a DASH. Dash into your rival and you STEAL the crown (or just
 * pop them) and they BLACK OUT for 1 second. Live millisecond hold timers on the
 * scoreboard; most cumulative hold time when the clock runs out WINS. The arena is
 * picked at random each round (open court of pillars OR the stepped stone dais).
 * P1 = WASD + Space(dash),  P2 = Arrows + Enter(dash). */
(() => {
  const D = window.GAME_DATA, CR = D.crown;
  const cv = document.getElementById("stage");
  const ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // ---------- sprite helpers ----------
  function build(rows, pal) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
      const col = pal[rows[y][x]]; if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return { canvas: c, w, h };
  }
  function flip(s) {
    const c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.translate(s.w, 0); g.scale(-1, 1); g.drawImage(s.canvas, 0, 0); return { canvas: c, w: s.w, h: s.h };
  }
  const fight = {};
  D.roster.forEach(c => { fight[c.name] = build(c.rows, D.palette); fight[c.name + "_f"] = flip(build(c.rows, D.palette)); });
  const crownBig = build(CR.crownBig, CR.palette);
  const crownSmall = build(CR.crownSmall, CR.palette);
  const FONT = D.font;

  function tW(s, sc, sp = 1) { return (String(s).length * (5 + sp) - sp) * sc; }
  function text(s, x, y, sc, color, sp = 1) {
    s = String(s).toUpperCase(); ctx.fillStyle = color; let cx = x;
    for (const ch of s) { const g = FONT[ch] || FONT[" "];
      for (let ry = 0; ry < g.length; ry++) for (let rx = 0; rx < g[ry].length; rx++)
        if (g[ry][rx] === "1") ctx.fillRect(cx + rx * sc, y + ry * sc, sc, sc);
      cx += (5 + sp) * sc; }
  }
  const tc = (s, cx, y, sc, c, sp = 1) => text(s, Math.round(cx - tW(s, sc, sp) / 2), y, sc, c, sp);
  const GOLD = "#ffd86b", DIM = "#9a9ab8", P1C = "#ff5d5d", P2C = "#5db4ff", INK = "#100c1c", CREAM = "#ffe9a0";

  // ---------- audio ----------
  function mkAudio(src, vol, loop) { const a = new Audio(src); a.volume = vol; a.loop = !!loop; return a; }
  const sndWalk = mkAudio("sfx/walk.mp3", 0.18, true);
  let audioReady = false;
  function unlockAudio() { audioReady = true; }
  function playHit() { const a = new Audio("sfx/punch.mp3"); a.volume = 0.5; a.play().catch(() => {}); }
  function setWalking(on) { if (on && audioReady) { if (sndWalk.paused) sndWalk.play().catch(() => {}); } else if (!sndWalk.paused) sndWalk.pause(); }

  // ---------- picks ----------
  let p1name = "PIXEL", p2name = "BYTE";
  try { const s = JSON.parse(localStorage.getItem("partyPicks")); if (s && s.p1 && s.p2) { p1name = s.p1; p2name = s.p2; } } catch (e) {}
  if (!fight[p1name]) p1name = "PIXEL"; if (!fight[p2name]) p2name = "BYTE";

  // ---------- maps (geometry scaled from the shared art metadata) ----------
  const MAPS = CR.maps.map(m => {
    const s = m.scale;
    return {
      img: (() => { const im = new Image(); im.src = m.bg; return im; })(),
      bounds: { l: m.bounds.l * s, r: m.bounds.r * s, t: m.bounds.t * s, b: m.bounds.b * s },
      obstacles: m.obstacles.map(o => o.type === "circle"
        ? { type: "circle", x: o.x * s, y: o.y * s, r: o.r * s }
        : { type: "rect", x: o.x * s, y: o.y * s, w: o.w * s, h: o.h * s }),
      spawn: { p1: [m.spawn.p1[0] * s, m.spawn.p1[1] * s], p2: [m.spawn.p2[0] * s, m.spawn.p2[1] * s], crown: [m.spawn.crown[0] * s, m.spawn.crown[1] * s] },
      name: m.bg.indexOf("map2") >= 0 ? "THE STONE DAIS" : "THE ROYAL COURT",
    };
  });
  let mapsLoaded = 0;
  MAPS.forEach(m => { m.img.onload = () => mapsLoaded++; });

  // ---------- entities ----------
  const PSC = 1.9, R = 13;
  function ent(name, color) { return { name, color, x: 0, y: 0, face: 1, holdMs: 0, dash: 0, dashDir: [1, 0], dashCool: 0, black: 0, walkT: 0, moving: false, r: R }; }
  let p1, p2, players, crown, map, mapIdx, phase, ready, timeLeft, winner, msg, msgT, sparks;
  const MATCH = 30;                                  // seconds per round

  function reset() {
    mapIdx = Math.floor(Math.random() * MAPS.length); map = MAPS[mapIdx];
    p1 = ent(p1name, P1C); p2 = ent(p2name, P2C); players = [p1, p2];
    p1.x = map.spawn.p1[0]; p1.y = map.spawn.p1[1]; p1.face = 1;
    p2.x = map.spawn.p2[0]; p2.y = map.spawn.p2[1]; p2.face = -1;
    crown = { holder: null, fx: map.spawn.crown[0], fy: map.spawn.crown[1], bob: 0 };
    phase = "ready"; ready = 2.4; timeLeft = MATCH; winner = null; msg = ""; msgT = 0; sparks = [];
  }
  reset();

  // ---------- input ----------
  const held = {};
  const CTRL = [
    { p: () => p1, U: "KeyW", Dn: "KeyS", L: "KeyA", Rt: "KeyD", dash: ["Space", "KeyF"] },
    { p: () => p2, U: "ArrowUp", Dn: "ArrowDown", L: "ArrowLeft", Rt: "ArrowRight", dash: ["Enter", "NumpadEnter"] },
  ];
  window.addEventListener("keydown", e => {
    unlockAudio();
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (e.code === "Backspace") { location.href = "gameselect.html"; return; }
    if (phase === "over" && (e.code === "Enter" || e.code === "KeyR" || e.code === "Space")) { if (window.GameMusic) window.GameMusic.next(); reset(); return; }
    if (phase === "play" && !e.repeat) {
      if (e.code === "Space" || e.code === "KeyF") doDash(p1);
      if (e.code === "Enter" || e.code === "NumpadEnter") doDash(p2);
    }
    held[e.code] = true;
  });
  window.addEventListener("keyup", e => { held[e.code] = false; });

  function inputDir(c) {
    const dx = (held[c.Rt] ? 1 : 0) - (held[c.L] ? 1 : 0), dy = (held[c.Dn] ? 1 : 0) - (held[c.U] ? 1 : 0);
    return [dx, dy];
  }
  function doDash(p) {
    if (phase !== "play" || p.black > 0 || p.dashCool > 0 || p.dash > 0) return;
    const c = CTRL.find(c => c.p() === p); let [dx, dy] = inputDir(c);
    if (dx === 0 && dy === 0) { dx = p.face; dy = 0; }
    const m = Math.hypot(dx, dy) || 1; p.dashDir = [dx / m, dy / m];
    p.dash = DASH_TIME; p.dashCool = DASH_COOL; p.face = dx > 0 ? 1 : (dx < 0 ? -1 : p.face);
  }
  const DASH_TIME = 0.16, DASH_COOL = 0.55, DASH_SPEED = 500, PSPD = 196, BLACKOUT = 1.0, GRAB = 12;

  // ---------- collision ----------
  function blocked(x, y, r) {
    const b = map.bounds;
    if (x - r < b.l || x + r > b.r || y - r < b.t || y + r > b.b) return true;
    for (const o of map.obstacles) {
      if (o.type === "circle") { if ((x - o.x) ** 2 + (y - o.y) ** 2 < (r + o.r) ** 2) return true; }
      else { const cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true; }
    }
    return false;
  }
  function moveEnt(e, dx, dy) {
    if (dx && !blocked(e.x + dx, e.y, e.r)) e.x += dx;
    if (dy && !blocked(e.x, e.y + dy, e.r)) e.y += dy;
  }

  // ---------- update ----------
  function update(dt) {
    crown.bob += dt * 5;
    msgT = Math.max(0, msgT - dt);
    for (const s of sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    sparks = sparks.filter(s => s.t > 0);

    if (phase === "ready") { ready -= dt; if (ready <= 0) phase = "play"; setWalking(false); return; }
    if (phase === "over") { setWalking(false); return; }

    timeLeft = Math.max(0, timeLeft - dt);
    let anyMoving = false;
    for (const c of CTRL) {
      const p = c.p();
      p.black = Math.max(0, p.black - dt); p.dash = Math.max(0, p.dash - dt); p.dashCool = Math.max(0, p.dashCool - dt);
      p.moving = false;
      if (p.black > 0) continue;
      if (p.dash > 0) {
        moveEnt(p, p.dashDir[0] * DASH_SPEED * dt, p.dashDir[1] * DASH_SPEED * dt);
        p.moving = true; p.walkT += dt * 20;
      } else {
        const [dx, dy] = inputDir(c);
        if (dx || dy) { const m = Math.hypot(dx, dy); moveEnt(p, dx / m * PSPD * dt, dy / m * PSPD * dt);
          if (dx) p.face = dx > 0 ? 1 : -1; p.moving = true; anyMoving = true; p.walkT += dt * 12; }
      }
    }
    setWalking(anyMoving);

    // dash impacts: a dasher who touches the rival steals the crown + blacks them out
    for (const [att, vic] of [[p1, p2], [p2, p1]]) {
      if (att.dash > 0 && att.black <= 0 && vic.black <= 0) {
        if ((att.x - vic.x) ** 2 + (att.y - vic.y) ** 2 < (att.r + vic.r + 6) ** 2) {
          vic.black = BLACKOUT; att.dash = 0; att.dashCool = Math.min(att.dashCool, 0.25);
          const stole = crown.holder === vic;
          if (stole) crown.holder = att;
          const mx = (att.x + vic.x) / 2, my = (att.y + vic.y) / 2;
          for (let i = 0; i < 10; i++) { const a = i / 10 * 7, sp = 80 + (i % 3) * 60; sparks.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0.4, c: stole ? GOLD : "#ffffff" }); }
          // knock the victim back along the dash direction
          moveEnt(vic, att.dashDir[0] * 20, att.dashDir[1] * 20);
          playHit();
          msg = (att === p1 ? "P1" : "P2") + (stole ? " STOLE THE CROWN!" : " BLACKOUT!"); msgT = 1.1;
        }
      }
    }

    // free crown pickup (only ever free before the first grab)
    if (crown.holder === null) {
      for (const p of players) if (p.black <= 0 && (p.x - crown.fx) ** 2 + (p.y - crown.fy) ** 2 < (p.r + GRAB) ** 2) {
        crown.holder = p; msg = (p === p1 ? "P1" : "P2") + " GRABBED THE CROWN!"; msgT = 1.1; break;
      }
    }
    if (crown.holder) crown.holder.holdMs += dt * 1000;

    if (timeLeft <= 0) {
      phase = "over";
      winner = p1.holdMs > p2.holdMs ? p1 : (p2.holdMs > p1.holdMs ? p2 : null);
    }
  }

  // ---------- draw ----------
  function shadow(x, y, rw) { ctx.fillStyle = "rgba(8,10,20,.4)"; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.35, 0, 0, 7); ctx.fill(); }
  function drawSprRaw(s, cx, feetY, scale, alpha) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(s.canvas, Math.round(cx - w / 2), feetY - h, w, h); ctx.globalAlpha = 1;
  }
  function drawAnim(s, cx, feetY, scale, walkT, moving) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    const left = Math.round(cx - w / 2), top = feetY - h;
    const legSrc = Math.floor(s.h * 0.62), legH = s.h - legSrc;
    const hop = moving ? -Math.round(Math.abs(Math.sin(walkT)) * 1.5) : 0;
    const step = moving ? Math.round(Math.sin(walkT) * 2) : 0;
    const mid = left + Math.round(s.w / 2 * scale);
    const legTop = top + Math.round(legSrc * scale) + hop;
    ctx.drawImage(s.canvas, 0, 0, s.w, legSrc, left, top + hop, w, Math.round(legSrc * scale));
    ctx.drawImage(s.canvas, 0, legSrc, s.w / 2, legH, left, legTop + step, mid - left, Math.round(legH * scale));
    ctx.drawImage(s.canvas, s.w / 2, legSrc, s.w / 2, legH, mid, legTop - step, left + w - mid, Math.round(legH * scale));
  }
  function drawDown(s, cx, feetY, scale, alpha) {
    const w = Math.round(s.w * scale), h = Math.round(s.h * scale);
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.translate(cx, feetY - h * 0.38); ctx.rotate(Math.PI * 0.46);
    ctx.drawImage(s.canvas, (-w / 2) | 0, (-h / 2) | 0, w, h); ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawStars(p, cy) {
    for (let i = 0; i < 3; i++) { const a = p.black * 9 + i * 2.1; ctx.fillStyle = i % 2 ? GOLD : "#f4f4ee"; ctx.fillRect((p.x + Math.cos(a) * 13) | 0, (cy + Math.sin(a) * 4) | 0, 3, 3); }
  }
  function carriedCrown(p, feetY, h) {
    const cs = 2.4, cw = Math.round(crownSmall.w * cs), ch = Math.round(crownSmall.h * cs);
    const y = feetY - h - ch + 1 - Math.round(Math.abs(Math.sin(crown.bob)) * 1);
    ctx.drawImage(crownSmall.canvas, Math.round(p.x - cw / 2), y, cw, ch);
  }
  function drawPlayer(p) {
    const s = p.face < 0 ? fight[p.name + "_f"] : fight[p.name];
    const h = Math.round(s.h * PSC), feetY = p.y + 8;
    shadow(p.x, p.y + 6, Math.round(s.w * PSC) * 0.42);
    if (p.black > 0) {                                    // dizzy / can't move
      drawDown(s, p.x, feetY, PSC, 0.7); drawStars(p, p.y - 30);
      return;
    }
    if (p.dash > 0) {                                     // motion trail behind the dash
      for (let i = 1; i <= 3; i++) drawSprRaw(s, p.x - p.dashDir[0] * i * 7, feetY - p.dashDir[1] * i * 7, PSC, 0.12 * (4 - i));
    }
    drawAnim(s, p.x, feetY, PSC, p.walkT, p.moving);
    if (crown.holder === p) carriedCrown(p, feetY, h);
    // P-tag
    ctx.fillStyle = p.color; const tx = (p.x - 9) | 0; ctx.fillRect(tx, (feetY - h - (crown.holder === p ? 19 : 7)) | 0, 20, 7);
    text(p === p1 ? "P1" : "P2", tx + 3, (feetY - h - (crown.holder === p ? 18 : 6)) | 0, 1, INK);
  }
  function drawFreeCrown() {
    if (crown.holder !== null) return;
    const cs = 2.4, cw = Math.round(crownBig.w * cs), ch = Math.round(crownBig.h * cs);
    const yb = Math.round(Math.sin(crown.bob) * 3);
    shadow(crown.fx, crown.fy + 12, 22);
    ctx.drawImage(crownBig.canvas, Math.round(crown.fx - cw / 2), crown.fy - ch + yb, cw, ch);
    for (let i = 0; i < 4; i++) { const a = crown.bob * 1.5 + i * 1.57; ctx.fillStyle = i % 2 ? CREAM : "#ffffff"; ctx.fillRect((crown.fx + Math.cos(a) * 22) | 0, (crown.fy - 6 + Math.sin(a) * 12) | 0, 3, 3); }
  }
  function ms(v) { return (v / 1000).toFixed(3); }
  function hud() {
    ctx.fillStyle = "rgba(16,12,28,.78)"; ctx.fillRect(0, 0, W, 34);
    const hold = crown.holder;
    // P1 (left)
    if (hold === p1) ctx.drawImage(crownSmall.canvas, 10, 7, 18, 18);
    text(p1name, 32, 5, 2, P1C); text(ms(p1.holdMs), 32, 19, 2, hold === p1 ? GOLD : "#f4f4ee");
    // P2 (right)
    const rx = W - 10 - tW(p2name, 2);
    if (hold === p2) ctx.drawImage(crownSmall.canvas, W - 28, 7, 18, 18);
    text(p2name, W - (hold === p2 ? 32 : 14) - tW(p2name, 2), 5, 2, P2C);
    const mw = tW(ms(p2.holdMs), 2); text(ms(p2.holdMs), W - 14 - mw, 19, 2, hold === p2 ? GOLD : "#f4f4ee");
    // centre: clock + tug bar
    tc(Math.ceil(timeLeft) + "S", W / 2, 3, 3, GOLD);
    const bw = 240, bx = (W - bw) / 2, by = 26, total = p1.holdMs + p2.holdMs;
    const f1 = total > 0 ? p1.holdMs / total : 0.5;
    ctx.fillStyle = "#2a2440"; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = P1C; ctx.fillRect(bx, by, Math.round(bw * f1), 5);
    ctx.fillStyle = P2C; ctx.fillRect(bx + Math.round(bw * f1), by, bw - Math.round(bw * f1), 5);
    ctx.fillStyle = INK; ctx.fillRect(bx + Math.round(bw * f1) - 1, by - 1, 2, 7);
  }

  function frame(prev, now) {
    const dt = Math.min((now - prev) / 1000, 0.033);
    update(dt);

    if (mapsLoaded < MAPS.length || !map.img.complete) {       // still loading art
      ctx.fillStyle = "#16122a"; ctx.fillRect(0, 0, W, H); tc("LOADING...", W / 2, H / 2 - 10, 4, GOLD);
      requestAnimationFrame(t => frame(now, t)); return;
    }
    ctx.drawImage(map.img, 0, 0, W, H);
    drawFreeCrown();
    [{ y: p1.y, f: () => drawPlayer(p1) }, { y: p2.y, f: () => drawPlayer(p2) }].sort((a, b) => a.y - b.y).forEach(e => e.f());
    for (const s of sparks) { ctx.fillStyle = s.c; ctx.fillRect(s.x | 0, s.y | 0, 3, 3); }

    hud();
    if (phase === "play") tc("P1 WASD +SPACE DASH    P2 ARROWS +ENTER DASH    BACKSPACE MENU", W / 2, H - 16, 1, DIM);
    if (msgT > 0) tc(msg, W / 2, 80, 3, GOLD);

    if (phase === "ready") {
      ctx.fillStyle = "rgba(11,10,20,.55)"; ctx.fillRect(0, 0, W, H);
      tc(map.name, W / 2, H / 2 - 96, 3, CREAM);
      tc(ready > 0.4 ? String(Math.ceil(ready - 0.4)) : "GO!", W / 2, H / 2 - 40, 8, GOLD);
      tc("GRAB THE CROWN  -  DASH TO STEAL IT  -  HOLD IT LONGEST", W / 2, H / 2 + 44, 2, "#cfe6ff");
    }
    if (phase === "over") {
      ctx.fillStyle = "rgba(11,10,20,.85)"; ctx.fillRect(0, 0, W, H);
      if (winner) {
        tc((winner === p1 ? "P1" : "P2") + " IS THE KING!", W / 2, 120, 6, GOLD);
        const s = fight[winner.name], scl = 190 / s.h;
        ctx.drawImage(s.canvas, W / 2 - s.w * scl / 2, 200, s.w * scl, 190);
        const cw = Math.round(crownSmall.w * 4), ch = Math.round(crownSmall.h * 4);
        ctx.drawImage(crownSmall.canvas, W / 2 - cw / 2, 200 - ch + 6, cw, ch);
        tc(winner.name + "  HELD " + ms(winner.holdMs) + "S", W / 2, 410, 3, winner.color);
      } else { tc("A DEAD HEAT!", W / 2, 200, 6, GOLD); tc("NOBODY WINS THE CROWN", W / 2, 280, 3, CREAM); }
      tc("P1 " + ms(p1.holdMs) + "S      P2 " + ms(p2.holdMs) + "S", W / 2, 460, 2, DIM);
      tc("ENTER / SPACE = REMATCH     BACKSPACE = MENU", W / 2, 520, 2, DIM);
    }

    window.__cg = { phase, map: mapIdx, holder: crown.holder ? (crown.holder === p1 ? "p1" : "p2") : null,
      h1: Math.round(p1.holdMs), h2: Math.round(p2.holdMs), t: +timeLeft.toFixed(1),
      b1: +p1.black.toFixed(2), b2: +p2.black.toFixed(2) };
    window.__cghook = {
      tp: (ax, ay, bx, by) => { p1.x = ax; p1.y = ay; p2.x = bx; p2.y = by; },
      dash1: () => doDash(p1), dash2: () => doDash(p2),
      give: who => { crown.holder = who === "p1" ? p1 : (who === "p2" ? p2 : null); },
      pos: () => ({ p1: [Math.round(p1.x), Math.round(p1.y)], p2: [Math.round(p2.x), Math.round(p2.y)] }),
      end: () => { timeLeft = 0; },
    };
    requestAnimationFrame(t => frame(now, t));
  }
  requestAnimationFrame(t => frame(t, t));
})();
