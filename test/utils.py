import psycopg
from azure.storage.blob import BlobServiceClient
from pathlib import Path
from contextlib import contextmanager
import json

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


def create_card(card_id, source_id, data, state, step, due, last_review=None):
    with with_db_connection() as cur:
        cur.execute("""
          INSERT INTO learn_language.cards (
            id, source_id, data, state, step, stability, difficulty, due, last_review
          ) VALUES (
            %s, %s, %s, %s, %s, 0, NULL, %s, %s
          );
          """, (card_id, source_id, json.dumps(data), state, step, due, last_review))
