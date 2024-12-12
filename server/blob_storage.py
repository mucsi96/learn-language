from os import environ
from azure.storage.blob import BlobClient, generate_blob_sas, BlobSasPermissions
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta
from azure.mgmt.storage import StorageManagementClient

credentials = DefaultAzureCredential()
storage_client = StorageManagementClient(
    credentials, environ.get("AZURE_SUBSCRIPTION_ID"))
keys = storage_client.storage_accounts.list_keys("ibari", "ibari")
account_key = keys.keys[0].value


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


def generate_sas_token(blob_url: str) -> str:
    blob_client = get_blob_client(blob_url)

    sas_token = generate_blob_sas(
        account_name=blob_client.account_name,
        account_key=account_key,
        container_name=blob_client.container_name,
        blob_name=blob_client.blob_name,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.utcnow() + timedelta(minutes=10)
    )
    return sas_token
