from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, navigate_to_card_creation, with_db_connection, yellow_image, red_image


def test_card_deletion(page: Page, context: BrowserContext):
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        images=[yellow_image, red_image],
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
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "en": "When does the train leave?",
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
    card_page.get_by_role(role="button", name="Delete card").click()
    expect(card_page.get_by_text("Are you sure you want to delete this card?")).to_be_visible()
    card_page.get_by_role(role="button", name="Yes").click()
    expect(card_page.get_by_text("Card deleted successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT id FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()
        assert result is None, "Card should be deleted from the database"

