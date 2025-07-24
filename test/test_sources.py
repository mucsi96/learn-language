from playwright.sync_api import Page, expect
from utils import create_card


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


def test_displays_card_counts(page: Page):
    create_card(
        card_id='test-card-1',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "test1",
            "translation": {"en": "test1"},
        },
        state=1,
        learning_steps=0,
        due='2025-03-13 08:24:32.82948',
    )
    create_card(
        card_id='test-card-2',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "test2",
            "translation": {"en": "test2"},
        },
        state=1,
        learning_steps=0,
        due='2025-03-13 08:24:32.82948',
    )
    page.goto("http://localhost:8180/sources")
    expect(page.get_by_text("2 cards")).to_be_visible()


def test_displays_card_count_for_sources(page: Page):
    # Create some test cards for different sources
    create_card(
        card_id='test-card-1',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "lernen",
            "translation": {"en": "to learn"},
        },
        state=1,
        learning_steps=0,
        due='2025-07-21 08:24:32.82948',
    )
    create_card(
        card_id='test-card-2',
        source_id="goethe-a1",
        source_page_number=10,
        data={
            "word": "sprechen",
            "translation": {"en": "to speak"},
        },
        state=1,
        learning_steps=0,
        due='2025-07-21 08:24:32.82948',
    )
    create_card(
        card_id='test-card-3',
        source_id="goethe-a2",
        source_page_number=8,
        data={
            "word": "hören",
            "translation": {"en": "to hear"},
        },
        state=1,
        learning_steps=0,
        due='2025-07-21 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources")

    # Check that card counts are displayed
    expect(page.locator('text=Goethe A1').locator('..').get_by_text("2 cards")).to_be_visible()
    expect(page.locator('text=Goethe A2').locator('..').get_by_text("1 cards")).to_be_visible()
    expect(page.locator('text=Goethe B1').locator('..').get_by_text("0 cards")).to_be_visible()
