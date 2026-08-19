"""Record the short animated tutorials shown inside the app.

Runs the real app in a phone sized browser, takes a frame after every step and
stitches the frames into a GIF with ffmpeg.

    python3 tools/make_tutorials.py --url http://localhost:8765 --out public/tut
"""

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

PHONE = {"width": 390, "height": 720}
HOLD = 6  # frames a step stays on screen (~1.2 s at 5 fps)
FPS = 5


def gif(frames: Path, target: Path) -> None:
    palette = frames / "palette.png"
    pattern = str(frames / "f%04d.png")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", pattern,
         "-vf", "scale=360:-1:flags=lanczos,palettegen=stats_mode=diff",
         str(palette)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS),
         "-i", pattern, "-i", str(palette), "-lavfi",
         "scale=360:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer",
         "-loop", "0", str(target)],
        check=True,
    )


class Recorder:
    def __init__(self, page, folder: Path):
        self.page = page
        self.folder = folder
        self.index = 0

    def shot(self, hold: int = HOLD) -> None:
        self.page.wait_for_timeout(250)
        first = self.folder / f"f{self.index:04d}.png"
        self.page.screenshot(path=str(first))
        self.index += 1
        for _ in range(hold - 1):
            shutil.copy(first, self.folder / f"f{self.index:04d}.png")
            self.index += 1

    def type(self, text: str, selector: str = "#query") -> None:
        self.page.click(selector)
        for letter in text:
            self.page.type(selector, letter, delay=40)
            self.shot(hold=2)
        self.shot()


def fresh(page, url: str) -> None:
    page.goto(url)
    page.evaluate("localStorage.clear()")
    page.goto(url)
    page.wait_for_selector("#results, .empty")
    page.evaluate("document.getElementById('guide').close()")


def by_code(rec: Recorder, url: str) -> None:
    fresh(rec.page, url)
    rec.shot()
    rec.type("7093")
    rec.page.click("#results li:first-child button")
    rec.page.wait_for_timeout(700)
    rec.shot(hold=10)
    rec.page.click("#zoomIn")
    rec.shot(hold=10)


def by_name(rec: Recorder, url: str) -> None:
    fresh(rec.page, url)
    rec.shot()
    rec.type("garnitura")
    rec.page.click("#results li:first-child button")
    rec.page.wait_for_timeout(700)
    rec.shot(hold=10)


def by_section(rec: Recorder, url: str) -> None:
    fresh(rec.page, url)
    rec.shot()
    rec.page.click("#groupList button:first-child")
    rec.shot()
    rec.page.click("#sectionList button:nth-child(2)")
    rec.page.wait_for_timeout(500)
    rec.shot(hold=10)


def worklist(rec: Recorder, url: str) -> None:
    fresh(rec.page, url)
    rec.type("7093")
    rec.page.click("#results li:first-child button")
    rec.page.wait_for_timeout(700)
    rec.shot()
    rec.page.click("#addList")
    rec.shot()
    rec.page.click("#note")
    rec.page.type("#note", "stoc hala 2", delay=40)
    rec.shot()
    rec.page.click("#close")
    rec.page.wait_for_timeout(400)
    rec.page.evaluate("window.scrollTo(0, 0)")
    rec.shot(hold=12)


def sending(rec: Recorder, url: str) -> None:
    fresh(rec.page, url)
    # the share sheet cannot be recorded, so the tap itself is enough
    rec.page.evaluate(
        "navigator.share = () => Promise.resolve(); window.open = () => null"
    )
    for code in ("7093", "7081"):
        rec.page.fill("#query", code)
        rec.page.wait_for_timeout(300)
        rec.page.click("#results li:first-child .listToggle")
        rec.shot()
    rec.page.fill("#query", "")
    rec.page.wait_for_timeout(300)
    rec.shot(hold=10)
    rec.page.click("#worklistSend")
    rec.shot(hold=8)
    rec.page.goto(f"{url}?lista=7093,7081")
    rec.page.wait_for_selector("#sharedTitle")
    rec.page.wait_for_timeout(700)
    rec.shot(hold=12)
    rec.page.click("#sharedSave")
    rec.page.wait_for_timeout(500)
    rec.shot(hold=12)


TUTORIALS = {
    "cod": by_code,
    "denumire": by_name,
    "categorii": by_section,
    "lista": worklist,
    "trimite": sending,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8765")
    parser.add_argument("--out", default="public/tut")
    parser.add_argument("--only", nargs="*", default=list(TUTORIALS))
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as play:
        browser = play.chromium.launch()
        page = browser.new_page(viewport=PHONE, device_scale_factor=1)
        for name in args.only:
            with tempfile.TemporaryDirectory() as folder:
                rec = Recorder(page, Path(folder))
                TUTORIALS[name](rec, args.url)
                gif(Path(folder), out / f"{name}.gif")
            print(f"{name}.gif")
        browser.close()


if __name__ == "__main__":
    main()
