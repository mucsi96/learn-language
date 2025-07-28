from playwright.sync_api import Page, BrowserContext, expect
from utils import create_card, get_color_image_bytes, get_image_content, with_db_connection, yellow_image, red_image, blue_image, green_image, navigate_to_card_creation, upload_mock_image


def prepare_card(page: Page, context: BrowserContext):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
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
    )
    return navigate_to_card_creation(page, context)


def test_carousel_indicator_initial(page: Page, context: BrowserContext):
    prepare_card(page, context)
    expect(page.get_by_text("1 / 2")).to_be_visible()


def test_prev_button_disabled_on_first_image(page: Page, context: BrowserContext):
    prepare_card(page, context)
    prev_button = page.get_by_role("button", name="Previous image").first
    expect(prev_button).to_be_disabled()


def test_next_button_enabled_on_first_image(page: Page, context: BrowserContext):
    prepare_card(page, context)
    next_button = page.get_by_role("button", name="Next image").first
    expect(next_button).to_be_enabled()


def test_next_click_updates_indicator_and_disables_next(page: Page, context: BrowserContext):
    prepare_card(page, context)
    next_button = page.get_by_role("button", name="Next image").first
    next_button.click()
    expect(page.get_by_text("2 / 2")).to_be_visible()
    expect(next_button).to_be_disabled()


def test_prev_click_from_last_image(page: Page, context: BrowserContext):
    prepare_card(page, context)
    next_button = page.get_by_role("button", name="Next image").first
    prev_button = page.get_by_role("button", name="Previous image").first
    next_button.click()
    prev_button.click()
    expect(page.get_by_text("1 / 2")).to_be_visible()
    expect(prev_button).to_be_disabled()
    expect(next_button).to_be_enabled()


def test_image_on_first_page(page: Page, context: BrowserContext):
    prepare_card(page, context)
    image_content = get_image_content(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert image_content == get_color_image_bytes("yellow")


def test_image_content_changes_on_navigation(page: Page, context: BrowserContext):
    prepare_card(page, context)
    next_button = page.get_by_role("button", name="Next image").first
    next_button.click()
    image2 = get_image_content(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert image2 == get_color_image_bytes("red")


def test_back_button_navigates_to_source_page(page: Page, context: BrowserContext):
    prepare_card(page, context)
    page.get_by_role("link", name="Back").click()
    expect(page.get_by_text("Seite 9")).to_be_visible()
    expect(page.get_by_text("die Abfahrt")).to_be_visible()
    expect(page.get_by_role("spinbutton", name="Page")).to_have_value("9")


def test_card_editing_page(page: Page, context: BrowserContext):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "NOUN",
            "gender": "FEMININE",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "en": "We leave at twelve o'clock.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "images": [{"id": image1}]
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "en": "When does the train leave?",
                    "ch": "Wänn fahrt dr",
                    "isSelected": True,
                    "images": [{"id": image2}]
                }
            ]
        },
    )
    navigate_to_card_creation(page, context)

    # Word section
    expect(page.get_by_role("combobox", name="Word type")).to_have_text("Főnév")
    expect(page.get_by_role("combobox", name="Gender")).to_have_text("Feminine")
    expect(page.get_by_label("German translation", exact=True)).to_have_value("abfahren")
    expect(page.get_by_label("Hungarian translation", exact=True)).to_have_value("elindulni, elhagyni")
    expect(page.get_by_label("Swiss German translation", exact=True)).to_have_value("abfahra, verlah")

    # Forms section
    expect(page.get_by_label("Form", exact=True).locator('nth=0')).to_have_value("fährt ab")
    expect(page.get_by_label("Form", exact=True).locator('nth=1')).to_have_value("fuhr ab")
    expect(page.get_by_label("Form", exact=True).locator('nth=2')).to_have_value("abgefahren")
    # Examples section
    expect(page.get_by_label("Example in German", exact=True).locator(
        'nth=0')).to_have_value("Wir fahren um zwölf Uhr ab.")
    expect(page.get_by_label("Example in Hungarian", exact=True).locator(
        'nth=0')).to_have_value("Tizenkét órakor indulunk.")
    expect(page.get_by_label("Example in Swiss German", exact=True).locator(
        'nth=0')).to_have_value("Mir fahred am zwöufi ab.")

    # Images
    image_content1 = get_image_content(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(page.get_by_role("img", name="Wann fährt der Zug ab?"))
    assert image_content1 == get_color_image_bytes("yellow")
    assert image_content2 == get_color_image_bytes("red")


def test_card_editing_in_db(page: Page, context: BrowserContext):
    image1 = upload_mock_image(blue_image)
    image2 = upload_mock_image(green_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "en": "We leave at twelve o'clock.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "images": [{"id": image1}],
                    "isSelected": True,
                },
                {
                    "de": "Wann fährt der Zug ab?",
                    "hu": "Mikor indul a vonat?",
                    "en": "When does the train leave?",
                    "ch": "Wänn fahrt dr",
                    "images": [{"id": image2}]
                }
            ]
        },
    )
    navigate_to_card_creation(page, context)
    page.get_by_label("Hungarian translation").fill("elindulni, elutazni")
    page.get_by_role("button", name="Add example image").nth(1).click()
    image_content2 = get_image_content(page.get_by_role("img", name="Wann fährt der Zug ab?"))

    assert image_content2 == get_color_image_bytes("red")

    page.get_by_role("radio").nth(1).click()
    page.get_by_role(role="button", name="Update").click()
    expect(page.get_by_text("Card updated successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()

        assert result is not None
        card_data = result[0]

    assert card_data["translation"]["hu"] == "elindulni, elutazni"
    assert "isSelected" not in card_data["examples"][0]
    assert card_data["examples"][1]["isSelected"] == True
    assert card_data["word"] == "abfahren"
    assert card_data["translation"]["ch"] == "abfahra, verlah"
    assert "fährt ab" in card_data["forms"]

    image_content1 = get_image_content(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    image_content2 = get_image_content(page.get_by_role("img", name="Wann fährt der Zug ab?"))

    assert image_content1 == get_color_image_bytes("blue")
    assert image_content2 == get_color_image_bytes("red")


def test_favorite_image_in_db(page: Page, context: BrowserContext):
    image1 = upload_mock_image(yellow_image)
    image2 = upload_mock_image(red_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
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
                    "images": [{"id": image2}]
                }
            ]
        },
    )

    navigate_to_card_creation(page, context)

    # Verify initial favorite state
    expect(page.get_by_role("button", name="Toggle favorite").first).to_have_attribute("aria-pressed", "true")
    expect(page.get_by_role("button", name="Toggle favorite").last).not_to_have_attribute("aria-pressed", "true")

    # Toggle favorite state of second image
    page.get_by_role("button", name="Toggle favorite").last.hover()
    page.get_by_role("button", name="Toggle favorite").last.click()
    expect(page.get_by_role("button", name="Toggle favorite").last).to_have_attribute("aria-pressed", "true")

    # Toggle favorite state of first image
    page.get_by_role("button", name="Toggle favorite").first.click()
    expect(page.get_by_role("button", name="Toggle favorite").first).not_to_have_attribute("aria-pressed", "true")

    page.wait_for_timeout(100)

    page.get_by_role("button", name="Update").click()
    expect(page.get_by_text("Card updated successfully")).to_be_visible()

    # Verify database state
    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()
        assert result is not None, "Card not found in the database"
        card_data = result[0]

    # Verify the favorite states were updated correctly
    assert "isFavorite" not in card_data["examples"][0]["images"][0]
    assert card_data["examples"][1]["images"][0]["isFavorite"] == True

    # Verify all other card data remained unchanged
    assert card_data["word"] == "abfahren"
    assert card_data["translation"]["hu"] == "elindulni, elhagyni"
    assert "fährt ab" in card_data["forms"]


def test_word_type_editing(page: Page, context: BrowserContext):
    image1 = upload_mock_image(yellow_image)
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
                    "images": [{"id": image1}]
                }
            ]
        },
    )

    navigate_to_card_creation(page, context)

    # Verify initial word type
    expect(page.get_by_role("combobox", name="Word type")).to_have_text("Ige")

    # Change the word type from VERB to NOUN
    page.get_by_role("combobox", name="Word type").click()
    page.get_by_role("option", name="Főnév").click()
    page.get_by_role("combobox", name="Gender").click()
    page.get_by_role("option", name="Masculine").click()

    # Submit the changes
    page.get_by_role("button", name="Update").click()
    expect(page.get_by_text("Card updated successfully")).to_be_visible()

    # Verify the change was saved in the database
    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()
        assert result is not None, "Card not found in the database"
        card_data = result[0]

    # Verify the word type was updated correctly
    assert card_data["type"] == "NOUN"
    assert card_data["gender"] == "MASCULINE"

    # Verify other card data remained unchanged
    assert card_data["word"] == "abfahren"
    assert card_data["translation"]["hu"] == "elindulni, elhagyni"
    assert "fährt ab" in card_data["forms"]


def test_example_image_addition(page: Page, context: BrowserContext):
    image1 = upload_mock_image(blue_image)
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
            "forms": ["fährt ab", "fuhr ab", "abgefahren"],
            "translation": {"en": "to leave", "hu": "elindulni, elhagyni", "ch": "abfahra, verlah"},
            "examples": [
                {
                    "de": "Wir fahren um zwölf Uhr ab.",
                    "hu": "Tizenkét órakor indulunk.",
                    "en": "We leave at twelve o'clock.",
                    "ch": "Mir fahred am zwöufi ab.",
                    "images": [{"id": image1}]
                }
            ]
        },
    )
    navigate_to_card_creation(page, context)

    page.get_by_role("button", name="Add example image").first.click()

    regenerated_image_content = get_image_content(page.get_by_role("img", name="Wir fahren um zwölf Uhr ab."))
    assert regenerated_image_content == get_color_image_bytes("yellow")


def test_card_deletion(page: Page, context: BrowserContext):
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
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
    )

    navigate_to_card_creation(page, context)
    page.get_by_role(role="button", name="Delete card").click()
    expect(page.get_by_text("Are you sure you want to delete this card?")).to_be_visible()
    page.get_by_role(role="button", name="Yes").click()
    expect(page.get_by_text("Card deleted successfully")).to_be_visible()

    with with_db_connection() as cur:
        cur.execute("SELECT id FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()
        assert result is None, "Card should be deleted from the database"
