import os
from render import grid, render_pixels, card, save_pair, OUT
import characters as C

SCALE = 16

def build_one(name, src, bg, accent):
    rows = grid(src)
    sprite = save_pair(name, rows, SCALE)
    c = card(sprite, bg, name, accent, SCALE)
    c.save(os.path.join(OUT, f"{name}_card.png"))
    print(f"{name}: grid {len(rows[0])}x{len(rows)}  card {c.size}")

if __name__ == "__main__":
    build_one("pixel", C.PIXEL, (58, 52, 78), (255, 93, 93))
    build_one("byte",  C.BYTE,  (44, 64, 70), (107, 214, 107))
    print("done ->", OUT)
