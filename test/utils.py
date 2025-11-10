import psycopg
from pathlib import Path
from contextlib import contextmanager
import json
import base64
import requests
import uuid
import shutil
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, List
from playwright.sync_api import expect

# Storage directory path (matches docker-compose.yaml configuration)
STORAGE_DIR = Path("/tmp/learn-language-test-storage")


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
    if STORAGE_DIR.exists():
        shutil.rmtree(STORAGE_DIR)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def populate_storage():
    sources_dir = STORAGE_DIR / "sources"
    sources_dir.mkdir(parents=True, exist_ok=True)

    pdf_files = [
        "A1_SD1_Wortliste_02.pdf",
        "Goethe-Zertifikat_A2_Wortliste.pdf",
        "Goethe-Zertifikat_B1_Wortliste.pdf",
    ]

    current_dir = Path(__file__).parent

    for filename in pdf_files:
        source_path = current_dir / filename
        dest_path = sources_dir / filename
        shutil.copy2(source_path, dest_path)


def create_card(card_id, source_id, data, state='NEW', learning_steps=0, due=datetime.now()-timedelta(days=1), stability=0.0, difficulty=0.0, source_page_number=1, last_review=None, elapsed_days=0, scheduled_days=0, reps=0, lapses=0, readiness='READY'):
    with with_db_connection() as cur:
        cur.execute("""
          INSERT INTO learn_language.cards (
            id, source_id, source_page_number, data, state, learning_steps, stability, difficulty, due, last_review, elapsed_days, scheduled_days, reps, lapses, readiness
          ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
          );
          """, (card_id, source_id, source_page_number, json.dumps(data), state, learning_steps, stability, difficulty, due, last_review, elapsed_days, scheduled_days, reps, lapses, readiness))


def create_cards_with_states(
    source_id: str,
    cards_to_create: List[dict],
    base_translations: Optional[Dict[str, str]] = None
):
    base_translations = base_translations or {'en': 'test', 'hu': 'teszt', 'ch': 'test'}

    def get_word_data(state: str, index: int):
        """Create unique word data for a card"""
        state_name = state.lower()
        word = f"{state_name}_{index}"
        return {
            "word": word,
            "type": "NOUN",
            "translation": {
                code: f"{trans}_{word}"
                for code, trans in base_translations.items()
            },
            "forms": [],
            "examples": []
        }

    for card_spec in cards_to_create:
        state = card_spec['state']

        for i in range(card_spec['count']):
            card_id = f"{source_id}_{state.lower()}_{i}"

            create_card(
                card_id=card_id,
                source_id=source_id,
                data=get_word_data(state, i),
                state=state,
                learning_steps=1 if state in ["LEARNING", "RELEARNING"] else 0,  # Step 1 for learning/relearning
                due=card_spec['due_date']
            )


yellow_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==")
red_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC")
blue_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC")
green_image = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=")
german_audio_sample = base64.b64decode("UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBC+Ezm4=")
hungarian_audio_sample = base64.b64decode("UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAaBCmEzmo=")

def get_image_content(image_element):
    expect(image_element).to_be_visible()
    image_src = image_element.get_attribute('src')
    assert image_src is not None

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

    start_box = start_element.bounding_box()
    end_box = end_element.bounding_box()

    assert start_box is not None and end_box is not None

    page.mouse.move(start_box["x"] - 5, start_box["y"] - 5)
    page.mouse.down()
    page.mouse.move(end_box["x"] + end_box["width"] + 5, end_box["y"] + end_box["height"] + 5)
    page.mouse.up()


def scroll_element_to_top(page, selector_text, exact=True):
    element = page.get_by_text(selector_text, exact=exact)
    page.evaluate("element => element.scrollIntoView({block: 'start', behavior: 'instant'})", element.element_handle())


def navigate_to_card_creation(page, context, source_name="Goethe A1", start_text="aber", end_text="Vor der Abfahrt rufe ich an.", word_name="abfahren"):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name=source_name).click()

    select_text_range(page, start_text, end_text)

    page.get_by_role(role="link", name=word_name).click()

def download_image(id):
    image_path = STORAGE_DIR / "images" / f"{id}.jpg"

    if not image_path.exists():
        raise FileNotFoundError(f"Image {id}.jpg does not exist in storage.")

    return image_path.read_bytes()

def download_audio(id):
    audio_path = STORAGE_DIR / "audio" / f"{id}.mp3"

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio {id}.mp3 does not exist in storage.")

    return audio_path.read_bytes()

def upload_mock_image(image_data):
    images_dir = STORAGE_DIR / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    uuid_str = str(uuid.uuid4())
    image_path = images_dir / f"{uuid_str}.jpg"

    image_path.write_bytes(image_data)

    return uuid_str

def ensure_timezone_aware(dt: datetime) -> datetime:
    """
    Ensures that a datetime object has timezone info.
    If the datetime is naive (no timezone), it assumes UTC timezone.
    """
    if dt.tzinfo is None:
        return datetime(dt.year, dt.month, dt.day,
                       dt.hour, dt.minute, dt.second,
                       microsecond=dt.microsecond, tzinfo=timezone.utc)
    return dt
