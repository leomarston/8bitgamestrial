"""
8-bit art for HOT POTATO. Two fighters scramble around a danger-yard; one is
stuck holding a lit bomb. PASS it by touching (or dashing into) your rival —
whoever's holding it when the fuse runs out gets blown up. Hazard-stripe arena,
TNT barrels for cover, a black bomb with a sparking fuse. Composed low-res then
nearest-upscaled (crisp pixels).
"""
from PIL import Image
import os, random
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

PAL = {
    "K": (26, 22, 32), "W": (245, 245, 250), "S": (176, 184, 198), "s": (108, 116, 132),
    "M": (48, 44, 60), "F": (96, 104, 120), "f": (72, 80, 96), "Y": (255, 208, 60),
    "y": (198, 150, 30), "R": (235, 72, 60), "r": (156, 40, 38), "O": (255, 142, 52),
    "o": (202, 98, 26), "C": (255, 240, 180), "D": (20, 18, 28), "U": (74, 118, 196),
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
# the lit bomb (black sphere + sparking fuse) — big idle / carried versions
BOMB = spr("""
.......C..
......CYC.
.......YO.
.......o..
......so..
.....ss...
...KKKKK..
..KMMMMMK.
.KMMMMMMMK
.KMSWMMMMK
KMMMMMMMMK
KMMMMMMMMK
KMMMMMMMMK
.KMMMMMMK.
.KMMMMMMK.
..KKMMKK..
...KKKK...
""")

BOMB_SMALL = spr("""
....C..
...CYC.
....YO.
....o..
..KKKK.
.KMMMMK
KMSWMMK
KMMMMMK
.KMMMK.
..KKK..
""")

# TNT barrel — solid cover to juke around
BARREL = spr("""
..KKKKKKKKKK..
.KSSSSSSSSSSK.
.KRRRRRRRRRrK.
.KRRRRRRRRRrK.
.KYYYYYYYYYyK.
.KyKyKyKyKyKK.
.KYYYYYYYYYyK.
.KRRRRRRRRRrK.
.KRRRRRRRRRrK.
.KRRRRRRRRRrK.
.KYYYYYYYYYyK.
.KyKyKyKyKyKK.
.KYYYYYYYYYyK.
.KRRRRRRRRRrK.
.KRRRRRRRRRrK.
.KSSSSSSSSSSK.
.KssssssssssK.
..KKKKKKKKKK..
""")

# explosion burst (drawn when the fuse runs out)
BOOM = spr("""
....K...K....K..
.K..KYK.KYK.K...
..K.YOYKYOY.K.K.
...KYOOYOOYK....
.KKYOORRROOYKK..
..KYORRWRRROYK..
.KYOORWWWROOYK.K
KKYORRWWWRRROYKK
.KYOORWWWROOYK.K
..KYORRWRRROYK..
.KKYOORRROOYKK..
...KYOOYOOYK....
..K.YOYKYOY.K.K.
.K..KYK.KYK.K...
....K...K....K..
""")

def fighter(img, name, cx, feetY, flip=False):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    px = img.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rw - 1 - rx] if flip else rows[ry][rx])
            if cc: sp(px, img.width, img.height, cx - rw // 2 + rx, feetY - rh + ry, (*cc, 255))

def star(img, cx, cy, c="C"):
    px = img.load()
    for (gx, gy) in [(0, 0), (2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, -1), (1, -1), (-1, 1)]:
        sp(px, img.width, img.height, cx + gx, cy + gy, col(c))

def disc(px, w, h, cx, cy, rw, rh, c):
    for y in range(int(cy - rh), int(cy + rh + 1)):
        for x in range(int(cx - rw), int(cx + rw + 1)):
            if ((x - cx) / rw) ** 2 + ((y - cy) / rh) ** 2 <= 1: sp(px, w, h, x, y, c)

# --------------------------------------------------------------------------
SC_GAME = 4
FX, FY, FW, FH = 4, 16, 232, 128                      # edge-to-edge floor
CX, CY = FX + FW // 2, FY + FH // 2                    # 120, 80
BARRELS = [(FX + 34, FY + 26), (FX + FW - 48, FY + 26),
           (FX + 34, FY + FH - 50), (FX + FW - 48, FY + FH - 50)]

def _stage(img, seed=7):
    W, H = img.size; px = img.load()
    random.seed(seed)
    for _ in range(70):                                # sparks in the dark header
        x, y = random.randint(0, W - 1), random.randint(0, FY + 2)
        px[x, y] = col(random.choice(["Y", "O", "R", "U", "W", "C"]))
    fx, fy, fw, fh = FX, FY, FW, FH
    for yy in range(fy, fy + fh):                       # steel checker floor
        for xx in range(fx, fx + fw):
            px[xx, yy] = col("F") if ((xx // 12) + (yy // 12)) % 2 == 0 else col("f")
    for t in range(1, 5):                               # diagonal hazard-stripe frame
        for xx in range(fx - t, fx + fw + t):
            for yy in (fy - t, fy + fh + t - 1): sp(px, W, H, xx, yy, col("Y") if ((xx + yy) // 3) % 2 == 0 else col("K"))
        for yy in range(fy - t, fy + fh + t):
            for xx in (fx - t, fx + fw + t - 1): sp(px, W, H, xx, yy, col("Y") if ((xx + yy) // 3) % 2 == 0 else col("K"))
    for xx in range(fx - 5, fx + fw + 5):              # black outline
        sp(px, W, H, xx, fy - 5, col("K")); sp(px, W, H, xx, fy + fh + 4, col("K"))
    for yy in range(fy - 5, fy + fh + 5):
        sp(px, W, H, fx - 5, yy, col("K")); sp(px, W, H, fx + fw + 4, yy, col("K"))
    return fx, fy, fw, fh

def _draw_actors(img, bomb=True):
    p1x, p1y = CX - 70, CY
    p2x, p2y = CX + 70, CY
    fighter(img, "PIXEL", p1x, p1y)
    fighter(img, "BYTE", p2x, p2y, flip=True)
    if bomb:                                            # bomb on P1's head (the carrier)
        blit(img, BOMB_SMALL, p1x - len(BOMB_SMALL[0]) // 2, p1y - len(fgrid(C.PIXEL)) - len(BOMB_SMALL))
        star(img, p1x + 6, p1y - len(fgrid(C.PIXEL)) - len(BOMB_SMALL) + 1, "C")

def _draw_yard(img, bomb=True, players=True):
    _stage(img); px = img.load(); W, H = img.size
    for (bx, by) in BARRELS:
        disc(px, W, H, bx + 7, by + len(BARREL) - 1, 7, 3, col("D"))   # ground shadow
        blit(img, BARREL, bx, by)
    if players: _draw_actors(img, bomb)

# ===========================================================================
# MAP 2 — a lush forest clearing (own palette). Hand-drawn leafy trees as cover,
# a hedge treeline frame, dappled grass, flowers, mushrooms, stones, grass tufts.
# ===========================================================================
FOR = {
    "K": (26, 30, 24), "W": (245, 248, 238), "G": (118, 194, 92), "g": (84, 156, 70),
    "d": (58, 116, 56), "T": (104, 182, 86), "t": (60, 130, 64), "H": (150, 98, 52),
    "h": (104, 64, 32), "U": (160, 216, 112), "u": (28, 66, 40), "R": (235, 86, 92),
    "Y": (255, 214, 84), "M": (240, 130, 196), "C": (214, 240, 150), "S": (150, 150, 160),
}
def fcol(k): return (*FOR[k], 255)

# big leafy tree with a deep-green outline so it pops off the grass
TREE = spr("""
.....uuuuuu.....
...uuTTTTTTuu...
..uTTTTTTTTTTu..
.uTTTTTCCTTTTTu.
.uTTTTTTTTTTTTu.
uTTTTTTTTTTTTTTu
uTTTCCTTTTTTtTTu
uTTTTTTTTTTtTTTu
uTTTTTTTTCCTTTTu
uTTtTTTTTTTTTTTu
.uTTTTTTTTTTTTu.
.uTTTtTTTTTTTu..
..uTTTTTTTTTTu..
...uuTTTTTTuu...
.....uuuuuu.....
......HHHH......
......HhhH......
......HhhH......
.....HHhhHH.....
....hHH..HHh....
""")
BUSH = spr("""
..uuuu..
.uTTTTu.
uTTCCTTu
uTTTtTTu
.uTTTTu.
..uuuu..
""")
MUSHROOM = spr("""
.uRRu.
uRWRWu
uRRRRu
.uHHu.
..hh..
""")
STONE = spr("""
.uSSu.
uSSSSu
.uKKu.
""")
TUFT = spr("""
U...U
UGgGU
..g..
""")
FLOWERS = [spr(".R.\nRYR\n.R."), spr(".M.\nMYM\n.M."), spr(".Y.\nYRY\n.Y."), spr(".W.\nWYW\n.W.")]
TREES = [(FX + 26, FY + 14), (FX + FW - 44, FY + 14), (FX + 26, FY + FH - 38), (FX + FW - 44, FY + FH - 38)]

def _forest_stage(img, seed=21):
    W, H = img.size; px = img.load()
    fx, fy, fw, fh = FX, FY, FW, FH
    random.seed(seed)
    for yy in range(fy, fy + fh):                        # flat base grass (calm, not static)
        for xx in range(fx, fx + fw): px[xx, yy] = fcol("G")
    for _ in range(16): disc(px, W, H, random.randint(fx, fx + fw), random.randint(fy, fy + fh), random.randint(10, 22), random.randint(6, 12), fcol("g"))
    for _ in range(10): disc(px, W, H, random.randint(fx, fx + fw), random.randint(fy, fy + fh), random.randint(6, 15), random.randint(4, 9), fcol("d"))
    for _ in range(7):  disc(px, W, H, random.randint(fx, fx + fw), random.randint(fy, fy + fh), random.randint(6, 14), random.randint(4, 8), fcol("U"))
    HB = 11                                              # deep-green treeline frame (scalloped, leafy)
    for yy in range(fy, fy + fh):
        for xx in range(fx, fx + fw):
            edge = min(xx - fx, fx + fw - 1 - xx, yy - fy, fy + fh - 1 - yy)
            if edge < HB - random.choice([0, 0, 1, 2, 3, 4]):
                px[xx, yy] = fcol("u" if edge < 3 else ("T" if random.random() < 0.5 else "t"))
    for xx in range(fx - 1, fx + fw + 1):               # outline
        sp(px, W, H, xx, fy - 1, fcol("K")); sp(px, W, H, xx, fy + fh, fcol("K"))
    for yy in range(fy - 1, fy + fh + 1):
        sp(px, W, H, fx - 1, yy, fcol("K")); sp(px, W, H, fx + fw, yy, fcol("K"))
    def place(rows, n):                                  # scatter clear decorations on the grass
        for _ in range(n):
            x = random.randint(fx + HB + 2, fx + fw - HB - 2 - len(rows[0]))
            y = random.randint(fy + HB + 2, fy + fh - HB - 2 - len(rows))
            blit(img, rows, x, y, pal=FOR)
    for fl in FLOWERS: place(fl, 7)
    place(MUSHROOM, 6); place(STONE, 5); place(TUFT, 24); place(BUSH, 4)
    return fx, fy, fw, fh

def _draw_forest(img, bomb=True, players=True):
    _forest_stage(img); px = img.load(); W, H = img.size
    for (tx, ty) in TREES:
        disc(px, W, H, tx + len(TREE[0]) // 2, ty + len(TREE), 9, 3, fcol("u"))   # shadow
        blit(img, TREE, tx, ty, pal=FOR)
    if players: _draw_actors(img, bomb)

# --------------------------------------------------------------------------
def rectf(px, W, H, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1)):
        for x in range(max(0, x0), min(W, x1)): px[x, y] = c
def orect(px, W, H, x0, y0, x1, y1, c, t=1):
    for k in range(t):
        for x in range(x0, x1): sp(px, W, H, x, y0 + k, c); sp(px, W, H, x, y1 - 1 - k, c)
        for y in range(y0, y1): sp(px, W, H, x0 + k, y, c); sp(px, W, H, x1 - 1 - k, y, c)

# ===========================================================================
# MAP 2 — THE STREET (crossroads). Four solid building blocks split the floor
# into a +-shaped network of roads: a corridor layout, not an open box.
# ===========================================================================
STR = {
    "K": (22, 22, 28), "W": (236, 238, 244), "D": (60, 62, 70), "d": (46, 48, 56),
    "S": (170, 172, 182), "s": (122, 124, 134), "Y": (245, 206, 70), "R": (184, 80, 64),
    "r": (122, 50, 42), "T": (202, 174, 122), "t": (150, 118, 72), "U": (98, 130, 198),
    "u": (54, 74, 140), "G": (140, 208, 234), "M": (40, 40, 48), "C": (232, 184, 96),
}
def scol(k): return (*STR[k], 255)
RW, SW = 26, 5                                            # half road width, sidewalk width
def _street_rects():
    vL, vR, hT, hB = CX - RW, CX + RW, CY - RW, CY + RW
    # each house's 2 entrances face the two roads it borders
    return [(FX, FY, vL - SW, hT - SW, "R", {"right", "bottom"}),
            (vR + SW, FY, FX + FW, hT - SW, "U", {"left", "bottom"}),
            (FX, hB + SW, vL - SW, FY + FH, "T", {"right", "top"}),
            (vR + SW, hB + SW, FX + FW, FY + FH, "U", {"left", "top"})]

WT, DW = 4, 20                                            # wall thickness, doorway width
def _house_walls(x0, y0, x1, y1, doors):
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    gx0, gx1, gy0, gy1 = cx - DW // 2, cx + DW // 2, cy - DW // 2, cy + DW // 2
    w = []
    w += ([(x0, y0, gx0, y0 + WT), (gx1, y0, x1, y0 + WT)] if "top" in doors else [(x0, y0, x1, y0 + WT)])
    w += ([(x0, y1 - WT, gx0, y1), (gx1, y1 - WT, x1, y1)] if "bottom" in doors else [(x0, y1 - WT, x1, y1)])
    w += ([(x0, y0, x0 + WT, gy0), (x0, gy1, x0 + WT, y1)] if "left" in doors else [(x0, y0, x0 + WT, y1)])
    w += ([(x1 - WT, y0, x1, gy0), (x1 - WT, gy1, x1, y1)] if "right" in doors else [(x1 - WT, y0, x1, y1)])
    return w

def _bld(px, W, H, x0, y0, x1, y1, ck, doors):
    dk = ck.lower()
    rectf(px, W, H, x0, y0, x1, y1, scol("C"))            # warm interior floor
    for gy in range(y0, y1, 7):                           # plank lines
        for gx in range(x0, x1): sp(px, W, H, gx, gy, scol("t"))
    cxm, cym = (x0 + x1) // 2, (y0 + y1) // 2             # little rug inside
    rug = "U" if ck != "U" else "R"
    rectf(px, W, H, cxm - 11, cym - 5, cxm + 11, cym + 5, scol(rug)); orect(px, W, H, cxm - 11, cym - 5, cxm + 11, cym + 5, scol("K"))
    for (wx0, wy0, wx1, wy1) in _house_walls(x0, y0, x1, y1, doors):   # brick walls (with door gaps)
        rectf(px, W, H, wx0, wy0, wx1, wy1, scol(ck))
        for x in range(wx0, wx1): sp(px, W, H, x, wy1 - 1, scol(dk))
        for y in range(wy0, wy1): sp(px, W, H, wx1 - 1, y, scol(dk))
        orect(px, W, H, wx0, wy0, wx1, wy1, scol("K"), 1)

def _draw_street(img, bomb=True, players=True):
    px = img.load(); W, H = img.size
    vL, vR, hT, hB = CX - RW, CX + RW, CY - RW, CY + RW
    rectf(px, W, H, FX, FY, FX + FW, FY + FH, scol("S"))  # sidewalk base
    for y in range(FY, FY + FH, 10):                      # sidewalk seams
        for x in range(FX, FX + FW): sp(px, W, H, x, y, scol("s"))
    rectf(px, W, H, vL, FY, vR, FY + FH, scol("D"))       # vertical road
    rectf(px, W, H, FX, hT, FX + FW, hB, scol("D"))       # horizontal road
    import random as _r; _r.seed(3)
    for _ in range(260):
        x, y = _r.randint(FX, FX + FW - 1), _r.randint(FY, FY + FH - 1)
        if (vL <= x < vR or hT <= y < hB): sp(px, W, H, x, y, scol("d"))
    for y in range(FY, FY + FH, 9):                       # dashed centre line (vertical)
        for k in range(5): sp(px, W, H, CX - 1, y + k, scol("Y")); sp(px, W, H, CX, y + k, scol("Y"))
    for x in range(FX, FX + FW, 9):                       # dashed centre line (horizontal)
        for k in range(5): sp(px, W, H, x + k, CY - 1, scol("Y")); sp(px, W, H, x + k, CY, scol("Y"))
    for y in (hT, hB - 1):                                # crosswalk stripes (horizontal road ends)
        pass
    for x in range(vL + 2, vR - 2, 6):                    # crosswalks across the vertical road
        rectf(px, W, H, x, hT - 4, x + 3, hT - 1, scol("W")); rectf(px, W, H, x, hB + 1, x + 3, hB + 4, scol("W"))
    for y in range(hT + 2, hB - 2, 6):                    # crosswalks across the horizontal road
        rectf(px, W, H, vL - 4, y, vL - 1, y + 3, scol("W")); rectf(px, W, H, vR + 1, y, vR + 4, y + 3, scol("W"))
    for (x0, y0, x1, y1, ck, doors) in _street_rects(): _bld(px, W, H, x0, y0, x1, y1, ck, doors)
    if players: _draw_actors(img, bomb)

# ===========================================================================
# MAP 3 — THE HOUSE (interior). A + of walls with doorway gaps makes four rooms;
# furniture is solid cover. A room-to-room chase, totally unlike the open arena.
# ===========================================================================
HOU = {
    "K": (34, 28, 26), "W": (247, 244, 236), "Fl": (190, 142, 88), "fl": (150, 104, 60),
    "Wl": (218, 210, 196), "wl": (168, 160, 144), "Tb": (140, 92, 52), "tb": (98, 60, 32),
    "So": (96, 140, 196), "so": (58, 92, 150), "Rg": (200, 76, 76), "rg": (150, 46, 52),
    "Pl": (86, 172, 92), "pl": (52, 120, 64), "G": (150, 205, 230), "Y": (240, 206, 90),
}
def hcol(k): return (*HOU[k], 255)
_VW0, _VW1, _HW0, _HW1 = CX - 3, CX + 3, CY - 3, CY + 3
HOUSE_WALLS = [
    (_VW0, FY, _VW1, FY + 24), (_VW0, FY + 44, _VW1, FY + FH - 44), (_VW0, FY + FH - 24, _VW1, FY + FH),
    (FX, _HW0, FX + 24, _HW1), (FX + 44, _HW0, FX + FW - 44, _HW1), (FX + FW - 24, _HW0, FX + FW, _HW1),
]
HOUSE_FURN = []          # empty rooms — no furniture

def _furn(px, W, H, x0, y0, x1, y1, k):
    if k == "bed":
        rectf(px, W, H, x0, y0, x1, y1, hcol("tb")); rectf(px, W, H, x0 + 1, y0 + 6, x1 - 1, y1 - 1, hcol("So"))
        rectf(px, W, H, x0 + 2, y0 + 2, x0 + 16, y0 + 11, hcol("W"))
    elif k == "sofa":
        rectf(px, W, H, x0, y0, x1, y1, hcol("so")); rectf(px, W, H, x0 + 2, y0 + 5, x1 - 2, y1 - 2, hcol("So"))
        for cx in range(x0 + 4, x1 - 6, 14): rectf(px, W, H, cx, y0 + 6, cx + 10, y1 - 4, hcol("so"))
    elif k == "table":
        rectf(px, W, H, x0, y0, x1, y1, hcol("Tb"))
        for (lx, ly) in [(x0, y0), (x1 - 3, y0), (x0, y1 - 3), (x1 - 3, y1 - 3)]: rectf(px, W, H, lx, ly, lx + 3, ly + 3, hcol("tb"))
        rectf(px, W, H, x0 + 6, y0 + 5, x1 - 6, y1 - 5, hcol("tb"))
    elif k == "shelf":
        rectf(px, W, H, x0, y0, x1, y1, hcol("tb"))
        books = ["Rg", "So", "Y", "Pl"]
        for i, bx in enumerate(range(x0 + 2, x1 - 3, 5)): rectf(px, W, H, bx, y0 + 2, bx + 4, y1 - 2, hcol(books[i % 4]))
    orect(px, W, H, x0, y0, x1, y1, hcol("K"), 1)

def _draw_house(img, bomb=True, players=True):
    px = img.load(); W, H = img.size
    for y in range(FY, FY + FH):                          # wood plank floor
        band = (y // 9) % 2
        for x in range(FX, FX + FW):
            c = "Fl" if band == 0 else "fl"
            if y % 9 == 0 or (x + band * 18) % 36 == 0: c = "fl"
            px[x, y] = hcol(c)
    for t in range(4):                                   # outer house walls
        for x in range(FX, FX + FW): sp(px, W, H, x, FY + t, hcol("Wl")); sp(px, W, H, x, FY + FH - 1 - t, hcol("Wl"))
        for y in range(FY, FY + FH): sp(px, W, H, FX + t, y, hcol("Wl")); sp(px, W, H, FX + FW - 1 - t, y, hcol("Wl"))
    orect(px, W, H, FX, FY, FX + FW, FY + FH, hcol("K"), 1)
    for (x0, y0, x1, y1) in HOUSE_WALLS:                  # walls
        rectf(px, W, H, x0, y0, x1, y1, hcol("Wl"))
        for x in range(x0, x1): sp(px, W, H, x, y0, hcol("W"))
        orect(px, W, H, x0, y0, x1, y1, hcol("K"), 1)
    for (x0, y0, x1, y1, k) in HOUSE_FURN: _furn(px, W, H, x0, y0, x1, y1, k)
    if players: _draw_actors(img, bomb)

# --------------------------------------------------------------------------
def yard_obs(): return [{"type": "circle", "x": bx + 7, "y": by + 13, "r": 6} for (bx, by) in BARRELS]
def street_obs():
    obs = []
    for (x0, y0, x1, y1, ck, doors) in _street_rects():
        for (wx0, wy0, wx1, wy1) in _house_walls(x0, y0, x1, y1, doors):
            obs.append({"type": "rect", "x": wx0, "y": wy0, "w": wx1 - wx0, "h": wy1 - wy0})
    return obs
def house_obs():
    return ([{"type": "rect", "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0} for (x0, y0, x1, y1) in HOUSE_WALLS]
            + [{"type": "rect", "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0} for (x0, y0, x1, y1, k) in HOUSE_FURN])

def _hud(img):
    px = img.load(); W, H = img.size
    for yy in range(0, 13):                              # clean top HUD bar
        for xx in range(W): px[xx, yy] = col("D")
    for xx in range(W): px[xx, 13] = col("K")
    blit(img, BOMB_SMALL, 5, 2)
    img.alpha_composite(pf.text("PIXEL", 1, (235, 72, 60)), (16, 4))
    f = pf.text("FUSE 4.2", 1, (255, 208, 60)); img.alpha_composite(f, (W // 2 - f.width // 2, 4))
    b = pf.text("BYTE", 1, (74, 118, 196)); img.alpha_composite(b, (W - 6 - b.width, 4))

# three structurally-different arenas: open yard / street crossroads / house rooms
MAPS = [
    {"bg": "hotpotato_map1.png", "mock": "hotpotato_arena.png", "draw": _draw_yard, "obs": yard_obs,
     "spawn": {"p": [[60, CY], [180, CY], [CX, 40], [CX, 120]]}},          # central spread, clear of barrels
    {"bg": "hotpotato_map2.png", "mock": "hotpotato_arena2.png", "draw": _draw_street, "obs": street_obs,
     "spawn": {"p": [[FX + 12, CY], [FX + FW - 12, CY], [CX, FY + 12], [CX, FY + FH - 12]]}},   # four road arms
    {"bg": "hotpotato_map3.png", "mock": "hotpotato_arena3.png", "draw": _draw_house, "obs": house_obs,
     "spawn": {"p": [[60, FY + 28], [FX + FW - 60, FY + 28], [60, FY + FH - 28], [FX + FW - 60, FY + FH - 28]]}},   # one per room
]

def arena():
    W, H, SC = 240, 150, 4
    for m in MAPS:
        img = Image.new("RGBA", (W, H), col("D"))
        m["draw"](img, bomb=True, players=True); _hud(img)
        img.resize((W * SC, H * SC), Image.NEAREST).convert("RGB").save(os.path.join(OUT, m["mock"]))
        print("wrote", m["mock"])

def hp_meta():
    bounds = {"l": FX + 8, "r": FX + FW - 8, "t": FY + 6, "b": FY + FH - 4}
    return [{"bg": m["bg"], "scale": SC_GAME, "bounds": bounds, "spawn": m["spawn"], "obstacles": m["obs"]()} for m in MAPS]

def export_bg():
    GAMEDIR = os.path.join(os.path.dirname(HERE), "game")
    for m in MAPS:
        img = Image.new("RGBA", (240, 150), col("D"))
        m["draw"](img, bomb=False, players=False)
        img.convert("RGB").save(os.path.join(GAMEDIR, m["bg"]))
        print("wrote game/" + m["bg"])

def assets():
    SC = 7
    items = []
    def cell(fn, label, size=(40, 40)):
        im = Image.new("RGBA", size, (0, 0, 0, 0)); fn(im); items.append((label, im))
    cell(lambda im: blit(im, BOMB, 15, 12), "BOMB")
    cell(lambda im: blit(im, BARREL, 13, 11), "BARREL")
    def carry(im): fighter(im, "PIXEL", 20, 36); blit(im, BOMB_SMALL, 20 - len(BOMB_SMALL[0]) // 2, 36 - len(fgrid(C.PIXEL)) - len(BOMB_SMALL) - 1)
    cell(carry, "CARRY")
    cell(lambda im: fighter(im, "BYTE", 20, 36, flip=True), "RUNNER")
    cell(lambda im: blit(im, BOOM, 12, 12), "BOOM")
    W = sum(im.width * 2 + 16 for _, im in items) + 16
    sheet = Image.new("RGBA", (W, 112), (*PAL["D"], 255)); x = 12
    for lab, im in items:
        up = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        sheet.alpha_composite(up, (x, 10))
        lb = pf.text(lab, 1, (235, 232, 245)); sheet.alpha_composite(lb, (x + up.width // 2 - lb.width // 2, 94))
        x += up.width + 16
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "hotpotato_assets.png"))
    print("wrote hotpotato_assets.png")

if __name__ == "__main__":
    assets(); arena(); export_bg(); print("done")
