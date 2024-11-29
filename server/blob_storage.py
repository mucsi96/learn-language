from azure.storage.blob import BlobClient
from azure.identity import DefaultAzureCredential

credentials = DefaultAzureCredential()

def get_blob_client(blob_url: str) -> BlobClient:
    return BlobClient.from_blob_url(blob_url, credentials)

def fetch_blob(blob_url: str) -> bytes:
    blob_client = get_blob_client(blob_url)
    return blob_client.download_blob().readall()

def upload_blob(data: bytes, blob_url: str) -> None:
    blob_client = get_blob_client(blob_url)
    blob_client.upload_blob(data, overwrite=True)

def blob_exists(blob_url: str) -> bool:
    blob_client = get_blob_client(blob_url)
    return blob_client.exists()
