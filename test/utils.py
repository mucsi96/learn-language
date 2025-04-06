import psycopg
from azure.storage.blob import BlobServiceClient
from pathlib import Path

blob_service_client = BlobServiceClient.from_connection_string(
  "DefaultEndpointsProtocol=https;AccountName=devstoreaccount1;"
  + "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;"
  + "BlobEndpoint=https://localhost:8181"
  + "/devstoreaccount1;"
)

def cleanup_db():
    conn = psycopg.connect(
        dbname="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="5460",
    )
    cur = conn.cursor()

    cur.execute("DROP SCHEMA IF EXISTS learn_language CASCADE")

    conn.commit()
    cur.close()


def populate_db():
    conn = psycopg.connect(
        dbname="test",
        host="localhost",
        user="postgres",
        password="postgres",
        port="5460",
    )
    cur = conn.cursor()
    cur.execute(
        """
        CREATE SCHEMA learn_language;
        CREATE TABLE learn_language.sources (
            id character varying NOT NULL,
            name character varying NOT NULL,
            file_name character varying NOT NULL,
            start_page integer NOT NULL,
            bookmarked_page integer
        );
        INSERT INTO learn_language.sources (id, name, file_name, start_page, bookmarked_page) VALUES
        ('goethe-a1', 'Goethe A1', 'A1_SD1_Wortliste_02.pdf', 9, NULL),
        ('goethe-a2', 'Goethe A2', 'Goethe-Zertifikat_A2_Wortliste.pdf', 8, NULL),
        ('goethe-b1', 'Goethe B1', 'Goethe-Zertifikat_B1_Wortliste.pdf', 16, NULL);

    """
    )

    conn.commit()
    cur.close()

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
            container_client.get_blob_client(filename).upload_blob(file_data, overwrite=True)