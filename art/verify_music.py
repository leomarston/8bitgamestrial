import os, glob, sys, asyncio
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
G = os.path.join(ROOT, "game")
chrome = next(iter(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome")), None)

async def src_of(page):
    return (await page.evaluate("() => (window.GameMusic ? window.GameMusic.src() : '')")).split("/")[-1]

async def main():
    errs = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=chrome, args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
        page = await b.new_page()
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)

        for f in ["index.html", "gameselect.html"]:
            await page.goto("file://" + os.path.join(G, f)); await page.wait_for_timeout(300)
            print(f"{f:16s} -> {await src_of(page)}")

        # game pages: should be one of music1-4; next() re-rolls
        for f in ["football.html", "flappy.html", "graveyard.html"]:
            await page.goto("file://" + os.path.join(G, f)); await page.wait_for_timeout(300)
            picks = [await src_of(page)]
            for _ in range(8):
                await page.evaluate("() => window.GameMusic.next()"); await page.wait_for_timeout(20)
                picks.append(await src_of(page))
            ok = all(p.startswith("music") and p.endswith(".mp3") for p in picks)
            print(f"{f:16s} -> first={picks[0]}  distinct_seen={sorted(set(picks))}  valid={ok}")

        await b.close()
    if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
    print("OK")

asyncio.run(main())
