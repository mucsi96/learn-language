from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import router as api_router
import os
import subprocess

load_dotenv()

app = FastAPI()

app.include_router(api_router)

# Mount the static files
app.mount("/", StaticFiles(directory="../client", html=True), name="static")

if os.getenv("ENV") == "development":
    subprocess.Popen(["kubectl", "port-forward", "services/demo-db", "8484:http", "--kubeconfig", "../.kube/demo-config", "--namespace", "demo"])
    subprocess.Popen(["npm", "run", "start"], cwd="../client")