from pathlib import Path
import sys
from playwright.sync_api import Page, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa

from utils import create_card, with_db_connection, german_audio_sample, hungarian_audio_sample, download_audio


def test_bulk_audio_fab_appears_when_cards_without_audio_exist(page: Page):
    """Test that the batch audio FAB appears when cards without audio exist"""
    # Create cards without audio
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    create_card(
        card_id='sprechen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "sprechen",
            "type": "VERB",
            "translation": {"en": "to speak", "hu": "beszélni", "ch": "rede"},
            "forms": ["spricht", "sprach", "gesprochen"],
            "examples": [
                {
                    "de": "Ich spreche Deutsch.",
                    "hu": "Németül beszélek.",
                    "en": "I speak German.",
                    "ch": "Ich red Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id-2"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")
    fab = page.get_by_role("button", name="Generate audio for cards")
    expect(fab).to_be_visible()
    expect(fab).to_contain_text("Generate audio for 2 cards")


def test_bulk_audio_fab_hides_when_all_cards_have_audio(page: Page):
    """Test that the batch audio FAB hides when all cards already have audio"""
    # Create card with complete audio data
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ],
            "audio": [
                {"id": "audio-id-1", "text": "verstehen", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "de", "selected": True},
                {"id": "audio-id-2", "text": "érteni", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "hu", "selected": True},
                {"id": "audio-id-3", "text": "Ich verstehe Deutsch.", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "de", "selected": True},
                {"id": "audio-id-4", "text": "Értem a németet.", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "hu", "selected": True}
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # FAB should not be visible since card has complete audio
    expect(page.get_by_role("button", name="Generate audio for cards")).not_to_be_visible()


def test_bulk_audio_fab_shows_partial_count_for_mixed_cards(page: Page):
    """Test that the FAB shows correct count when only some cards need audio"""
    # Create one card with audio
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ],
            "audio": [
                {"id": "audio-id-1", "text": "verstehen", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "de", "selected": True},
                {"id": "audio-id-2", "text": "érteni", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "hu", "selected": True},
                {"id": "audio-id-3", "text": "Ich verstehe Deutsch.", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "de", "selected": True},
                {"id": "audio-id-4", "text": "Értem a németet.", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "hu", "selected": True}
            ]
        },
        readiness='REVIEWED'
    )

    # Create one card without audio
    create_card(
        card_id='sprechen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "sprechen",
            "type": "VERB",
            "translation": {"en": "to speak", "hu": "beszélni", "ch": "rede"},
            "forms": ["spricht", "sprach", "gesprochen"],
            "examples": [
                {
                    "de": "Ich spreche Deutsch.",
                    "hu": "Németül beszélek.",
                    "en": "I speak German.",
                    "ch": "Ich red Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id-2"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    # Create another card without audio
    create_card(
        card_id='lernen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "lernen",
            "type": "VERB",
            "translation": {"en": "to learn", "hu": "tanulni", "ch": "lerne"},
            "forms": ["lernt", "lernte", "gelernt"],
            "examples": [
                {
                    "de": "Ich lerne Deutsch.",
                    "hu": "Németet tanulok.",
                    "en": "I learn German.",
                    "ch": "Ich lern Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id-3"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # FAB should show count for only cards without complete audio
    fab = page.get_by_role("button", name="Generate audio for cards")
    expect(fab).to_be_visible()
    expect(fab).to_contain_text("Generate audio for 2 cards")


def test_bulk_audio_creation_opens_progress_dialog(page: Page):
    """Test that clicking the FAB opens the progress dialog"""
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Click the FAB
    page.get_by_role("button", name="Generate audio for cards").click()

    # Progress dialog should open
    expect(page.get_by_role("dialog")).to_be_visible()
    expect(page.get_by_role("dialog").get_by_role("heading", name="Creating Audio")).to_be_visible()


def test_bulk_audio_creation_shows_individual_progress(page: Page):
    """Test that the progress dialog shows individual card progress"""
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    create_card(
        card_id='sprechen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "sprechen",
            "type": "VERB",
            "translation": {"en": "to speak", "hu": "beszélni", "ch": "rede"},
            "forms": ["spricht", "sprach", "gesprochen"],
            "examples": [
                {
                    "de": "Ich spreche Deutsch.",
                    "hu": "Németül beszélek.",
                    "en": "I speak German.",
                    "ch": "Ich red Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id-2"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Click the FAB
    page.get_by_role("button", name="Generate audio for cards").click()

    # Check that individual cards are listed within the progress dialog
    expect(page.get_by_role('dialog').get_by_text('verstehen')).to_be_visible()
    expect(page.get_by_role('dialog').get_by_text('sprechen')).to_be_visible()

    # Check that progress bars are present
    expect(page.get_by_role('dialog').locator("mat-progress-bar")).to_have_count(2)


def test_bulk_audio_creation_creates_audio_in_database(page: Page):
    """Test that bulk audio creation actually creates audio data in the database"""
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Click the FAB
    page.get_by_role("button", name="Generate audio for cards").click()

    # Wait for creation to complete
    expect(page.get_by_text("Audio generated successfully for 1 card!")).to_be_visible()

    # Verify audio data was added to database
    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'verstehen'")
        result = cur.fetchone()

        assert result is not None, "Card 'verstehen' was not found"
        card_data = result[0]

        # Check that audio data was added
        assert 'audio' in card_data
        audio_list = card_data['audio']
        assert isinstance(audio_list, list)
        
        # Helper function to find audio by text
        def find_audio_by_text(text):
            return next((audio for audio in audio_list if audio['text'] == text), None)

        # Should have audio for German word (German samples)
        verstehen_audio = find_audio_by_text('verstehen')
        assert verstehen_audio is not None
        assert download_audio(verstehen_audio['id']) == german_audio_sample
        
        example_audio = find_audio_by_text('Ich verstehe Deutsch.')
        assert example_audio is not None
        assert download_audio(example_audio['id']) == german_audio_sample

        # Should have audio for Hungarian translations (Hungarian samples)
        translation_audio = find_audio_by_text('érteni')
        assert translation_audio is not None
        assert download_audio(translation_audio['id']) == hungarian_audio_sample
        
        translation_example_audio = find_audio_by_text('Értem a németet.')
        assert translation_example_audio is not None
        assert download_audio(translation_example_audio['id']) == hungarian_audio_sample


def test_bulk_audio_creation_updates_card_readiness_to_ready(page: Page):
    """Test that bulk audio creation updates card readiness to READY"""
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Click the FAB
    page.get_by_role("button", name="Generate audio for cards").click()

    # Wait for creation to complete
    expect(page.get_by_text("Audio generated successfully for 1 card!")).to_be_visible()

    # Verify card readiness was updated
    with with_db_connection() as cur:
        cur.execute("SELECT readiness FROM learn_language.cards WHERE id = 'verstehen'")
        result = cur.fetchone()

        assert result is not None, "Card 'verstehen' was not found"
        readiness = result[0]

        assert readiness == 'READY', f"Expected readiness to be 'READY', but got '{readiness}'"


def test_bulk_audio_creation_updates_ui_after_completion(page: Page):
    """Test that the UI updates correctly after bulk audio creation completes"""
    create_card(
        card_id='verstehen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    create_card(
        card_id='sprechen',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "sprechen",
            "type": "VERB",
            "translation": {"en": "to speak", "hu": "beszélni", "ch": "rede"},
            "forms": ["spricht", "sprach", "gesprochen"],
            "examples": [
                {
                    "de": "Ich spreche Deutsch.",
                    "hu": "Németül beszélek.",
                    "en": "I speak German.",
                    "ch": "Ich red Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id-2"}]
                }
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # Verify FAB is initially visible
    fab = page.get_by_role("button", name="Generate audio for cards")
    expect(fab).to_be_visible()

    fab.click()

    # Wait for creation to complete
    expect(page.get_by_text("Audio generated successfully for 2 cards!")).to_be_visible()

    # Close the dialog
    page.get_by_role('dialog').get_by_role('button', name='Close').click()

    # FAB should no longer be visible since cards now have audio
    expect(fab).not_to_be_visible()


def test_bulk_audio_creation_partial_audio_generation(page: Page):
    """Test bulk audio creation for cards that already have partial audio"""
    # Create card with some existing audio
    create_card(
        card_id='partial-audio',
        source_id="goethe-a1",
        source_page_number=15,
        data={
            "word": "verstehen",
            "type": "VERB",
            "translation": {"en": "to understand", "hu": "érteni", "ch": "verstoh"},
            "forms": ["versteht", "verstand", "verstanden"],
            "examples": [
                {
                    "de": "Ich verstehe Deutsch.",
                    "hu": "Értem a németet.",
                    "en": "I understand German.",
                    "ch": "Ich verstoh Tüütsch.",
                    "isSelected": True,
                    "images": [{"id": "test-image-id"}]
                }
            ],
            "audio": [
                {"id": "existing-audio-id-1", "text": "verstehen", "voice": "test-voice", "model": "eleven_turbo_v2_5", "language": "de", "selected": True}
                # Missing translation and example audio
            ]
        },
        readiness='REVIEWED'
    )

    page.goto("http://localhost:8180/in-review-cards")

    # FAB should still be visible since card needs additional audio
    page.get_by_role("button", name="Generate audio for cards").click()

    # Wait for creation to complete
    expect(page.get_by_text("Audio generated successfully for 1 card!")).to_be_visible()

    # Verify audio data was completed
    with with_db_connection() as cur:
        cur.execute("SELECT data FROM learn_language.cards WHERE id = 'partial-audio'")
        result = cur.fetchone()

        assert result is not None, "Card 'partial-audio' was not found"
        card_data = result[0]

        audio_list = card_data['audio']
        assert isinstance(audio_list, list)
        
        # Helper function to find audio by text
        def find_audio_by_text(text):
            return next((audio for audio in audio_list if audio['text'] == text), None)

        # Should preserve existing audio
        verstehen_audio = find_audio_by_text('verstehen')
        assert verstehen_audio is not None
        assert verstehen_audio['id'] == 'existing-audio-id-1'

        # Should have added missing audio (language-specific samples)
        translation_audio = find_audio_by_text('érteni')
        assert translation_audio is not None
        assert download_audio(translation_audio['id']) == hungarian_audio_sample
        
        example_audio = find_audio_by_text('Ich verstehe Deutsch.')
        assert example_audio is not None
        assert download_audio(example_audio['id']) == german_audio_sample
        
        translation_example_audio = find_audio_by_text('Értem a németet.')
        assert translation_example_audio is not None
        assert download_audio(translation_example_audio['id']) == hungarian_audio_sample
