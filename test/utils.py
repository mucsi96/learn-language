import psycopg
from azure.storage.blob import BlobServiceClient
from pathlib import Path
from contextlib import contextmanager
import json
import base64
import requests
import uuid
from datetime import datetime
from typing import Dict, Optional, List
from playwright.sync_api import expect

blob_service_client = BlobServiceClient.from_connection_string(
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;"
    + "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;"
    + "BlobEndpoint=http://localhost:8181"
    + "/devstoreaccount1;"
)


@contextmanager
def with_db_connection():
    conn = psycopg.connect(
        dbname="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="5460",
    )
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    finally:
        cur.close()
        conn.close()


def cleanup_db():
    with with_db_connection() as cur:
        cur.execute("DROP SCHEMA IF EXISTS learn_language CASCADE")


def populate_db():
    with with_db_connection() as cur:
        current_dir = Path(__file__).parent
        init_sql_path = current_dir / "init.sql"

        with init_sql_path.open("r") as sql_file:
            cur.execute(sql_file.read())  # type: ignore


def cleanup_storage():
    container_client = blob_service_client.get_container_client('learn-language')

    if not container_client.exists():
        container_client.create_container()
        return

    for blob in container_client.list_blobs():
        blob_client = container_client.get_blob_client(blob.name)
        blob_client.delete_blob()


def populate_storage():
    container_client = blob_service_client.get_container_client('learn-language')

    if not container_client.exists():
        container_client.create_container()

    pdf_files = [
        "A1_SD1_Wortliste_02.pdf",
        "Goethe-Zertifikat_A2_Wortliste.pdf",
        "Goethe-Zertifikat_B1_Wortliste.pdf",
    ]

    current_dir = Path(__file__).parent

    for filename in pdf_files:
        file_path = current_dir / filename
        with file_path.open("rb") as file_data:
            container_client.get_blob_client("sources/" + filename).upload_blob(file_data, overwrite=True)


def create_card(card_id, source_id, data, state, step, due, stability=0, difficulty=0, source_page_number=1, last_review=None, elapsed_days=0, scheduled_days=0, reps=0, lapses=0):
    with with_db_connection() as cur:
        cur.execute("""
          INSERT INTO learn_language.cards (
            id, source_id, source_page_number, data, state, step, stability, difficulty, due, last_review, elapsed_days, scheduled_days, reps, lapses
          ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
          );
          """, (card_id, source_id, source_page_number, json.dumps(data), state, step, stability, difficulty, due, last_review, elapsed_days, scheduled_days, reps, lapses))


def create_cards_with_states(
    source_id: str,
    cards_to_create: List[dict],
    base_translations: Optional[Dict[str, str]] = None
):
    state_names = {
        0: "new",
        1: "learning",
        2: "review",
        3: "relearning"
    }

    state_counts = {name: 0 for name in state_names.values()}

    base_translations = base_translations or {'en': 'test', 'hu': 'teszt', 'ch': 'test'}

    def get_word_data(state: int, index: int):
        """Create unique word data for a card"""
        state_name = state_names[state]
        word = f"{state_name}_{index}"
        return {
            "word": word,
            "type": "nomen",
            "translation": {
                code: f"{trans}_{word}"
                for code, trans in base_translations.items()
            },
            "forms": [],
            "examples": []
        }

    for card_spec in cards_to_create:
        state = card_spec['state']
        state_name = state_names[state]

        for i in range(card_spec['count']):
            state_counts[state_name] += 1
            card_id = f"{state_name}_{state_counts[state_name]}"

            create_card(
                card_id=card_id,
                source_id=source_id,
                data=get_word_data(state, state_counts[state_name]),
                state=state,
                step=1 if state in [1, 3] else 0,  # Step 1 for learning/relearning
                due=card_spec['due_date']
            )

    return {state: count for state, count in state_counts.items()}


yellow_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==")
red_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC")
blue_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC")
green_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=")


def get_image_content(image_element):
    expect(image_element).to_be_visible()
    image_src = image_element.get_attribute('src')
    assert image_src is not None, "Image src attribute is None"

    if image_src.startswith('blob:'):
        # Use browser context to fetch blob and return as base64
        base64_data = image_element.evaluate('''async (el) => {
            const response = await fetch(el.src);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }''')
        return base64.b64decode(base64_data)
    else:
        response = requests.get(image_src)
        response.raise_for_status()
        return response.content


def get_color_image_bytes(color, size=600):
    images_dir = Path(__file__).parent / "images"
    filename = f"{color}{size}.jpg"
    with (images_dir / filename).open("rb") as f:
        return f.read()


def select_text_range(page, start_text, end_text):
    start_element = page.get_by_text(start_text, exact=True)
    end_element = page.get_by_text(end_text, exact=True)

    end_element.scroll_into_view_if_needed()

    start_box = start_element.bounding_box()
    end_box = end_element.bounding_box()

    assert start_box is not None and end_box is not None, "Bounding boxes could not be retrieved"

    page.mouse.move(start_box["x"], start_box["y"])
    page.mouse.down()
    page.mouse.move(end_box["x"] + end_box["width"], end_box["y"] + end_box["height"])
    page.mouse.up()


def navigate_to_card_creation(page, context, source_name="Goethe A1", start_text="aber", end_text="Vor der Abfahrt rufe ich an.", word_name="abfahren"):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name=source_name).click()

    select_text_range(page, start_text, end_text)

    with context.expect_page() as card_page_info:
        page.get_by_role(role="link", name=word_name).click()
    card_page = card_page_info.value

    return card_page

def download_image(id):
    container_client = blob_service_client.get_container_client('learn-language')
    blob_name = f"images/{id}.jpg"
    blob_client = container_client.get_blob_client(blob_name)

    if not blob_client.exists():
        raise FileNotFoundError(f"Blob {blob_name} does not exist in the container.")

    download_stream = blob_client.download_blob()
    return download_stream.readall()

def upload_mock_image(image_data):
    container_client = blob_service_client.get_container_client('learn-language')

    if not container_client.exists():
        container_client.create_container()

    uuid_str = str(uuid.uuid4())
    blob_name = f"images/{uuid_str}.jpg"
    blob_client = container_client.get_blob_client(blob_name)

    blob_client.upload_blob(image_data, overwrite=True)

    return uuid_str
