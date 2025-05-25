import psycopg
from azure.storage.blob import BlobServiceClient
from pathlib import Path
from contextlib import contextmanager
import json
import base64
import requests
from playwright.sync_api import expect

blob_service_client = BlobServiceClient.from_connection_string(
    "DefaultEndpointsProtocol=https;AccountName=devstoreaccount1;"
    + "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;"
    + "BlobEndpoint=https://localhost:8181"
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


def create_card(card_id, source_id, data, state, step, due, source_page_number=1, last_review=None, images=None):
    with with_db_connection() as cur:
        cur.execute("""
          INSERT INTO learn_language.cards (
            id, source_id, source_page_number, data, state, step, stability, difficulty, due, last_review
          ) VALUES (
            %s, %s, %s, %s, %s, 0, NULL, %s, %s, %s
          );
          """, (card_id, source_id, source_page_number, json.dumps(data), state, step, due, last_review))

    if images:
        for index, image_data in enumerate(images):
            upload_mock_image(image_data, source_id, card_id, index)


# 1x1 transparent pixel
mockImage1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");

# 1x1 red pixel
mockImage2 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

# 1x1 blue pixel
mockImage3 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

# 1x1 green pixel
mockImage4 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");


def get_image_content(image_element):
    expect(image_element).to_be_visible()
    image_src = image_element.get_attribute('src')
    assert image_src is not None, "Image src attribute is None"

    response = requests.get(image_src)
    response.raise_for_status()

    return response.content

def navigate_to_card_creation(page, context, source_name="Goethe A1", start_text="Alphabetische", end_text="Vor der Abfahrt rufe ich an.", word_name="abfahren"):
    page.goto("http://localhost:8180/sources")
    page.get_by_role(role="link", name=source_name).click()

    # Simulate dragging a rectangle to select words
    start_element = page.get_by_text(start_text)
    end_element = page.get_by_text(end_text)
    start_box = start_element.bounding_box()
    end_box = end_element.bounding_box()

    assert start_box is not None and end_box is not None, "Bounding boxes could not be retrieved"

    page.mouse.move(start_box["x"] + start_box["width"] / 2, start_box["y"] + start_box["height"] / 2)
    page.mouse.down()
    page.mouse.move(end_box["x"] + end_box["width"] / 2, end_box["y"] + end_box["height"] / 2)
    page.mouse.up()

    with context.expect_page() as card_page_info:
        page.get_by_role(role="link", name=word_name).click()
    card_page = card_page_info.value

    return card_page

def upload_mock_image(image_data, source_id="goethe-a1", card_id="abfahren", example_index=0):
    container_client = blob_service_client.get_container_client('learn-language')

    if not container_client.exists():
        container_client.create_container()

    blob_name = f"images/{source_id}/{card_id}-{example_index}.png"
    blob_client = container_client.get_blob_client(blob_name)

    blob_client.upload_blob(image_data, overwrite=True)
