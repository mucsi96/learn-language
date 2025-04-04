from os import environ
from dotenv import load_dotenv
import subprocess


if environ.get("ENV") != "test":
    load_dotenv()

ENV = environ.get("ENV")
DB_PORT = environ.get("DB_PORT")
HEALTH_CHECK_PORT = int(environ.get("HEALTH_CHECK_PORT", 8082))

if ENV == "development":
    subprocess.Popen(["kubectl", "port-forward", "services/postgres1", f"{DB_PORT}:http",
                     "--kubeconfig", "../.kube/db-config", "--namespace", "db"])
    subprocess.Popen(["npm", "run", "start"], cwd="../client")

from database import init_db
from fastapi import FastAPI, Request
from auth import security
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from routes import router as api_router
from threading import Thread
import uvicorn

app = FastAPI()

app.include_router(api_router, dependencies=[security])

if ENV != "development":
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
            "mockAuth": ENV == "test"
        })

def start_healthcheck_server():
    health_app = FastAPI()

    @health_app.get("/health")
    async def health_check():
        return {"status": "ok"}

    uvicorn.run(health_app, host="0.0.0.0", port=HEALTH_CHECK_PORT, log_level="warning")

init_db()
Thread(target=start_healthcheck_server, daemon=True).start()
