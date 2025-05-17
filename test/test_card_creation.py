from pathlib import Path
import sys
from playwright.sync_api import Page, BrowserContext, expect

sys.path.append(str(Path(__file__).resolve().parent.parent))  # noqa


def test_card_creation_page(page: Page, context: BrowserContext):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name="Goethe A1").click()

    # Simulate dragging a rectangle to select words
    start_element = page.get_by_text("Alphabetische")
    end_element = page.get_by_text("Vor der Abfahrt rufe ich an.")
    start_box = start_element.bounding_box()
    end_box = end_element.bounding_box()

    assert start_box is not None and end_box is not None, "Bounding boxes could not be retrieved"

    page.mouse.move(start_box["x"] + start_box["width"] / 2, start_box["y"] + start_box["height"] / 2)
    page.mouse.down()
    page.mouse.move(end_box["x"] + end_box["width"] / 2, end_box["y"] + end_box["height"] / 2)
    page.mouse.up()

    with context.expect_page() as card_page_info:
        page.get_by_role(role="link", name="abfahren").click()
    card_page = card_page_info.value

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
