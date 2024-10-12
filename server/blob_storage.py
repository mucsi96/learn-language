from azure.storage.blob import BlobClient
from azure.identity import DefaultAzureCredential
from cachetools import TTLCache, cached
from typing import Tuple

credentials = DefaultAzureCredential()


@cached(cache=TTLCache(maxsize=32, ttl=3600))
def fetch_blob(blob_url: str) -> Tuple[str, bytes]:
    blob_client = BlobClient.from_blob_url(blob_url, credentials)
    return (blob_client.blob_name, blob_client.download_blob().readall())
