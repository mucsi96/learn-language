from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import get_color_image_bytes, with_db_connection, navigate_to_card_creation, get_image_content

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
    image_content1 = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(card_page.get_by_role("img", name="Wann fährt der Zug ab?"))
    assert image_content1 == get_color_image_bytes("yellow"), "Image data does not match mock image data"
    assert image_content2 == get_color_image_bytes("red"), "Image data does not match mock image data"



def test_card_creation_in_db(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)

    image_content1 = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(card_page.get_by_role("img", name="Wann fährt der Zug ab?"))
    assert image_content1 == get_color_image_bytes("yellow"), "Image data does not match mock image data"
    assert image_content2 == get_color_image_bytes("red"), "Image data does not match mock image data"

    card_page.get_by_role(role="button", name="Create").click()

    expect(card_page.get_by_text("Card created successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT data, source_id, source_page_number, state FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()

        assert result is not None, "Card was not created in the database"

        card_data = result[0]
        source_id = result[1]
        source_page_number = result[2]
        state = result[3]

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
        assert card_data["examples"][0]["isSelected"] is True, "First example should be selected"
        assert state == 0, "Card state should be 'new'"

def test_example_image_addition(page: Page, context: BrowserContext):
    card_page = navigate_to_card_creation(page, context)

    card_page.get_by_role("button", name="Add example image").first.click()

    regenerated_image_content = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert regenerated_image_content == get_color_image_bytes("blue"), "Regenerated image data does not match Image 2"


