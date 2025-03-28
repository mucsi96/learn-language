from playwright.sync_api import Page, expect


def test_displayes_sources(page: Page):
    page.goto("http://localhost:8180/sources")
    expect(page.get_by_role(role="heading",
           level=1, name="Sources")).to_be_visible()
    expect(page.get_by_role(role="link", name="Goethe A1")).to_be_visible()
    expect(page.get_by_role(role="link", name="Goethe A2")).to_be_visible()
    expect(page.get_by_role(role="link", name="Goethe B1")).to_be_visible()


def test_sources_have_links(page: Page):
    page.goto("http://localhost:8180/sources")
    expect(page.get_by_role(role="link", name="Goethe A1")).to_have_attribute("href", "/sources/goethe-a1/page/9")
    expect(page.get_by_role(role="link", name="Goethe A2")).to_have_attribute("href", "/sources/goethe-a2/page/8")
    expect(page.get_by_role(role="link", name="Goethe B1")).to_have_attribute("href", "/sources/goethe-b1/page/16")
