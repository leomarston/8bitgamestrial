import os, glob, sys, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "art", "out")
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def shot(page, name): await page.screenshot(path=os.path.join(OUT, name))

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 980, "height": 620})
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))

        # game-select with 3 tiles
        await page.goto("file://" + os.path.join(ROOT, "game", "gameselect.html"))
        await page.wait_for_timeout(400); await shot(page, "gs_3tiles.png")

        # the graveyard game
        await page.goto("file://" + os.path.join(ROOT, "game", "graveyard.html"))
        await page.wait_for_timeout(500); await shot(page, "gv_01_ready.png")
        await page.wait_for_timeout(2300); await shot(page, "gv_02_play.png")
        # both idle: the monster ramps up and eventually catches one -> round resolves
        for _ in range(120):
            await page.wait_for_timeout(100)
            dbg = await page.evaluate("() => window.__gv")
            if dbg and dbg["phase"] == "over": break
        await page.wait_for_timeout(300); await shot(page, "gv_03_over.png")
        print("final:", await page.evaluate("() => window.__gv"))

        await b.close()
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK ->", OUT)

asyncio.run(main())
