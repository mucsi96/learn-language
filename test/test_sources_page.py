from pathlib import Path
import sys
from playwright.sync_api import BrowserContext, Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, select_text_range, scroll_element_to_top


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


def test_bookmarks_last_visited_page(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    page.get_by_role(role="link", name="Next page").click()
    page.get_by_role(role="link", name="Next page").click()
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()
    expect(page.get_by_text("Seite 11")).to_be_visible()


def test_highlights_existing_cards(page: Page):
    create_card(
        card_id='anfangen',
        source_id="goethe-a2",
        source_page_number=9,
        data={
            "word": "anfangen",
            "translation": {"en": "to start"},
        },
        state=1,
        learning_steps=0,
        due='2025-03-13 08:24:32.82948',
    )
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A2").click()
    expect(page.get_by_text("anfangen,")).to_have_accessible_description("Card exists")


def test_drag_to_select_words(page: Page, context: BrowserContext):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    expect(page.get_by_role(role="link", name="aber")).to_be_visible()
    expect(page.get_by_role(role="link", name="abfahren")).to_be_visible()

    page.get_by_role(role="link", name="abfahren").click()

    expect(page.get_by_label("German translation", exact=True)).to_have_value("abfahren")


def test_drag_to_select_multiple_regions(page: Page, context: BrowserContext):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    scroll_element_to_top(page, "A", exact=True)

    # First region selection
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    expect(page.get_by_role(role="link", name="aber")).to_be_visible()

    # Second region selection
    select_text_range(page, "der Absender", "Können Sie mir seine Adresse sagen?")

    # Check that links from both regions are visible
    expect(page.get_by_role(role="link", name="aber")).to_be_visible()
    expect(page.get_by_role(role="link", name="abfahren")).to_be_visible()
    expect(page.get_by_role(role="link", name="der Absender")).to_be_visible()
    expect(page.get_by_role(role="link", name="die Adresse")).to_be_visible()


def test_source_selector_routing_works(page: Page):
    # Navigate to first source page
    page.goto("http://localhost:8180/sources/goethe-a1/page/9")

    # Check initial content is visible
    expect(page.get_by_text("die Abfahrt")).to_be_visible()

    # Open the source selector dropdown
    page.get_by_role("button", name="Goethe A1").click()

    # Select the second source
    page.get_by_role("menuitem", name="Goethe A2").click()

    # URL should change
    expect(page).to_have_url("http://localhost:8180/sources/goethe-a2/page/8")

    # Content should change to the page from the second source
    expect(page.get_by_text("die Adresse")).not_to_be_visible()


def test_source_selector_dropdown_content(page: Page):
    # Navigate to sources page
    page.goto("http://localhost:8180/sources/goethe-a1/page/9")

    # Open the source selector dropdown
    page.get_by_role("button", name="Goethe A1").click()

    # Check all sources are available in the dropdown
    expect(page.get_by_role("menuitem", name="Goethe A1")).to_be_visible()
    expect(page.get_by_role("menuitem", name="Goethe A2")).to_be_visible()
    expect(page.get_by_role("menuitem", name="Goethe B1")).to_be_visible()
