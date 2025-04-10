from playwright.sync_api import Page, expect


def test_displays_current_page(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    expect(page.get_by_role(role="spinbutton", name="Page")).to_have_value("9")


def test_displayes_page_content(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    expect(page.get_by_text("die Abfahrt")).to_be_visible()
    expect(page.get_by_text("Vor der Abfahrt rufe ich an.")).to_be_visible()
    expect(page.get_by_text("Seite 9")).to_be_visible()


def test_previous_page(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    page.get_by_role(role="link", name="Previous page").click()
    expect(page.get_by_text("Seite 8")).to_be_visible()


def test_next_page(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    page.get_by_role(role="link", name="Next page").click()
    expect(page.get_by_text("Seite 10")).to_be_visible()
