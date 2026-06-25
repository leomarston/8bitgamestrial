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
        await page.goto("file://" + os.path.join(ROOT, "game", "platformer.html"))
        await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(ROOT, "art", "out", "rn_01_ready.png"))

        # P1 holds forward from the start (buffered through countdown); P2 idles
        await page.keyboard.down("KeyD")
        await page.wait_for_timeout(2200)   # past countdown, now in play
        st = await page.evaluate("() => window.__rn")
        print("0.x s into play:", {k: st[k] for k in ("phase", "p1y", "p1g", "a1", "a2")}, "(p1y~128 & solid ground)")
        await page.screenshot(path=os.path.join(ROOT, "art", "out", "rn_02_play.png"))

        # keep P1 running + jumping; P2 idle should fall behind the frame and die
        for i in range(90):
            if i % 6 == 0: await page.keyboard.press("KeyW")
            await page.wait_for_timeout(80)
            r = await page.evaluate("() => window.__rn")
            if r["phase"] == "over": break
        await page.keyboard.up("KeyD")
        r = await page.evaluate("() => window.__rn")
        await page.screenshot(path=os.path.join(ROOT, "art", "out", "rn_03_over.png"))
        print("result:", r)
        await b.close()
    if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
    print("OK")

asyncio.run(main())
