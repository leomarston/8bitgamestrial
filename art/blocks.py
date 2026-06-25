"""
8-bit sandbox-platformer tileset (cobblestone / wood planks / grass-dirt / vines
/ crates) for the auto-scroll "RUNNER" minigame. Night theme, like the reference.
No Mario stuff, no enemies — the hazard is falling behind the scroll frame.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# 16-colour night-sandbox palette
PAL = {
    ".": None,
    "K": (20, 17, 28),     # outline
    "M": (43, 47, 60),     # mortar / deep shadow
    "W": (238, 242, 255),  # white / stars
    "H": (154, 162, 180),  # stone light
    "S": (108, 115, 132),  # stone mid
    "s": (70, 76, 94),     # stone dark
    "P": (140, 92, 50),    # wood light
    "p": (88, 55, 33),     # wood dark
    "L": (92, 196, 76),    # grass light
    "g": (47, 138, 58),    # grass dark / vine
    "r": (158, 76, 44),    # dirt brick light (reddish)
    "R": (104, 48, 24),    # dirt brick dark
    "m": (182, 188, 204),  # metal light (nails)
    "Y": (255, 196, 80),   # warm accent
    "A": (24, 36, 72),     # sky (night blue)
}

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
            X, Y = ox + x, oy + y
            if 0 <= X < img.width and 0 <= Y < img.height: px[X, Y] = (*c, 255)

# --------------------------------------------------------------------------
STONE = spr("""
HHHHHHHMHHHHHHHM
SSSSSSSMSSSSSSSM
SssssssMSssssssM
MMMMMMMMMMMMMMMM
HHHMHHHHHHHMHHHH
SSSMSSSSSSSMSSSS
SssMSssssSsMSsss
MMMMMMMMMMMMMMMM
HHHHHHHMHHHHHHHM
SSSSSSSMSSSSSSSM
SssssssMSssssssM
MMMMMMMMMMMMMMMM
HHHMHHHHHHHMHHHH
SSSMSSSSSSSMSSSS
SssMSssssSsMSsss
MMMMMMMMMMMMMMMM
""")

STONE_TOP = spr("""
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
gLggLgggLggLgggL
HHHMHHHHHHHMHHHH
SSSMSSSSSSSMSSSS
SssMSssssSsMSsss
MMMMMMMMMMMMMMMM
HHHHHHHMHHHHHHHM
SSSSSSSMSSSSSSSM
SssssssMSssssssM
MMMMMMMMMMMMMMMM
HHHMHHHHHHHMHHHH
SSSMSSSSSSSMSSSS
SssMSssssSsMSsss
MMMMMMMMMMMMMMMM
HHHHHHHMHHHHHHHM
""")

WOOD = spr("""
PPPpPPPpPPPpPPPp
PmPpPPPpPmPpPPPp
PPPpPpPpPPPpPpPp
PPPpPPPpPPPpPPPp
PpPpPPPpPpPpPPPp
PPPpPPPpPPPpPPPp
PPPpPpPpPPPpPpPp
PPPpPPPpPPPpPPPp
PPPpPPPpPPPpPPPp
PpPpPPPpPpPpPPPp
PPPpPPPpPPPpPPPp
PPPpPpPpPPPpPpPp
PmPpPPPpPmPpPPPp
PPPpPPPpPPPpPPPp
PPPpPPPpPPPpPPPp
pppppppppppppppp
""")

GROUND = spr("""
LLLLLLLLLLLLLLLL
LLLLLLLLLLLLLLLL
gLggLgggLggLgggL
rrrrrrrMrrrrrrrM
rRRRRRRMrRRRRRRM
RRRRRRRMRRRRRRRM
MMMMMMMMMMMMMMMM
rrrMrrrrrrrMrrrr
rRRMrRRRRRRMrRRR
RRRMRRRRRRRMRRRR
MMMMMMMMMMMMMMMM
rrrrrrrMrrrrrrrM
rRRRRRRMrRRRRRRM
RRRRRRRMRRRRRRRM
MMMMMMMMMMMMMMMM
rrrMrrrrrrrMrrrr
""")

DIRT = spr("""
rrrrrrrMrrrrrrrM
rRRRRRRMrRRRRRRM
RRRRRRRMRRRRRRRM
MMMMMMMMMMMMMMMM
rrrMrrrrrrrMrrrr
rRRMrRRRRRRMrRRR
RRRMRRRRRRRMRRRR
MMMMMMMMMMMMMMMM
rrrrrrrMrrrrrrrM
rRRRRRRMrRRRRRRM
RRRRRRRMRRRRRRRM
MMMMMMMMMMMMMMMM
rrrMrrrrrrrMrrrr
rRRMrRRRRRRMrRRR
RRRMRRRRRRRMRRRR
MMMMMMMMMMMMMMMM
""")

CRATE = spr("""
KKKKKKKKKKKKKKKK
KmPPPPPPPPPPPPmK
KPpPPPPPPPPPpPPK
KPPpPPPPPPPpPPPK
KPPPpPPPPPpPPPPK
KPPPPpPPPpPPPPPK
KPPPPPpPpPPPPPPK
KPPPPPPpPPPPPPPK
KPPPPPpPpPPPPPPK
KPPPPpPPPpPPPPPK
KPPPpPPPPPpPPPPK
KPPpPPPPPPPpPPPK
KPpPPPPPPPPPpPPK
KmPPPPPPPPPPPPmK
KKKKKKKKKKKKKKKK
KppppppppppppppK
""")

VINE = spr("""
..KgLg..
..KgLg..
.KgLLg..
..KgLg..
..KgLg..
.KgLLg..
..KgLg..
..KgLg..
KgLLg...
..KgLg..
..KgLg..
..KgLg..
.KgLLg..
..KgLg..
..KgKg..
..Kg....
""")

TREE_BG = spr("""
.....KK.....
...KKggKK...
..KgggggsK..
.KgggggggsK.
KggggggggssK
KggggggggssK
.KgggggggsK.
.KsgggggssK.
..KsgggssK..
...KKpK KK..
.....Kp.....
.....Kp.....
....KppK....
""")

if __name__ == "__main__":
    items = [("STONE", STONE), ("STONE_TOP", STONE_TOP), ("WOOD", WOOD),
             ("GROUND", GROUND), ("DIRT", DIRT), ("CRATE", CRATE),
             ("VINE", VINE), ("TREE_BG", TREE_BG)]
    SC = 5
    cw, ch = 130, 130
    cols = 4
    rows = (len(items) + cols - 1) // cols
    img = Image.new("RGBA", (cols * cw, rows * ch), (*PAL["A"], 255))
    for i, (name, s) in enumerate(items):
        base = Image.new("RGBA", (len(s[0]), len(s)), (0, 0, 0, 0))
        blit(base, s, 0, 0)
        up = base.resize((base.width * SC, base.height * SC), Image.NEAREST)
        cx = (i % cols) * cw + (cw - up.width) // 2
        cy = (i // cols) * ch + 14
        img.alpha_composite(up, (cx, cy))
    img.convert("RGB").save(os.path.join(OUT, "blocks_tiles.png"))
    print("wrote blocks_tiles.png")
