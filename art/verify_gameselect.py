import os, sys, glob, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "game", "gameselect.html")
OUT = os.path.join(ROOT, "art", "out")
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 1000, "height": 660})
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(OUT, "gs_01_initial.png"))

        # move to an empty tile (idx 2) and try to pick -> "not ready"
        await page.keyboard.press("KeyD"); await page.keyboard.press("KeyD")
        await page.wait_for_timeout(120)
        await page.keyboard.press("Space"); await page.wait_for_timeout(150)
        await page.screenshot(path=os.path.join(OUT, "gs_02_locked.png"))
        sel = await page.evaluate("() => window.__sel")
        print("on empty tile:", sel, "url still gameselect:", page.url.endswith("gameselect.html"))

        # go back to football (idx 0) and pick -> navigate
        await page.keyboard.press("KeyA"); await page.keyboard.press("KeyA")
        await page.wait_for_timeout(120)
        await page.keyboard.press("Space"); await page.wait_for_timeout(500)
        print("after picking football, url:", page.url.split('/')[-1])

        await b.close()
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK ->", OUT)

asyncio.run(main())
