import base64
from os import environ, makedirs
from pathlib import Path

from openai import OpenAI
from models import Word
import random

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)


def generate_image(word: Word, input: str, index: int):
    root_dir = Path(__file__).parent / ".."
    makedirs(root_dir / "images", exist_ok=True)
    response = client.images.generate(
        model="dall-e-3",
        prompt=input,
        size="1024x1024",
        quality="hd",
        style="natural",
        n=1,
        response_format="b64_json"
    )
    if response.data[0].b64_json:
        image_data = base64.decodebytes(
            bytes(response.data[0].b64_json, 'utf-8'))
        image_filename = root_dir / \
            f"images/{word.word.lower().replace(' ', '_')}_{index}.png"
        with open(image_filename, "wb") as image_file:
            image_file.write(image_data)


def generate_speech(word: Word, input: str, index: int):
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
        f"speech/{word.word.lower().replace(' ', '_')}_{index}.mp3"
    response.stream_to_file(speech_filename)
