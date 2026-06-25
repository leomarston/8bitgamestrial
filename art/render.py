"""
4-bit (16-color) pixel art renderer for the couch-party minigame characters.

Design philosophy:
- ONE shared 16-color palette for the whole game (true 4-bit constraint).
- Each sprite is authored as an explicit ASCII grid so every pixel is placed by hand.
- Render scaled up with a soft drop-shadow + presentation card so the art is easy to judge.
"""

from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------------------
# THE 4-BIT PALETTE  (16 colors total, index 0 = transparent)
# ---------------------------------------------------------------------------
PALETTE = {
    ".": None,            # 0  transparent
    "K": (37, 30, 51),    # 1  outline / darkest
    "W": (244, 244, 238), # 2  white / shine
    "S": (255, 206, 158), # 3  skin light
    "s": (216, 140, 88),  # 4  skin shadow
    "R": (255, 93, 93),   # 5  red light   (P1 hoodie)
    "r": (190, 50, 56),   # 6  red dark
    "B": (93, 180, 255),  # 7  blue light  (P1 jeans)
    "b": (47, 100, 175),  # 8  blue dark
    "H": (176, 100, 52),  # 9  hair light  (brown)
    "h": (104, 58, 30),   # 10 hair dark   (brown)
    "G": (107, 214, 107), # 11 green light (P2 hoodie)
    "g": (47, 140, 80),   # 12 green dark
    "Y": (255, 213, 74),  # 13 yellow      (P2 hair / accents)
    "L": (194, 199, 208), # 14 grey light  (P2 pants)
    "D": (90, 99, 117),   # 15 grey dark
}

# ---------------------------------------------------------------------------
# GRID HELPERS
# ---------------------------------------------------------------------------
def grid(s, width=24):
    """Parse a multiline sprite string into rows, right-padded with transparent."""
    rows = []
    for raw in s.split("\n"):
        line = raw.rstrip("\n")
        if line.strip() == "" and not rows:
            continue  # skip leading blank lines
        if len(line) > width:
            raise ValueError(f"row too wide ({len(line)}>{width}): {line!r}")
        rows.append(line.ljust(width, "."))
    # drop trailing fully-empty rows
    while rows and set(rows[-1]) <= {"."}:
        rows.pop()
    return rows


def render_pixels(rows, scale):
    """Render a grid of palette chars to a transparent RGBA image."""
    h = len(rows)
    w = max(len(r) for r in rows)
    img = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            col = PALETTE.get(ch)
            if col is None:
                continue
            for dy in range(scale):
                for dx in range(scale):
                    px[x * scale + dx, y * scale + dy] = (*col, 255)
    return img


def soft_shadow(w_px, scale):
    """A simple oval drop shadow (pixelated to match the art)."""
    sw, sh = int(w_px * 0.62), max(scale * 2, 8)
    sh_img = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh_img)
    d.ellipse([0, 0, sw - 1, sh - 1], fill=(20, 16, 30, 110))
    return sh_img


def card(sprite, bg, name, accent, scale, pad=3):
    """Compose a single character beauty-shot: bg card + shadow + sprite + name banner."""
    sw, sh = sprite.size
    cw = sw + pad * 2 * scale
    ch = sh + pad * 2 * scale + 7 * scale  # extra room for shadow + name banner
    img = Image.new("RGBA", (cw, ch), (*bg, 255))

    # subtle checker floor in lower third
    floor = ch - 9 * scale
    d = ImageDraw.Draw(img)
    fb = tuple(max(0, c - 14) for c in bg)
    for yy in range(floor, ch, scale * 2):
        for xx in range(0, cw, scale * 2):
            if ((xx // (scale * 2)) + (yy // (scale * 2))) % 2 == 0:
                d.rectangle([xx, yy, xx + scale * 2 - 1, yy + scale * 2 - 1], fill=(*fb, 255))

    # shadow under feet
    sh_img = soft_shadow(sw, scale)
    img.alpha_composite(sh_img, ((cw - sh_img.width) // 2, ch - 9 * scale - sh_img.height // 2))

    # sprite
    img.alpha_composite(sprite, ((cw - sw) // 2, pad * scale))
    return img


def save_pair(name, rows, scale=16):
    sprite = render_pixels(rows, scale)
    sprite.save(os.path.join(OUT, f"{name}_sprite.png"))
    # also a 1x clean sheet (true resolution)
    render_pixels(rows, 1).save(os.path.join(OUT, f"{name}_1x.png"))
    return sprite
