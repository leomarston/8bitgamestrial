"""
Hand-authored sprite grids for the 8 couch-party fighters.

True 4-bit: ONE shared 16-color palette (see render.PALETTE).
Each fighter is a 24x~29 chibi. PIXEL and BYTE are authored as full literal
grids; the rest are composed from a shared face/body template so the whole
roster stays visually consistent, then customised per character.
"""

# ---------------------------------------------------------------------------
# Shared builders
# ---------------------------------------------------------------------------
def center(core, w=24):
    pad = w - len(core)
    if pad < 0:
        raise ValueError(f"core too wide ({len(core)}): {core!r}")
    left = pad // 2
    return "." * left + core + "." * (pad - left)


def face_rows(x, e):
    """9 rows: forehead -> neck.  x = side-hair char, e = eyebrow char."""
    return [
        f".....K{x}{x}SSSSSSSS{x}{x}K.....",
        f".....K{x}{x}S{e}SSSS{e}S{x}{x}K.....",
        f".....K{x}{x}SKKSSKKS{x}{x}K.....",
        f".....K{x}{x}SWKSSWKS{x}{x}K.....",
        f".....K{x}{x}SsSSSSsS{x}{x}K.....",
        f".....K{x}{x}SSKrrKSS{x}{x}K.....",
        f"......K{x}SSssssSS{x}K......",
        "........KSSSSSSK........",
        ".........KsSSsK.........",
    ]


def body_rows(c1, c2, p1, p2, em, sole):
    """13 rows: hoodie collar -> shoe soles."""
    return [
        f"......K{c1}{c1}{c1}{c2}{c2}{c2}{c2}{c1}{c1}{c1}K......",
        f".....K{c1}{c1}{c1}{c1}{c1}{em}{em}{c1}{c1}{c1}{c1}{c1}K.....",
        f".....K{c2}{c1}{c1}{c1}{c1}{c2}{c2}{c1}{c1}{c1}{c1}{c2}K.....",
        f".....K{c2}{c1}{c1}{c1}{c1}{c2}{c2}{c1}{c1}{c1}{c1}{c2}K.....",
        f".....K{c2}{c1}{c1}{c1}{c1}{c2}{c2}{c1}{c1}{c1}{c1}{c2}K.....",
        f".....KS{c2}{c2}{c2}{c2}{c2}{c2}{c2}{c2}{c2}{c2}SK.....",
        f".......K{p1}{p1}{p1}{p2}{p2}{p1}{p1}{p1}K.......",
        f".......K{p1}{p1}{p1}{p2}{p2}{p1}{p1}{p1}K.......",
        f".......K{p1}{p1}{p1}KK{p1}{p1}{p1}K.......",
        f".......K{p2}{p2}{p2}KK{p2}{p2}{p2}K.......",
        ".......KWWWKKWWWK.......",
        "......KWWWWKKWWWWK......",
        f"......K{sole}{sole}{sole}{sole}KK{sole}{sole}{sole}{sole}K......",
    ]


def humanoid(tops, x, e, c1, c2, p1, p2, em, sole):
    rows = [center(t) for t in tops]
    rows += face_rows(x, e)
    rows += body_rows(c1, c2, p1, p2, em, sole)
    return "\n".join(rows)


def setpx(grid_str, edits):
    """edits: list of (y, x, ch) applied onto a grid string -> grid string."""
    rows = [list(r) for r in grid_str.split("\n")]
    for (y, x, ch) in edits:
        if 0 <= y < len(rows) and 0 <= x < len(rows[y]):
            rows[y][x] = ch
    return "\n".join("".join(r) for r in rows)


# ---------------------------------------------------------------------------
# 1) PIXEL — brown mop, red hoodie, blue jeans
# ---------------------------------------------------------------------------
PIXEL = "\n".join([
    ".........KKKKKK.........",
    ".......KhhhhhhhhK.......",
    "......KhhhHHHhhhhK......",
    ".....KhhhhHHhhhhhhK.....",
] + face_rows("h", "h") + body_rows("R", "r", "B", "b", "W", "D"))

# ---------------------------------------------------------------------------
# 2) BYTE — blue beanie + pom, blonde hair, green hoodie + star, grey joggers
# ---------------------------------------------------------------------------
BYTE = "\n".join([
    "...........WW...........",
    ".........KKWWKK.........",
    ".......KBBBBBBBBK.......",
    "......KBBBBBBBBBBK......",
    ".....KBBBBBBBBBBBBK.....",
    ".....KbbbbbbbbbbbbK.....",
] + face_rows("Y", "h") + [
    "......KGGGggggGGGK......",
    ".....KGGGGGYYGGGGGK.....",
    ".....KgGGGYYYYGGGgK.....",
    ".....KgGGGGYYGGGGgK.....",
    ".....KgGGGGggGGGGgK.....",
    ".....KSggggggggggSK.....",
    ".......KLLLDDLLLK.......",
    ".......KLLLDDLLLK.......",
    ".......KLLLKKLLLK.......",
    ".......KDDDKKDDDK.......",
    ".......KWWWKKWWWK.......",
    "......KWWWWKKWWWWK......",
    "......KggggKKggggK......",
])

# ---------------------------------------------------------------------------
# 3) NOVA — tall red flame hair, blue jacket, grey jeans
# ---------------------------------------------------------------------------
NOVA = humanoid(
    ["RR", "KRRRRK", "KRRRRRRK", "KRRRRRRRRRRK",
     "KRRRRRRRRRRRRK", "KRRrrRRRRrrRRK", "KRRRRRRRRRRRRK"],
    x="r", e="r", c1="B", c2="b", p1="L", p2="D", em="Y", sole="D")

# ---------------------------------------------------------------------------
# 4) CHIP — blonde twin-tails, green tee, blue overalls
# ---------------------------------------------------------------------------
CHIP = humanoid(
    ["KYYYYYYK", "KYYYYYYYYYYK", "KYYYYYYYYYYYYK",
     "KYYYYYhhYYYYYK", "KYYYYYSSYYYYYK"],
    x="Y", e="h", c1="G", c2="g", p1="B", p2="b", em="W", sole="L")
# twin-tails: hair blobs sticking out either side near the cheeks
_tt = [(8, 4, "K"), (8, 3, "K"),
       (9, 3, "K"), (9, 4, "Y"), (9, 2, "K"),
       (10, 2, "K"), (10, 3, "Y"), (10, 4, "Y"), (10, 1, "K"),
       (11, 2, "K"), (11, 3, "Y"), (11, 4, "Y"), (11, 1, "K"),
       (12, 2, "K"), (12, 3, "Y"), (12, 4, "K"),
       (13, 3, "K")]
_tt += [(y, 23 - x, ch) for (y, x, ch) in _tt]  # mirror to the right
CHIP = setpx(CHIP, _tt)

# ---------------------------------------------------------------------------
# 5) GLITCH — green mohawk, shaved sides, grey jacket, blue jeans
# ---------------------------------------------------------------------------
GLITCH = humanoid(
    ["GG", "KGGK", "KSGGSK", "KSSGGSSK", "KSSSGGSSSK", "KSSSSGGSSSSK"],
    x="S", e="g", c1="L", c2="D", p1="B", p2="b", em="R", sole="D")

# ---------------------------------------------------------------------------
# 6) ACE — blue ball cap (red logo), brown hair, red varsity jacket, grey jeans
# ---------------------------------------------------------------------------
ACE = humanoid(
    ["KBBBBBBK", "KBBBBRRBBBBK", "KBBBBBBBBBBBBK",
     "KBbBBBBBBBBbBK", "KbbbbbbbbbbbbK"],
    x="h", e="h", c1="R", c2="r", p1="L", p2="D", em="Y", sole="D")

# ---------------------------------------------------------------------------
# 7) ZED — ninja: dark hood + red headband, masked face, dark gi
# ---------------------------------------------------------------------------
ZED = "\n".join([
    ".........KKKKKK.........",
    ".......KDDDDDDDDK.......",
    "......KDDDDDDDDDDK......",
    ".....KRRRRRRRRRRRRK.....",
    ".....KDDDDDDDDDDDDK.....",
    ".....KDDSSSSSSSSDDK.....",
    ".....KDDSKKSSKKSDDK.....",
    ".....KDDSWKSSWKSDDK.....",
    "......KDDDDDDDDDDK......",
    "......KDDDDDDDDDDK......",
    "........KDDDDDDK........",
    ".........KDDDDK.........",
] + body_rows("D", "K", "D", "K", "R", "D"))

# ---------------------------------------------------------------------------
# 8) BOLT — robot: grey metal, antenna, blue visor, metal body
# ---------------------------------------------------------------------------
BOLT = "\n".join([
    "...........YY...........",
    "...........LL...........",
    ".......KLLLLLLLLK.......",
    "......KLLLLLLLLLLK......",
    ".....KLLLLLLLLLLLLK.....",
    ".....KLDDDDDDDDDDLK.....",
    ".....KLDBWBBBBWBDLK.....",
    ".....KLDBBBBBBBBDLK.....",
    "......KLLLLLLLLLLK......",
    "......KLKLKLKLKLLK......",
    "........KLLLLLLK........",
    ".........KLLLLK.........",
] + body_rows("L", "D", "L", "D", "R", "D"))


# ---------------------------------------------------------------------------
# Football — a 16x16 soccer ball (white + black patches + grey shading)
# ---------------------------------------------------------------------------
BALL = "\n".join([
    ".....KKKKKK.....",
    "...KKWWWWWWKK...",
    "..KWWWWWWWWWLLK.",
    ".KWWWWWKKWWWWLLK",
    ".KWWWKKKKKKWWLLK",
    "KWWWWKKKKKKWWWLK",
    "KWWWWWKKKKWWWWLK",
    "KWWWWWWKKWWWWWLK",
    "KWWWWWWWWWWWWWLK",
    "KWWKKWWWWWWKKWLK",
    "KWWKKKWWWWKKKWLK",
    ".KWWKKWWWWKKWLLK",
    ".KWWWWWWWWWWLLK.",
    "..KWWWWWWWWLLK..",
    "...KKWWWWLLKK...",
    ".....KKKKKK.....",
])

# ---------------------------------------------------------------------------
# Flappy wings — a right wing in two flap frames (mirror in code for the left).
# White feathers, dark trailing edge, grey underside shading.
# ---------------------------------------------------------------------------
WING_UP = "\n".join([
    ".......KK..",
    ".....KKWWK.",
    "...KKWWWWK.",
    ".KKWWWWWLK.",
    "KWWWWWWLK..",
    "KWWWWWLK...",
    ".KWWWLK....",
    "..KKKK.....",
])
WING_DOWN = "\n".join([
    "..KKKK.....",
    ".KWWWLK....",
    "KWWWWWLK...",
    "KWWWWWWLK..",
    ".KKWWWWWLK.",
    "...KKWWWWK.",
    ".....KKWWK.",
    ".......KK..",
])

# ---------------------------------------------------------------------------
# Roster (order = grid order, row-major 4x2)
# ---------------------------------------------------------------------------
ROSTER = [
    ("PIXEL",  PIXEL,  "#ff5d5d"),
    ("BYTE",   BYTE,   "#6bd66b"),
    ("NOVA",   NOVA,   "#5db4ff"),
    ("CHIP",   CHIP,   "#ffd54a"),
    ("GLITCH", GLITCH, "#6bd66b"),
    ("ACE",    ACE,    "#ff5d5d"),
    ("ZED",    ZED,    "#c2c7d0"),
    ("BOLT",   BOLT,   "#5db4ff"),
]
