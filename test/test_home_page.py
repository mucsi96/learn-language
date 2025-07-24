from pathlib import Path
import sys
import uuid
from datetime import datetime, timedelta

from playwright.sync_api import Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, create_cards_with_states


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
        {'state': 'NEW', 'count': 2, 'due_date': yesterday},
        {'state': 'REVIEW', 'count': 2, 'due_date': yesterday},
        {'state': 'LEARNING', 'count': 1, 'due_date': tomorrow},
        {'state': 'RELEARNING', 'count': 1, 'due_date': tomorrow},
    ]

    create_cards_with_states('goethe-a1', cards_to_create)

    page.goto('http://localhost:8180')
    expect(page.get_by_title("New", exact=True)).to_contain_text("2")
    expect(page.get_by_title("Learning", exact=True)).not_to_be_visible()
    expect(page.get_by_title("Review", exact=True)).to_contain_text("2")
    expect(page.get_by_title("Relearning", exact=True)).not_to_be_visible()


def test_due_cards_limited_to_max_50(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    cards_to_create = [
        {'state': 'NEW', 'count': 60, 'due_date': yesterday},
    ]

    create_cards_with_states('goethe-a1', cards_to_create)

    page.goto('http://localhost:8180')
    expect(page.get_by_title("New", exact=True)).to_contain_text("50")


def test_due_cards_limited_to_max_50_mixed_states(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    cards_to_create = [
        {'state': 'NEW', 'count': 20, 'due_date': yesterday},
        {'state': 'LEARNING', 'count': 15, 'due_date': yesterday},
        {'state': 'REVIEW', 'count': 10, 'due_date': yesterday},
        {'state': 'RELEARNING', 'count': 25, 'due_date': yesterday},
    ]

    create_cards_with_states('goethe-a1', cards_to_create)

    page.goto('http://localhost:8180')
    expect(page.get_by_title("New", exact=True)).to_contain_text("20")
    expect(page.get_by_title("Learning", exact=True)).to_contain_text("15")
    expect(page.get_by_title("Review", exact=True)).to_contain_text("10")
    expect(page.get_by_title("Relearning", exact=True)).to_contain_text("5")


def test_in_review_cards_not_on_home_page(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    create_card(
        card_id=str(uuid.uuid4()),
        source_id='goethe-a1',
        data={'en': 'test', 'hu': 'teszt', 'ch': 'test'},
        state='NEW',
        learning_steps=0,
        due=yesterday,
        readiness='IN_REVIEW'
    )

    create_card(
        card_id=str(uuid.uuid4()),
        source_id='goethe-a1',
        data={'en': 'test2', 'hu': 'teszt2', 'ch': 'test2'},
        state='NEW',
        learning_steps=0,
        due=yesterday,
        readiness= 'READY'
    )

    page.goto('http://localhost:8180')
    expect(page.get_by_title("New", exact=True)).to_contain_text("1")
