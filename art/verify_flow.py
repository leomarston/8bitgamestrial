import os, sys, glob, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "game", "index.html")
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

        # P1 -> ZED (idx6): right,right, down ; P2 -> BOLT (idx7): start idx3 -> down,right?
        for k in ["KeyD", "KeyD", "KeyS"]:           # P1 to idx 6 (ZED)
            await page.keyboard.press(k); await page.wait_for_timeout(80)
        for k in ["ArrowDown"]:                       # P2 from CHIP(3) -> BOLT(7)
            await page.keyboard.press(k); await page.wait_for_timeout(80)
        await page.keyboard.press("Space"); await page.wait_for_timeout(120)  # P1 lock
        await page.keyboard.press("Enter"); await page.wait_for_timeout(300)  # P2 lock
        await page.screenshot(path=os.path.join(OUT, "flow_1_ready.png"))

        # kick off -> football
        await page.keyboard.press("Space")
        await page.wait_for_timeout(800)
        url_now = page.url
        await page.screenshot(path=os.path.join(OUT, "flow_2_football.png"))
        names = await page.evaluate("() => { try { return JSON.parse(localStorage.getItem('partyPicks')); } catch(e){ return null; } }")
        await b.close()
        print("navigated to:", url_now.split('/')[-1], "picks:", names)
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK")

asyncio.run(main())
