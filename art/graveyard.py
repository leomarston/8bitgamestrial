"""
Graveyard / cemetery 4-bit art for the "Monster in the Middle" minigame.

This uses its OWN moody 16-colour palette (an authentic 8-bit-style palette swap
for the spooky scene). The scene is composed at low resolution and upscaled with
nearest-neighbour so every element shares one crisp pixel grid.
"""
from PIL import Image
import os, math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# 16-colour moody graveyard palette
# ---------------------------------------------------------------------------
PAL = {
    ".": None,
    "K": (16, 12, 28),     # outline / darkest
    "N": (33, 29, 58),     # night shadow (deep violet)
    "V": (52, 48, 90),     # violet (sky / cloak)
    "v": (78, 74, 126),    # fog violet / distant
    "S": (109, 106, 146),  # stone shadow
    "M": (154, 154, 184),  # stone mid
    "L": (210, 212, 230),  # stone / bone light
    "G": (22, 40, 28),     # grass darkest
    "g": (35, 74, 46),     # grass dark
    "m": (53, 107, 60),    # grass mid / moss
    "D": (44, 32, 22),     # dirt dark
    "d": (94, 67, 41),     # dirt / wood
    "W": (207, 230, 255),  # moonlight pale
    "Y": (255, 216, 107),  # candle / lantern warm
    "E": (121, 211, 106),  # ghoul green (monster glow)
}

def spr(s):
    rows = [r for r in s.split("\n")]
    while rows and rows[0].strip() == "": rows.pop(0)
    while rows and rows[-1].strip() == "": rows.pop()
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]

def blit(img, rows, ox, oy, pal=PAL, flip=False):
    px = img.load()
    h = len(rows); w = len(rows[0])
    for y in range(h):
        for x in range(w):
            ch = rows[y][w - 1 - x] if flip else rows[y][x]
            c = pal.get(ch)
            if c is None: continue
            X, Y = ox + x, oy + y
            if 0 <= X < img.width and 0 <= Y < img.height:
                px[X, Y] = (*c, 255)

# ---------------------------------------------------------------------------
# Sprites (hand-authored)
# ---------------------------------------------------------------------------
HEADSTONE = spr("""
...KKKKKK...
..KMMMMMMK..
.KMMLLLLMMK.
.KMLMMMMSMK.
.KMLMSSMMSMK
.KMLMSSMMSMK
.KMLMMMMMSMK
.KMLMMMMMSMK
.KMLMMMMMSMK
.KMMMMMMMSMK
.KMMMMMMMMMK
KKSSSSSSSSSKK
KmgKSSSSSKgmK
.mggKKKKKggm.
..mgg gg gm..
""")

CROSS = spr("""
....KKKK....
...KMMMMK...
...KMLLMK...
.KKKMMSMKKK.
KMMMMMSMMMMK
KMLLMMSMMSMK
KMMMMMSMMSMK
.KKKMMSMKKK.
...KMLSMK...
...KMMSMK...
...KMMSMK...
...KMMSMK...
..KSSSSSSK..
.KmgKKKKgmK.
..mgggggm...
""")

BROKEN = spr("""
.....KKK..
....KMSK..
...KMMSK..
.KKMMMSK..
KMMLMMSK..
KMLMMMSKK.
KMMMMMMSK.
KMMMSSMSK.
KMMMMMMSK.
KSSSSSSSK.
KmgKKKKgmK
.mgggggm..
""")

TOMB = spr("""
..KKKKKKKKKKKKKK..
.KMMMMMMMMMMMMMMK.
KMLLLLLLLLLLLLLMK
KMLMMMMMMMMMMMSMK
KSMMMMMMMMMMMMSSK
KSSMMMMMMMMMMSSSK
KSSSSSSSSSSSSSSSK
.KSSSSSSSSSSSSSK.
..KKKKKKKKKKKKK..
..mggm..mggm..g..
""")

# Big central mausoleum / crypt
CRYPT = spr("""
..........KKKKKKKKKKKKKKKKKK..........
.........KMMMMMMMMMMMMMMMMMMK.........
........KMMMMMMMMMMMMMMMMMMMMK........
.......KMLLLLLLLLLLLLLLLLLLLMK.......
......KMMMMMMMMMMMMMMMMMMMMMMMK......
.....KKKKKKKKKKKKKKKKKKKKKKKKKKK.....
....KMSMMMMMMMMMMMMMMMMMMMMMMMSMK....
....KMSMLMMMMMMMMMMMMMMMMMMMLMSMK....
....KMSMLMMSSSSSSSSSSSSSSMMMLMSMK....
....KMSMLMMSKKKKKKKKKKKKSMMMLMSMK....
....KMSMLMMSKNNNNNNNNNNKSMMMLMSMK....
....KMSMLMMSKNNKKKKKKNNKSMMMLMSMK....
....KMSMLMMSKNKWWWWWWKNKSMMMLMSMK....
....KMSMLMMSKNKWYYYYWKNKSMMMLMSMK....
....KMSMLMMSKNKWYEEYWKNKSMMMLMSMK....
....KMSMLMMSKNKWYEEYWKNKSMMMLMSMK....
....KMSMLMMSKNKWYYYYWKNKSMMMLMSMK....
....KMSMLMMSKNKWWWWWWKNKSMMMLMSMK....
....KMSMMMMSKNNKKKKKKNNKSMMMMSMK.....
....KSSSSSSSKNNNNNNNNNNKSSSSSSSK.....
....KSSSSSSSKKKKKKKKKKKKSSSSSSSK.....
...KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK...
..mggmgKSSSSSSSSSSSSSSSSSSSSKgmggm..
.mgggggmKKKKKKKKKKKKKKKKKKKKmggggg.
""")

DEAD_TREE = spr("""
......K...K......
...K..K...K..K...
....K.KK.KK.K.K..
.K...KK.K.KK...K.
..K.K.KKdKK.K.K..
...KK..KdK..KK...
.....KK.K.KK.....
.......KdK.......
.......KdK.......
......KdddK......
......KdddK......
......KDddK......
......KdddK......
......KDddK......
.....KDdddDK.....
....KKDdddDKK....
...mggKKdKKggm...
..mgggmKKKmgggm..
""")

FENCE = spr("""
K..K..K..K..K..K.
K..K..K..K..K..K.
KSSKSSKSSKSSKSSK.
K..K..K..K..K..K.
K..K..K..K..K..K.
KMKKMKKMKKMKKMKK.
""")

PILLAR = spr("""
.KKKK.
KMMMMK
KMLLMK
KMMMMK
KSMMSK
KSSSSK
KMMMMK
KMMMMK
KMMMMK
KSSSSK
KKKKKK
""")

LANTERN = spr("""
..KK..
.KYYK.
KYWWYK
KYWWYK
KYYYYK
.KYYK.
..KK..
..dd..
..dd..
..dd..
.KddK.
""")

SKULL = spr("""
.KKKK.
KLLLLK
KLKKLK
KLKKLK
KLLLLK
.KLLK.
.KKKK.
""")

BAT = spr("""
K.KKK.K
KKNNNKK
.KNNNK.
..KKK..
""")

# MONSTER = a shambling zombie (green skin, mismatched eyes, teeth, arms out)
MONSTER = spr("""
......KKKK......
....KKEEEEKK....
...KEEEEEEEEK...
..KEEEEEEEEEEK..
..KEWWKEEEKWEK..
..KEWWKEEEKWEK..
..KEEEEggEEEEK..
..KELKLKLKLLEK..
..KEEKKKKKKEEK..
...KEEEEEEEEK...
....KKEEEEKK....
.KKK..KEEK..KKK.
KEEEK.KEEK.KEEEK
KEEEKKDDDDKKEEEK
.KKKKKDDDDDKKKKK
.....KDDgDDK....
.....KDDDDDK....
.....KKDDDKK....
....KDDK.KDDK...
....KEEK.KEEK...
....KKKK.KKKK...
""")

if __name__ == "__main__":
    # sprite contact sheet for review
    items = [("HEADSTONE", HEADSTONE), ("CROSS", CROSS), ("BROKEN", BROKEN),
             ("TOMB", TOMB), ("DEAD_TREE", DEAD_TREE), ("FENCE", FENCE),
             ("PILLAR", PILLAR), ("LANTERN", LANTERN), ("SKULL", SKULL),
             ("BAT", BAT), ("MONSTER", MONSTER), ("CRYPT", CRYPT)]
    SC = 5
    cellw, cellh = 70, 90
    cols = 6
    rows = (len(items) + cols - 1) // cols
    img = Image.new("RGBA", (cols * cellw, rows * cellh + 20), (24, 22, 38, 255))
    for i, (name, s) in enumerate(items):
        base = Image.new("RGBA", (len(s[0]), len(s)), (0, 0, 0, 0))
        blit(base, s, 0, 0)
        up = base.resize((base.width * SC, base.height * SC), Image.NEAREST)
        cx = (i % cols) * cellw + (cellw - up.width) // 2
        cy = (i // cols) * cellh + 10
        img.alpha_composite(up, (cx, max(cy, 10)))
    img.convert("RGB").save(os.path.join(OUT, "graveyard_sprites.png"))
    print("wrote graveyard_sprites.png")
