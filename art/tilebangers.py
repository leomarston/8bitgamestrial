"""
8-bit art for TILE BLITZ (our take on Party Panic's "Tile Bangers"):
two fighters in glossy bubbles roll over a tiled stage to paint it their colour,
bumping & punching each other. Bright, party-arcade palette. Composed low-res
then nearest-upscaled (crisp pixels).
"""
from PIL import Image
import os, math
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

PAL = {
    "K": (32, 20, 56), "W": (255, 255, 255), "N": (185, 179, 207), "n": (132, 126, 166),
    "R": (255, 93, 108), "r": (194, 51, 80), "B": (79, 184, 255), "b": (36, 98, 192),
    "Y": (255, 210, 62), "C": (189, 234, 255), "P": (122, 69, 200), "p": (67, 40, 111),
    "G": (79, 214, 107), "M": (255, 122, 208), "D": (38, 28, 74),
}
def col(k): return (*PAL[k], 255)

def setpx(px, w, h, x, y, c):
    if 0 <= x < w and 0 <= y < h: px[x, y] = c

# ---------------------------------------------------------------------------
# glossy beveled floor tile (16x16) tinted to an owner
# ---------------------------------------------------------------------------
def tile(light, dark, gloss=(255, 255, 255)):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); px = im.load()
    for y in range(16):
        for x in range(16):
            c = light
            if x == 15 or y == 15: c = dark            # bevel / grid line
            elif x == 0 or y == 0: c = light
            px[x, y] = (*c, 255)
    for (gx, gy) in [(2, 2), (3, 2), (2, 3), (4, 2), (2, 4)]: px[gx, gy] = (*gloss, 255)  # shine
    return im
TILE_N = tile(PAL["N"], PAL["n"], (230, 227, 240))
TILE_R = tile(PAL["R"], PAL["r"])
TILE_B = tile(PAL["B"], PAL["b"])
TILES = {0: TILE_N, 1: TILE_R, 2: TILE_B}

# ===========================================================================
# GAME EXPORT — a glossy beveled tile authored as one template that the game
# recolours per owner, a hand-drawn bumper, the playfield grid metadata, and a
# clean background PNG. Single source of truth shared by the art and the game.
# ===========================================================================
SC_GAME = 4
CELL, COLS, ROWS, OX, OY = 16, 14, 8, 8, 14          # native grid (x 8..232, y 14..142)
# h=highlight  o=body  #=grid-line/shadow  *=gloss
TILE_TEMPLATE = [
    "hhhhhhhhhhhhhhh#",
    "h**oooooooooooo#",
    "h*ooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "hoooooooooooooo#",
    "################",
]
TILE_COLORS = {
    "N": {"h": "#d6d2ea", "o": "#b9b3cf", "#": "#6b6690", "*": "#ffffff"},
    "R": {"h": "#ff9aa6", "o": "#ff5d6c", "#": "#b3324a", "*": "#ffe2e6"},
    "B": {"h": "#9bd8ff", "o": "#4fb8ff", "#": "#2356a8", "*": "#e2f3ff"},
    "G": {"h": "#a7f0a0", "o": "#6bd66b", "#": "#2f7a3a", "*": "#e6ffe0"},
    "Y": {"h": "#ffe6a0", "o": "#ffd54a", "#": "#a8842a", "*": "#fff6d8"},
}
BUMPER = [
    ".....KKKKKK.....",
    "...KKYYYYYYKK...",
    "..KYYYYYYYYYYK..",
    ".KYYYYYYYYYYYYK.",
    ".KYYYYYWWYYYYYK.",
    "KYYYYWWWWWWYYYYK",
    "KYYYWWWWWWWWYYYK",
    "KYYYWWCCCCWWYYYK",
    "KYYYWWCCCCWWYYYK",
    "KYYYWWWWWWWWYYYK",
    "KYYYYWWWWWWYYYYK",
    ".KYYYYYWWYYYYYK.",
    ".KYYYYYYYYYYYYK.",
    "..KYYYYYYYYYYK..",
    "...KKYYYYYYKK...",
    ".....KKKKKK.....",
]
BUMPER_CELLS = []          # no obstacles — a clean open paint floor

def tb_meta():
    def cc(c, r): return [OX + c * CELL + CELL // 2, OY + r * CELL + CELL // 2]
    return {
        "scale": SC_GAME, "cell": CELL, "cols": COLS, "rows": ROWS, "ox": OX, "oy": OY,
        "bounds": {"l": OX + 4, "r": OX + COLS * CELL - 4, "t": OY + 4, "b": OY + ROWS * CELL - 4},
        "bumpers": [{"x": cc(c, r)[0], "y": cc(c, r)[1], "cell": [c, r], "r": 7} for (c, r) in BUMPER_CELLS],
        "spawn": {"p": [cc(1, ROWS - 2), cc(COLS - 2, 1), cc(1, 1), cc(COLS - 2, ROWS - 2)]},
        "bg": "tileblitz_bg.png",
    }

def export_bg():
    import random
    W, H = 240, 150
    im = Image.new("RGBA", (W, H), (*PAL["D"], 255)); px = im.load()
    random.seed(4)
    for _ in range(150):
        x, y = random.randint(0, W - 1), random.randint(0, H - 1)
        px[x, y] = col(random.choice(["G", "M", "Y", "R", "B", "W", "P"]))
    gx0, gy0, gx1, gy1 = OX, OY, OX + COLS * CELL, OY + ROWS * CELL
    for t in range(1, 5):                              # beveled purple frame ring
        for x in range(gx0 - t, gx1 + t):
            for yy in (gy0 - t, gy1 + t - 1): setpx(px, W, H, x, yy, col("P") if (x + yy) % 2 == 0 else col("p"))
        for y in range(gy0 - t, gy1 + t):
            for xx in (gx0 - t, gx1 + t - 1): setpx(px, W, H, xx, y, col("P") if (xx + y) % 2 == 0 else col("p"))
    for x in range(gx0 - 5, gx1 + 5):                 # black outline
        setpx(px, W, H, x, gy0 - 5, col("K")); setpx(px, W, H, x, gy1 + 4, col("K"))
    for y in range(gy0 - 5, gy1 + 5):
        setpx(px, W, H, gx0 - 5, y, col("K")); setpx(px, W, H, gx1 + 4, y, col("K"))
    GAMEDIR = os.path.join(os.path.dirname(HERE), "game")
    im.convert("RGB").save(os.path.join(GAMEDIR, "tileblitz_bg.png"))
    print("wrote game/tileblitz_bg.png")

# ---------------------------------------------------------------------------
# colored ground pad under a fighter (marks who they are / their paint colour)
# ---------------------------------------------------------------------------
def pad(img, cx, feetY, light, dark):
    px = img.load(); w, h = img.size
    rw, rh = 11, 5
    for y in range(-rh, rh + 1):
        for x in range(-rw, rw + 1):
            d = (x / rw) ** 2 + (y / rh) ** 2
            if d <= 1.0:
                setpx(px, w, h, cx + x, feetY + y, (*(dark if d > 0.5 else light), 255))

def bumper(img, cx, cy, r):
    px = img.load(); w, h = img.size
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            d = math.hypot(x - cx, y - cy)
            if d <= r - 2: setpx(px, w, h, x, y, col("Y"))
            elif d <= r - 0.4: setpx(px, w, h, x, y, col("r") if (x - cx) + (y - cy) > 1 else col("Y"))
            elif d <= r + 0.5: setpx(px, w, h, x, y, col("K"))
    for (gx, gy) in [(-2, -3), (-3, -2), (-1, -3), (-3, -1)]: setpx(px, w, h, cx + gx, cy + gy, col("W"))
    # little star
    for (gx, gy) in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: setpx(px, w, h, cx + gx, cy + gy, col("W"))

def star(img, cx, cy, c="W"):
    px = img.load(); w, h = img.size
    for (gx, gy) in [(0, 0), (2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, -1), (1, -1), (-1, 1)]:
        setpx(px, w, h, cx + gx, cy + gy, col(c))

def fighter(img, name, cx, feetY, scale=1.0, flip=False):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    fimg = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = fimg.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rw - 1 - rx if flip else rx, ry] = (*cc, 255)
    if scale != 1.0: fimg = fimg.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(fimg, (cx - fimg.width // 2, feetY - fimg.height))

# ---------------------------------------------------------------------------
# assets sheet
# ---------------------------------------------------------------------------
def assets_sheet():
    SC = 6
    cells = []
    def cell(drawfn, label, size=(34, 34)):
        im = Image.new("RGBA", size, (0, 0, 0, 0)); drawfn(im); cells.append((label, im))
    cell(lambda im: im.alpha_composite(TILE_N, (9, 9)), "TILE")
    cell(lambda im: im.alpha_composite(TILE_R, (9, 9)), "P1 TILE")
    cell(lambda im: im.alpha_composite(TILE_B, (9, 9)), "P2 TILE")
    def b1(im): pad(im, 17, 29, PAL["R"], PAL["r"]); fighter(im, "PIXEL", 17, 31)
    def b2(im): pad(im, 17, 29, PAL["B"], PAL["b"]); fighter(im, "BYTE", 17, 31)
    cell(b1, "P1"); cell(b2, "P2")
    cell(lambda im: bumper(im, 17, 17, 13), "BUMPER")
    cell(lambda im: star(im, 17, 17, "Y"), "PUNCH")
    SCcanvas = Image.new("RGBA", (len(cells) * 60, 84), (*PAL["D"], 255))
    for i, (lab, im) in enumerate(cells):
        up = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        SCcanvas.alpha_composite(up, (i * 60 + 30 - up.width // 2, 6))
        lb = pf.text(lab, 1, (235, 232, 245)); SCcanvas.alpha_composite(lb, (i * 60 + 30 - lb.width // 2, 74))
    SCcanvas.resize((SCcanvas.width * 2, SCcanvas.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "tilebangers_assets.png"))

# ---------------------------------------------------------------------------
# arena mockup (the "map")
# ---------------------------------------------------------------------------
def arena():
    W, H, SC = 240, 150, 4
    img = Image.new("RGBA", (W, H), (*PAL["D"], 255)); px = img.load()
    # confetti background
    import random; random.seed(4)
    for _ in range(120):
        x, y = random.randint(0, W - 1), random.randint(18, H - 1)
        px[x, y] = col(random.choice(["G", "M", "Y", "R", "B", "W"]))
    # ---- HUD: timer + territory tug bar ----
    t = pf.text_shadow("0:28", 2, (255, 255, 255)); img.alpha_composite(t, (W // 2 - t.width // 2, 2))
    bx, by, bw, bh = 16, 11, W - 32, 6
    for x in range(bx, bx + bw):
        for y in range(by, by + bh): px[x, y] = col("n")
    redw = int(bw * 0.52); bluew = int(bw * 0.36)
    for x in range(bx, bx + redw):
        for y in range(by, by + bh): px[x, y] = col("R")
    for x in range(bx + bw - bluew, bx + bw):
        for y in range(by, by + bh): px[x, y] = col("B")
    for x in range(bx - 1, bx + bw + 1): px[x, by - 1] = col("K"); px[x, by + bh] = col("K")
    for y in range(by - 1, by + bh + 1): px[bx - 1, y] = col("K"); px[bx + bw, y] = col("K")
    # ---- arena frame ----
    fx, fy, fw, fh = 16, 24, W - 32, H - 30
    for x in range(fx - 4, fx + fw + 4):
        for y in range(fy - 4, fy + fh + 4):
            if x < fx or x >= fx + fw or y < fy or y >= fy + fh:
                px[x, y] = col("P") if (x + y) % 2 == 0 else col("p")
    for x in range(fx - 4, fx + fw + 4): px[x, fy - 4] = col("K"); px[x, fy + fh + 3] = col("K")
    for y in range(fy - 4, fy + fh + 4): px[fx - 4, y] = col("K"); px[fx + fw + 3, y] = col("K")
    # ---- tile floor: every painted tile snaps to the grid ----
    cols, rows = fw // 16, fh // 16
    ox = fx + (fw - cols * 16) // 2; oy = fy + (fh - rows * 16) // 2
    def cellxy(c, r): return (ox + c * 16, oy + r * 16)
    def state(c, r):
        v = (c / cols) - (r / rows)
        if v < -0.30: return 2
        if v > 0.32: return 1
        return (1 if ((c * 7 + r * 5) % 5 == 0) else (2 if ((c * 3 + r) % 6 == 0) else 0))
    grid = [[state(c, r) for c in range(cols)] for r in range(rows)]
    # players sit on grid cells; their cell + a short trail are painted (grid-aligned)
    p1c, p1r = 2, rows - 2
    p2c, p2r = cols - 3, 1
    for dc in range(-2, 1): grid[p1r][max(0, p1c + dc)] = 1
    for dc in range(0, 3): grid[p2r][min(cols - 1, p2c + dc)] = 2
    for r in range(rows):
        for c in range(cols):
            img.alpha_composite(TILES[grid[r][c]], cellxy(c, r))
    # ---- bumpers (centred on tile cells so nothing looks off-grid) ----
    for (bc, br) in [(cols // 2, rows // 2), (3, 1), (cols - 3, rows - 2)]:
        x, y = cellxy(bc, br); bumper(img, x + 8, y + 8, 9)
    # ---- the two fighters standing on their cells, with coloured pads ----
    x1, y1 = cellxy(p1c, p1r); cx1, fy1 = x1 + 8, y1 + 16
    x2, y2 = cellxy(p2c, p2r); cx2, fy2 = x2 + 8, y2 + 16
    pad(img, cx1, fy1 - 2, PAL["R"], PAL["r"]); fighter(img, "PIXEL", cx1, fy1)
    pad(img, cx2, fy2 - 2, PAL["B"], PAL["b"]); fighter(img, "BYTE", cx2, fy2, flip=True)
    t1 = pf.text("P1", 1, (255, 255, 255)); img.alpha_composite(t1, (cx1 - 4, fy1 - 36))
    t2 = pf.text("P2", 1, (255, 255, 255)); img.alpha_composite(t2, (cx2 - 4, fy2 - 36))

    up = img.resize((W * SC, H * SC), Image.NEAREST)
    up.convert("RGB").save(os.path.join(OUT, "tilebangers_arena.png"))
    print("wrote tilebangers_arena.png", up.size)

if __name__ == "__main__":
    assets_sheet(); arena(); export_bg(); print("done")
