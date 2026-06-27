"""
4-bit art for SHIP DASH (button-masher boat race).
Each player owns a sea lane; the more you SPAM your key, the faster your boat rows
right. First boat to cross the FINISH line on the right wins. Native 240x150,
nearest-upscaled x4 -> 960x600.

This module is ART ONLY for approval: a beauty-shot scene + an asset sheet.
The recolourable export (ship_export) mirrors the traffic.py pattern for later.
"""
from PIL import Image, ImageDraw
import os, math, random
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

def lit(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)

# ---- player base colours (match in-game PCOL) ----
PCOL = [(255, 93, 93), (93, 180, 255), (107, 214, 107), (255, 213, 74)]

# ---- sea / sky palette ----
SKY_T = (150, 214, 240)      # sky top
SKY_B = (188, 232, 248)      # sky near horizon
SEA = (40, 116, 184)         # sea base
SEA_D = (28, 92, 156)        # sea trough
SEA_L = (86, 168, 222)       # sea crest
FOAM = (226, 244, 252)       # white foam
WOOD = (150, 100, 58)        # hull wood
WOOD_D = (108, 70, 38)
WOOD_L = (198, 150, 96)
DECK = (210, 170, 116)
MAST = (92, 62, 36)
OUTLN = (38, 28, 22)

SHIP_W, SHIP_H = 38, 34

# ---------------------------------------------------------------------------
# BOAT  (side view, bow to the right; sail + flag carry the player colour)
# ---------------------------------------------------------------------------
def _ship(c, name=None):
    """Render a sailboat from a role->RGBA dict c (hull/hullD/hullL/deck/sail/
    sailL/sailD/mast/flag/out). Used for both the mockup and the export template."""
    W, H = SHIP_W, SHIP_H
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cx = 14                                            # mast x

    # --- sail (big triangle, the main colour identifier) ---
    sail = [(cx + 1, 3), (cx + 1, 23), (cx + 16, 20)]
    d.polygon(sail, fill=c["sail"]); d.line(sail + [sail[0]], fill=c["out"])
    d.polygon([(cx + 1, 13), (cx + 1, 23), (cx + 14, 20)], fill=c["sailD"])   # lower shade
    d.line([(cx + 2, 4), (cx + 2, 22)], fill=c["sailL"])                      # luff highlight
    # --- mast + flag ---
    d.rectangle([cx - 1, 2, cx, 24], fill=c["mast"])
    d.polygon([(cx, 2), (cx + 7, 4), (cx, 6)], fill=c["flag"]); d.line([(cx, 2), (cx + 7, 4), (cx, 6)], fill=c["out"])
    # --- hull (wooden) ---
    hull = [(3, 23), (W - 1, 24), (W - 7, 31), (7, 31)]
    d.polygon(hull, fill=c["hull"]); d.line(hull + [hull[0]], fill=c["out"])
    d.polygon([(6, 27), (W - 4, 27), (W - 7, 31), (7, 31)], fill=c["hullD"])  # waterline shadow
    d.line([(5, 23), (W - 4, 24)], fill=c["deck"])                            # deck rail
    d.line([(5, 25), (W - 6, 25)], fill=c["hullL"])                           # plank highlight
    # --- little sailor (the player's fighter) at the stern ---
    if name:
        _fighter(im, name, 8, 24, scale=0.5)
    return im

def _ship_colors(base):
    return dict(hull=(*WOOD, 255), hullD=(*WOOD_D, 255), hullL=(*WOOD_L, 255), deck=(*DECK, 255),
                sail=(*base, 255), sailL=(*lit(base, 1.22), 255), sailD=(*lit(base, 0.74), 255),
                mast=(*MAST, 255), flag=(*base, 255), out=(*OUTLN, 255))

def draw_ship(base, name=None):
    return _ship(_ship_colors(base), name)

def _fighter(img, name, cx, feetY, scale=1.0):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    f = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = f.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rx, ry] = (*cc, 255)
    if scale != 1.0: f = f.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(f, (cx - f.width // 2, feetY - f.height))

# ---------------------------------------------------------------------------
# SEA  (waves + foam, with a per-lane phase so it reads as moving water)
# ---------------------------------------------------------------------------
def sea_band(w, h, phase=0.0):
    im = Image.new("RGBA", (w, h), (*SEA, 255)); px = im.load()
    # vertical depth gradient
    for y in range(h):
        t = y / max(1, h - 1)
        col = tuple(int(SEA_L[i] + (SEA_D[i] - SEA_L[i]) * t) for i in range(3))
        for x in range(w): px[x, y] = (*col, 255)
    d = ImageDraw.Draw(im)
    # rolling wave crests
    rows = max(3, h // 7)
    for r in range(rows):
        baseY = int((r + 0.5) * h / rows)
        for x in range(w):
            yy = baseY + int(2.2 * math.sin((x * 0.18) + phase + r * 1.3))
            d.point((x, yy), fill=(*SEA_L, 255))
            if (x + r) % 9 == 0:
                d.line([x, yy, x + 2, yy], fill=(*FOAM, 255))               # foam flecks
    return im

def rope_divider(im, y):
    """A buoy rope marking a lane boundary."""
    d = ImageDraw.Draw(im)
    for x in range(0, im.width, 4):
        d.point((x, y), fill=(244, 244, 238, 200))
    for x in range(6, im.width, 26):                                        # buoys
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 140, 60, 255), outline=(120, 50, 16, 255))
        d.point((x, y - 1), fill=(255, 224, 180, 255))

# ---------------------------------------------------------------------------
# FINISH + START + SKY furniture
# ---------------------------------------------------------------------------
def finish_band(im, x):
    d = ImageDraw.Draw(im); H = im.height
    cs = 6
    for j, yy in enumerate(range(34, H, cs)):
        for i, xx in enumerate(range(x, x + 12, cs)):
            col = (244, 244, 238) if (i + j) % 2 == 0 else (40, 40, 48)
            d.rectangle([xx, yy, xx + cs - 1, yy + cs - 1], fill=(*col, 255))
    d.rectangle([x - 1, 30, x + 12, 33], fill=(190, 40, 52, 255))           # banner
    t = pf.text("FINISH", 1, (255, 255, 250)); im.alpha_composite(t, (x + 6 - t.width // 2, 26))
    # poles
    d.rectangle([x - 1, 30, x, H - 1], fill=(60, 60, 70, 255)); d.rectangle([x + 11, 30, x + 12, H - 1], fill=(60, 60, 70, 255))

def start_buoys(im, x):
    d = ImageDraw.Draw(im)
    for y in range(38, im.height, 8):
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(255, 210, 70, 255), outline=(150, 110, 20, 255))

def sun(im, x, y, r):
    d = ImageDraw.Draw(im)
    d.ellipse([x - r - 2, y - r - 2, x + r + 2, y + r + 2], fill=(255, 240, 180, 90))
    d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 226, 120, 255), outline=(255, 200, 80, 255))

def cloud(im, x, y, s):
    d = ImageDraw.Draw(im)
    for ox, oy, rr in [(-s, 2, s), (0, 0, int(s * 1.3)), (s, 2, s), (0, 3, int(s * 1.5))]:
        d.ellipse([x + ox - rr, y + oy - rr, x + ox + rr, y + oy + rr], fill=(248, 252, 255, 255))

# ---------------------------------------------------------------------------
# SCENE
# ---------------------------------------------------------------------------
def scene(lanes=4):
    W, H = 240, 150
    im = Image.new("RGBA", (W, H), (*SKY_T, 255)); d = ImageDraw.Draw(im)
    # sky gradient
    for y in range(34):
        t = y / 33; col = tuple(int(SKY_T[i] + (SKY_B[i] - SKY_T[i]) * t) for i in range(3))
        d.line([0, y, W, y], fill=(*col, 255))
    sun(im, 24, 16, 9); cloud(im, 78, 14, 5); cloud(im, 150, 11, 4)

    SEA_Y = 34; laneH = (H - SEA_Y) / lanes
    # water lanes (slightly different phase each)
    for L in range(lanes):
        y0 = int(SEA_Y + L * laneH); y1 = int(SEA_Y + (L + 1) * laneH)
        band = sea_band(W, y1 - y0, phase=L * 1.7); im.alpha_composite(band, (0, y0))
    for L in range(1, lanes):
        rope_divider(im, int(SEA_Y + L * laneH))

    start_buoys(im, 16)
    finish_band(im, 214)

    # boats at varying progress (button-masher: leader is furthest right)
    names = ["NOVA", "BYTE", "GLITCH", "CHIP"]
    prog = [150, 96, 120, 70]                                               # x of each boat (race in motion)
    for L in range(lanes):
        cyc = int(SEA_Y + (L + 0.5) * laneH)
        s = draw_ship(PCOL[L], names[L])
        bx = prog[L]
        # bow wake
        d.ellipse([bx + 30, cyc + 6, bx + 40, cyc + 11], fill=(*FOAM, 230))
        im.alpha_composite(s, (bx - s.width // 2, cyc + 10 - s.height))
        # lane tag
        tag = pf.text("P%d" % (L + 1), 1, (255, 255, 255))
        chip = Image.new("RGBA", (tag.width + 4, tag.height + 3), (*PCOL[L], 255))
        chip.alpha_composite(tag, (2, 1)); im.alpha_composite(chip, (4, int(SEA_Y + L * laneH) + 2))

    # title banner
    t = pf.text("SHIP DASH", 2, (20, 40, 70)); im.alpha_composite(t, (W // 2 - t.width // 2 + 1, 5))
    t2 = pf.text("SHIP DASH", 2, (255, 255, 250)); im.alpha_composite(t2, (W // 2 - t2.width // 2, 4))
    hint = pf.text("MASH YOUR KEY TO ROW", 1, (30, 50, 80)); im.alpha_composite(hint, (W // 2 - hint.width // 2, 22))
    return im.resize((W * 4, H * 4), Image.NEAREST)

def assets_sheet():
    items = [("P1 SHIP", draw_ship(PCOL[0], "NOVA")), ("P2 SHIP", draw_ship(PCOL[1], "BYTE")),
             ("P3 SHIP", draw_ship(PCOL[2], "GLITCH")), ("P4 SHIP", draw_ship(PCOL[3], "CHIP"))]
    SC = 4; cw = 200
    maxh = max(i[1].height for i in items) * SC
    sheet = Image.new("RGBA", (len(items) * cw, maxh + 60), (26, 30, 40, 255))
    sheet.alpha_composite(sea_band(sheet.width, 40, 0.0), (0, sheet.height - 40))
    for j, (lab, img) in enumerate(items):
        up = img.resize((img.width * SC, img.height * SC), Image.NEAREST)
        sheet.alpha_composite(up, (j * cw + (cw - up.width) // 2, 18 + (maxh - up.height)))
        lb = pf.text(lab, 2, (235, 238, 248)); sheet.alpha_composite(lb, (j * cw + (cw - lb.width) // 2, 2))
    sheet.convert("RGB").save(os.path.join(OUT, "ship_assets.png")); print("wrote ship_assets.png", sheet.size)

if __name__ == "__main__":
    assets_sheet()
    scene(4).convert("RGB").save(os.path.join(OUT, "ship_scene4.png")); print("wrote ship_scene4.png")
    scene(2).convert("RGB").save(os.path.join(OUT, "ship_scene2.png")); print("wrote ship_scene2.png")
    print("done")
