"""
4-bit art for the 8-BIT CUP (tournament mode).
Choosing the Cup plays RANDOM minigames back-to-back; each game's winner earns a
point and the standings are shown between rounds. FIRST TO 5 WINS lifts the cup.
Native 240x150, nearest-upscaled x4 -> 960x600. ART + SYSTEM MOCKUP ONLY.
"""
from PIL import Image, ImageDraw
import os, math, random
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

def lit(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)

# ---- gold palette for the cup ----
OUT_C = (74, 48, 16)
GOLD_L = (255, 228, 132)
GOLD = (238, 194, 70)
GOLD_D = (196, 148, 40)
GOLD_DD = (150, 108, 28)
SHINE = (255, 250, 222)
PLINTH = (84, 60, 36)
PLINTH_L = (120, 88, 52)
PCOL = [(255, 93, 93), (93, 180, 255), (107, 214, 107), (255, 213, 74)]

# ---------------------------------------------------------------------------
# TROPHY
# ---------------------------------------------------------------------------
CUP_W, CUP_H = 44, 56
def draw_trophy():
    W, H = CUP_W, CUP_H
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = W // 2
    # handles (drawn first so the bowl overlaps their inner edge)
    for s in (-1, 1):
        x0 = cx + s * 9
        box = [x0 - s * 12, 8, x0 + s * 2, 30] if s > 0 else [x0 - 2, 8, x0 + 12, 30]
        d.arc([min(box[0], box[2]), box[1], max(box[0], box[2]), box[3]], 270 if s > 0 else 90, 90 if s > 0 else 270, fill=GOLD, width=4)
        d.arc([min(box[0], box[2]), box[1], max(box[0], box[2]), box[3]], 270 if s > 0 else 90, 90 if s > 0 else 270, fill=OUT_C, width=1)
    # bowl
    bowl = [(8, 9), (36, 9), (33, 22), (28, 30), (16, 30), (11, 22)]
    d.polygon(bowl, fill=GOLD); d.line(bowl + [bowl[0]], fill=OUT_C, width=1)
    d.polygon([(13, 22), (31, 22), (28, 30), (16, 30)], fill=GOLD_D)        # lower shade
    # rim
    d.ellipse([6, 4, 38, 13], fill=GOLD_L, outline=OUT_C)
    d.ellipse([10, 6, 34, 11], fill=GOLD_D)
    d.ellipse([11, 6, 33, 10], fill=GOLD)
    # left highlight streak
    d.line([(14, 11), (14, 24)], fill=GOLD_L); d.line([(13, 12), (13, 20)], fill=SHINE)
    # star emblem
    star(d, cx, 18, 6, SHINE, OUT_C)
    # stem + knot
    d.rectangle([cx - 2, 30, cx + 1, 36], fill=GOLD); d.line([(cx - 2, 30), (cx - 2, 36)], fill=OUT_C); d.line([(cx + 1, 30), (cx + 1, 36)], fill=GOLD_D)
    d.ellipse([cx - 5, 34, cx + 4, 40], fill=GOLD_L, outline=OUT_C)
    # base
    d.rectangle([cx - 8, 40, cx + 7, 44], fill=GOLD, outline=OUT_C)
    d.polygon([(cx - 12, 55), (cx + 11, 55), (cx + 7, 45), (cx - 8, 45)], fill=PLINTH)
    d.line([(cx - 12, 55), (cx + 11, 55), (cx + 7, 45), (cx - 8, 45), (cx - 12, 55)], fill=OUT_C)
    d.line([(cx - 8, 46), (cx + 7, 46)], fill=PLINTH_L)
    return im

def star(d, cx, cy, r, fill, outline=None):
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + math.cos(ang) * rr, cy + math.sin(ang) * rr))
    d.polygon(pts, fill=fill, outline=outline)

# ---- a small win "pip" (filled gold star = a win, empty = still to play) ----
def draw_pip(filled):
    s = 12; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if filled:
        star(d, s // 2, s // 2 + 1, 5.5, GOLD, OUT_C); star(d, s // 2, s // 2, 2.2, SHINE)
    else:
        d.ellipse([1, 1, s - 2, s - 2], fill=(40, 36, 54, 255), outline=(96, 90, 120, 255))
        star(d, s // 2, s // 2 + 1, 4.0, (62, 58, 80, 255))
    return im

def fighter(img, name, cx, feetY, scale=1.0):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    f = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = f.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rx, ry] = (*cc, 255)
    if scale != 1.0: f = f.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(f, (cx - f.width // 2, feetY - f.height))

# ---------------------------------------------------------------------------
# STAGE BACKGROUND (a champions' hall)
# ---------------------------------------------------------------------------
def stage(W, H, glow=None):
    im = Image.new("RGBA", (W, H), (38, 28, 60, 255)); d = ImageDraw.Draw(im)
    for y in range(H):                                    # vertical gradient
        t = y / H; c = (int(46 - 18 * t), int(34 - 12 * t), int(74 - 26 * t))
        d.line([0, y, W, y], fill=(*c, 255))
    if glow:                                              # subtle golden halo (cx, cy, R)
        gx, gy, R = glow
        for r in range(R, 4, -6):
            d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=(255, 220, 120, 6))
    # floor band
    d.rectangle([0, H - 26, W, H], fill=(30, 22, 48, 255))
    d.line([0, H - 26, W, H - 26], fill=(96, 80, 140, 255))
    for x in range(0, W, 16): d.line([x, H - 26, x + 8, H], fill=(40, 30, 62, 255))
    return im

def panel(im, x, y, w, h, col):
    d = ImageDraw.Draw(im)
    d.rectangle([x, y, x + w, y + h], fill=(24, 20, 36, 235)); d.rectangle([x, y, x + w, y + h], outline=col, width=1)

def standings(W=240, H=150, n=4, wins=(3, 1, 2, 0), nxt="TANK DUEL"):
    im = stage(W, H); d = ImageDraw.Draw(im)
    names = ["NOVA", "BYTE", "GLITCH", "CHIP"]
    # header: small trophy + title
    t = draw_trophy().resize((CUP_W * 5 // 9, CUP_H * 5 // 9), Image.NEAREST)
    im.alpha_composite(t, (14, 0))
    lab = pf.text("8-BIT CUP", 2, (255, 226, 120)); im.alpha_composite(lab, (W // 2 - lab.width // 2, 4))
    sub = pf.text("FIRST TO 5 WINS", 1, (212, 202, 236)); im.alpha_composite(sub, (W // 2 - sub.width // 2, 18))
    # standings rows (compact: header 0..30, rows 30..126, banner 128..150)
    rowH = 24; top = 30
    order = sorted(range(n), key=lambda i: -wins[i])      # leader first
    for slot, i in enumerate(order):
        y = top + slot * rowH
        panel(im, 14, y, W - 28, rowH - 4, PCOL[i])
        fighter(im, names[i], 28, y + rowH - 7, scale=0.6)
        tag = pf.text("P%d %s" % (i + 1, names[i]), 1, PCOL[i]); im.alpha_composite(tag, (44, y + 4))
        sc = pf.text("%d/5" % wins[i] + ("  LEADER" if slot == 0 and wins[i] > 0 else ""), 1, (255, 226, 120) if slot == 0 and wins[i] > 0 else (190, 184, 210))
        im.alpha_composite(sc, (44, y + 12))
        for k in range(5):                                 # 5 win pips
            pip = draw_pip(k < wins[i]); im.alpha_composite(pip, (W - 26 - (5 - k) * 14, y + 4))
    # next-up banner
    by = H - 22
    d.rectangle([0, by, W, H], fill=(20, 16, 30, 255)); d.line([0, by, W, by], fill=(255, 226, 120, 255))
    nb = pf.text("NEXT GAME:  " + nxt, 2, (255, 244, 210)); im.alpha_composite(nb, (W // 2 - nb.width // 2, by + 5))
    return im.resize((W * 4, H * 4), Image.NEAREST)

def champion(W=240, H=150, who=0):
    im = stage(W, H, glow=(W // 2, 56, 60)); d = ImageDraw.Draw(im)
    names = ["NOVA", "BYTE", "GLITCH", "CHIP"]
    # confetti
    rnd = random.Random(5)
    for _ in range(120):
        x, y = rnd.randint(0, W), rnd.randint(0, H - 28); c = PCOL[rnd.randint(0, 3)]
        d.rectangle([x, y, x + 2, y + 3], fill=(*c, 255))
    # CHAMPION! title at the very top
    lab = pf.text("CHAMPION!", 3, (255, 226, 120)); im.alpha_composite(lab, (W // 2 - lab.width // 2, 6))
    # big trophy, fully visible
    tw, th = int(CUP_W * 1.55), int(CUP_H * 1.55)
    t = draw_trophy().resize((tw, th), Image.NEAREST); im.alpha_composite(t, (W // 2 - tw // 2, 28))
    # winner: portrait + name on the bottom floor band
    fighter(im, names[who], 92, H - 4, scale=0.95)
    nm = pf.text("P%d  %s" % (who + 1, names[who]), 2, PCOL[who]); im.alpha_composite(nm, (112, H - 20))
    won = pf.text("WINS THE CUP", 1, (212, 202, 236)); im.alpha_composite(won, (112, H - 9))
    return im.resize((W * 4, H * 4), Image.NEAREST)

def assets_sheet():
    items = [("TROPHY", draw_trophy()), ("WIN", draw_pip(True)), ("TO PLAY", draw_pip(False))]
    SC = 4; cw = 180; maxh = max(i[1].height for i in items) * SC
    sheet = Image.new("RGBA", (len(items) * cw, maxh + 40), (30, 24, 48, 255))
    for j, (lab, img) in enumerate(items):
        up = img.resize((img.width * SC, img.height * SC), Image.NEAREST)
        sheet.alpha_composite(up, (j * cw + (cw - up.width) // 2, 14 + (maxh - up.height)))
        lb = pf.text(lab, 2, (235, 232, 245)); sheet.alpha_composite(lb, (j * cw + (cw - lb.width) // 2, 2))
    sheet.convert("RGB").save(os.path.join(OUT, "cup_assets.png")); print("wrote cup_assets.png", sheet.size)

def _conv(im, look):
    out = []
    for y in range(im.height):
        row = ""
        for x in range(im.width):
            r, g, b, a = im.load()[x, y]
            row += "." if a < 128 else look.get((r, g, b), ".")
        out.append(row)
    return out

def cup_export():
    """Trophy as a fixed-palette char-grid for the hub icon + tournament screen."""
    look = {OUT_C: "o", GOLD_L: "L", GOLD: "G", GOLD_D: "d", GOLD_DD: "k", SHINE: "W", PLINTH: "p", PLINTH_L: "P"}
    rows = _conv(draw_trophy(), look)
    pal = {".": None, "o": "#%02x%02x%02x" % OUT_C, "L": "#%02x%02x%02x" % GOLD_L, "G": "#%02x%02x%02x" % GOLD,
           "d": "#%02x%02x%02x" % GOLD_D, "k": "#%02x%02x%02x" % GOLD_DD, "W": "#%02x%02x%02x" % SHINE,
           "p": "#%02x%02x%02x" % PLINTH, "P": "#%02x%02x%02x" % PLINTH_L}
    return {"trophy": rows, "trophyW": CUP_W, "trophyH": CUP_H, "pal": pal,
            "gold": "#%02x%02x%02x" % GOLD, "goldL": "#%02x%02x%02x" % GOLD_L, "out": "#%02x%02x%02x" % OUT_C}

if __name__ == "__main__":
    assets_sheet()
    standings(n=4, wins=(3, 1, 2, 0), nxt="TANK DUEL").convert("RGB").save(os.path.join(OUT, "cup_standings.png")); print("wrote cup_standings.png")
    standings(n=2, wins=(4, 2), nxt="SHIP DASH").convert("RGB").save(os.path.join(OUT, "cup_standings2.png")); print("wrote cup_standings2.png")
    champion(who=0).convert("RGB").save(os.path.join(OUT, "cup_champion.png")); print("wrote cup_champion.png")
    print("done")
