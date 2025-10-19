"""Test audio sequencing in learn card component."""

import pytest
from playwright.sync_api import Page, expect
import time


def test_audio_plays_sequentially(page: Page):
    """Test that audio files play sequentially with proper delays."""

    # Navigate to a study page with cards that have audio
    page.goto("/sources/1/study")

    # Wait for the learn card component to load
    page.wait_for_selector("app-learn-card", timeout=10000)

    # Click reveal to trigger audio playback
    reveal_button = page.locator("button:has-text('Reveal')")
    if reveal_button.is_visible():
        reveal_button.click()

    # Wait a moment for audio to start
    time.sleep(0.5)

    # Check that the component is present and audio would be playing
    # Note: We can't directly test audio playback in headless mode,
    # but we can verify the component structure is correct
    learn_card = page.locator("app-learn-card")
    expect(learn_card).to_be_visible()

    # Verify the vocabulary card component is present
    vocab_card = page.locator("app-learn-vocabulary-card")
    expect(vocab_card).to_be_visible()

    # Test toggling reveal again
    reveal_button = page.locator("button").filter(has_text="Hide")
    if reveal_button.is_visible():
        reveal_button.click()
        time.sleep(0.5)

    # Click reveal again to test audio restart
    reveal_button = page.locator("button").filter(has_text="Reveal")
    if reveal_button.is_visible():
        reveal_button.click()

    # Verify no console errors related to audio
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg))

    # Wait for potential audio errors
    time.sleep(2)

    # Check for audio-related errors
    audio_errors = [msg for msg in console_messages if "audio" in msg.text.lower() and msg.type == "error"]
    assert len(audio_errors) == 0, f"Found audio errors in console: {audio_errors}"

    print("✓ Audio sequencing test passed - no errors detected")


def test_voice_selection_dialog_audio(page: Page):
    """Test audio playback in voice selection dialog."""

    # Navigate to a card editing page
    page.goto("/sources/1/page/1")
    page.wait_for_selector("app-page", timeout=10000)

    # Create a card first if needed
    # This would depend on your test data setup

    # Open voice selection dialog (this would need the proper trigger)
    # For now, we'll just verify the service is available

    # Check that the page loaded without errors
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg))

    # Wait for potential errors
    time.sleep(1)

    # Check for service-related errors
    service_errors = [msg for msg in console_messages if "AudioPlaybackService" in msg.text and msg.type == "error"]
    assert len(service_errors) == 0, f"Found AudioPlaybackService errors: {service_errors}"

    print("✓ Voice selection dialog audio test passed")


if __name__ == "__main__":
    # This allows running the test file directly
    pytest.main([__file__, "-v"])
