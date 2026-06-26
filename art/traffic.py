"""
4-bit art for TRAFFIC RUN (our Frogger-style coin-dodge).
Start on the grass at the bottom, cross the lanes of cars to grab coins (the
further up, the higher the value). Get run over -> back to the grass. First to 15
total points wins. Native 240x150, nearest-upscaled x4 -> 960x600.
Replicates the look of the two reference screenshots.
"""
from PIL import Image, ImageDraw
import os, random
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

def lit(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)

# ---- car colours (light roof, body, dark shade) keyed off a base ----
CARS = {
    "yellow": (230, 208, 116), "green": (150, 210, 110), "pink": (232, 150, 205),
    "lime": (200, 224, 110), "blue": (170, 182, 224), "purple": (200, 150, 214),
    "hotpink": (240, 130, 196),
}
WIN = (46, 48, 62)        # window glass
WHEEL = (28, 28, 34)

def draw_car(base, facing=1):
    body = base; light = lit(base, 1.16); dark = lit(base, 0.66)
    W, H = 64, 30
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([6, H - 5, W - 6, H - 1], fill=(8, 8, 12, 90))                       # ground shadow
    for wx in (13, W - 25):                                                        # 4 wheels poking out
        d.rounded_rectangle([wx, 0, wx + 13, 6], 2, fill=(*WHEEL, 255))
        d.rounded_rectangle([wx, H - 7, wx + 13, H - 1], 2, fill=(*WHEEL, 255))
        d.rectangle([wx + 3, 2, wx + 10, 4], fill=(70, 70, 80, 255))
        d.rectangle([wx + 3, H - 5, wx + 10, H - 3], fill=(70, 70, 80, 255))
    d.rounded_rectangle([3, 4, W - 4, H - 4], 7, fill=(*body, 255))                # body
    d.rounded_rectangle([3, H // 2, W - 4, H - 4], 7, fill=(*dark, 255))           # lower-half shade
    d.rounded_rectangle([3, 4, W - 4, H - 4], 7, outline=(*lit(base, 0.45), 255), width=1)
    d.rounded_rectangle([3, 4, W - 4, 7], 3, fill=(*light, 255))                   # top highlight
    d.rounded_rectangle([15, 7, W - 13, H - 7], 3, fill=(*WIN, 255))               # dark cabin/glass
    d.rounded_rectangle([24, 9, W - 22, H - 9], 2, fill=(*light, 255))             # light roof centre
    for sx in (W - 14, 22):                                                        # window pillars
        d.rectangle([sx, 7, sx + 1, H - 7], fill=(*dark, 255))
    d.rectangle([W - 6, 8, W - 4, 12], fill=(255, 250, 210, 255))                  # headlights (front = right)
    d.rectangle([W - 6, H - 12, W - 4, H - 8], fill=(255, 250, 210, 255))
    d.rectangle([4, 9, 6, 12], fill=(220, 70, 60, 255)); d.rectangle([4, H - 12, 6, H - 9], fill=(220, 70, 60, 255))  # tail lights
    if facing < 0: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

# ---- coin with a value number ----
def draw_coin(val):
    W = 26
    im = Image.new("RGBA", (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([0, 0, W - 1, W - 1], fill=(120, 84, 16, 255))                       # rim
    d.ellipse([2, 2, W - 3, W - 3], fill=(244, 200, 72, 255))                      # gold
    d.ellipse([4, 4, W - 5, W - 5], outline=(208, 150, 32, 255), width=1)
    d.ellipse([6, 5, 12, 11], fill=(255, 244, 200, 255))                          # shine
    t = pf.text(str(val), 2, (120, 80, 12)); im.alpha_composite(t, ((W - t.width) // 2, (W - t.height) // 2 + 1))
    return im

# ---- grass tile ----
def grass_strip(w, h):
    im = Image.new("RGBA", (w, h), (74, 150, 70, 255)); px = im.load()
    rnd = random.Random(7)
    for i in range(w * h // 6):
        x, y = rnd.randint(0, w - 1), rnd.randint(0, h - 1)
        px[x, y] = (*( (52, 116, 52) if rnd.random() < 0.5 else (96, 178, 84) ), 255)
    d = ImageDraw.Draw(im)
    for x in range(0, w, 5):                                                       # blades along the top
        bx = x + rnd.randint(0, 3); d.line([bx, 0, bx, 3], fill=(96, 178, 84, 255))
    return im

def blood(im, cx, cy, s):
    d = ImageDraw.Draw(im); rnd = random.Random(cx * 7 + cy)
    for _ in range(7):
        ox, oy = rnd.randint(-s, s), rnd.randint(-s // 2, s // 2); r = rnd.randint(2, s // 2)
        d.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=(110, 26, 26, 150))
    for _ in range(6):
        ox, oy = rnd.randint(-s - 4, s + 4), rnd.randint(-s // 2 - 3, s // 2 + 3)
        d.ellipse([cx + ox - 1, cy + oy - 1, cx + ox + 1, cy + oy + 1], fill=(86, 18, 18, 150))

def fighter(img, name, cx, feetY, scale=1.0):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    f = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = f.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rx, ry] = (*cc, 255)
    if scale != 1.0: f = f.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(f, (cx - f.width // 2, feetY - f.height))

# ---- stone wall + scoreboard ----
STONE = (120, 120, 128); STONE2 = (96, 96, 104); MORT = (58, 58, 66)
def wall_strip(w, h):
    im = Image.new("RGBA", (w, h), (*MORT, 255)); d = ImageDraw.Draw(im)
    bw, bh = 22, 11
    for r in range(0, h // bh + 1):
        off = (bw // 2) if r % 2 else 0
        for c in range(-1, w // bw + 1):
            x = c * bw + off; y = r * bh
            d.rectangle([x + 1, y + 1, x + bw - 1, y + bh - 1], fill=(*(STONE if (c + r) % 2 else STONE2), 255))
            d.rectangle([x + 1, y + 1, x + bw - 1, y + 2], fill=(150, 150, 158, 255))
    return im

def scoreboard(im, x, y, name, score):
    d = ImageDraw.Draw(im)
    d.rectangle([x, y, x + 52, y + 18], fill=(24, 20, 30, 255)); d.rectangle([x, y, x + 52, y + 18], outline=(70, 66, 84, 255), width=1)
    fighter(im, name, x + 11, y + 17, scale=0.8)
    t = pf.text(str(score), 2, (245, 245, 240)); im.alpha_composite(t, (x + 52 - t.width - 6, y + (18 - t.height) // 2))

# ---- the road ----
ASPH = (58, 58, 64)
def road(im, y0, y1, lanes):
    d = ImageDraw.Draw(im); rnd = random.Random(3)
    d.rectangle([0, y0, im.width, y1], fill=(*ASPH, 255))
    for i in range((im.width * (y1 - y0)) // 5):
        x, y = rnd.randint(0, im.width - 1), rnd.randint(y0, y1 - 1)
        d.point((x, y), fill=(*(lit(ASPH, 0.85) if rnd.random() < 0.5 else lit(ASPH, 1.15)), 255))
    lh = (y1 - y0) / lanes
    for L in range(1, lanes):
        ly = int(y0 + L * lh)
        for x in range(0, im.width, 14): d.rectangle([x, ly, x + 8, ly + 1], fill=(150, 150, 156, 255))

# ---------------------------------------------------------------------------
# SCENE
# ---------------------------------------------------------------------------
def scene(show_grass=True):
    W, H = 240, 150
    im = Image.new("RGBA", (W, H), (*ASPH, 255))
    WALL_H = 26; GRASS_H = 16 if show_grass else 0
    road(im, WALL_H, H - GRASS_H, lanes=6)
    # blood splats
    blood(im, 70, 110, 12); blood(im, 150, 70, 10); blood(im, 95, 50, 9); blood(im, 40, 130, 8)
    # cars (varied colours / directions across lanes)
    cars = [("yellow", 60, 40, 1), ("green", 200, 64, -1), ("pink", 150, 96, 1), ("lime", 70, 122, 1), ("blue", 20, 134, 1)]
    for col, cx, cy, fac in cars:
        c = draw_car(CARS[col], fac); im.alpha_composite(c, (cx - c.width // 2, cy - c.height // 2))
    # coins (value grows the higher up they are)
    for val, cx, cy in [(8, 110, 44), (6, 95, 30), (4, 14, 70), (2, 14, 96)]:
        cc = draw_coin(val); im.alpha_composite(cc, (cx - cc.width // 2, cy - cc.height // 2))
    # grass
    if show_grass:
        gs = grass_strip(W, GRASS_H); im.alpha_composite(gs, (0, H - GRASS_H))
        fighter(im, "NOVA", 40, H - 2, scale=1.0)
    fighter(im, "NOVA", 95, 132, scale=1.0)
    # wall + scoreboards on top
    ws = wall_strip(W, WALL_H); im.alpha_composite(ws, (0, 0))
    scoreboard(im, 34, 4, "GLITCH", 0); scoreboard(im, 96, 4, "NOVA", 0); scoreboard(im, 158, 4, "ACE", 8)
    return im.resize((W * 4, H * 4), Image.NEAREST)

def assets_sheet():
    items = [("YELLOW", draw_car(CARS["yellow"])), ("PINK", draw_car(CARS["pink"], -1)), ("GREEN", draw_car(CARS["green"])),
             ("BLUE", draw_car(CARS["blue"], -1)), ("PURPLE", draw_car(CARS["purple"])),
             ("COIN 2", draw_coin(2)), ("COIN 6", draw_coin(6)), ("COIN 10", draw_coin(10))]
    SC = 2; cw = 150
    maxh = max(i[1].height for i in items) * SC
    sheet = Image.new("RGBA", (len(items) * cw, maxh + 30), (26, 26, 32, 255))
    for j, (lab, img) in enumerate(items):
        up = img.resize((img.width * SC, img.height * SC), Image.NEAREST)
        sheet.alpha_composite(up, (j * cw + (cw - up.width) // 2, 8 + (maxh - up.height)))
        lb = pf.text(lab, 1, (235, 232, 245)); sheet.alpha_composite(lb, (j * cw + (cw - lb.width) // 2, sheet.height - 14))
    sheet.convert("RGB").save(os.path.join(OUT, "traffic_assets.png")); print("wrote traffic_assets.png", sheet.size)

if __name__ == "__main__":
    assets_sheet()
    scene(show_grass=True).convert("RGB").save(os.path.join(OUT, "traffic_2.png")); print("wrote traffic_2.png")
    scene(show_grass=False).convert("RGB").save(os.path.join(OUT, "traffic_1.png")); print("wrote traffic_1.png")
    print("done")
