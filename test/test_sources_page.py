from pathlib import Path
import sys
from playwright.sync_api import BrowserContext, Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, select_text_range


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
        step=0,
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

    with context.expect_page() as card_page_info:
        page.get_by_role(role="link", name="abfahren").click()
    card_page = card_page_info.value

    expect(card_page.get_by_label("German translation", exact=True)).to_have_value("abfahren")


def test_drag_to_select_multiple_regions(page: Page, context: BrowserContext):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # First region selection
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Second region selection
    select_text_range(page, "der Absender", "Können Sie mir seine Adresse sagen?")

    # Check that links from both regions are visible
    expect(page.get_by_role(role="link", name="aber")).to_be_visible()
    expect(page.get_by_role(role="link", name="abfahren")).to_be_visible()
    expect(page.get_by_role(role="link", name="der Absender")).to_be_visible()
    expect(page.get_by_role(role="link", name="die Adresse")).to_be_visible()
