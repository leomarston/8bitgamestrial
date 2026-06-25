import os, glob, sys, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def main():
    errs = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 980, "height": 620})
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await page.goto("file://" + os.path.join(ROOT, "game", "graveyard.html"))
        await page.wait_for_timeout(2500)  # into play

        # Put the zombie on one side of a grave (headstone at ~720,372) and the
        # idle target on the FAR side, directly in line so the grave is between them.
        await page.evaluate("() => { window.__hook.tp(770,355, 60,540); window.__hook.setMon(660,355); }")
        m0 = await page.evaluate("() => window.__hook.mon()")
        caught = False
        for _ in range(60):                # up to 6s
            await page.wait_for_timeout(100)
            gv = await page.evaluate("() => window.__gv")
            if not gv["a1"] or gv["phase"] == "over": caught = True; break
        m1 = await page.evaluate("() => (window.__hook ? window.__hook.mon() : null)")
        await b.close()
        print("monster start:", m0, "-> end:", m1, "| reached idle target across the grave:", caught)
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK" if caught else "STILL STUCK")
        sys.exit(0 if caught else 2)

asyncio.run(main())
