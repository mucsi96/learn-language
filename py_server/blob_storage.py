from os import environ
from azure.storage.blob import BlobClient, BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.identity import DefaultAzureCredential
from datetime import datetime, timedelta, timezone

ENV = environ.get("ENV")
ACCOUNT_URL = str(environ.get("STORAGE_ACCOUNT_BLOB_URL"))
CONTAINER_NAME = str(environ.get("STORAGE_ACCOUNT_CONTAINER_NAME"))

credentials = DefaultAzureCredential()

def get_blob_client(blob_name: str) -> BlobClient:
    return get_blob_service_client().get_blob_client(container=CONTAINER_NAME, blob=blob_name)


def get_blob_service_client() -> BlobServiceClient:
    if ENV == "development":
        return BlobServiceClient(account_url=ACCOUNT_URL, credential=credentials)
    else:
        return BlobServiceClient(account_url=ACCOUNT_URL, credential=credentials)


def fetch_blob(blob_name: str) -> bytes:
    blob_client = get_blob_client(blob_name)
    return blob_client.download_blob().readall()


def upload_blob(data: bytes, blob_name: str) -> None:
    blob_client = get_blob_client(blob_name)
    blob_client.upload_blob(data, overwrite=True)


def blob_exists(blob_name: str) -> bool:
    blob_client = get_blob_client(blob_name)
    return blob_client.exists()


def get_download_url(blob_name: str) -> str:
    blob_client = get_blob_client(blob_name)
    blob_service_client = get_blob_service_client()

    user_delegation_key = blob_service_client.get_user_delegation_key(datetime.now(
        timezone.utc), datetime.now(timezone.utc) + timedelta(minutes=2))

    sas_token = generate_blob_sas(
        account_name=str(blob_client.account_name),
        user_delegation_key=user_delegation_key,
        container_name=blob_client.container_name,
        blob_name=blob_client.blob_name,
        permission=BlobSasPermissions(read=True),
        start=datetime.now(
            timezone.utc),
        expiry=datetime.now(
            timezone.utc) + timedelta(minutes=2)
    )
    return f"{blob_client.url}?{sas_token}"
