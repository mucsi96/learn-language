from os import environ, makedirs
from pathlib import Path

from openai import OpenAI
from models import Word
import random

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)

def generate_speech(id: str, input: str, language: str, index: int):
    root_dir = Path(__file__).parent / ".."
    makedirs(root_dir / "speech", exist_ok=True)
    voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    selected_voice = random.choice(voices)
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=selected_voice,
        input=input,
    )
    speech_filename = root_dir / \
        f"speech/{id}_{language}_{index}.mp3"
    response.stream_to_file(speech_filename)