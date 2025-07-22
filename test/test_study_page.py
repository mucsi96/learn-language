from pathlib import Path
import sys
import uuid
from playwright.sync_api import Page, expect
from datetime import datetime, timedelta

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import get_color_image_bytes, get_image_content, yellow_image, green_image, create_card, upload_mock_image, create_cards_with_states, with_db_connection


def test_study_page_initial_state(page: Page):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(green_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
            "gender": "NEUTER",
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
        state='NEW',
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("heading", level=2, name="elindulni, elhagyni")).to_be_visible()
    expect(page.get_by_role("heading", level=2, name="abfahren")).not_to_be_visible()
    expect(page.get_by_text("Ige", exact=True)).to_be_visible()
    expect(page.get_by_text("New", exact=True)).to_be_visible()
    expect(page.get_by_text("Gender: Neuter", exact=True)).not_to_be_visible()
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
            "type": "VERB",
            "gender": "NEUTER",
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
        state='LEARNING',
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    # Navigate to study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    page.get_by_text("elindulni, elhagyni", exact=True).click()

    expect(page.get_by_text("abfahren", exact=True)).to_be_visible()
    expect(page.get_by_text("elindulni, elhagyni")).not_to_be_visible()
    expect(page.get_by_text("abfahra, verlah")).not_to_be_visible()
    expect(page.get_by_text("Ige", exact=True)).to_be_visible()
    expect(page.get_by_text("Learning", exact=True)).to_be_visible()
    expect(page.get_by_text("Gender: Neuter", exact=True)).to_be_visible()
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


def test_source_selector_routing_works(page: Page):
    # Create a card in one source
    create_card(
        card_id='lernen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "lernen",
            "type": "VERB",
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
            "type": "VERB",
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
    now = datetime.now()
    yesterday = now - timedelta(days=1)
    create_cards_with_states(
        "goethe-a1",
        [
            {"state": "NEW", "count": 3, 'due_date': yesterday},
            {"state": "LEARNING", "count": 2, 'due_date': yesterday},
        ],
    )

    # Navigate to the study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("navigation").get_by_title("New", exact=True)).to_have_text("3")
    expect(page.get_by_role("navigation").get_by_title("Learning", exact=True)).to_have_text("2")


def test_source_selector_stats_update_after_changing_source(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)
    # Create cards in two different sources with different states
    create_cards_with_states(
        'goethe-a1',
        [
            {"state": "NEW", "count": 3, 'due_date': yesterday},
            {"state": "LEARNING", "count": 2, 'due_date': yesterday},
        ],
    )

    create_cards_with_states(
        'goethe-a2',
        [
            {"state": "NEW", "count": 1, 'due_date': yesterday},
            {"state": "LEARNING", "count": 4, 'due_date': yesterday},
        ],
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
    now = datetime.now()
    yesterday = now - timedelta(days=1)
    create_cards_with_states(
        'goethe-a1',
        [
            {"state": "NEW", "count": 2, 'due_date': yesterday},
            {"state": "LEARNING", "count": 3, 'due_date': yesterday},
        ],
    )

    create_cards_with_states(
        'goethe-a2',
        [
            {"state": "NEW", "count": 5, 'due_date': yesterday},
            {"state": "LEARNING", "count": 1, 'due_date': yesterday},
        ],
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


def test_cards_with_in_review_readiness_not_shown_on_study_page(page: Page):
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    # Create a card that has IN_REVIEW readiness status
    create_card(
        card_id=str(uuid.uuid4()),
        source_id='goethe-a1',
        data={
            'word': 'verstehen',
            'translation': {'en': 'to understand', 'hu': 'érteni', 'ch': 'verstah'}
        },
        state='NEW',
        step=0,
        due=yesterday,
        readiness='IN_REVIEW'
    )

    # Create a card that is ready for review
    create_card(
        card_id=str(uuid.uuid4()),
        source_id='goethe-a1',
        data={
            'word': 'lernen',
            'translation': {'en': 'to learn', 'hu': 'tanulni', 'ch': 'lerne'}
        },
        state='REVIEW',
        step=0,
        due=yesterday,
    )

    # Navigate to the study page
    page.goto("http://localhost:8180/sources/goethe-a1/study")

    expect(page.get_by_role("navigation").get_by_title("Review", exact=True)).to_have_text("1")
    expect(page.get_by_role("navigation").get_by_title("New", exact=True)).not_to_be_visible()
    expect(page.get_by_text("Review", exact=True)).to_be_visible()


def test_mark_for_review_button_visible_on_study_page(page: Page):
    """Test that the Mark for Review button is visible on the study flashcard"""
    create_card(
        card_id='testen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "testen",
            "type": "VERB",
            "forms": ["testet", "testete", "getestet"],
            "translation": {"en": "to test", "hu": "tesztelni", "ch": "teste"},
            "examples": [
                {
                    "de": "Wir testen das System.",
                    "hu": "Teszteljük a rendszert.",
                    "en": "We test the system.",
                    "ch": "Mir tested s'System.",
                    "isSelected": True
                }
            ]
        },
        state='NEW',
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Verify Mark for Review button is visible
    mark_review_button = page.get_by_role("button", name="Mark for Review")
    expect(mark_review_button).to_be_visible()
    expect(mark_review_button.get_by_text("flag")).to_be_visible()


def test_edit_card_button_visible_on_study_page(page: Page):
    """Test that the Edit Card button is visible on the study flashcard"""
    create_card(
        card_id='bearbeiten',
        source_id="goethe-a1",
        source_page_number=20,
        data={
            "word": "bearbeiten",
            "type": "VERB",
            "forms": ["bearbeitet", "bearbeitete", "bearbeitet"],
            "translation": {"en": "to edit", "hu": "szerkeszteni", "ch": "bearbeite"},
            "examples": [
                {
                    "de": "Ich bearbeite das Dokument.",
                    "hu": "Szerkesztem a dokumentumot.",
                    "en": "I edit the document.",
                    "ch": "Ich bearbeite s'Dokument.",
                    "isSelected": True
                }
            ]
        },
        state='LEARNING',
        step=0,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Verify Edit Card button is visible
    edit_button = page.get_by_role("link", name="Edit Card")
    expect(edit_button).to_be_visible()
    expect(edit_button.get_by_text("edit")).to_be_visible()


def test_mark_for_review_button_functionality(page: Page):
    """Test that clicking the Mark for Review button updates card readiness to IN_REVIEW"""
    create_card(
        card_id='markieren',
        source_id="goethe-a1",
        source_page_number=25,
        data={
            "word": "markieren",
            "type": "VERB",
            "forms": ["markiert", "markierte", "markiert"],
            "translation": {"en": "to mark", "hu": "megjelölni", "ch": "markiere"},
            "examples": [
                {
                    "de": "Ich markiere die wichtigen Stellen.",
                    "hu": "Megjelölöm a fontos helyeket.",
                    "en": "I mark the important places.",
                    "ch": "Ich markiere d'wichtige Stelle.",
                    "isSelected": True
                }
            ]
        },
        state='REVIEW',
        step=0,
        due='2025-07-06 08:24:32.82948',
        readiness='READY'
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Click the Mark for Review button
    page.get_by_role("button", name="Mark for Review").click()

    # Verify the card readiness was updated in the database
    with with_db_connection() as cur:
        cur.execute("SELECT readiness FROM learn_language.cards WHERE id = 'markieren'")
        result = cur.fetchone()
        assert result is not None
        assert result[0] == 'IN_REVIEW'


def test_mark_for_review_button_loads_next_card(page: Page):
    """Test that after marking a card for review, the next card is loaded"""
    # Create two cards
    create_card(
        card_id='erste',
        source_id="goethe-a1",
        source_page_number=30,
        data={
            "word": "erste",
            "type": "ADJECTIVE",
            "translation": {"en": "first", "hu": "első", "ch": "erschti"},
            "examples": [
                {
                    "de": "Das ist meine erste Karte.",
                    "hu": "Ez az első kártyám.",
                    "en": "This is my first card.",
                    "ch": "Das isch mini erschti Charte.",
                    "isSelected": True
                }
            ]
        },
        state='NEW',
        step=0,
        due='2025-07-06 08:20:00.00000',
        readiness='READY'
    )

    create_card(
        card_id='zweite',
        source_id="goethe-a1",
        source_page_number=31,
        data={
            "word": "zweite",
            "type": "ADJECTIVE",
            "translation": {"en": "second", "hu": "második", "ch": "zwöiti"},
            "examples": [
                {
                    "de": "Das ist meine zweite Karte.",
                    "hu": "Ez a második kártyám.",
                    "en": "This is my second card.",
                    "ch": "Das isch mini zwöiti Charte.",
                    "isSelected": True
                }
            ]
        },
        state='NEW',
        step=0,
        due='2025-07-06 08:25:00.00000',
        readiness='READY'
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Verify first card is showing (due earlier)
    expect(page.get_by_text("első", exact=True)).to_be_visible()

    # Click Mark for Review button
    page.get_by_role("button", name="Mark for Review").click()

    # Verify the second card is now showing
    expect(page.get_by_text("második", exact=True)).to_be_visible()
    expect(page.get_by_text("első", exact=True)).not_to_be_visible()


def test_edit_card_button_navigation(page: Page):
    """Test that clicking the Edit Card button navigates to the correct card editing page"""
    create_card(
        card_id='navigieren',
        source_id="goethe-a1",
        source_page_number=35,
        data={
            "word": "navigieren",
            "type": "VERB",
            "forms": ["navigiert", "navigierte", "navigiert"],
            "translation": {"en": "to navigate", "hu": "navigálni", "ch": "navigiere"},
            "examples": [
                {
                    "de": "Ich navigiere durch die Seiten.",
                    "hu": "Navigálok az oldalakon.",
                    "en": "I navigate through the pages.",
                    "ch": "Ich navigiere dur d'Site.",
                    "isSelected": True
                }
            ]
        },
        state='LEARNING',
        step=1,
        due='2025-07-06 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources/goethe-a1/study")

    # Click the Edit Card button
    page.get_by_role("link", name="Edit Card").click()

    # Verify we navigated to the correct card editing page
    expect(page.get_by_label("German translation", exact=True)).to_have_value("navigieren")
