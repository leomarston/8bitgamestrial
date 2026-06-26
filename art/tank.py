"""
8-bit art + map generator for TANK DUEL (our take on Atari Combat / Battle City).
Top-down battlefield: a FULL-BLEED maze (no decorative frame) of destructible
brick, solid steel, and water, laid out by a mirror-symmetric randomiser so all
four corners are fair. Native 240x150, nearest-upscaled x4 -> 960x600.
"""
from PIL import Image
import os, random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# palette
# ---------------------------------------------------------------------------
PAL = {
    ".": None,
    "k": (26, 24, 32),      # outline / darkest
    # ground
    "f": (52, 50, 43), "g": (62, 60, 50), "e": (43, 41, 35),
    # brick (destructible)
    "R": (172, 74, 52), "r": (206, 110, 80), "m": (104, 44, 34),
    # steel (solid)
    "S": (148, 156, 170), "s": (94, 102, 120), "W": (216, 222, 232), "d": (58, 64, 78),
    # water (no-drive, shoot-over)
    "B": (58, 116, 196), "b": (38, 84, 150), "c": (130, 178, 234),
    # bush (cover)
    "G": (74, 148, 70), "n": (46, 102, 50), "l": (122, 196, 98),
    # tank parts
    "T": (40, 40, 48), "t": (70, 70, 82),   # tread dark / light
    "U": (150, 158, 172), "u": (96, 104, 122),  # barrel/turret metal
    "C": (255, 255, 255), "o": (255, 255, 255),  # body (recoloured per player), o = body shade
}

def col(k): return (*PAL[k], 255)

# ---------------------------------------------------------------------------
# 16x16 tile art
# ---------------------------------------------------------------------------
BRICK = [
    "RrRRRRRmRrRRRRRm",
    "RRRRRRRmRRRRRRRm",
    "RRRRRRRmRRRRRRRm",
    "mmmmmmmmmmmmmmmm",
    "RRRmRrRRRRRmRrRR",
    "RRRmRRRRRRRmRRRR",
    "RRRmRRRRRRRmRRRR",
    "mmmmmmmmmmmmmmmm",
    "RrRRRRRmRrRRRRRm",
    "RRRRRRRmRRRRRRRm",
    "RRRRRRRmRRRRRRRm",
    "mmmmmmmmmmmmmmmm",
    "RRRmRrRRRRRmRrRR",
    "RRRmRRRRRRRmRRRR",
    "RRRmRRRRRRRmRRRR",
    "mmmmmmmmmmmmmmmm",
]
STEEL = [
    "WWSSSSSSSSSSSSds",
    "WWSSSSSSSSSSSSds",
    "SSSWWSSSSSSWWSds",
    "SSSWWSSSSSSWWSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "SSSWWSSSSSSWWSds",
    "SSSWWSSSSSSWWSds",
    "SSSSSSSSSSSSSSds",
    "SSSSSSSSSSSSSSds",
    "ssssssssssssssss",
    "dddddddddddddddd",
]
WATER = [
    "BBBBBBBBBBBBBBBB",
    "BBBcBBBBBBBcBBBB",
    "BBBBBBBBBBBBBBBB",
    "BcBBBBBcBBBBBBBB",
    "BBBBBBBBBBBBBccB",
    "BBBBBBBBBBBBBBBB",
    "BBBccBBBBBBBBBBB",
    "BBBBBBBBBBcBBBBB",
    "BBBBBBBBBBBBBBBB",
    "BBcBBBBBBBBBcBBB",
    "BBBBBBBBBBBBBBBB",
    "bBBBBBccBBBBBBBb",
    "BBBBBBBBBBBBBBBB",
    "BBBBBBBBBBBBccBB",
    "bBBBBBBBBBBBBBBb",
    "bbBBBBBBBBBBBBbb",
]
BUSH = [
    "nGnGGnGGnGGnGGnn",
    "GGlGGGGlGGGGlGGG",
    "GnGGGnGGGnGGGnGG",
    "GGGlGGGGlGGGGlGG",
    "nGGGGnGGGGnGGGGn",
    "GlGGGGlGGGGlGGGG",
    "GGGnGGGGnGGGGnGG",
    "GGGGGlGGGGGlGGGG",
    "nGGnGGGnGGGnGGGn",
    "GGlGGGGlGGGGlGGG",
    "GnGGGnGGGnGGGnGG",
    "GGGlGGGGlGGGGlGG",
    "nGGGGnGGGGnGGGGn",
    "GlGGGGlGGGGlGGGG",
    "GGGnGGGGnGGGGnGG",
    "nGnGGnGGnGGnGGnn",
]

def render_tile(rows):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = PAL.get(ch)
            if c: px[x, y] = (*c, 255)
    return im

def render_floor(seed=0):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); px = im.load()
    rnd = random.Random(seed)
    for y in range(16):
        for x in range(16):
            r = rnd.random()
            px[x, y] = col("g") if r < 0.06 else (col("e") if r < 0.12 else col("f"))
    return im

TILE_IMG = {1: render_tile(BRICK), 2: render_tile(STEEL), 3: render_tile(WATER), 4: render_tile(BUSH)}

# ---------------------------------------------------------------------------
# top-down tank (barrel points UP); recoloured per player, rotated per facing
# ---------------------------------------------------------------------------
TANK = [
    ".......UU.......",
    ".......UU.......",
    ".......UU.......",
    ".TTT..kUUk..TTT.",
    ".TtTkkCCCCkkTtT.",
    ".TTTkCCCCCCkTTT.",
    ".TtTkCooooCkTtT.",
    ".TTTkCouuoCkTTT.",
    ".TtTkCouuoCkTtT.",
    ".TTTkCooooCkTTT.",
    ".TtTkCCCCCCkTtT.",
    ".TTTkkCCCCkkTTT.",
    ".TtT.kkkkkk.TtT.",
    ".TTT........TTT.",
    ".TtT........TtT.",
    "................",
]

def hexcol(h):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

def render_tank(body_hex):
    body = hexcol(body_hex)
    shade = tuple(max(0, int(c * 0.62)) for c in body)
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0)); px = im.load()
    for y, row in enumerate(TANK):
        for x, ch in enumerate(row):
            if ch == "C": px[x, y] = (*body, 255)
            elif ch == "o": px[x, y] = (*shade, 255)
            elif ch != ".":
                c = PAL.get(ch)
                if c: px[x, y] = (*c, 255)
    return im

# barrel-up -> rotate so it faces a direction. PIL.rotate is CCW.
def facing(im, d):  # d in {"up","down","left","right"}
    return {"up": im, "down": im.rotate(180), "left": im.rotate(270), "right": im.rotate(90)}[d]

# ---------------------------------------------------------------------------
# MAP GENERATOR — mirror-symmetric (4-fold fair), connected, open spawn pockets
# tiles: 0 floor, 1 brick, 2 steel, 3 water, 4 bush
# ---------------------------------------------------------------------------
COLS, ROWS, CELL = 15, 9, 16

def gen_map(seed):
    rnd = random.Random(seed)
    g = [[0] * COLS for _ in range(ROWS)]
    for x in range(COLS): g[0][x] = 2; g[ROWS - 1][x] = 2          # steel perimeter
    for y in range(ROWS): g[y][0] = 2; g[y][COLS - 1] = 2
    cx, cy = COLS // 2, ROWS // 2                                   # 7,4 centre

    def place(x, y, v):                                             # write to all 4 mirrored cells
        for (mx, my) in {(x, y), (COLS - 1 - x, y), (x, ROWS - 1 - y), (COLS - 1 - x, ROWS - 1 - y)}:
            if 0 < mx < COLS - 1 and 0 < my < ROWS - 1:
                g[my][mx] = v

    POCKET = {(1, 1), (2, 1), (1, 2)}                              # keep each corner spawn open
    quad = [(x, y) for y in range(1, cy) for x in range(1, cx) if (x, y) not in POCKET]
    for (x, y) in quad:                                            # scatter cover in one quadrant, mirror it
        r = rnd.random()
        if r < 0.28: place(x, y, 1)                                # brick
        elif r < 0.40: place(x, y, 2)                              # steel
        elif r < 0.45: place(x, y, 4)                              # bush
    for y in range(1, cy):                                         # centre column wall bits
        if rnd.random() < 0.45: place(cx, y, 2 if rnd.random() < 0.45 else 1)
    for x in range(1, cx):                                         # centre row wall bits
        if rnd.random() < 0.35: place(x, cy, 1 if rnd.random() < 0.7 else 2)
    if rnd.random() < 0.6:                                         # a little water motif around centre
        place(cx - 1, cy, 3); place(cx, cy - 1, 3)
    g[cy][cx] = rnd.choice([0, 2, 1])                              # centre cell
    for (sx, sy) in POCKET: place(sx, sy, 0)                       # re-clear pockets

    # connectivity: tanks are blocked by steel(2)/water(3); bricks are destructible (passable).
    # BFS over non-steel/water from a spawn; if any spawn is sealed, knock a steel to floor.
    spawns = [(1, 1), (COLS - 2, 1), (1, ROWS - 2), (COLS - 2, ROWS - 2)]
    def reachable():
        seen = set(); st = [spawns[0]]; seen.add(spawns[0])
        while st:
            x, y = st.pop()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 < nx < COLS - 1 and 0 < ny < ROWS - 1 and (nx, ny) not in seen and g[ny][nx] not in (2, 3):
                    seen.add((nx, ny)); st.append((nx, ny))
        return seen
    for _ in range(40):
        seen = reachable()
        if all(s in seen for s in spawns): break
        # carve: turn a steel cell adjacent to the reached region into floor (symmetric)
        for y in range(1, ROWS - 1):
            for x in range(1, COLS - 1):
                if g[y][x] == 2 and any((x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    place(x, y, 0); break
            else:
                continue
            break
    return g

def tank_meta():
    return {"scale": 4, "cols": COLS, "rows": ROWS, "cell": CELL,
            "spawns": [[1, 1], [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2]]}

def tank_export():
    """Everything the browser game needs: palette, tile + tank grids, and meta.
    The randomized map itself is generated live in JS (same algorithm as gen_map)."""
    pal = {k: (None if v is None else "#%02x%02x%02x" % v) for k, v in PAL.items()}
    return {
        "palette": pal,
        "brick": BRICK, "steel": STEEL, "water": WATER, "bush": BUSH, "tank": TANK,
        "meta": tank_meta(),
    }

# ---------------------------------------------------------------------------
# render a full map preview (the "map" the player judges)
# ---------------------------------------------------------------------------
PCOL = ["#ff5d5d", "#5db4ff", "#6bd66b", "#ffd54a"]

def render_map(seed, with_tanks=True):
    W, H, SC = COLS * CELL, ROWS * CELL, 4                          # 240x144
    g = gen_map(seed)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    floors = [render_floor(i) for i in range(8)]
    for y in range(ROWS):
        for x in range(COLS):
            im.alpha_composite(floors[(x * 3 + y * 7) % 8], (x * CELL, y * CELL))  # ground everywhere
            v = g[y][x]
            if v in TILE_IMG: im.alpha_composite(TILE_IMG[v], (x * CELL, y * CELL))
    if with_tanks:
        spawns = tank_meta()["spawns"]
        faces = ["right", "left", "right", "left"]                  # face inward
        for i, ((sx, sy), face) in enumerate(zip(spawns, faces)):
            t = facing(render_tank(PCOL[i]), face)
            im.alpha_composite(t, (sx * CELL, sy * CELL))
    up = im.resize((W * SC, H * SC), Image.NEAREST)
    return up

def assets_sheet():
    SC = 8
    items = [("FLOOR", render_floor(3)), ("BRICK", TILE_IMG[1]), ("STEEL", TILE_IMG[2]),
             ("WATER", TILE_IMG[3]), ("BUSH", TILE_IMG[4]),
             ("P1", facing(render_tank(PCOL[0]), "up")), ("P2", facing(render_tank(PCOL[1]), "right")),
             ("P3", facing(render_tank(PCOL[2]), "down")), ("P4", facing(render_tank(PCOL[3]), "left"))]
    import pixelfont as pf
    cw = 22
    canvas = Image.new("RGBA", (len(items) * cw * SC // 1, 0), (0, 0, 0, 0))
    sheet = Image.new("RGBA", (len(items) * (16 + 6) * SC // 4 * 4, 16 * SC + 22), (24, 22, 30, 255))
    x = 8
    for lab, img in items:
        up = img.resize((16 * SC, 16 * SC), Image.NEAREST)
        sheet.alpha_composite(up, (x, 6))
        lb = pf.text(lab, 2, (235, 232, 245)); sheet.alpha_composite(lb, (x + 8 * SC - lb.width // 2, 16 * SC + 8))
        x += 16 * SC + 14
    sheet = sheet.crop((0, 0, x, sheet.height))
    sheet.convert("RGB").save(os.path.join(OUT, "tank_assets.png"))
    print("wrote tank_assets.png", sheet.size)

if __name__ == "__main__":
    assets_sheet()
    for s in (7, 11, 23):
        render_map(s).convert("RGB").save(os.path.join(OUT, f"tank_map_{s}.png"))
        print("wrote tank_map_%d.png" % s)
    print("done")
