from pathlib import Path
import sys
from playwright.sync_api import Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, upload_mock_image, yellow_image, red_image, with_db_connection


def test_displays_in_review_cards_in_table(page: Page):
    """Test that cards with IN_REVIEW readiness are displayed in the table"""
    image1 = upload_mock_image(yellow_image)

    # Create cards with IN_REVIEW readiness
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "gender": "NEUTER",
            "forms": ["versteht", "verstand", "verstanden"],
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": image1}]
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    create_card(
        card_id='sprechen',
        source_id="goethe-b1",
        source_page_number=22,
        data={
            "word": "sprechen",
            "type": "VERB",
            "forms": ["spricht", "sprach", "gesprochen"],
            "translation": {"en": "to speak", "hu": "beszélni"},
            "examples": []
        },
        readiness='IN_REVIEW'
    )

    # Create a card that should not appear (READY readiness)
    create_card(
        card_id='lernen',
        source_id="goethe-a2",
        source_page_number=10,
        data={
            "word": "lernen",
            "type": "VERB",
            "translation": {"en": "to learn", "hu": "tanulni"},
        },
        readiness='READY'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Check page title and description
    expect(page.get_by_role("heading", name="Cards In Review", exact=True)).to_be_visible()
    expect(page.get_by_text("These cards are currently being reviewed")).to_be_visible()

    # Check table headers
    expect(page.get_by_role("columnheader", name="Word")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Type")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Translation")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Source")).to_be_visible()

    # Check that IN_REVIEW cards are displayed
    expect(page.get_by_text("verstehen", exact=True)).to_be_visible()
    expect(page.get_by_text("sprechen", exact=True)).to_be_visible()
    expect(page.get_by_text("Ige", exact=True)).to_have_count(2)  # Hungarian for "verb"

    # Check translations are displayed
    expect(page.get_by_text("HU: érteni • EN: to understand • CH: verstoh")).to_be_visible()
    expect(page.get_by_text("HU: beszélni • EN: to speak")).to_be_visible()

    # Check source information
    expect(page.get_by_text("Goethe A1")).to_be_visible()
    expect(page.get_by_text("Page 15")).to_be_visible()
    expect(page.get_by_text("Goethe B1")).to_be_visible()
    expect(page.get_by_text("Page 22")).to_be_visible()

    # Check that READY card is not displayed
    expect(page.get_by_text("lernen", exact=True)).not_to_be_visible()


def test_navigation_on_row_click(page: Page):
    """Test that clicking a table row navigates to the card page"""
    create_card(
        card_id='schreiben',
        source_id="goethe-a2",
        source_page_number=18,
        data={
            "word": "schreiben",
            "type": "VERB",
            "forms": ["schreibt", "schrieb", "geschrieben"],
            "translation": {"en": "to write", "hu": "írni", "ch": "schriibe"},
            "examples": []
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Wait for the table to load
    expect(page.get_by_text("schreiben", exact=True)).to_be_visible()

    # Click on the row containing 'schreiben'
    row = page.get_by_role("row").filter(has_text="schreiben")
    row.click()

    # Wait for card page to load and check content
    expect(page.get_by_label("German translation", exact=True)).to_have_value("schreiben")


def test_navigation_back_after_row_click(page: Page):
    """Test that back navigation works from card page to in-review-cards"""
    create_card(
        card_id='lesen',
        source_id="goethe-a1",
        source_page_number=12,
        data={
            "word": "lesen",
            "type": "VERB",
            "forms": ["liest", "las", "gelesen"],
            "translation": {"en": "to read", "hu": "olvasni", "ch": "läse"},
            "examples": []
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Wait for the table to load and click on the row
    expect(page.get_by_text("lesen", exact=True)).to_be_visible()
    row = page.get_by_role("row").filter(has_text="lesen")
    row.click()

    # Verify we're on the card page
    expect(page.get_by_label("German translation", exact=True)).to_have_value("lesen")

    # Click the back button
    page.get_by_role("link", name="Back").click()

    # Verify we're back on the in-review-cards page
    expect(page).to_have_url("http://localhost:8180/in-review-cards")
    expect(page.get_by_role("heading", name="Cards In Review", exact=True)).to_be_visible()
    expect(page.get_by_text("lesen", exact=True)).to_be_visible()


def test_displays_empty_state_when_no_cards_in_review(page: Page):
    """Test that empty state is displayed when there are no cards in review"""
    # Create cards that are not IN_REVIEW
    create_card(
        card_id='ready_card',
        source_id="goethe-a1",
        source_page_number=5,
        data={
            "word": "fertig",
            "type": "ADJECTIVE",
            "translation": {"en": "ready", "hu": "kész"},
        },
        readiness='READY'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Check that empty state is displayed
    expect(page.get_by_role("heading", name="No cards in review", exact=True)).to_be_visible()
    # Check that table is not displayed
    expect(page.get_by_role("table")).not_to_be_visible()


def test_page_title(page: Page):
    """Test that the page has the correct title"""
    page.goto("http://localhost:8180/in-review-cards")
    expect(page).to_have_title("Cards In Review")


def test_mark_as_reviewed_button_disabled_when_no_example_selected(page: Page):
    """Test that Mark as reviewed button is disabled when no example is selected"""
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)

    create_card(
        card_id='testen',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "testen",
            "type": "VERB",
            "forms": ["testet", "testete", "getestet"],
            "translation": {"en": "to test", "hu": "tesztelni", "ch": "teste"},
            "examples": [
                {
                    "de": "Wir testen die Anwendung.",
                    "hu": "Teszteljük az alkalmazást.",
                    "en": "We test the application.",
                    "ch": "Mir tested d'Aawändig.",
                    "images": [{"id": image1}, {"id": image2}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="testen")
    row.click()

    # Verify the button exists but is disabled
    mark_as_reviewed_btn = page.get_by_role("button", name="Mark as reviewed")
    expect(mark_as_reviewed_btn).to_be_visible()
    expect(mark_as_reviewed_btn).to_be_disabled()


def test_mark_as_reviewed_button_disabled_when_no_favorite_image(page: Page):
    """Test that Mark as reviewed button is disabled when selected example has no favorite image"""
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)

    create_card(
        card_id='pruefen',
        source_id="goethe-a1",
        source_page_number=10,
        data={
            "word": "prüfen",
            "type": "VERB",
            "forms": ["prüft", "prüfte", "geprüft"],
            "translation": {"en": "to check", "hu": "ellenőrizni", "ch": "prüefe"},
            "examples": [
                {
                    "de": "Ich prüfe die Ergebnisse.",
                    "hu": "Ellenőrzöm az eredményeket.",
                    "en": "I check the results.",
                    "ch": "Ich prüef d'Resultat.",
                    "images": [{"id": image1}, {"id": image2}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="prüfen")
    row.click()

    # Select the first example (radio button)
    page.get_by_role("radio").click()

    # Verify the button is still disabled because no image is marked as favorite
    mark_as_reviewed_btn = page.get_by_role("button", name="Mark as reviewed")
    expect(mark_as_reviewed_btn).to_be_disabled()


def test_mark_as_reviewed_button_enabled_when_conditions_met(page: Page):
    """Test that Mark as reviewed button is enabled when example is selected and has favorite image"""
    image1 = upload_mock_image(yellow_image)

    create_card(
        card_id='kontrollieren',
        source_id="goethe-a1",
        source_page_number=11,
        data={
            "word": "kontrollieren",
            "type": "VERB",
            "forms": ["kontrolliert", "kontrollierte", "kontrolliert"],
            "translation": {"en": "to control", "hu": "irányítani", "ch": "kontrolliere"},
            "examples": [
                {
                    "de": "Sie kontrolliert alles genau.",
                    "hu": "Mindent pontosan irányít.",
                    "en": "She controls everything precisely.",
                    "ch": "Sie kontrolliert alles gnau.",
                    "images": [{"id": image1}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="kontrollieren")
    row.click()

    # Select the first example and mark image as favorite
    page.get_by_role("radio").click()
    page.get_by_role("button", name="Toggle favorite").click()

    # Verify the button is now enabled
    mark_as_reviewed_btn = page.get_by_role("button", name="Mark as reviewed")
    expect(mark_as_reviewed_btn).to_be_enabled()


def test_mark_as_reviewed_updates_readiness_in_database(page: Page):
    """Test that clicking Mark as reviewed updates the card readiness in the database"""
    image1 = upload_mock_image(yellow_image)

    create_card(
        card_id='verwalten',
        source_id="goethe-a1",
        source_page_number=12,
        data={
            "word": "verwalten",
            "type": "VERB",
            "forms": ["verwaltet", "verwaltete", "verwaltet"],
            "translation": {"en": "to manage", "hu": "kezelni", "ch": "verwalte"},
            "examples": [
                {
                    "de": "Er verwaltet das System.",
                    "hu": "Ő kezeli a rendszert.",
                    "en": "He manages the system.",
                    "ch": "Er verwaltet s'System.",
                    "images": [{"id": image1}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="verwalten")
    row.click()

    # Select the first example and mark image as favorite
    page.get_by_role("radio").click()
    page.get_by_role("button", name="Toggle favorite").click()

    # Click Mark as reviewed button
    page.get_by_role("button", name="Mark as reviewed").click()

    # Verify success message
    expect(page.get_by_text("Card marked as reviewed successfully")).to_be_visible()

    # Verify readiness was updated in database
    with with_db_connection() as cur:
        cur.execute("SELECT readiness FROM learn_language.cards WHERE id = 'verwalten'")
        result = cur.fetchone()
        assert result is not None
        assert result[0] == 'REVIEWED'


def test_mark_as_reviewed_saves_card_data_changes(page: Page):
    """Test that Mark as reviewed saves any changes made to card data"""
    image1 = upload_mock_image(yellow_image)

    create_card(
        card_id='organisieren',
        source_id="goethe-a1",
        source_page_number=13,
        data={
            "word": "organisieren",
            "type": "VERB",
            "forms": ["organisiert", "organisierte", "organisiert"],
            "translation": {"en": "to organize", "hu": "szervezni", "ch": "organisiere"},
            "examples": [
                {
                    "de": "Wir organisieren eine Veranstaltung.",
                    "hu": "Rendezvényt szervezünk.",
                    "en": "We organize an event.",
                    "ch": "Mir organisiere en Event.",
                    "images": [{"id": image1}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="organisieren")
    row.click()

    # Modify the Hungarian translation
    page.get_by_label("Hungarian translation", exact=True).fill("megszervezni")

    # Select the first example and mark image as favorite
    page.get_by_role("radio").click()
    page.get_by_role("button", name="Toggle favorite").click()

    # Click Mark as reviewed button
    page.get_by_role("button", name="Mark as reviewed").click()

    # Verify success message
    expect(page.get_by_text("Card marked as reviewed successfully")).to_be_visible()

    # Verify both readiness and card data were updated in database
    with with_db_connection() as cur:
        cur.execute("SELECT readiness, data FROM learn_language.cards WHERE id = 'organisieren'")
        result = cur.fetchone()
        assert result is not None
        assert result[0] == 'REVIEWED'

        card_data = result[1]
        assert card_data["translation"]["hu"] == "megszervezni"


def test_navigation_back_after_mark_as_reviewed(page: Page):
    """Test that navigation back works after marking card as reviewed"""
    image1 = upload_mock_image(yellow_image)

    create_card(
        card_id='koordinieren',
        source_id="goethe-a1",
        source_page_number=14,
        data={
            "word": "koordinieren",
            "type": "VERB",
            "forms": ["koordiniert", "koordinierte", "koordiniert"],
            "translation": {"en": "to coordinate", "hu": "koordinálni", "ch": "koordiniere"},
            "examples": [
                {
                    "de": "Sie koordiniert die Termine.",
                    "hu": "Koordinálja a találkozókat.",
                    "en": "She coordinates the appointments.",
                    "ch": "Sie koordiniert d'Termine.",
                    "images": [{"id": image1}],
                }
            ]
        },
        readiness='IN_REVIEW'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Navigate to card page
    row = page.get_by_role("row").filter(has_text="koordinieren")
    row.click()

    # Select the first example and mark image as favorite
    page.get_by_role("radio").click()
    page.get_by_role("button", name="Toggle favorite").click()

    # Click Mark as reviewed button
    page.get_by_role("button", name="Mark as reviewed").click()

    # Wait for success message to ensure action completed
    expect(page.get_by_text("Card marked as reviewed successfully")).to_be_visible()

    # Click the back button
    page.get_by_role("link", name="Back").click()

    # Verify we're back on the in-review-cards page
    expect(page).to_have_url("http://localhost:8180/in-review-cards")
    expect(page.get_by_role("heading", name="Cards In Review", exact=True)).to_be_visible()

    expect(page.get_by_role("row").filter(has_text="koordinieren")).not_to_be_visible()
