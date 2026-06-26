"""
4-bit art mockup for RED LIGHT / GREEN LIGHT (2-4 players).
Each player runs in their own horizontal LANE toward the finish on the right.
A giant watcher DOLL oversees: back turned = GREEN (go), facing you = RED (freeze).
Move on red and you're sent back to START. Native 240x150, nearest x4 -> 960x600.
"""
from PIL import Image, ImageDraw
import os
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---- palette ----
SKY = (150, 206, 236); SKY2 = (178, 222, 246); CLOUD = (240, 246, 255)
DIRT = (176, 138, 92); DIRT2 = (152, 116, 74); DIRT3 = (124, 94, 58); LANE = (104, 78, 48)
WALLBG = (108, 92, 132); WALLBG2 = (90, 76, 112)
# doll
HAIR = (224, 120, 46); HAIRD = (168, 84, 28); FACE = (255, 226, 198); FACED = (230, 188, 156)
EYE = (28, 24, 32); CHEEK = (255, 152, 152); SHIRT = (255, 214, 82); SHIRTD = (210, 168, 44)
SKIRT = (216, 108, 48); SKIRTD = (160, 76, 30); SHOE = (40, 36, 50); BOW = (224, 64, 78)
# signal
HOUS = (38, 36, 50); POST = (96, 100, 116); RON = (244, 72, 72); ROFF = (96, 42, 46); GON = (96, 222, 112); GOFF = (40, 78, 50)
GOLD = (255, 213, 74); WHITE = (244, 244, 238); INK = (24, 22, 32); RED = (230, 70, 80)

def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), (*c, 255))

# ---------------------------------------------------------------------------
# THE DOLL  (native ~36x72) — front (watching, RED) and back (turned, GREEN)
# ---------------------------------------------------------------------------
def doll(front=True):
    W, H = 36, 72
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # pigtails behind
    for sx in (3, 25):
        d.ellipse([sx, 16, sx + 8, 40], fill=(*HAIR, 255)); d.ellipse([sx + 1, 17, sx + 7, 33], fill=(*HAIR, 255))
        d.ellipse([sx + 1, 32, sx + 7, 40], fill=(*HAIRD, 255))
        d.rectangle([sx + 2, 14, sx + 6, 18], fill=(*BOW, 255))            # hair ties
    # head hair
    d.ellipse([6, 3, 30, 31], fill=(*HAIR, 255))
    if front:
        d.ellipse([9, 8, 27, 30], fill=(*FACE, 255))                      # face
        d.rectangle([9, 8, 27, 14], fill=(*HAIR, 255))                    # bangs
        d.ellipse([9, 12, 27, 16], fill=(*HAIR, 255))
        for ex in (14, 21):                                              # eyes
            d.ellipse([ex, 18, ex + 2, 21], fill=(*EYE, 255))
        px(im, 13, 24, CHEEK); px(im, 14, 24, CHEEK); px(im, 22, 24, CHEEK); px(im, 23, 24, CHEEK)
        d.rectangle([17, 25, 19, 27], fill=(*EYE, 255))                  # mouth
        d.ellipse([16, 22, 20, 25], outline=None)
    else:
        d.ellipse([7, 4, 29, 30], fill=(*HAIR, 255))                     # full hair (no face)
        d.line([18, 6, 18, 28], fill=(*HAIRD, 255))                      # hair part
        d.rectangle([15, 5, 21, 10], fill=(*BOW, 255)); px(im, 18, 7, WHITE)  # back bow
    # neck + shirt
    d.rectangle([16, 30, 20, 33], fill=(*FACE, 255))
    d.rounded_rectangle([11, 32, 25, 45], 3, fill=(*SHIRT, 255)); d.rectangle([11, 42, 25, 45], fill=(*SHIRTD, 255))
    # arms
    for ax in (8, 24):
        d.rectangle([ax, 33, ax + 4, 43], fill=(*SHIRT, 255)); d.rectangle([ax, 41, ax + 4, 45], fill=(*FACE, 255))
    # skirt
    d.polygon([(13, 45), (23, 45), (28, 56), (8, 56)], fill=(*SKIRT, 255)); d.polygon([(8, 54), (28, 54), (28, 56), (8, 56)], fill=(*SKIRTD, 255))
    # legs + shoes
    for lx in (13, 19):
        d.rectangle([lx, 56, lx + 4, 67], fill=(*FACE, 255)); d.rectangle([lx, 64, lx + 4, 67], fill=(*FACED, 255))
        d.rectangle([lx - 1, 67, lx + 5, 71], fill=(*SHOE, 255))
    return im

# ---------------------------------------------------------------------------
# SIGNAL LAMP (native 12x30) — red lit or green lit
# ---------------------------------------------------------------------------
def lamp(red=True):
    im = Image.new("RGBA", (12, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([5, 22, 7, 30], fill=(*POST, 255))                       # post
    d.rounded_rectangle([1, 0, 11, 22], 3, fill=(*HOUS, 255))
    d.ellipse([3, 2, 9, 9], fill=(*(RON if red else ROFF), 255))         # red lamp
    d.ellipse([3, 12, 9, 19], fill=(*(GOFF if red else GON), 255))       # green lamp
    if red: d.ellipse([4, 3, 7, 6], fill=(255, 170, 170, 255))
    else: d.ellipse([4, 13, 7, 16], fill=(190, 255, 200, 255))
    return im

# ---------------------------------------------------------------------------
# RUNNER (roster fighter)
# ---------------------------------------------------------------------------
def fighter(img, name, cx, feetY, scale=1.0, flip=False, alpha=255):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    f = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = f.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rw - 1 - rx if flip else rx, ry] = (*cc, alpha)
    if scale != 1.0: f = f.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(f, (cx - f.width // 2, feetY - f.height))

PCOL = [(255, 93, 93), (93, 180, 255), (107, 214, 107), (255, 213, 74)]
ZN = ["PIXEL", "BYTE", "NOVA", "CHIP"]

# ---------------------------------------------------------------------------
# SCENE
# ---------------------------------------------------------------------------
START_X, FIN_X = 30, 182
TOP = 20

def scene(state, count, progress=None):
    W, H = 240, 150
    im = Image.new("RGBA", (W, H), (*SKY, 255)); d = ImageDraw.Draw(im); pxl = im.load()
    red = (state == "red")
    # sky band + back wall
    for y in range(0, TOP + 6):
        for x in range(W):
            if (x * 9 + y * 7) % 19 == 0: px(im, x, y, SKY2)
    d.rectangle([0, TOP, W, TOP + 4], fill=(*WALLBG, 255))
    # lanes
    laneH = (H - TOP - 6) / count
    for i in range(count):
        y0 = int(TOP + 6 + i * laneH); y1 = int(TOP + 6 + (i + 1) * laneH)
        base = DIRT if i % 2 == 0 else DIRT2
        d.rectangle([0, y0, W, y1], fill=(*base, 255))
        for s in range(((W * (y1 - y0)) // 26)):                         # speckle
            sx = (s * 53) % W; sy = y0 + (s * 29) % max(1, (y1 - y0))
            px(im, sx, sy, DIRT3 if (sx + sy) % 2 else DIRT)
        d.line([0, y1, W, y1], fill=(*LANE, 255))                        # lane divider
        # faint dashed centre guide
        for x in range(START_X, FIN_X, 12): d.rectangle([x, (y0 + y1) // 2, x + 5, (y0 + y1) // 2], fill=(*LANE, 255))
    # start line (left) + finish (right, checker)
    d.rectangle([START_X - 3, TOP + 6, START_X - 1, H], fill=(*WHITE, 255))
    for y in range(TOP + 6, H, 6):
        for k in range(3):
            c = WHITE if ((y // 6) + k) % 2 == 0 else INK
            d.rectangle([FIN_X + k * 3, y, FIN_X + k * 3 + 2, y + 5], fill=(*c, 255))
    # the giant doll, standing on the right overseeing every lane
    dl = doll(front=red); sc = (H - 30) / dl.height; dl = dl.resize((int(dl.width * sc), int(dl.height * sc)), Image.NEAREST)
    d.ellipse([FIN_X + 8, H - 10, W - 2, H - 2], fill=(20, 16, 30, 90))   # shadow
    im.alpha_composite(dl, (W - dl.width - 2, H - dl.height - 2))
    # signal lamp top-left of the field
    lp = lamp(red); lp = lp.resize((lp.width * 2, lp.height * 2), Image.NEAREST)
    im.alpha_composite(lp, (6, 2))
    # state banner
    label = "RED LIGHT - FREEZE!" if red else "GREEN LIGHT - RUN!"
    t = pf.text_shadow(label, 2, (255, 120, 120) if red else (140, 240, 150))
    im.alpha_composite(t, (W // 2 - t.width // 2, 3))

    # runners, one per lane
    prog = progress or ([0.62, 0.40, 0.74, 0.30][:count] if not red else [0.55, 0.33, 0.05, 0.66][:count])
    caught = (2 if red and count >= 3 else (1 if red else -1))
    for i in range(count):
        y0 = int(TOP + 6 + i * laneH); y1 = int(TOP + 6 + (i + 1) * laneH)
        feetY = y1 - 2
        x = int(START_X + (FIN_X - START_X - 8) * prog[i])
        # coloured lane tag at the start
        d.rectangle([START_X - 1, y0 + 2, START_X + 8, y0 + 9], fill=(*PCOL[i], 255))
        t = pf.text("P" + str(i + 1), 1, (20, 18, 28)); im.alpha_composite(t, (START_X, y0 + 3))
        sc2 = min(1.15, (laneH - 6) / 22)
        if i == caught:
            x = START_X + 6                                              # sent back to start
            for k in range(6): px(im, x + 8 + k * 4, feetY - 8, DIRT3)  # dust trail back to start
            fighter(im, ZN[i], x, feetY, scale=sc2, flip=False, alpha=255)
            bub = pf.text_shadow("CAUGHT!", 1, (255, 90, 90)); im.alpha_composite(bub, (x - bub.width // 2, feetY - int(22 * sc2) - 10))
            d.line([x - 6, feetY - 26, x + 6, feetY - 14], fill=(*RED, 255)); d.line([x + 6, feetY - 26, x - 6, feetY - 14], fill=(*RED, 255))
        else:
            fighter(im, ZN[i], x, feetY, scale=sc2, flip=False, alpha=255)
            if not red:                                                  # little speed lines while running
                for k in range(3): px(im, x - int(12 * sc2) - k * 3, feetY - 8 - k * 2, WHITE)

    return im.resize((W * 4, H * 4), Image.NEAREST)

# ---------------------------------------------------------------------------
# ASSET LEGEND
# ---------------------------------------------------------------------------
def assets_sheet():
    items = []
    items.append(("DOLL: GREEN", doll(False)))
    items.append(("DOLL: RED", doll(True)))
    items.append(("LAMP GO", lamp(False)))
    items.append(("LAMP STOP", lamp(True)))
    # track tile
    tt = Image.new("RGBA", (24, 24), (0, 0, 0, 0)); dt = ImageDraw.Draw(tt); dt.rectangle([0, 0, 24, 24], fill=(*DIRT, 255))
    for s in range(40): px(tt, (s * 7) % 24, (s * 11) % 24, DIRT3 if s % 2 else DIRT2)
    dt.line([0, 23, 24, 23], fill=(*LANE, 255)); items.append(("TRACK", tt))
    # finish
    ff = Image.new("RGBA", (16, 24), (0, 0, 0, 0)); df = ImageDraw.Draw(ff)
    for y in range(0, 24, 6):
        for k in range(2):
            df.rectangle([k * 8, y, k * 8 + 7, y + 5], fill=(*(WHITE if (y // 6 + k) % 2 == 0 else INK), 255))
    items.append(("FINISH", ff))
    # start flag
    sf = Image.new("RGBA", (16, 24), (0, 0, 0, 0)); ds = ImageDraw.Draw(sf); ds.rectangle([3, 0, 4, 24], fill=(*WHITE, 255)); ds.polygon([(5, 1), (14, 5), (5, 9)], fill=(*RED, 255)); items.append(("START", sf))
    # runner
    rn = Image.new("RGBA", (24, 28), (0, 0, 0, 0)); fighter(rn, "PIXEL", 12, 28, scale=1.1); items.append(("RUNNER", rn))
    # caught icon
    ci = Image.new("RGBA", (20, 20), (0, 0, 0, 0)); dc = ImageDraw.Draw(ci); dc.line([2, 2, 18, 18], fill=(*RED, 255), width=2); dc.line([18, 2, 2, 18], fill=(*RED, 255), width=2); items.append(("CAUGHT", ci))

    SC = 2; pad = 12; labelH = 18; cw = 90
    maxh = max(i[1].height for i in items) * SC
    sheet = Image.new("RGBA", (len(items) * cw, maxh + pad * 2 + labelH), (26, 24, 34, 255))
    for j, (lab, img) in enumerate(items):
        up = img.resize((img.width * SC, img.height * SC), Image.NEAREST)
        sheet.alpha_composite(up, (j * cw + (cw - up.width) // 2, pad + (maxh - up.height)))
        lb = pf.text(lab, 1, (235, 232, 245)); sheet.alpha_composite(lb, (j * cw + (cw - lb.width) // 2, sheet.height - labelH + 4))
    sheet.convert("RGB").save(os.path.join(OUT, "rlgl_assets.png")); print("wrote rlgl_assets.png", sheet.size)

if __name__ == "__main__":
    scene("green", 4).convert("RGB").save(os.path.join(OUT, "rlgl_green.png")); print("wrote rlgl_green.png")
    scene("red", 4).convert("RGB").save(os.path.join(OUT, "rlgl_red.png")); print("wrote rlgl_red.png")
    scene("green", 2).convert("RGB").save(os.path.join(OUT, "rlgl_green2.png")); print("wrote rlgl_green2.png")
    assets_sheet()
    print("done")
