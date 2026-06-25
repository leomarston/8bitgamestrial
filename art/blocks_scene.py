"""Compose a sandbox-platformer scene in the reference style (night, stone tower
with a wood doorway, grass-topped ledges with vines, crate, our characters)."""
from PIL import Image
import os
import blocks as B
from blocks import PAL, blit
from render import PALETTE as FPAL, grid as fgrid
import characters as C

OUT = B.OUT
TS = 16
WT, HT = 22, 13
W, H = WT * TS, HT * TS
SC = 4
GTOP = 11  # ground top row

def hsh(x, y, s=0):
    v = (x * 73856093) ^ (y * 19349663) ^ (s * 83492791)
    v = (v ^ (v >> 13)) & 0xffffffff
    return (v % 1000) / 1000.0

img = Image.new("RGBA", (W, H), (*PAL["A"], 255))
px = img.load()

# darker sky band up top + stars
for y in range(0, 40):
    for x in range(W):
        if y < 18: px[x, y] = (16, 24, 52, 255)
for i in range(80):
    x, y = int(hsh(i, 1) * W), int(hsh(i, 2) * (GTOP * TS - 10))
    px[x, y] = (*PAL["W"], 255)
    if i % 4 == 0 and x + 1 < W: px[x + 1, y] = (*PAL["W"], 255)

# background trees (scaled x2 silhouettes)
def tree(cx_tile, scale=2):
    t = Image.new("RGBA", (len(B.TREE_BG[0]), len(B.TREE_BG)), (0, 0, 0, 0))
    blit(t, B.TREE_BG, 0, 0)
    t = t.resize((t.width * scale, t.height * scale), Image.NEAREST)
    img.alpha_composite(t, (cx_tile * TS, GTOP * TS - t.height + 2))
tree(19, 3); tree(1, 2)

def put(spr, tx, ty): blit(img, spr, tx * TS, ty * TS)

# ground across (with one small gap to hint at parkour)
for x in range(WT):
    if x in (15, 16):   # a gap (pit)
        continue
    put(B.GROUND, x, GTOP)
    put(B.DIRT, x, GTOP + 1)

# stone tower with a wood doorway + grass cap
for ty in range(2, GTOP):
    for tx in range(4, 9):
        put(B.STONE_TOP if ty == 2 else B.STONE, tx, ty)
for ty in range(7, GTOP):           # wood doorway
    for tx in range(5, 8):
        put(B.WOOD, tx, ty)

# floating grass-topped ledges + hanging vines
def ledge(x0, x1, ty, vines=()):
    for tx in range(x0, x1 + 1):
        put(B.STONE_TOP, tx, ty); put(B.STONE, tx, ty + 1)
    for vx in vines:
        blit(img, B.VINE, vx * TS + 4, (ty + 2) * TS)
ledge(12, 14, 5, vines=(12, 14))
ledge(10, 11, 8, vines=(10,))
ledge(18, 21, 8, vines=(18, 21))
# a couple platforms to cross the pit
put(B.STONE_TOP, 15, 9); put(B.STONE_TOP, 16, 7)

# crate on the ground
put(B.CRATE, 2, GTOP - 1)
put(B.CRATE, 17, GTOP - 1)

# characters (our fighters) standing in the scene
def fighter(name, tx, feet_row, flip=False):
    rows = fgrid(getattr(C, name))
    w = len(rows[0]); h = len(rows)
    ox = tx * TS + (TS - w) // 2
    oy = feet_row * TS - h
    for ry in range(h):
        for rx in range(w):
            ch = rows[ry][w - 1 - rx] if flip else rows[ry][rx]
            c = FPAL.get(ch)
            if c is None: continue
            X, Y = ox + rx, oy + ry
            if 0 <= X < W and 0 <= Y < H: px[X, Y] = (*c, 255)

fighter("PIXEL", 9, GTOP)            # on the ground by the tower
fighter("NOVA", 13, 5, flip=True)    # on the high ledge
fighter("CHIP", 10, 8)               # on the mid ledge
fighter("BYTE", 19, GTOP)            # on the ground right

up = img.resize((W * SC, H * SC), Image.NEAREST)
up.convert("RGB").save(os.path.join(OUT, "blocks_scene.png"))
print("wrote blocks_scene.png", up.size)
