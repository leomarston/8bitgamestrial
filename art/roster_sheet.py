import os
from PIL import Image, ImageDraw
from render import grid, render_pixels, OUT
import pixelfont as pf
import characters as C

def build():
    SCALE = 8
    cols, rows = 4, 2
    cell_w, cell_h = 200, 290
    pad = 16
    W = cols * cell_w + pad * 2
    H = rows * cell_h + pad * 2 + 40
    img = Image.new("RGBA", (W, H), (26, 22, 38, 255))
    d = ImageDraw.Draw(img)

    title = pf.text_shadow("8 FIGHTERS - 4-BIT ROSTER", 3, (255, 213, 74))
    img.alpha_composite(title, ((W - title.width) // 2, 10))

    for i, (name, src, accent) in enumerate(C.ROSTER):
        cx = pad + (i % cols) * cell_w
        cy = pad + 40 + (i // cols) * cell_h
        ac = tuple(int(accent[j:j+2], 16) for j in (1, 3, 5))
        d.rounded_rectangle([cx + 6, cy + 6, cx + cell_w - 6, cy + cell_h - 6],
                            radius=10, fill=(40, 35, 56), outline=ac, width=3)
        spr = render_pixels(grid(src), SCALE)
        sx = cx + (cell_w - spr.width) // 2
        sy = cy + 26
        # shadow
        ov = Image.new("RGBA", (spr.width, 18), (0, 0, 0, 0))
        ImageDraw.Draw(ov).ellipse([spr.width//2-50, 0, spr.width//2+50, 16], fill=(15,12,24,120))
        img.alpha_composite(ov, (sx, sy + spr.height - 8))
        img.alpha_composite(spr, (sx, sy))
        nm = pf.text(name, 3, ac)
        img.alpha_composite(nm, (cx + (cell_w - nm.width) // 2, cy + cell_h - 34))

    img.convert("RGB").save(os.path.join(OUT, "roster.png"))
    print("roster.png", img.size)

if __name__ == "__main__":
    build()
