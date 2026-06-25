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

def _draw_map(img, bomb=True, players=True):
    _stage(img); px = img.load(); W, H = img.size
    for (bx, by) in BARRELS:
        disc(px, W, H, bx + 7, by + len(BARREL) - 1, 7, 3, col("D"))   # ground shadow
        blit(img, BARREL, bx, by)
    if players:
        p1x, p1y = CX - 70, CY
        p2x, p2y = CX + 70, CY
        fighter(img, "PIXEL", p1x, p1y)
        fighter(img, "BYTE", p2x, p2y, flip=True)
        if bomb:                                        # bomb on P1's head (the carrier)
            blit(img, BOMB_SMALL, p1x - len(BOMB_SMALL[0]) // 2, p1y - len(fgrid(C.PIXEL)) - len(BOMB_SMALL))
            star(img, p1x + 6, p1y - len(fgrid(C.PIXEL)) - len(BOMB_SMALL) + 1, "C")

def _hud(img):
    px = img.load(); W, H = img.size
    for yy in range(0, 13):                              # clean top HUD bar
        for xx in range(W): px[xx, yy] = col("D")
    for xx in range(W): px[xx, 13] = col("K")
    blit(img, BOMB_SMALL, 5, 2)
    img.alpha_composite(pf.text("PIXEL", 1, (235, 72, 60)), (16, 4))
    f = pf.text("FUSE 4.2", 1, (255, 208, 60)); img.alpha_composite(f, (W // 2 - f.width // 2, 4))
    b = pf.text("BYTE", 1, (74, 118, 196)); img.alpha_composite(b, (W - 6 - b.width, 4))

def arena():
    W, H, SC = 240, 150, 4
    img = Image.new("RGBA", (W, H), col("D"))
    _draw_map(img, bomb=True, players=True)
    _hud(img)
    img.resize((W * SC, H * SC), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "hotpotato_arena.png"))
    print("wrote hotpotato_arena.png")

def hp_meta():
    return {
        "scale": SC_GAME, "bg": "hotpotato_bg.png",
        "bounds": {"l": FX + 8, "r": FX + FW - 8, "t": FY + 6, "b": FY + FH - 4},
        "obstacles": [{"type": "circle", "x": bx + 7, "y": by + 13, "r": 6} for (bx, by) in BARRELS],
        "spawn": {"p1": [CX - 70, CY], "p2": [CX + 70, CY]},
    }

def export_bg():
    img = Image.new("RGBA", (240, 150), col("D"))
    _draw_map(img, bomb=False, players=False)
    GAMEDIR = os.path.join(os.path.dirname(HERE), "game")
    img.convert("RGB").save(os.path.join(GAMEDIR, "hotpotato_bg.png"))
    print("wrote game/hotpotato_bg.png")

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
