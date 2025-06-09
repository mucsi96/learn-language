from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import navigate_to_card_creation


def test_home_page_title(page: Page):
    page.goto("http://localhost:8180/")
    expect(page).to_have_title("")


def test_sources_page_title(page: Page):
    page.goto("http://localhost:8180/sources")
    expect(page).to_have_title("Sources")


def test_source_page_title(page: Page):
    page.goto("http://localhost:8180/sources/goethe-a1/page/9")
    expect(page).to_have_title("9 / goethe-a1")


def test_card_page_title(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)
    expect(card_page).to_have_title("abfahren")
