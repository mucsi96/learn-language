import base64
from os import environ, makedirs
from pathlib import Path

from openai import OpenAI

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)


def generate_image(id: str, input: str, index: int):
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
            f"images/{id}_{index}.png"
        with open(image_filename, "wb") as image_file:
            image_file.write(image_data)