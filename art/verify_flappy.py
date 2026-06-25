import os, sys, glob, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "game", "flappy.html")
OUT = os.path.join(ROOT, "art", "out")
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 1000, "height": 640})
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(500)
        await page.screenshot(path=os.path.join(OUT, "flap_01_ready.png"))   # countdown + arena

        # wait for play, then flap both for a while (P1 a bit weaker so it dies first)
        await page.wait_for_timeout(2200)
        grabbed_play = grabbed_chase = False
        for i in range(120):
            if i % 3 == 0: await page.keyboard.press("ArrowUp")     # P2 flaps often (survives)
            if i % 5 == 0: await page.keyboard.press("KeyW")        # P1 flaps less (dies sooner)
            await page.wait_for_timeout(60)
            dbg = await page.evaluate("() => window.__dbg")
            if dbg and dbg["phase"] == "play" and not grabbed_play and i > 6:
                await page.screenshot(path=os.path.join(OUT, "flap_02_play.png")); grabbed_play = True
            if dbg and dbg["phase"] == "chase" and not grabbed_chase:
                await page.screenshot(path=os.path.join(OUT, "flap_03_chase.png")); grabbed_chase = True
            if dbg and dbg["phase"] == "over":
                await page.screenshot(path=os.path.join(OUT, "flap_04_over.png"))
                break
        final = await page.evaluate("() => window.__dbg")
        await b.close()
        print("final:", final, "| chase shot:", grabbed_chase)
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK ->", OUT)

asyncio.run(main())
