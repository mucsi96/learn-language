import base64
from os import environ, makedirs
from pathlib import Path

from openai import OpenAI
from models import Word
import random

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)

def generate_speech(input: str):
    root_dir = Path(__file__).parent / ".."
    makedirs(root_dir / "speech", exist_ok=True)
    voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    selected_voice = random.choice(voices)
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=selected_voice,
        input=input,
        response_format="b64_json"
    )
    if response.data[0].b64_json:
        return base64.decodebytes(
            bytes(response.data[0].b64_json, 'utf-8'))