from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import get_color_image_bytes, get_image_content, yellow_image, green_image, create_card, upload_mock_image, with_db_connection

def test_study_page_initial_state(page: Page, context: BrowserContext):
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

def test_study_page_revealed_state(page: Page, context: BrowserContext):
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
