from playwright.sync_api import Page, BrowserContext, expect
from utils import create_card, get_color_image_bytes, get_image_content, yellow_image, red_image, navigate_to_card_creation, upload_mock_image


def prepare_card(page: Page, context: BrowserContext):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)
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
                    "images": [{"id": image1}, {"id": image2}],
                }
            ]
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    return navigate_to_card_creation(page, context)

def test_carousel_indicator_initial(page: Page, context: BrowserContext):
    card_page = prepare_card(page,context)
    expect(card_page.get_by_text("1 / 2")).to_be_visible()


def test_prev_button_disabled_on_first_image(page: Page, context: BrowserContext):
    card_page = prepare_card(page,context)
    prev_button = card_page.get_by_role("button", name="Previous image").first
    expect(prev_button).to_be_disabled()


def test_next_button_enabled_on_first_image(page: Page, context: BrowserContext):
    card_page = prepare_card(page,context)
    next_button = card_page.get_by_role("button", name="Next image").first
    expect(next_button).to_be_enabled()


def test_next_click_updates_indicator_and_disables_next(page: Page, context: BrowserContext):
    card_page = prepare_card(page,context)
    next_button = card_page.get_by_role("button", name="Next image").first
    next_button.click()
    expect(card_page.get_by_text("2 / 2")).to_be_visible()
    expect(next_button).to_be_disabled()


def test_prev_click_from_last_image(page: Page, context: BrowserContext):
    card_page = prepare_card(page,context)
    next_button = card_page.get_by_role("button", name="Next image").first
    prev_button = card_page.get_by_role("button", name="Previous image").first
    next_button.click()
    prev_button.click()
    expect(card_page.get_by_text("1 / 2")).to_be_visible()
    expect(prev_button).to_be_disabled()
    expect(next_button).to_be_enabled()


def test_image_on_first_page(page: Page, context: BrowserContext):
    card_page = prepare_card(page, context)
    image_content = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert image_content == get_color_image_bytes("yellow"), "First image should be the yellow image"


def test_image_content_changes_on_navigation(page: Page, context: BrowserContext):
    card_page = prepare_card(page, context)
    next_button = card_page.get_by_role("button", name="Next image").first
    next_button.click()
    image2 = get_image_content(card_page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert image2 == get_color_image_bytes("red"), "Second image should be the red image after navigation"
