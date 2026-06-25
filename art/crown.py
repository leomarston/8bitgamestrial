"""
8-bit art for CROWN GRAB (our King-of-the-Crown). Two fighters fight over a
golden crown on a colorful party stage with pillars/cover to juke around. Punch
the holder -> they drop it & fall; longest cumulative holder (in ms) wins.
Bright stage palette; composed low-res then nearest-upscaled (crisp pixels).
"""
from PIL import Image
import os, math, random
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

PAL = {
    "K": (28, 22, 48), "W": (255, 255, 255), "Y": (255, 210, 62), "y": (196, 133, 26),
    "R": (255, 77, 94), "r": (184, 36, 60), "F": (230, 184, 120), "f": (176, 124, 68),
    "S": (185, 179, 207), "s": (107, 102, 144), "U": (90, 120, 208), "u": (42, 38, 96),
    "G": (95, 208, 107), "M": (255, 122, 208), "C": (255, 233, 160), "D": (24, 20, 54),
}
def col(k): return (*PAL[k], 255)
def sp(px, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h: px[x, y] = c

def spr(s):
    rows = [r for r in s.split("\n")]
    while rows and rows[0] == "": rows.pop(0)
    while rows and rows[-1] == "": rows.pop()
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]

def blit(img, rows, ox, oy, pal=PAL, flip=False):
    px = img.load(); h = len(rows); w = len(rows[0])
    for y in range(h):
        for x in range(w):
            ch = rows[y][w - 1 - x] if flip else rows[y][x]
            c = pal.get(ch)
            if c is None: continue
            sp(px, img.width, img.height, ox + x, oy + y, (*c, 255))

# --------------------------------------------------------------------------
CROWN = spr("""
..K.....K.....K..
..K.K...K...K.K..
.KYKYK.KYK.KYKYK.
.KYRYKKKYKKKYRYK.
.KYYYYYYYYYYYYYK.
.KYYRYYYWYYYRYYK.
.KYYYYYYYYYYYYYK.
.KyyyyyyyyyyyyyK.
.KKKKKKKKKKKKKKK.
""")

PILLAR = spr("""
.KKKKKK.
KYYYYYYK
KYWWWWYK
KKKKKKKK
KRRRRRRK
KWWWWWWK
KRRRRRRK
KWWWWWWK
KRRRRRRK
KWWWWWWK
KRRRRRRK
KWWWWWWK
KRRRRRRK
KKsssssK
KSssssSK
KSsssssK
.KKKKKK.
""")

def fighter(img, name, cx, feetY, flip=False):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    px = img.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rw - 1 - rx] if flip else rows[ry][rx])
            if cc: sp(px, img.width, img.height, cx - rw // 2 + rx, feetY - rh + ry, (*cc, 255))

def disc(px, w, h, cx, cy, rw, rh, c):
    for y in range(int(cy - rh), int(cy + rh + 1)):
        for x in range(int(cx - rw), int(cx + rw + 1)):
            if ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2 <= 1: sp(px, w, h, x, y, c)

def star(img, cx, cy, c="W"):
    px = img.load()
    for (gx, gy) in [(0, 0), (2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, -1), (1, -1), (-1, 1)]:
        sp(px, img.width, img.height, cx + gx, cy + gy, col(c))

def crown_small(img, cx, cy):
    """tiny crown to sit on a head"""
    px = img.load()
    rows = ["K.K.K", "KYKYK", "YYYYY", "YRYRY", "yyyyy"]
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != ".": sp(px, img.width, img.height, cx - 2 + i, cy + j, col(ch))

# --------------------------------------------------------------------------
def dais(px, w, h, cx, cy):
    disc(px, w, h, cx, cy, 34, 16, col("r"))        # carpet
    disc(px, w, h, cx, cy, 30, 13, col("R"))
    # gold rim
    for a in range(0, 360, 4):
        x = cx + 34 * math.cos(math.radians(a)); y = cy + 16 * math.sin(math.radians(a))
        sp(px, w, h, int(x), int(y), col("Y"))
    # pedestal
    for yy in range(cy - 14, cy + 2):
        for xx in range(cx - 5, cx + 6):
            sp(px, w, h, xx, yy, col("S") if xx < cx else col("s"))
    for xx in range(cx - 6, cx + 7): sp(px, w, h, xx, cy - 14, col("Y"))

def spotlight(px, w, h, apx, topY, botY, half):
    for y in range(topY, botY):
        hw = int(half * (y - topY) / (botY - topY))
        for x in range(apx - hw, apx + hw):
            if (x + y) % 3 == 0: sp(px, w, h, x, y, col("U"))

def bunting(px, w, h, y):
    cols = ["R", "Y", "G", "M", "U", "W"]
    for i, bx in enumerate(range(0, w, 14)):
        c = col(cols[i % len(cols)])
        for dy in range(7):
            for dx in range(dy, 14 - dy):
                sp(px, w, h, bx + dx, y + dy, c)
        for dx in range(14): sp(px, w, h, bx + dx, y - 1, col("K"))

def panel(img, x, y, ww, hh, color):
    px = img.load()
    for yy in range(y, y + hh):
        for xx in range(x, x + ww):
            edge = xx == x or xx == x + ww - 1 or yy == y or yy == y + hh - 1
            sp(px, img.width, img.height, xx, yy, col("K") if edge else col(color))

# --------------------------------------------------------------------------
def arena():
    W, H, SC = 240, 150, 4
    img = Image.new("RGBA", (W, H), col("u")); px = img.load()
    spotlight(px, W, H, 50, 22, 150, 70); spotlight(px, W, H, 190, 22, 150, 70)
    random.seed(6)
    for _ in range(90):
        x, y = random.randint(0, W - 1), random.randint(28, H - 1)
        px[x, y] = col(random.choice(["G", "M", "Y", "R", "U", "W"]))
    bunting(px, W, H, 22)

    # ---- stage floor (checker) with border ----
    fx, fy, fw, fh = 18, 40, W - 36, H - 50
    for yy in range(fy, fy + fh):
        for xx in range(fx, fx + fw):
            px[xx, yy] = col("F") if ((xx // 12) + (yy // 12)) % 2 == 0 else col("f")
    for xx in range(fx - 2, fx + fw + 2):
        for t in range(2): px[xx, fy - 1 - t] = col("Y" if t == 0 else "y"); px[xx, fy + fh + t] = col("y")
    for yy in range(fy - 2, fy + fh + 2):
        for t in range(2): px[fx - 1 - t, yy] = col("Y" if t == 0 else "y"); px[fx + fw + t, yy] = col("y")

    # ---- centre dais + pedestal + crown ----
    cxc, cyc = W // 2, fy + fh // 2 + 6
    dais(px, W, H, cxc, cyc)
    blit(img, CROWN, cxc - len(CROWN[0]) // 2, cyc - 30)   # crown floating over pedestal
    star(img, cxc + 10, cyc - 30, "W")

    # ---- pillars (cover to juke around) ----
    for (pcx, pcy) in [(fx + 26, fy + 22), (fx + fw - 30, fy + 22), (fx + 26, fy + fh - 24), (fx + fw - 30, fy + fh - 24)]:
        # ground shadow
        disc(px, W, H, pcx + 3, pcy + len(PILLAR), 7, 3, col("u"))
        blit(img, PILLAR, pcx, pcy)

    # ---- fighters: P1 is KING (crown + tag), P2 chasing & punching ----
    p1x, p1y = cxc - 40, cyc + 20
    p2x, p2y = cxc - 16, cyc + 22
    fighter(img, "PIXEL", p1x, p1y)
    crown_small(img, p1x, p1y - len(fgrid(C.PIXEL)) - 1)
    fighter(img, "BYTE", p2x, p2y, flip=True)
    star(img, (p1x + p2x) // 2 + 2, p1y - 12, "Y")          # punch spark
    kt = pf.text("KING", 1, (255, 233, 160)); img.alpha_composite(kt, (p1x - 8, p1y - len(fgrid(C.PIXEL)) - 10))

    # ---- scoreboard: live ms hold timers + bars ----
    panel(img, 6, 4, 96, 16, "D"); panel(img, W - 102, 4, 96, 16, "D")
    crown_small(img, 14, 7)
    img.alpha_composite(pf.text("PIXEL", 1, (255, 93, 108)), (22, 6))
    img.alpha_composite(pf.text("8.420", 2, (255, 255, 255)), (52, 6))
    img.alpha_composite(pf.text("BYTE", 1, (79, 184, 255)), (W - 96, 6))
    img.alpha_composite(pf.text("5.130", 2, (255, 255, 255)), (W - 66, 6))
    # tug bar (who has held longer)
    bx, by, bw = 104, 8, W - 210
    for x in range(bx, bx + bw):
        px[x, by] = col("R") if (x - bx) < bw * 0.62 else col("U")
        px[x, by + 1] = col("R") if (x - bx) < bw * 0.62 else col("U")

    img.resize((W * SC, H * SC), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "crown_arena.png"))
    print("wrote crown_arena.png")

def _scoreboard(img):
    px = img.load(); W, H = img.size
    panel(img, 6, 4, 96, 16, "D"); panel(img, W - 102, 4, 96, 16, "D")
    crown_small(img, 14, 7)
    img.alpha_composite(pf.text("PIXEL", 1, (255, 93, 108)), (22, 6))
    img.alpha_composite(pf.text("8.420", 2, (255, 255, 255)), (52, 6))
    img.alpha_composite(pf.text("BYTE", 1, (79, 184, 255)), (W - 96, 6))
    img.alpha_composite(pf.text("5.130", 2, (255, 255, 255)), (W - 66, 6))
    bx, by, bw = 104, 8, W - 210
    for x in range(bx, bx + bw):
        px[x, by] = col("R") if (x - bx) < bw * 0.62 else col("U")
        px[x, by + 1] = col("R") if (x - bx) < bw * 0.62 else col("U")

def stairs(px, w, h, topX, topY, dirn, n=4, sw=12, sh=4):
    """3/4 staircase descending from (topX,topY) at the platform edge out to ground."""
    for i in range(n):
        x0 = topX + dirn * i * 7 + (0 if dirn > 0 else -sw)
        yt = topY + i * sh
        for yy in range(yt, yt + sh):
            for xx in range(x0, x0 + sw):
                sp(px, w, h, xx, yy, col("S") if yy == yt else col("s"))
        for xx in range(x0, x0 + sw): sp(px, w, h, xx, yt, col("Y"))

def _stage(img, seed):
    W, H = img.size; px = img.load()
    spotlight(px, W, H, 50, 22, 150, 70); spotlight(px, W, H, 190, 22, 150, 70)
    random.seed(seed)
    for _ in range(90):
        x, y = random.randint(0, W - 1), random.randint(28, H - 1)
        px[x, y] = col(random.choice(["G", "M", "Y", "R", "U", "W"]))
    bunting(px, W, H, 22)
    fx, fy, fw, fh = 18, 40, W - 36, H - 50
    for yy in range(fy, fy + fh):
        for xx in range(fx, fx + fw):
            px[xx, yy] = col("F") if ((xx // 12) + (yy // 12)) % 2 == 0 else col("f")
    for xx in range(fx - 2, fx + fw + 2):
        for t in range(2): px[xx, fy - 1 - t] = col("Y" if t == 0 else "y"); px[xx, fy + fh + t] = col("y")
    for yy in range(fy - 2, fy + fh + 2):
        for t in range(2): px[fx - 1 - t, yy] = col("Y" if t == 0 else "y"); px[fx + fw + t, yy] = col("y")
    return fx, fy, fw, fh

def arena2():
    """MAP 2 — blocked middle: a solid raised platform you can only mount via a
    staircase on each side; the crown sits on top, so the chase funnels up the stairs."""
    W, H, SC = 240, 150, 4
    img = Image.new("RGBA", (W, H), col("u")); px = img.load()
    fx, fy, fw, fh = _stage(img, 11)
    cxc = W // 2
    deckTop, halfW, deckH, faceH = fy + 24, 44, 28, 16
    deckBot = deckTop + deckH
    # solid front face (the height / the blocked middle)
    for y in range(deckBot, deckBot + faceH):
        for x in range(cxc - halfW, cxc + halfW):
            base = "K" if (x % 12 == 0 or y == deckBot + faceH - 1) else "s"
            sp(px, W, H, x, y, col(base))
    for x in range(cxc - halfW, cxc + halfW): sp(px, W, H, x, deckBot + faceH, col("u"))  # base shadow
    # top deck surface (walkable, reached only by the stairs)
    for y in range(deckTop, deckBot):
        for x in range(cxc - halfW, cxc + halfW):
            sp(px, W, H, x, y, col("S") if (x // 8 + y // 8) % 2 == 0 else col("s"))
    for x in range(cxc - halfW, cxc + halfW): sp(px, W, H, x, deckTop, col("Y"))
    for y in range(deckTop, deckBot): sp(px, W, H, cxc - halfW, y, col("y")); sp(px, W, H, cxc + halfW - 1, y, col("y"))
    # the two staircases (only ways up)
    stairs(px, W, H, cxc - halfW, deckBot, -1)
    stairs(px, W, H, cxc + halfW, deckBot, +1)
    # crown on top centre
    blit(img, CROWN, cxc - len(CROWN[0]) // 2, deckTop + 3); star(img, cxc + 10, deckTop + 3, "W")
    # fighters: KING on the deck, chaser climbing the right stairs
    fighter(img, "PIXEL", cxc - 14, deckBot - 1)
    crown_small(img, cxc - 14, deckBot - 1 - len(fgrid(C.PIXEL)) - 1)
    img.alpha_composite(pf.text("KING", 1, (255, 233, 160)), (cxc - 22, deckBot - len(fgrid(C.PIXEL)) - 11))
    fighter(img, "BYTE", cxc + halfW + 16, deckBot + 12, flip=True)
    star(img, cxc + halfW + 6, deckBot + 2, "Y")
    _scoreboard(img)
    img.resize((W * SC, H * SC), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "crown_arena2.png"))
    print("wrote crown_arena2.png")

def assets():
    SC = 7
    items = []
    def cell(fn, label, size=(40, 40)):
        im = Image.new("RGBA", size, (0, 0, 0, 0)); fn(im); items.append((label, im))
    cell(lambda im: blit(im, CROWN, 11, 15), "CROWN")
    cell(lambda im: blit(im, PILLAR, 16, 4), "PILLAR")
    def king(im): fighter(im, "PIXEL", 20, 34); crown_small(im, 20, 34 - len(fgrid(C.PIXEL)) - 1)
    cell(king, "KING")
    cell(lambda im: fighter(im, "BYTE", 20, 34, flip=True), "CHASER")
    cell(lambda im: star(im, 20, 20, "Y"), "PUNCH")
    def ped(im):
        p = im.load(); dais(p, im.width, im.height, 20, 26)
    cell(ped, "DAIS", (52, 40))
    W = sum(im.width * 2 + 16 for _, im in items) + 16
    sheet = Image.new("RGBA", (W, 110), (*PAL["u"], 255)); x = 12
    for lab, im in items:
        up = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        sheet.alpha_composite(up, (x, 10))
        lb = pf.text(lab, 1, (235, 232, 245)); sheet.alpha_composite(lb, (x + up.width // 2 - lb.width // 2, 92))
        x += up.width + 16
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "crown_assets.png"))
    print("wrote crown_assets.png")

if __name__ == "__main__":
    assets(); arena(); arena2(); print("done")
