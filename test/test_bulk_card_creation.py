from pathlib import Path
import sys
from datetime import datetime, timezone
from playwright.sync_api import Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import download_image, ensure_timezone_aware, scroll_element_to_top, yellow_image, red_image, with_db_connection, select_text_range, create_card


def test_bulk_create_fab_appears_when_words_without_cards_selected(page: Page):
    create_card(
        card_id='aber',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "aber",
            "type": "CONJUNCTION",
            "translation": {"en": "but", "hu": "de", "ch": "aber"},
            "forms": [],
            "examples": []
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Initially no FAB should be visible
    expect(page.locator("button:has-text('Create')").filter(has_text="Cards")).not_to_be_visible()

    # Select a region with words that don't have cards
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # FAB should now be visible with correct count
    fab = page.locator("button:has-text('Create')").filter(has_text="Cards")
    expect(fab).to_be_visible()
    expect(fab).to_contain_text("Create 2 Cards")


def test_bulk_create_fab_shows_correct_count_for_multiple_regions(page: Page):
    create_card(
        card_id='aber',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "aber",
            "type": "CONJUNCTION",
            "translation": {"en": "but", "hu": "de", "ch": "aber"},
            "forms": [],
            "examples": []
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    scroll_element_to_top(page, "A", exact=True)

    # Select first region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Select second region
    select_text_range(page, "der Absender", "Können Sie mir seine Adresse sagen?")

    # FAB should show total count from both regions
    fab = page.locator("button:has-text('Create')").filter(has_text="Cards")
    expect(fab).to_be_visible()
    expect(fab).to_contain_text("Create 5 Cards")


def test_bulk_create_fab_hides_when_all_words_have_cards(page: Page):
    create_card(
        card_id='aber',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "aber",
            "type": "CONJUNCTION",
            "translation": {"en": "but", "hu": "de", "ch": "aber"},
            "forms": [],
            "examples": []
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    create_card(
        card_id='abfahren',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "abfahren",
            "type": "VERB",
            "translation": {"en": "to depart", "hu": "elindulni", "ch": "abfahren"},
            "forms": [],
            "examples": []
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )
    create_card(
        card_id='die-abfahrt',
        source_id="goethe-a1",
        source_page_number=9,
        data={
            "word": "Abfahrt",
            "type": "NOUN",
            "translation": {"en": "departure", "hu": "indulás", "ch": "die Abfahrt"},
            "forms": [],
            "examples": []
        },
        state=1,
        step=0,
        due='2025-03-13 08:24:32.82948',
    )

    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select region with words that now have cards
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    expect(page.get_by_role(role="link", name="aber")).to_be_visible()

    # FAB should not be visible
    expect(page.locator("button:has-text('Create')").filter(has_text="Cards")).not_to_be_visible()


def test_bulk_card_creation_opens_progress_dialog(page: Page):
    """Test that clicking the FAB opens the progress dialog"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Progress dialog should open
    expect(page.locator("h2:has-text('Creating Cards')")).to_be_visible()


def test_bulk_card_creation_shows_individual_progress(page: Page):
    """Test that the progress dialog shows individual card progress"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Check that individual words are listed within the progress dialog
    expect(page.get_by_role('dialog').get_by_text('aber')).to_be_visible()
    expect(page.get_by_role('dialog').get_by_text('abfahren')).to_be_visible()
    expect(page.get_by_role('dialog').get_by_text('die Abfahrt')).to_be_visible()

    # Check that progress bars are present
    expect(page.get_by_role('dialog').locator("mat-progress-bar")).to_have_count(3)


def test_bulk_card_creation_creates_cards_in_database(page: Page):
    """Test that bulk creation actually creates cards in the database"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Verify cards were created in database
    with with_db_connection() as cur:
        cur.execute("SELECT id, data FROM learn_language.cards WHERE id IN ('aber', 'abfahren', 'die-abfahrt')")
        results = cur.fetchall()

        assert len(results) == 3

        card_ids = [result[0] for result in results]
        assert 'aber' in card_ids
        assert 'abfahren' in card_ids
        assert 'die-abfahrt' in card_ids


def test_bulk_card_creation_includes_word_data(page: Page):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Verify word data in database
    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'abfahren'")
        result = cur.fetchone()

        assert result is not None, "Card 'abfahren' was not found"
        card_data = result[0]

        # Check word data
        assert card_data['word'] == 'abfahren'
        assert card_data['type'] == 'VERB'
        assert 'gender' not in card_data
        assert card_data['forms'] == ['fährt ab', 'fuhr ab', 'abgefahren']
        assert card_data['translation']['en'] == 'to depart, to leave'
        assert card_data['translation']['hu'] == 'elindulni, elhagyni'
        assert card_data['translation']['ch'] == 'abfahra, verlah'
        assert card_data['examples'][0]['de'] == 'Wir fahren um zwölf Uhr ab.'
        assert card_data['examples'][0]['en'] == 'We are departing at twelve o\'clock.'
        assert card_data['examples'][0]['hu'] == 'Tizenkét órakor indulunk.'
        assert card_data['examples'][0]['ch'] == 'Mir fahred am zwöufi ab.'
        assert card_data['examples'][1]['de'] == 'Wann fährt der Zug ab?'
        assert card_data['examples'][1]['en'] == 'When does the train leave?'
        assert card_data['examples'][1]['hu'] == 'Mikor indul a vonat?'
        assert card_data['examples'][1]['ch'] == 'Wänn fahrt de Zug ab?'
        image1 = download_image(card_data['examples'][0]['images'][0]['id'])
        image2 = download_image(card_data['examples'][1]['images'][0]['id'])
        assert image1 == yellow_image
        assert image2 == red_image

        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'die-abfahrt'")
        result = cur.fetchone()
        assert result is not None, "Card 'die Abfahrt' was not found"
        card_data = result[0]
        # Check word data
        assert card_data['word'] == 'die Abfahrt'
        assert card_data['type'] == 'NOUN'
        assert card_data['gender'] == 'FEMININE'
        assert card_data['forms'] == ['die Abfahrten']


def test_bulk_card_creation_updates_ui_after_completion(page: Page):
    """Test that the UI updates correctly after bulk creation completes"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Verify FAB is initially visible
    fab = page.locator("button:has-text('Create')").filter(has_text="Cards")

    fab.click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Close the dialog
    page.locator("button:has-text('Close')").click()

    # FAB should no longer be visible since cards now exist
    expect(fab).not_to_be_visible()

    expect(page.get_by_role(role="link", name="aber")).to_be_visible()
    expect(page.get_by_role(role="link", name="aber")).to_have_accessible_description("Card exists")
    expect(page.get_by_role(role="link", name="abfahren")).to_be_visible()
    expect(page.get_by_role(role="link", name="abfahren")).to_have_accessible_description("Card exists")
    expect(page.get_by_role(role="link", name="die Abfahrt")).to_be_visible()
    expect(page.get_by_role(role="link", name="die Abfahrt")).to_have_accessible_description("Card exists")


def test_bulk_card_creation_fsrs_attributes(page: Page):
    """Test that created cards have correct FSRS attributes"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Verify FSRS attributes in database
    with with_db_connection() as cur:
        cur.execute("""
            SELECT state, step, stability, difficulty, reps, lapses, due
            FROM learn_language.cards
            WHERE id = 'abfahren'
        """)
        result = cur.fetchone()

        assert result is not None, "Card 'abfahren' was not found"
        state, step, stability, difficulty, reps, lapses, due = result

        # Check FSRS initial values (from createEmptyCard())
        assert state == 'NEW'
        assert step == 0
        assert stability == 0
        assert difficulty == 0
        assert reps == 0
        assert lapses == 0
        assert due is not None


def test_bulk_card_creation_source_metadata(page: Page):
    """Test that created cards have correct source metadata"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Verify source metadata in database
    with with_db_connection() as cur:
        cur.execute("""
            SELECT c.source_id, c.source_page_number, s.name
            FROM learn_language.cards c
            JOIN learn_language.sources s ON c.source_id = s.id
            WHERE c.id = 'abfahren'
        """)
        result = cur.fetchone()

        assert result is not None, "Card 'abfahren' was not found"
        source_id, page_number, source_name = result

        assert source_id == 'goethe-a1'
        assert page_number == 9
        assert source_name == 'Goethe A1'


def test_bulk_card_creation_learning_parameters_and_review_state(page: Page):
    """Test that created cards have correct learning parameters and review state"""
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Select a region
    select_text_range(page, "aber", "Vor der Abfahrt rufe ich an.")

    # Click the FAB
    page.locator("button:has-text('Create')").filter(has_text="Cards").click()

    # Wait for creation to complete
    expect(page.get_by_role('dialog').get_by_role('button', name='Close')).to_be_visible()

    # Verify learning parameters and review state in database
    with with_db_connection() as cur:
        # Check all three cards
        cur.execute("""
            SELECT state, step, stability, difficulty, reps, lapses, due, readiness
            FROM learn_language.cards
            WHERE id IN ('aber', 'abfahren', 'die-abfahrt')
        """)
        results = cur.fetchall()

        assert len(results) == 3, "Expected 3 cards to be created"

        # Get current time for due date comparison
        current_time = datetime.now(timezone.utc)

        # Check that all cards have the correct initial learning parameters
        for result in results:
            state, step, stability, difficulty, reps, lapses, due, readiness = result

            # Check FSRS initial values
            assert state == 'NEW'
            assert step == 0
            assert stability == 0
            assert difficulty == 0
            assert reps == 0
            assert lapses == 0

            assert due is not None
            time_difference = abs((ensure_timezone_aware(due) - current_time).total_seconds())
            assert time_difference < 60  # Within 1 minute of test execution
            assert readiness == 'IN_REVIEW'
