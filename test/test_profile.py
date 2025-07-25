from playwright.sync_api import Page, expect


def test_title(page: Page):
    page.goto("http://localhost:8180")
    expect(page.get_by_role("link", name="Learn language")).to_be_visible()
    expect(page.get_by_role("link", name="Learn language")).to_have_attribute("href", "/")


def test_shows_user_initials_in_header(page: Page):
    page.goto("http://localhost:8180")
    expect(page.get_by_role("button", name="TU")).to_be_visible()


def test_shows_user_name_in_popup(page: Page):
    page.goto("http://localhost:8180")
    page.get_by_role("button", name="TU").click()
    expect(page.get_by_text("Test User")).to_be_visible()


def test_navigates_to_sources_from_popup(page: Page):
    page.goto("http://localhost:8180")
    page.get_by_role("button", name="TU").click()
    expect(page.get_by_role(role="menuitem", name="Create cards")).to_have_attribute("href", "/sources")
    page.get_by_role(role="menuitem", name="Create cards").click()
    expect(page.get_by_role(role="heading", level=1, name="Sources")).to_be_visible()
