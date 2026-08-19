"""Read a picking-list photo in the browser and print the catalog codes found."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

PHOTOS = [Path(p) for p in sys.argv[1:]]


def main() -> None:
    with sync_playwright() as play:
        browser = play.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto("http://localhost:8899/", wait_until="networkidle")
        if page.locator("#guideClose").is_visible():
            page.locator("#guideClose").click()
        for photo in PHOTOS:
            page.evaluate("document.getElementById('scanner').showModal()")
            page.set_input_files("#sheetFile", str(photo))
            page.wait_for_selector("#shared:not([hidden])", timeout=180000)
            title = page.locator("#sharedTitle").inner_text()
            codes = page.locator("#results .code").all_inner_texts()
            print(photo.name, "->", title, codes)
            page.locator("#sharedClose").click()
        print("errors:", errors)
        browser.close()


main()
