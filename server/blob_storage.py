from azure.storage.blob import BlobClient
from azure.identity import DefaultAzureCredential
from typing import Tuple

credentials = DefaultAzureCredential()

def fetch_blob(blob_url: str) -> Tuple[str, bytes]:
    blob_client = BlobClient.from_blob_url(blob_url, credentials)
    return blob_client.download_blob().readall()

def upload_blob(data: bytes, blob_url: str, override: bool = False) -> str:
    blob_client = BlobClient.from_blob_url(blob_url, credentials)
    
    if not override and blob_client.exists():
        return blob_client.url
    
    blob_client.upload_blob(data, overwrite=override)
    return blob_client.url

def get_blob_url(blob_url: str) -> str:
    blob_client = BlobClient.from_blob_url(blob_url, credentials)
    return blob_client.url
