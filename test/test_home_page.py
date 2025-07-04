from pathlib import Path
import sys
from playwright.sync_api import Page, expect
from datetime import datetime, timedelta

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_cards_with_states


def test_displays_welcome_message(page: Page):
    page.goto("http://localhost:8180")
    expect(page.get_by_role("heading", name="Welcome to Learn Language", exact=True)).to_be_visible()


def test_displays_source_list(page: Page):
    page.goto("http://localhost:8180")
    expect(page.get_by_role("heading", name="Goethe A1", exact=True)).to_be_visible()
    expect(page.get_by_role("heading", name="Goethe A2", exact=True)).to_be_visible()
    expect(page.get_by_role("heading", name="Goethe B1", exact=True)).to_be_visible()


def test_due_cards_count_by_state(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)
    tomorrow = now + timedelta(days=1)

    cards_to_create = [
        {'state': 0, 'count': 2, 'due_date': yesterday},
        {'state': 1, 'count': 1, 'due_date': yesterday},
        {'state': 2, 'count': 2, 'due_date': yesterday},
        {'state': 3, 'count': 1, 'due_date': yesterday},
        {'state': 0, 'count': 1, 'due_date': tomorrow},
        {'state': 1, 'count': 1, 'due_date': tomorrow},
        {'state': 2, 'count': 1, 'due_date': tomorrow},
        {'state': 3, 'count': 1, 'due_date': tomorrow},
    ]

    create_cards_with_states('goethe-a1', cards_to_create)

    page.goto('http://localhost:8180')
    expect(page.get_by_title("New", exact=True)).to_contain_text("2")
    expect(page.get_by_title("Learning", exact=True)).to_contain_text("1")
    expect(page.get_by_title("Review", exact=True)).to_contain_text("2")
    expect(page.get_by_title("Relearning", exact=True)).to_contain_text("1")
