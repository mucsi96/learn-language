import base64
from os import environ, makedirs
from pathlib import Path

from openai import OpenAI

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)


def generate_image(input: str):
    root_dir = Path(__file__).parent / ".."
    makedirs(root_dir / "images", exist_ok=True)
    response = client.images.generate(
        model="dall-e-3",
        prompt="Design a photorealistic, visually appealing, and modern image to illustrate the following example sentence: " + input,
        size="1024x1024",
        quality="hd",
        style="natural",
        n=1,
        response_format="b64_json"
    )
    if response.data[0].b64_json:
        return base64.decodebytes(
            bytes(response.data[0].b64_json, 'utf-8'))