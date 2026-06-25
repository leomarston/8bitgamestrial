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

# ---------------------------------------------------------------------------
# glossy bubble ring (drawn over a fighter); light/dark = owner colour
# ---------------------------------------------------------------------------
def bubble(img, cx, cy, r, light, dark):
    px = img.load(); w, h = img.size
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            d = math.hypot(x - cx, y - cy)
            if r - 0.4 <= d <= r + 0.5: setpx(px, w, h, x, y, col("K"))
            elif r - 2.6 <= d < r - 0.4:
                c = light if (x - cx) + (y - cy) < -1 else (dark if (x - cx) + (y - cy) > 2 else light)
                setpx(px, w, h, x, y, (*c, 255))
    # shine: white arc top-left + a glint
    for t in range(20, 70, 6):
        a = math.radians(t)
        setpx(px, w, h, int(cx + (r - 4) * -math.cos(a)), int(cy + (r - 4) * -math.sin(a)), col("W"))
    setpx(px, w, h, cx - r // 2, cy - r // 2 - 1, col("W")); setpx(px, w, h, cx - r // 2 + 1, cy - r // 2 - 1, col("W"))
    # faint cyan reflection bottom-right
    setpx(px, w, h, cx + r // 2, cy + r // 3, col("C"))

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
    def b1(im): fighter(im, "PIXEL", 17, 26); bubble(im, 17, 17, 15, PAL["R"], PAL["r"])
    def b2(im): fighter(im, "BYTE", 17, 26); bubble(im, 17, 17, 15, PAL["B"], PAL["b"])
    cell(b1, "P1 BUBBLE"); cell(b2, "P2 BUBBLE")
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
    # ---- tile floor (paint pattern: red bottom-left, blue top-right, neutral middle) ----
    cols, rows = fw // 16, fh // 16
    ox = fx + (fw - cols * 16) // 2; oy = fy + (fh - rows * 16) // 2
    def state(c, r):
        import random as _r
        v = (c / cols) - (r / rows)
        if v < -0.28: return 2
        if v > 0.30: return 1
        return (1 if ((c * 7 + r * 5) % 5 == 0) else (2 if ((c * 3 + r) % 6 == 0) else 0))
    for r in range(rows):
        for c in range(cols):
            img.alpha_composite(TILES[state(c, r)], (ox + c * 16, oy + r * 16))
    # ---- bumpers ----
    bumper(img, ox + cols * 16 // 2, oy + rows * 16 // 2, 11)
    bumper(img, ox + 16 * 2 + 8, oy + 16 + 8, 8); bumper(img, ox + fw - 40, oy + fh - 36, 8)
    # ---- a paint trail + the two bubbles mid-roll, bumping ----
    p1x, p1y = ox + 16 * 3, oy + rows * 16 - 30
    p2x, p2y = ox + cols * 16 - 56, oy + 40
    for (tx, ty) in [(p1x - 30, p1y + 8), (p1x - 16, p1y + 6)]:
        img.alpha_composite(TILE_R, ((tx // 16) * 16, (ty // 16) * 16))
    fighter(img, "PIXEL", p1x, p1y + 14); bubble(img, p1x, p1y, 16, PAL["R"], PAL["r"])
    fighter(img, "BYTE", p2x, p2y + 14, flip=True); bubble(img, p2x, p2y, 16, PAL["B"], PAL["b"])
    star(img, (p1x + p2x) // 2, (p1y + p2y) // 2, "Y")  # bump spark
    # ---- player name tags ----
    t1 = pf.text("P1", 1, (255, 255, 255)); img.alpha_composite(t1, (p1x - 4, p1y - 24))
    t2 = pf.text("P2", 1, (255, 255, 255)); img.alpha_composite(t2, (p2x - 4, p2y - 24))

    up = img.resize((W * SC, H * SC), Image.NEAREST)
    up.convert("RGB").save(os.path.join(OUT, "tilebangers_arena.png"))
    print("wrote tilebangers_arena.png", up.size)

if __name__ == "__main__":
    assets_sheet(); arena(); print("done")
