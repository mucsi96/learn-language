from dotenv import load_dotenv

load_dotenv()

from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
from pathlib import Path
from auth import security
import subprocess
from routes import router as api_router
from fastapi import FastAPI, Request
from os import environ


ENV = environ.get("ENV")

app = FastAPI()

app.include_router(api_router, dependencies=[security])

if ENV == "development":
    subprocess.Popen(["kubectl", "port-forward", "services/postgres1", "8484:http",
                     "--kubeconfig", "../.kube/db-config", "--namespace", "db"])
    subprocess.Popen(["npm", "run", "start"], cwd="../client")
else:
    STATIC_DIR = Path("static")
    AZURE_TENANT_ID = environ.get("AZURE_TENANT_ID")
    AZURE_CLIENT_ID = environ.get("AZURE_CLIENT_ID")
    UI_CLIENT_ID = environ.get("UI_CLIENT_ID")
    templates = Jinja2Templates(directory=Path("templates"))

    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str):

        static_path = STATIC_DIR / path

        if static_path.exists() and static_path.is_file():
            return FileResponse(static_path)

        return templates.TemplateResponse("index.html", {
            "request": request,
            "apiContextPath": "/api",
            "tenantId": AZURE_TENANT_ID,
            "clientId": UI_CLIENT_ID,
            "apiClientId": AZURE_CLIENT_ID,
            "mockAuth": False
        })
