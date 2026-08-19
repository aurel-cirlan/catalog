"""Quick smoke test for named worklists and the feedback dialog."""

from playwright.sync_api import sync_playwright

URL = "http://localhost:8899/"


def main() -> None:
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 780})
        errors = []
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.add_init_script("localStorage.setItem('catalog.guide', '1')")
        page.goto(URL)
        page.wait_for_selector("#results")
        page.on("dialog", lambda d: d.accept("Santier Ploiesti"))

        page.fill("#query", "7093")
        page.wait_for_timeout(400)
        page.click("#results li:first-child .listToggle")
        print("titlu 1:", page.inner_text("#worklistTitle"))

        page.click("#worklistNew")
        page.wait_for_timeout(300)
        page.fill("#query", "7081")
        page.wait_for_timeout(400)
        page.click("#results li:first-child .listToggle")
        print("titlu 2:", page.inner_text("#worklistTitle"))
        print("liste:", page.inner_text("#listNames").replace("\n", " | "))

        page.fill("#query", "")
        page.wait_for_timeout(300)
        page.click("#listNames button:first-child")
        page.wait_for_timeout(300)
        print("dupa comutare:", page.inner_text("#worklistTitle"))

        page.reload()
        page.wait_for_selector("#worklistTitle")
        print("dupa reload:", page.inner_text("#worklistTitle"))

        page.goto(f"{URL}?lista=7093,7081&nume=Santier%20Brasov")
        page.wait_for_selector("#sharedTitle")
        print("primita:", page.inner_text("#sharedTitle"))
        page.click("#sharedSave")
        page.wait_for_timeout(400)
        print("dupa salvare:", page.inner_text("#worklistTitle"))
        print("liste:", page.inner_text("#listNames").replace("\n", " | "))

        page.click("#help")
        page.click("#feedback")
        page.wait_for_timeout(300)
        print("feedback:", page.is_visible("#feedbackWhatsapp"))
        print("erori:", errors)
        browser.close()


if __name__ == "__main__":
    main()
