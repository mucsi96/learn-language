import json
from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect
import requests

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import with_db_connection, mockImage1, mockImage2, navigate_to_card_creation

def test_card_creation_page(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)

    # Word section
    expect(card_page.get_by_label("Word type", exact=True)).to_have_value("ige")
    expect(card_page.get_by_label("German translation", exact=True)).to_have_value("abfahren")
    expect(card_page.get_by_label("Hungarian translation", exact=True)).to_have_value("elindulni, elhagyni")
    expect(card_page.get_by_label("Swiss German translation", exact=True)).to_have_value("abfahra, verlah")

    # Forms section
    expect(card_page.get_by_label("Form", exact=True).locator('nth=0')).to_have_value("fährt ab")
    expect(card_page.get_by_label("Form", exact=True).locator('nth=1')).to_have_value("fuhr ab")
    expect(card_page.get_by_label("Form", exact=True).locator('nth=2')).to_have_value("abgefahren")
    # Examples section
    expect(card_page.get_by_label("Example in German", exact=True).locator(
        'nth=0')).to_have_value("Wir fahren um zwölf Uhr ab.")
    expect(card_page.get_by_label("Example in Hungarian", exact=True).locator(
        'nth=0')).to_have_value("Tizenkét órakor indulunk.")
    expect(card_page.get_by_label("Example in Swiss German", exact=True).locator(
        'nth=0')).to_have_value("Mir fahred am zwöufi ab.")

    # Image
    image_element = card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab.")
    expect(image_element).to_be_visible()

    image_src = image_element.get_attribute('src')

    assert image_src is not None, "Image src attribute is None"

    response = requests.get(image_src)
    response.raise_for_status()

    assert response.content == mockImage1, "Image data does not match mock image data"


def test_card_creation_in_db(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)

    card_page.get_by_role(role="button", name="Create").click()

    expect(card_page.get_by_text("Card created successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT data, source_id, source_page_number FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()

        assert result is not None, "Card was not created in the database"

        card_data = result[0]
        source_id = result[1]
        source_page_number = result[2]

        # Verify source ID and page number
        assert source_id == "goethe-a1", "Source ID doesn't match"
        assert source_page_number == 9, "Source page number doesn't match"

        # Verify word section
        assert card_data["type"] == "ige", "Word type doesn't match"
        assert card_data["word"] == "abfahren", "German word doesn't match"
        assert card_data["translation"]["hu"] == "elindulni, elhagyni", "Hungarian translation doesn't match"
        assert card_data["translation"]["ch"] == "abfahra, verlah", "Swiss German translation doesn't match"

        # Verify forms
        assert "fährt ab" in card_data["forms"], "Form 'fährt ab' not found"
        assert "fuhr ab" in card_data["forms"], "Form 'fuhr ab' not found"
        assert "abgefahren" in card_data["forms"], "Form 'abgefahren' not found"

        # Verify examples
        example_found = False
        for example in card_data["examples"]:
            if example["de"] == "Wir fahren um zwölf Uhr ab.":
                example_found = True
                assert example["hu"] == "Tizenkét órakor indulunk.", "Hungarian example doesn't match"
                assert example["ch"] == "Mir fahred am zwöufi ab.", "Swiss German example doesn't match"
                break

        assert example_found, "Example not found in card data"

def test_image_regeneration(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)

    card_page.get_by_role("button").filter(has_text="refresh").first.click()

    regenerated_image_element = card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab.")
    expect(regenerated_image_element).to_be_visible()

    regenerated_image_src = regenerated_image_element.get_attribute('src')
    assert regenerated_image_src is not None, "Regenerated image src attribute is None"

    regenerated_response = requests.get(regenerated_image_src)
    regenerated_response.raise_for_status()

    assert regenerated_response.content == mockImage2, "Regenerated image data does not match Image 2"


