"""Compose the full 4-bit cemetery scene (low-res, then nearest-neighbour upscale)."""
from PIL import Image
import random, os
import graveyard as GY
from graveyard import PAL, blit, spr
from render import PALETTE as FIGHT_PAL, grid as fgrid
import characters as C

OUT = GY.OUT
W, H, SC = 240, 152, 4
random.seed(7)

def C_(k): return (*PAL[k], 255)

def hsh(x, y, s=0):
    n = (x * 73856093) ^ (y * 19349663) ^ (s * 83492791)
    n = (n ^ (n >> 13)) & 0xffffffff
    return (n % 1000) / 1000.0

img = Image.new("RGBA", (W, H), C_("N"))
px = img.load()

# ---- sky : flat horizontal bands (no smooth gradient) ----
horizon = 46
bands = [("K", 0), ("N", 8), ("V", 20), ("v", 36)]
for i, (c, y0) in enumerate(bands):
    y1 = bands[i + 1][1] if i + 1 < len(bands) else horizon
    for y in range(y0, y1):
        for x in range(W): px[x, y] = C_(c)

# stars
for _ in range(70):
    x, y = random.randint(0, W - 1), random.randint(0, horizon - 6)
    px[x, y] = C_("W" if random.random() < .4 else "v")

# moon (flat disc + craters + dithered halo)
mx, my, mr = 198, 18, 11
for y in range(my - mr - 3, my + mr + 3):
    for x in range(mx - mr - 3, mx + mr + 3):
        if not (0 <= x < W and 0 <= y < H): continue
        d = ((x - mx) ** 2 + (y - my) ** 2) ** .5
        if d <= mr: px[x, y] = C_("W")
        elif d <= mr + 2 and (x + y) % 2 == 0: px[x, y] = C_("L")
for (cx, cy, cr) in [(-3, -2, 2), (4, 3, 2), (1, -5, 1), (-5, 4, 1)]:
    for y in range(-cr, cr + 1):
        for x in range(-cr, cr + 1):
            if x * x + y * y <= cr * cr:
                X, Y = mx + cx + x, my + cy + y
                if 0 <= X < W and 0 <= Y < H: px[X, Y] = C_("v")

# bats
for (bx, by) in [(150, 14), (120, 24), (60, 12), (90, 30), (40, 26)]:
    blit(img, GY.BAT, bx, by)

# distant ragged treeline silhouette along the horizon
for x in range(W):
    th = int(4 + 5 * abs(((x * 0.13) % 2) - 1) + 3 * hsh(x, 3))
    for y in range(horizon - th, horizon):
        if 0 <= y < H: px[x, y] = C_("N")

# ---- ground : grass with dithered texture, darker toward the bottom ----
for y in range(horizon, H):
    for x in range(W):
        r = hsh(x, y, 1)
        base = "g"
        if r < 0.10: base = "m"
        elif r > 0.60: base = "G"
        if y > H - 26 and r < 0.55: base = "G"   # darker toward the foreground
        px[x, y] = C_(base)

# back wall / fence with central gate
fy = horizon - 6
for x in range(0, W, len(GY.FENCE[0])):
    blit(img, GY.FENCE, x, fy)
for x in [6, 96, 142, 232]:                       # stone pillars
    blit(img, GY.PILLAR, x, fy - 5)
# gate gap + arch in the centre
gate_l, gate_r = 108, 132
for y in range(fy - 5, fy + 6):
    for x in range(gate_l, gate_r):
        if 0 <= x < W: px[x, y] = C_("g")          # open gateway (grass shows through)
blit(img, GY.PILLAR, gate_l - 6, fy - 6)
blit(img, GY.PILLAR, gate_r, fy - 6)
for x in range(gate_l - 6, gate_r + 6):            # arch top
    px[x, fy - 7] = C_("S"); px[x, fy - 8] = C_("M")
# CEMETERY plaque on the arch (tiny)
for x in range(gate_l - 2, gate_r + 2): px[x, fy - 6] = C_("K")

# ---- cobblestone path from gate down to the crypt ----
def cobbles(cx, y0, y1, halfw):
    for y in range(y0, y1):
        for x in range(cx - halfw, cx + halfw):
            if not (0 <= x < W): continue
            r = hsh(x // 3, y // 3, 5)
            px[x, y] = C_("S" if ((x // 3 + y // 3) % 2 == 0) else "M")
            if r < 0.15: px[x, y] = C_("D")
cobbles(120, horizon, 92, 9)

# ---- depth-sorted props (back to front) ----
crypt_w = len(GY.CRYPT[0])
props = []
props.append((78, lambda: blit(img, GY.CRYPT, 120 - crypt_w // 2, 50)))     # central crypt
props.append((70, lambda: blit(img, GY.DEAD_TREE, 8, 50, flip=True)))
props.append((72, lambda: blit(img, GY.DEAD_TREE, 214, 52)))

# tombstone field (avoid the central path & crypt)
stones = [GY.HEADSTONE, GY.HEADSTONE, GY.HEADSTONE, GY.BROKEN, GY.BROKEN, GY.TOMB]
plots_y = [96, 116, 136]
for ri, py in enumerate(plots_y):
    for cx in range(18, W - 18, 30):
        jx = int((hsh(cx, py, 2) - .5) * 8)
        x = cx + jx + (15 if ri % 2 else 0)
        if 96 <= x <= 150 and py < 110: continue   # keep monster space clear
        s = stones[int(hsh(x, py, 9) * len(stones)) % len(stones)]
        yy = py + int((hsh(x, py, 4) - .5) * 6)
        props.append((yy, (lambda s=s, x=x, yy=yy: (shadow(x + len(s[0]) // 2, yy + len(s), len(s[0])), blit(img, s, x, yy)))))

# lanterns flanking the path
props.append((90, lambda: (glow(104, 92, "Y"), blit(img, GY.LANTERN, 101, 84))))
props.append((90, lambda: (glow(136, 92, "Y"), blit(img, GY.LANTERN, 133, 84))))

# skulls + bone bits scattered
for _ in range(7):
    x, y = random.randint(20, W - 20), random.randint(100, H - 6)
    props.append((y, (lambda x=x, y=y: blit(img, GY.SKULL, x, y))))

def shadow(cx, by, w):
    for x in range(cx - w // 2, cx + w // 2):
        for y in range(by - 2, by + 1):
            if 0 <= x < W and 0 <= y < H and ((x + y) % 2 == 0):
                px[x, y] = C_("G")

def glow(cx, cy, col):
    for y in range(cy - 6, cy + 6):
        for x in range(cx - 6, cx + 6):
            if not (0 <= x < W and 0 <= y < H): continue
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if d <= 6 and (x + y) % 2 == 0 and px[x, y][:3] != PAL["K"]:
                if d <= 3 or (x + y) % 4 == 0: px[x, y] = C_(col)

for y, fn in sorted(props, key=lambda p: p[0]):
    fn()

# ---- monster in the middle (with eerie green dithered glow) ----
mons_x, mons_y = 120 - len(GY.MONSTER[0]) // 2, 84
glow(120, 96, "E")
shadow(120, 84 + len(GY.MONSTER), 16)
blit(img, GY.MONSTER, mons_x, mons_y)

# ---- two fighters dropped into the arena ----
def fighter(name, x, y, flip=False):
    rows = fgrid(getattr(C, name))
    fp = {k: (None if v is None else v) for k, v in FIGHT_PAL.items()}
    # ground shadow
    shadow(x + len(rows[0]) // 2, y + len(rows), len(rows[0]))
    p = img.load()
    h = len(rows); w = len(rows[0])
    for ry in range(h):
        for rx in range(w):
            ch = rows[ry][w - 1 - rx] if flip else rows[ry][rx]
            c = fp.get(ch)
            if c is None: continue
            X, Y = x + rx, y + ry
            if 0 <= X < W and 0 <= Y < H: p[X, Y] = (*c, 255)

fighter("PIXEL", 40, 112)
fighter("BYTE", 176, 112, flip=True)

# ---- low ground mist (dithered, dim) near the bottom ----
for y in range(H - 16, H):
    t = (y - (H - 16)) / 16
    for x in range(W):
        if hsh(x, y, 7) < 0.05 + t * 0.20:
            spark = hsh(x, y, 11) < 0.16 and (x + y) % 2 == 0
            px[x, y] = C_("W") if spark else C_("v")

# ---- vignette: darken the four edges with dither ----
for y in range(H):
    for x in range(W):
        edge = min(x, y - 0, W - 1 - x, H - 1 - y)
        if edge < 10 and (x + y) % 2 == 0 and hsh(x, y, 8) < (10 - edge) / 14:
            r, g, b, a = px[x, y]
            px[x, y] = (max(0, r - 30), max(0, g - 28), max(0, b - 24), 255)

up = img.resize((W * SC, H * SC), Image.NEAREST)
up.convert("RGB").save(os.path.join(OUT, "graveyard_scene.png"))
print("wrote graveyard_scene.png", up.size)
