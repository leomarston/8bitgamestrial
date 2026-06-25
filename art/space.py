"""
8-bit art for METEOR DERBY (our space-dodge). Two pilots in round shuttle pods
share a lane, shoving each other while meteor blocks and glowing ice crystals
rain down. Dark starfield, white capsule pods (pilot in a glass dome, blue fins,
flame), chunky rock obstacles. Composed low-res then nearest-upscaled.
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
    "K": (10, 10, 24), "D": (18, 20, 46), "N": (40, 46, 96), "W": (244, 247, 255),
    "S": (198, 205, 224), "s": (138, 146, 172), "t": (92, 99, 128), "B": (74, 126, 236),
    "b": (40, 72, 176), "Y": (255, 214, 80), "O": (255, 138, 46), "G": (118, 224, 150),
    "C": (198, 242, 255), "R": (236, 74, 76), "F": (240, 200, 150), "M": (150, 158, 182),
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
# the shuttle pod. '.' inside the dome is transparent so the pilot shows through.
# left side is white-lit (W), right side falls into shadow (S/s) for roundness.
SHUTTLE = spr("""
..........RR..........
..........Rb..........
..........tt..........
.........tKKt.........
........tKSWSKt........
.......tKSWWWSKt.......
......KKKWWWWSSKK......
.....KWWWWWWWWSSSK.....
....KWWWWWWWWWWSSSK....
....KWWCCCCCCCCCWSSK...
...KWWC.........CWSSK..
...KWC...........CWSK..
...KWC...........CWSK..
...KWC...........CWSK..
...KWC...........CWSK..
...KWWC.........CWSSK..
....KWWCCCCCCCCCWSSK...
....KWWWWWWWWWWWSSSK...
...KBBBBBBBBBBBBBBBBK..
...KbbbBBBBBBBBBbbbbK..
...KWWWWWWWWWWSSSSSSK..
..KWWWWWWWWWWWSSSSSSSK.
..KWWWWWWWsssWSSSSSSSK.
..KWSWWWWWsssWSSSSSsSK.
.KBBKWWWWWsssWWSSSSKBBK
KBBBBKWWWWWWWWWWSSKBBBBK
KBBBB.KWWWWWWWWWSK.BBBBK
.KBB...KKKKKKKKKKK..BBK.
..........WWW..........
.........WWYWWW........
........OOYYWYYOO......
........OYWWWWYO.......
.........OYYWYO........
.........OOYYOO........
..........OYO.........
...........O..........
""")

# a cratered asteroid — lit from the upper-left, shadowed lower-right
METEOR = spr("""
.....CttttttC.....
...CtMMMMMMMMttC...
..tMMWWWMMMMMMMtt..
.tMWWWWMMMMsssMMtt.
.tMWWMMMMMMsssMMMt.
tMMMMMMMMMMsssMMMtt
tMMMsssMMMMMMMMMMtt
tMMsssssMMMMWWMMMtt
tMMsssssMMMMWWMMtttt
tMMMsssMMMMMMMMtttt.
.tMMMMMMMMsssMMttt..
.tMMMMMMMMsssMtttt..
..tMMMMMMMsssMttt...
...CttMMMMMMtttC...
.....CttttttC......
""")


def face(img, name, cx, cy):
    """draw the pilot's head (top of the fighter sprite) centred in the glass dome"""
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); hh = min(10, len(rows))
    px = img.load()
    for ry in range(hh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: sp(px, img.width, img.height, cx - rw // 2 + rx, cy - hh // 2 + ry, (*cc, 255))

def shuttle(img, name, cx, topY, flip=False, dmg=0):
    """compose a pod: pilot head behind the glass, then the hull (window is
    transparent so the head shows), then damage cracks."""
    w = len(SHUTTLE[0])
    face(img, name, cx - 1, topY + 13)               # pilot head in the dome
    blit(img, SHUTTLE, cx - w // 2, topY, flip=flip)
    if dmg >= 1: _cracks(img, cx, topY, 1)
    if dmg >= 2: _cracks(img, cx, topY, 2)

def _cracks(img, cx, topY, lvl):
    px = img.load(); w = len(SHUTTLE[0]); ox = cx - w // 2
    seg1 = [(7, 21), (8, 22), (7, 23), (9, 23), (8, 24), (14, 20), (15, 21), (14, 22)]
    seg2 = [(6, 24), (10, 25), (11, 26), (16, 22), (13, 24), (9, 20), (12, 22), (7, 25)]
    for (dx, dy) in (seg1 if lvl == 1 else seg2):
        sp(px, img.width, img.height, ox + dx, topY + dy, col("K"))
        sp(px, img.width, img.height, ox + dx + 1, topY + dy, col("t"))
    if lvl == 2:                                       # extra scorch
        for (dx, dy) in [(5, 23), (17, 22), (6, 26), (16, 25)]:
            sp(px, img.width, img.height, ox + dx, topY + dy, col("K"))

def star(img, cx, cy, c="W"):
    px = img.load()
    for (gx, gy) in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]:
        sp(px, img.width, img.height, cx + gx, cy + gy, col(c))

# --------------------------------------------------------------------------
def bg(img, seed=5):
    """deep-space gradient + scattered stars (the static background)."""
    W, H = img.size; px = img.load()
    for y in range(H):
        t = y / H
        c = tuple(int(PAL["K"][i] + (PAL["D"][i] - PAL["K"][i]) * (0.5 + 0.5 * t)) for i in range(3))
        for x in range(W): px[x, y] = (*c, 255)
    random.seed(seed)
    for _ in range(70):                                # faint nebula band
        x, y = random.randint(0, W - 1), random.randint(int(H * 0.3), int(H * 0.7))
        if random.random() < 0.5: px[x, y] = (*PAL["N"], 255)
    for _ in range(150):                               # small stars
        x, y = random.randint(0, W - 1), random.randint(0, H - 1)
        r = random.random()
        px[x, y] = (*PAL["W" if r > 0.5 else ("C" if r > 0.25 else "s")], 255)
    for _ in range(10):                                # a few bright twinkles
        x, y = random.randint(2, W - 3), random.randint(2, H - 3)
        star(img, x, y, "W")

# --------------------------------------------------------------------------
def arena():
    W, H, SC = 240, 150, 4
    img = Image.new("RGBA", (W, H), col("K"))
    bg(img, 5)
    # falling obstacles (one type — meteors)
    blit(img, METEOR, 36, 26); blit(img, METEOR, 150, 56); blit(img, METEOR, 96, 16)
    blit(img, METEOR, 200, 96)
    # the two shuttles sharing the lane near the bottom
    laneTop = H - 42
    shuttle(img, "PIXEL", 80, laneTop, dmg=0)
    shuttle(img, "BYTE", 150, laneTop, flip=True, dmg=1)
    # HUD: 3 health pips per player
    pip = spr("GGG\nGGG\nGGG")
    img.alpha_composite(pf.text("PIXEL", 1, (255, 93, 108)), (6, 4))
    for i in range(3): blit(img, pip, 38 + i * 6, 4)
    img.alpha_composite(pf.text("BYTE", 1, (79, 184, 255)), (W - 64, 4))
    for i in range(3): blit(img, pip, W - 24 + i * 6, 4)
    img.resize((W * SC, H * SC), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "space_arena.png"))
    print("wrote space_arena.png")

def assets():
    SC = 7
    items = []
    def cell(fn, label, size=(48, 48)):
        im = Image.new("RGBA", size, (0, 0, 0, 0)); fn(im); items.append((label, im))
    cell(lambda im: shuttle(im, "PIXEL", 24, 6, dmg=0), "SHUTTLE")
    cell(lambda im: shuttle(im, "BYTE", 24, 6, dmg=1), "HIT x1")
    cell(lambda im: shuttle(im, "BYTE", 24, 6, dmg=2), "HIT x2")
    cell(lambda im: blit(im, METEOR, 16, 16), "METEOR")
    W = sum(im.width * 2 + 16 for _, im in items) + 16
    sheet = Image.new("RGBA", (W, 130), (*PAL["D"], 255)); x = 12
    for lab, im in items:
        up = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
        sheet.alpha_composite(up, (x, 8))
        lb = pf.text(lab, 1, (235, 232, 245)); sheet.alpha_composite(lb, (x + up.width // 2 - lb.width // 2, 112))
        x += up.width + 16
    sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).convert("RGB").save(os.path.join(OUT, "space_assets.png"))
    print("wrote space_assets.png")

SC_GAME = 4
LANE_Y = 122                                            # native pod-centre y (shared lane)

def sp_meta():
    return {"scale": SC_GAME, "bg": "space_bg.png", "laneY": LANE_Y, "spawn": [80, 160]}

def export_bg():
    img = Image.new("RGBA", (240, 150), col("K")); bg(img, 5)
    GAMEDIR = os.path.join(os.path.dirname(HERE), "game")
    img.convert("RGB").save(os.path.join(GAMEDIR, "space_bg.png"))
    print("wrote game/space_bg.png")

if __name__ == "__main__":
    assets(); arena(); export_bg(); print("done")
