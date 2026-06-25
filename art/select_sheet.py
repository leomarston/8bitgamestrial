import os
from PIL import Image, ImageDraw
from render import grid, render_pixels, PALETTE, OUT
import pixelfont as pf
import characters as C

def panel(draw_img, x, y, w, h, fill, border, radius=14, bw=4):
    d = ImageDraw.Draw(draw_img)
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=fill)
    d.rounded_rectangle([x, y, x + w, y + h], radius=radius, outline=border, width=bw)

def shadow_oval(img, cx, cy, rw, rh, alpha=120):
    ov = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
    ImageDraw.Draw(ov).ellipse([0, 0, rw * 2 - 1, rh * 2 - 1], fill=(15, 12, 24, alpha))
    img.alpha_composite(ov, (cx - rw, cy - rh))

def build_select():
    W, H = 900, 660
    bg = (26, 22, 38)
    img = Image.new("RGBA", (W, H), (*bg, 255))
    d = ImageDraw.Draw(img)

    # ---- backdrop: subtle diagonal scanline grid ----
    for yy in range(0, H, 4):
        d.line([(0, yy), (W, yy)], fill=(31, 27, 46), width=1)
    # corner glow rectangles
    d.rectangle([0, 0, W, 8], fill=(47, 100, 175))
    d.rectangle([0, H - 8, W, H], fill=(190, 50, 56))

    # ---- title ----
    title = pf.text_shadow("CHOOSE YOUR FIGHTER", scale=5, color=(255, 213, 74))
    img.alpha_composite(title, ((W - title.width) // 2, 26))
    sub = pf.text("8-BIT PARTY  *  4-BIT BUILD  *  COUCH CO-OP", scale=2, color=(150, 156, 178))
    img.alpha_composite(sub, ((W - sub.width) // 2, 74))

    panels = [
        dict(src=C.PIXEL, name="PIXEL", tag="PLAYER 1", fill=(58, 40, 54),
             border=(255, 93, 93), keys="MOVE: W A S D    HIT: SPACE", x=46),
        dict(src=C.BYTE, name="BYTE", tag="PLAYER 2", fill=(40, 56, 54),
             border=(107, 214, 107), keys="MOVE: ARROWS    HIT: ENTER", x=474),
    ]
    PW, PH, PY = 380, 478, 108
    SCALE = 10

    for p in panels:
        x = p["x"]
        panel(img, x, PY, PW, PH, (*p["fill"], 255), p["border"])
        # tag banner
        d.rounded_rectangle([x + 18, PY + 16, x + PW - 18, PY + 54], radius=8, fill=p["border"])
        tag = pf.text(p["tag"], scale=3, color=(26, 22, 38))
        img.alpha_composite(tag, (x + (PW - tag.width) // 2, PY + 26))

        # sprite + floor shadow
        rows = grid(p["src"])
        spr = render_pixels(rows, SCALE)
        sx = x + (PW - spr.width) // 2
        sy = PY + 74
        shadow_oval(img, x + PW // 2, sy + spr.height - 4, int(spr.width * 0.40), 13)
        img.alpha_composite(spr, (sx, sy))

        # name plate
        npy = PY + PH - 92
        d.rounded_rectangle([x + 30, npy, x + PW - 30, npy + 46], radius=8,
                            fill=(20, 16, 30), outline=p["border"], width=3)
        nm = pf.text(p["name"], scale=5, color=p["border"])
        img.alpha_composite(nm, (x + (PW - nm.width) // 2, npy + 8))

        # control hint
        keys = pf.text(p["keys"], scale=2, color=(190, 195, 210))
        img.alpha_composite(keys, (x + (PW - keys.width) // 2, npy + 58))

    # ---- VS badge in the middle ----
    cx = W // 2
    vy = PY + 150
    d.ellipse([cx - 40, vy - 40, cx + 40, vy + 40], fill=(255, 213, 74), outline=(26, 22, 38), width=5)
    vs = pf.text("VS", scale=6, color=(26, 22, 38))
    img.alpha_composite(vs, (cx - vs.width // 2, vy - vs.height // 2))

    # ---- palette strip ----
    sy = H - 44
    sw = 30
    swatches = [k for k in PALETTE if PALETTE[k] is not None]
    total = sw * len(swatches)
    startx = (W - total) // 2
    lab = pf.text("4-BIT PALETTE - 16 COLORS", scale=2, color=(150, 156, 178))
    img.alpha_composite(lab, ((W - lab.width) // 2, sy - 22))
    for i, k in enumerate(swatches):
        col = PALETTE[k]
        xx = startx + i * sw
        d.rectangle([xx, sy, xx + sw - 2, sy + 24], fill=(*col, 255), outline=(26, 22, 38), width=1)
    # transparent slot indicator at index 0
    d.rectangle([startx - sw, sy, startx - sw + sw - 2, sy + 24], outline=(80, 80, 90), width=1)

    img.convert("RGB").save(os.path.join(OUT, "character_select.png"))
    print("character_select.png", img.size)

if __name__ == "__main__":
    build_select()
