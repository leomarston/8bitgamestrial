"""
8-bit art mockup for SLIME VOLLEY (2-4 players).
Beach court split into one COLORED PIT ("hole") per player, separated by nets.
Keep the ball out of YOUR hole; if it lands in your pit you lose a point.
Native 240x150, nearest-upscaled x4 -> 960x600. Mockup only (for approval).
"""
from PIL import Image
import os, math
from render import PALETTE as FPAL, grid as fgrid
import characters as C
import pixelfont as pf

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

SKY = (118, 196, 236); SKY2 = (150, 214, 246)
SUN = (255, 247, 206); CLOUD = (240, 246, 255)
SAND = (224, 204, 156); SAND2 = (198, 174, 120); SANDD = (158, 130, 84); EDGE = (74, 54, 34)
NETP = (64, 116, 208); NETW = (236, 240, 250)
# per-player pit colours: rim(light), body, deep
ZONE = [
    ((255, 138, 138), (230, 70, 70), (150, 36, 44)),     # P1 red
    ((150, 206, 255), (74, 150, 240), (32, 78, 150)),    # P2 blue
    ((150, 224, 150), (74, 196, 96), (32, 110, 56)),     # P3 green
    ((255, 226, 130), (240, 200, 60), (150, 116, 28)),   # P4 yellow
]
ZNAMES = ["PIXEL", "BYTE", "NOVA", "CHIP"]

def setpx(px, W, H, x, y, c):
    if 0 <= x < W and 0 <= y < H: px[x, y] = (*c, 255)

def fill(px, W, H, x0, y0, x1, y1, c):
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            setpx(px, W, H, x, y, c)

def disc(px, W, H, cx, cy, r, c):
    for y in range(int(cy - r), int(cy + r + 1)):
        for x in range(int(cx - r), int(cx + r + 1)):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: setpx(px, W, H, x, y, c)

def cloud(px, W, H, cx, cy, s):
    disc(px, W, H, cx, cy, 2 * s, CLOUD); disc(px, W, H, cx + 3 * s, cy + s, int(1.6 * s), CLOUD)
    disc(px, W, H, cx - 3 * s, cy + s, int(1.5 * s), CLOUD); fill(px, W, H, cx - 4 * s, cy + s, cx + 4 * s, cy + 2 * s + 1, CLOUD)

def fighter(img, name, cx, feetY, scale=1.0, flip=False):
    rows = fgrid(getattr(C, name)); rw = len(rows[0]); rh = len(rows)
    f = Image.new("RGBA", (rw, rh), (0, 0, 0, 0)); fp = f.load()
    for ry in range(rh):
        for rx in range(rw):
            cc = FPAL.get(rows[ry][rx])
            if cc: fp[rw - 1 - rx if flip else rx, ry] = (*cc, 255)
    if scale != 1.0: f = f.resize((max(1, int(rw * scale)), max(1, int(rh * scale))), Image.NEAREST)
    img.alpha_composite(f, (cx - f.width // 2, feetY - f.height))

def ball(img, cx, cy, r=7):
    b = fgrid(C.BALL); bw = len(b[0]); bh = len(b)
    bi = Image.new("RGBA", (bw, bh), (0, 0, 0, 0)); bp = bi.load()
    for y in range(bh):
        for x in range(bw):
            cc = FPAL.get(b[y][x])
            if cc: bp[x, y] = (*cc, 255)
    sc = (2 * r) / bw; bi = bi.resize((int(bw * sc), int(bh * sc)), Image.NEAREST)
    img.alpha_composite(bi, (cx - bi.width // 2, cy - bi.height // 2))

# court geometry (native px) — players small + ball ~player-sized, matching the
# reference ratios (player ~13% of play height, ball ~1.15x a player, big areas).
PX0, PX1 = 22, 218          # play area x-range
FLOOR_TOP = 106             # rim of the holes / where players stand
FLOOR_BOT = 124             # bottom of the holes (the lose-zone interior)
NET_TOP = 58                # how high the nets reach
PSCALE = 0.6                # ~13px-tall players
BALL_R = 11                 # bigger ball ≈ 1.7x a player

def scene(count):
    W, H = 240, 150
    img = Image.new("RGBA", (W, H), (*SKY, 255)); px = img.load()
    # sky shading + sun + clouds
    for y in range(0, 90):
        for x in range(0, W):
            if (x * 7 + y * 13) % 23 == 0: setpx(px, W, H, x, y, SKY2)
    disc(px, W, H, 176, 30, 12, SUN); disc(px, W, H, 176, 30, 9, (255, 252, 230))
    cloud(px, W, H, 70, 34, 4); cloud(px, W, H, 150, 22, 3)
    # sandy frame: left/right walls, bottom, top corners (open sky in the middle-top)
    fill(px, W, H, 0, 0, 20, H, SAND); fill(px, W, H, W - 20, 0, W, H, SAND)
    fill(px, W, H, 0, FLOOR_TOP, W, H, SAND)
    fill(px, W, H, 0, 0, 40, 26, SAND); fill(px, W, H, W - 40, 0, W, 26, SAND)
    # sand texture speckle
    for i in range(900):
        x = (i * 53) % W; y = (i * 29) % H
        if px[x, y][:3] == SAND: setpx(px, W, H, x, y, SAND2 if (x + y) % 3 else SANDD)
    # inner edge line of the frame
    for x in range(20, W - 20): setpx(px, W, H, x, FLOOR_TOP - 1, EDGE)
    for y in range(0, FLOOR_TOP): setpx(px, W, H, 19, y, EDGE); setpx(px, W, H, W - 20, y, EDGE)

    zoneW = (PX1 - PX0) / count
    # pits (holes) — one colour per player
    for i in range(count):
        zx0 = int(PX0 + i * zoneW) + (2 if i == 0 else 1)
        zx1 = int(PX0 + (i + 1) * zoneW) - (2 if i == count - 1 else 1)
        rim, body, deep = ZONE[i]
        for y in range(FLOOR_TOP, FLOOR_BOT):
            t = (y - FLOOR_TOP) / (FLOOR_BOT - FLOOR_TOP)
            c = tuple(int(rim[k] + (deep[k] - rim[k]) * t) for k in range(3))
            for x in range(zx0, zx1): setpx(px, W, H, x, y, c)
        for x in range(zx0, zx1):           # bright rim lip + dark base line
            setpx(px, W, H, x, FLOOR_TOP, tuple(min(255, v + 30) for v in rim))
            setpx(px, W, H, x, FLOOR_BOT - 1, deep)
        for y in range(FLOOR_TOP, FLOOR_BOT):
            setpx(px, W, H, zx0, y, EDGE); setpx(px, W, H, zx1 - 1, y, EDGE)
    # nets on the dividers between zones
    for i in range(1, count):
        dx = int(PX0 + i * zoneW)
        fill(px, W, H, dx - 2, FLOOR_TOP - 2, dx + 2, FLOOR_BOT, SANDD)      # divider wall base
        fill(px, W, H, dx - 1, NET_TOP, dx + 1, FLOOR_TOP, NETP)            # pole
        for y in range(NET_TOP, NET_TOP + 22):                              # mesh
            for x in range(dx - 6, dx + 7):
                if (x + y) % 2 == 0: setpx(px, W, H, x, y, NETW)
        fill(px, W, H, dx - 7, NET_TOP - 2, dx + 7, NET_TOP, NETP)         # top band
    # small players standing on the RIM of their hole (so the court reads big)
    for i in range(count):
        cx = int(PX0 + (i + 0.5) * zoneW)
        rim, body, deep = ZONE[i]
        for yy in range(-1, 2):                       # small coloured pad on the rim
            for xx in range(-5, 6):
                if (xx / 5) ** 2 + (yy / 1.6) ** 2 <= 1: setpx(px, W, H, cx + xx, FLOOR_TOP + yy, body)
        fighter(img, ZNAMES[i], cx, FLOOR_TOP + 1, scale=PSCALE, flip=(i % 2 == 1))
    # the ball — roughly player-sized (a touch bigger), arcing toward someone's hole
    ball(img, int(PX0 + zoneW * (count - 0.7)), 50, r=BALL_R)
    # score chips along the bottom sand
    for i in range(count):
        cx = int(PX0 + (i + 0.5) * zoneW); bw2 = int(zoneW) - 8
        bx0 = cx - bw2 // 2; by0 = FLOOR_BOT + 6
        fill(px, W, H, bx0, by0, bx0 + bw2, by0 + 14, (28, 24, 36))
        fill(px, W, H, bx0, by0, bx0 + bw2, by0 + 2, ZONE[i][1])
        head = fgrid(getattr(C, ZNAMES[i]))[:10]
        hf = Image.new("RGBA", (len(head[0]), 10), (0, 0, 0, 0)); hp = hf.load()
        for ry in range(10):
            for rx in range(len(head[ry])):
                cc = FPAL.get(head[ry][rx])
                if cc: hp[rx, ry] = (*cc, 255)
        img.alpha_composite(hf.resize((10, 10), Image.NEAREST), (bx0 + 3, by0 + 3))
        t = pf.text("5", 1, (255, 255, 255)); img.alpha_composite(t, (bx0 + bw2 - 8, by0 + 4))

    up = img.resize((W * 4, H * 4), Image.NEAREST)
    return up

if __name__ == "__main__":
    for n in (2, 3, 4):
        scene(n).convert("RGB").save(os.path.join(OUT, f"volley_{n}.png"))
        print("wrote volley_%d.png" % n)
    print("done")
