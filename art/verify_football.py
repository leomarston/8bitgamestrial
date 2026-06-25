import os, sys, glob, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "game", "football.html")
OUT = os.path.join(ROOT, "art", "out")

def find_chrome():
    for p in glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"):
        return p

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=find_chrome(), args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 1000, "height": 640})
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(300)
        await page.screenshot(path=os.path.join(OUT, "fb_01_kickoff.png"))   # arena + GET READY

        # play a short rally to show the ball mid-flight + shadow under it
        await page.wait_for_timeout(900)
        await page.keyboard.down("ArrowUp")  # P2 climbs
        await page.wait_for_timeout(400)
        await page.keyboard.up("ArrowUp")
        await page.screenshot(path=os.path.join(OUT, "fb_02_play.png"))

        # force a goal: send P1 keeper to the bottom and hold, leaving the net open
        await page.keyboard.down("KeyS")
        captured = False
        for _ in range(60):  # up to ~6s, grab the GOAL frame
            await page.wait_for_timeout(100)
            sc = await page.evaluate("() => window.__score || null")
            if sc and (sc[0] + sc[1] > 0):
                await page.screenshot(path=os.path.join(OUT, "fb_03_goal.png"))
                captured = True; break
        await page.keyboard.up("KeyS")
        if not captured:
            await page.screenshot(path=os.path.join(OUT, "fb_03_goal.png"))
        print("score after:", await page.evaluate("() => window.__score || null"))

        await b.close()
        if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
        print("OK ->", OUT)

asyncio.run(main())
