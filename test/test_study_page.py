from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import get_color_image_bytes, get_image_content, yellow_image, green_image, create_card, upload_mock_image, with_db_connection


def create_test_cards_with_states(source_id, states_counts, base_word="word"):
    """
    Create multiple cards for testing with specified states and counts.

    Args:
        source_id: The source ID for the cards
        states_counts: Dict mapping state numbers to counts, e.g. {0: 3, 1: 2}
        base_word: Base word to use for card creation

    Returns:
        Dict with counts per state name
    """
    state_names = {
        0: "new",
        1: "learning",
        2: "review",
        3: "relearning"
    }

    created = {state_name: 0 for state_name in state_names.values()}

    for state, count in states_counts.items():
        state_name = state_names[state]
        for i in range(count):
            card_id = f"{state_name}_{base_word}_{i}"
            word = f"{state_name}_{base_word}_{i}"

            create_card(
                card_id=card_id,
                source_id=source_id,
                source_page_number=10,
                data={
                    "word": word,
                    "type": "nomen",
                    "translation": {"en": f"{word}_en", "hu": f"{word}_hu"},
                    "examples": []
                },
                state=state,
                step=1 if state in [1, 3] else 0,
                due='2025-07-06 08:24:32.82948',
            )
            created[state_name] += 1

    return created


def test_study_page_initial_state(page: Page):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(green_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "ige",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "en": "We leave at twelve o'clock.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "images": [{"id": image1, "isFavorite": True}]
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "en": "When does the train leave?",
                    "ch": "Wänn fahrt dr",
                    "isSelected": True,
                    "images": [{"id": image2, "isFavorite": True}]
                }
            ]
        },
        state=1,
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("heading", level=2, name="elindulni, elhagyni")).to_be_visible()
    expect(page.get_by_role("heading", level=2, name="abfahren")).not_to_be_visible()
    expect(page.get_by_text("ige", exact=True)).to_be_visible()
    expect(page.get_by_text("fährt ab")).not_to_be_visible()
    expect(page.get_by_text("fuhr ab")).not_to_be_visible()
    expect(page.get_by_text("abgefahren")).not_to_be_visible()
    expect(page.get_by_text("Tizenkét órakor indulunk.")).not_to_be_visible()
    expect(page.get_by_text("Mikor indul a vonat?")).to_be_visible()
    expect(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab.")).not_to_be_visible()
    expect(page.get_by_role("img", name="Mikor indul a vonat?")).to_be_visible()
    image_content = get_image_content(page.get_by_role("img", name="Mikor indul a vonat?"))
    assert image_content == get_color_image_bytes("green", 1200)


def test_study_page_revealed_state(page: Page):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(green_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "ige",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "en": "We leave at twelve o'clock.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "images": [{"id": image1, "isFavorite": True}]
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "en": "When does the train leave?",
                    "ch": "Wänn fahrt dr",
                    "isSelected": True,
                    "images": [{"id": image2, "isFavorite": True}]
                }
            ]
        },
        state=1,
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    # Navigate to study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    page.locator(".flashcard").click()

    expect(page.get_by_text("abfahren", exact=True)).to_be_visible()
    expect(page.get_by_text("elindulni, elhagyni")).not_to_be_visible()
    expect(page.get_by_text("abfahra, verlah")).not_to_be_visible()
    expect(page.get_by_text("ige", exact=True)).to_be_visible()
    expect(page.get_by_text("fährt ab")).to_be_visible()
    expect(page.get_by_text("fuhr ab")).to_be_visible()
    expect(page.get_by_text("abgefahren")).to_be_visible()
    expect(page.get_by_text("Wir fahren um zwölf Uhr ab.")).not_to_be_visible()
    expect(page.get_by_text("Wann fährt der Zug ab?")).to_be_visible()
    expect(page.get_by_text("Mikor indul a vonat?")).not_to_be_visible()

    image_content = get_image_content(page.get_by_role("img", name="Wann fährt der Zug ab?"))
    assert image_content == get_color_image_bytes("green", 1200)
    expect(page.get_by_role("button", name="Again")).to_be_visible()
    expect(page.get_by_role("button", name="Hard")).to_be_visible()
    expect(page.get_by_role("button", name="Good")).to_be_visible()
    expect(page.get_by_role("button", name="Easy")).to_be_visible()


def test_study_page_card_state_new(page: Page):
    create_card(
        card_id='lernen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "lernen",
            "type": "ige",
            "forms": ["lernt", "lernte", "gelernt"],
            "translation": {"en": "to learn", "hu": "tanulni"},
            "examples": [
                {
                    "de": "Ich lerne Deutsch.",
                    "hu": "Németül tanulok.",
                    "en": "I learn German.",
                    "isSelected": True
                }
            ]
        },
        state=0,
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_text("New", exact=True)).to_be_visible()


def test_study_page_card_state_learning(page: Page):
    create_card(
        card_id='sprechen',
        source_id="goethe-a1",
        source_page_number=20,
        data={
            "word": "sprechen",
            "type": "ige",
            "forms": ["spricht", "sprach", "gesprochen"],
            "translation": {"en": "to speak", "hu": "beszélni"},
            "examples": [
                {
                    "de": "Ich spreche Deutsch.",
                    "hu": "Németül beszélek.",
                    "en": "I speak German.",
                    "isSelected": True
                }
            ]
        },
        state=1,
        step=1,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_text("Learning", exact=True)).to_be_visible()


def test_source_selector_routing_works(page: Page):
    # Create a card in one source
    create_card(
        card_id='lernen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "lernen",
            "type": "ige",
            "forms": ["lernt", "lernte", "gelernt"],
            "translation": {"en": "to learn", "hu": "tanulni"},
            "examples": [
                {
                    "de": "Ich lerne Deutsch.",
                    "hu": "Németül tanulok.",
                    "en": "I learn German.",
                    "isSelected": True
                }
            ]
        },
        state=0,
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    # Create a card in another source
    create_card(
        card_id='schreiben',
        source_id="goethe-a2",
        source_page_number=10,
        data={
            "word": "schreiben",
            "type": "ige",
            "forms": ["schreibt", "schrieb", "geschrieben"],
            "translation": {"en": "to write", "hu": "írni"},
            "examples": [
                {
                    "de": "Ich schreibe einen Brief.",
                    "hu": "Levelet írok.",
                    "en": "I am writing a letter.",
                    "isSelected": True
                }
            ]
        },
        state=1,
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    # Start from the first source
    page.goto("http://localhost:8180/sources/goethe-a1/study")
    expect(page.get_by_text("tanulni", exact=True)).to_be_visible()

    # Open the source selector dropdown
    page.get_by_role("button", name="Goethe A1").click()

    # Select the second source
    page.get_by_role("menuitem", name="Goethe A2").click()

    # URL should change
    expect(page).to_have_url("http://localhost:8180/sources/goethe-a2/study")

    # Content should change to the card from the second source
    expect(page.get_by_text("írni", exact=True)).to_be_visible()
    expect(page.get_by_text("tanulni", exact=True)).not_to_be_visible()


def test_source_selector_shows_proper_stats(page: Page):
    # Create cards with different states
    create_test_cards_with_states(
        source_id="goethe-a1",
        states_counts={0: 3, 1: 2},  # 3 new and 2 learning cards
        base_word="stats"
    )

    # Navigate to the study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("navigation").get_by_title("New", exact=True)).to_have_text("3")
    expect(page.get_by_role("navigation").get_by_title("Learning", exact=True)).to_have_text("2")


def test_source_selector_stats_update_after_changing_source(page: Page):
    # Create cards in two different sources with different states
    create_test_cards_with_states(
        source_id="goethe-a1",
        states_counts={0: 3, 1: 2},  # 3 new and 2 learning cards
        base_word="update_a1"
    )

    create_test_cards_with_states(
        source_id="goethe-a2",
        states_counts={0: 1, 1: 4},  # 1 new and 4 learning cards
        base_word="update_a2"
    )

    # Navigate to the first source
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("navigation").get_by_title("New", exact=True)).to_have_text("3")
    expect(page.get_by_role("navigation").get_by_title("Learning", exact=True)).to_have_text("2")

    # Open the source selector dropdown
    page.get_by_role("button", name="Goethe A1").click()

    # Select the second source
    page.get_by_role("menuitem", name="Goethe A2").click()

    expect(page.get_by_role("navigation").get_by_title("New", exact=True)).to_have_text("1")
    expect(page.get_by_role("navigation").get_by_title("Learning", exact=True)).to_have_text("4")


def test_source_selector_dropdown_shows_stats(page: Page):
    # Create cards with different states in two sources
    create_test_cards_with_states(
        source_id="goethe-a1",
        states_counts={0: 2, 1: 3},  # 2 new and 3 learning cards
        base_word="dropdown_a1"
    )

    create_test_cards_with_states(
        source_id="goethe-a2",
        states_counts={0: 5, 1: 1},  # 5 new and 1 learning card
        base_word="dropdown_a2"
    )

    # Navigate to the study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Open the source selector dropdown
    page.get_by_role("button", name="Goethe A1").click()

    # Check that stats are displayed in the dropdown menu items
    # Find the menu items
    goethe_a1_menu_item = page.get_by_role("menuitem", name="Goethe A1")
    goethe_a2_menu_item = page.get_by_role("menuitem", name="Goethe A2")

    expect(goethe_a1_menu_item.get_by_title("New", exact=True)).to_have_text("2")
    expect(goethe_a1_menu_item.get_by_title("Learning", exact=True)).to_have_text("3")
    expect(goethe_a2_menu_item.get_by_title("New", exact=True)).to_have_text("5")
    expect(goethe_a2_menu_item.get_by_title("Learning", exact=True)).to_have_text("1")
