import os, glob, sys, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "art", "out")
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = await b.new_page(viewport={"width": 980, "height": 620})
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto("file://" + os.path.join(ROOT, "game", "graveyard.html"))
        await page.wait_for_timeout(2500)  # past the countdown

        # PUNCH TEST: place P1 next to P2, P1 punches -> P2 should be downed (~0.7s)
        await page.evaluate("() => window.__hook.tp(440,300,470,300)")
        before = await page.evaluate("() => window.__gv")
        await page.evaluate("() => window.__hook.punch()")
        await page.wait_for_timeout(120)
        after = await page.evaluate("() => window.__gv")
        await page.screenshot(path=os.path.join(OUT, "gv_punch.png"))
        print("before punch d2:", before["d2"], "| after punch d2:", after["d2"], "(>0 means P2 downed)")

        # let it run out: monster (slower) eventually resolves
        for _ in range(160):
            await page.wait_for_timeout(100)
            if (await page.evaluate("() => window.__gv"))["phase"] == "over": break
        print("final:", await page.evaluate("() => window.__gv"))
        await b.close()
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK")

asyncio.run(main())
