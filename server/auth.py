from os import environ
from fastapi import Depends, HTTPException
from fastapi_azure_auth import SingleTenantAzureAuthorizationCodeBearer
from fastapi_azure_auth.user import User


azure_scheme = SingleTenantAzureAuthorizationCodeBearer(
    app_client_id=environ.get("AZURE_CLIENT_ID"),
    tenant_id=environ.get("AZURE_TENANT_ID"),
    scopes={
        f'api://{environ.get("AZURE_CLIENT_ID")}/card-deck-read': 'card-deck-read',
        f'api://{environ.get("AZURE_CLIENT_ID")}/card-deck-write': 'card-deck-write'
    },
    allow_guest_users=True
)

security = Depends(azure_scheme)


async def validate_is_card_deck_reader(user: User = Depends(azure_scheme)) -> None:
    if 'card-deck-reader' not in user.roles or 'card-deck-read' not in user.scp:
        raise HTTPException(status_code=403)


async def validate_is_card_deck_writer(user: User = Depends(azure_scheme)) -> None:
    if 'card-deck-writer' not in user.roles or 'card-deck-write' not in user.scp:
        raise HTTPException(status_code=403)

is_card_deck_reader = Depends(validate_is_card_deck_reader)
is_card_deck_writer = Depends(validate_is_card_deck_writer)
