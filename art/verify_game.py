import os, sys, glob, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "file://" + os.path.join(ROOT, "game", "index.html")
OUT = os.path.join(ROOT, "art", "out")

def find_chrome():
    for p in glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"):
        return p
    return None

async def main():
    chrome = find_chrome()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width": 1000, "height": 660})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(URL)
        await page.wait_for_timeout(600)
        await page.screenshot(path=os.path.join(OUT, "game_01_initial.png"))

        # P1 -> NOVA (idx2), P2 -> ACE (idx5)
        for k in ["KeyD", "KeyD"]:
            await page.keyboard.press(k); await page.wait_for_timeout(120)
        for k in ["ArrowDown", "ArrowRight", "ArrowRight"]:
            await page.keyboard.press(k); await page.wait_for_timeout(120)
        await page.wait_for_timeout(300)
        await page.screenshot(path=os.path.join(OUT, "game_02_moved.png"))

        # mirror case: move P2 onto P1's cell (both on NOVA) -> both cursors visible
        for k in ["ArrowUp", "ArrowLeft", "ArrowLeft", "ArrowLeft"]:
            await page.keyboard.press(k); await page.wait_for_timeout(100)
        await page.wait_for_timeout(300)
        await page.screenshot(path=os.path.join(OUT, "game_03_mirror.png"))

        # move P2 back to ACE, then P1 locks
        for k in ["ArrowDown", "ArrowRight", "ArrowRight"]:
            await page.keyboard.press(k); await page.wait_for_timeout(100)
        await page.keyboard.press("Space"); await page.wait_for_timeout(300)
        await page.screenshot(path=os.path.join(OUT, "game_03b_p1lock.png"))

        # P2 lock -> ready overlay
        await page.keyboard.press("Enter"); await page.wait_for_timeout(400)
        await page.screenshot(path=os.path.join(OUT, "game_04_bothready.png"))

        await browser.close()
        if errors:
            print("JS ERRORS:\n" + "\n".join(errors)); sys.exit(1)
        print("OK, screenshots in", OUT)

asyncio.run(main())
