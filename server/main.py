from os import environ
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import router as api_router
import subprocess
from auth import security

load_dotenv()

app = FastAPI()

app.include_router(api_router, dependencies=[security])

# Mount the static files
app.mount("/", StaticFiles(directory="../client", html=True), name="static")

if environ.get("ENV") == "development":
    subprocess.Popen(["kubectl", "port-forward", "services/postgres1", "8484:http",
                     "--kubeconfig", "../.kube/db-config", "--namespace", "db"])
    subprocess.Popen(["npm", "run", "start"], cwd="../client")
