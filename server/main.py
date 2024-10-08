from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from routes import router as api_router

load_dotenv()

app = FastAPI()

app.include_router(api_router)

# Mount the static files
app.mount("/", StaticFiles(directory="../client", html=True), name="static")
