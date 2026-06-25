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
        url = "file://" + os.path.join(ROOT, "game", "platformer.html")

        # --- map changes every round: collect seeds across reloads ---
        seeds = []
        for _ in range(3):
            await page.goto(url); await page.wait_for_timeout(300)
            seeds.append((await page.evaluate("() => window.__rn")).get("seed"))
        print("seeds across reloads (should differ):", seeds)

        # --- no shaking: idle on the flat start, sample p1.y over many frames ---
        await page.goto(url); await page.wait_for_timeout(2300)   # into play, NO input (grace period)
        ys = []
        for _ in range(15):
            ys.append((await page.evaluate("() => window.__rn"))["p1y"]); await page.wait_for_timeout(28)
        print("idle p1y samples:", sorted(set(ys)), "(single value = no shake)")

        # --- squish: drop P1 onto P2's head on the flat start -> P2 squished ~1s ---
        await page.goto(url); await page.wait_for_timeout(2300)
        await page.evaluate("() => window.__rnhook.tp(100, 96, 100, 128)")   # P1 above P2, flat ground
        await page.evaluate("() => window.__rnhook.drop()")
        smax = 0
        for _ in range(8):
            await page.wait_for_timeout(40)
            smax = max(smax, (await page.evaluate("() => window.__rn"))["s2"])
        print("after stomp -> max P2 squish:", smax, "(>0 means squished & frozen)")
        await page.screenshot(path=os.path.join(ROOT, "art", "out", "rn_squish.png"))
        await b.close()
    if errs: print("JS ERRORS:\n" + "\n".join(errs)); sys.exit(1)
    print("OK")

asyncio.run(main())
