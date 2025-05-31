from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import get_image_content, mockImage1, mockImage2, mockImage3, mockImage4, create_card, navigate_to_card_creation, with_db_connection

def test_card_editing_page(page: Page, context: BrowserContext):
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        images=[mockImage1, mockImage2],
        data={
            "word": "abfahren",
            "type": "ige",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "ch": "Mir fahred am zwöufi ab.",
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "ch": "Wänn fahrt dr",
                    "isSelected": True,
                }
            ]
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
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

    # Images
    image_content1 = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(card_page.get_by_role("img", name="Wann fährt der Zug ab?"))
    assert image_content1 == mockImage1, "Image data does not match mock image data"
    assert image_content2 == mockImage2, "Image data does not match mock image data"

def test_card_editing_in_db(page: Page, context: BrowserContext):
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        images=[mockImage1, mockImage2],
        data={
            "word": "abfahren",
            "type": "ige",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "isSelected": True,
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "ch": "Wänn fahrt dr",
                }
            ]
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    card_page = navigate_to_card_creation(page, context)
    card_page.get_by_label("Hungarian translation").fill("elindulni, elutazni")
    card_page.get_by_role("button").filter(has_text="refresh").nth(1).click()
    image_content2 = get_image_content(card_page.get_by_role("img", name="Wann fährt der Zug ab?"))

    assert image_content2 == mockImage4, "Image data does not match mock image data"

    card_page.get_by_role("radio").nth(1).click()
    card_page.get_by_role(role="button", name="Update").click()
    expect(card_page.get_by_text("Card updated successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()

        assert result is not None, "Card not found in the database"
        card_data = result[0]

    assert card_data["translation"]["hu"] == "elindulni, elutazni", "Hungarian translation wasn't updated"
    assert card_data["examples"][0]["isSelected"] == None, "First example should no longer be selected"
    assert card_data["examples"][1]["isSelected"] == True, "Second example should now be selected"
    assert card_data["word"] == "abfahren", "German word was changed unexpectedly"
    assert card_data["translation"]["ch"] == "abfahra, verlah", "Swiss German translation was changed unexpectedly"
    assert "fährt ab" in card_data["forms"], "Form 'fährt ab' was lost"

    image_content1 = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(card_page.get_by_role("img", name="Wann fährt der Zug ab?"))

    assert image_content1 == mockImage3, "First image should remain unchanged"
    assert image_content2 == mockImage4, "Second image should have been regenerated"
