import base64
import json
from os import environ, makedirs, path
from pathlib import Path
from langchain_core.messages import HumanMessage, SystemMessage
from time import time

from openai import OpenAI
from models import Word
from llm import llm
import random

client = OpenAI(
    api_key=environ.get("OPEN_API_TOKEN"),
)


def populate(word: Word) -> dict:
    for example in word.examples:
        generate_image(word, example, word.examples.index(example))
    generate_speech(word, word.word, 0)
    for example in word.examples:
        generate_speech(word, example, word.examples.index(example) + 1)
    translations = create_translations(word)
    generate_speech(word, translations['hungarian']['translation'], 10)
    for example in translations['hungarian']['examples']:
        generate_speech(word, example, 11 + translations['hungarian']['examples'].index(example))
    return translations


def create_translations(word: Word) -> dict:
    system_message = SystemMessage(
        """
        You are a helpful assistant!
        You are tasked with creating data for flashcards for learning German.
        Provide the translation of the word in Swiss German (Zurich dialect) and Hungarian.
        !IMPORTANRT! Please provide the translations in the following JSON structure:
        {
            "wordType": "ige",
            "swissGerman": {
                "translation": "aafange",
                "examples": ["Ich fange an.", "Er fängt an."]
            }
            "hungarian": {
                "translation": "kezdeni",
                "examples": ["Kezdeni fogok.", "Kezdeni fog."]
            }
        }
        The wordType should be always in hungarian. The examples are optional.
    """
    )
    human_message = HumanMessage(
        f"""
        The word is: {word.word}.
        The forms are: {word.forms}.
        The examples are: {word.examples}.
    """
    )
    start_time = time()
    result = llm.invoke([system_message, human_message])
    end_time = time()
    print(f"Execution time: {end_time - start_time} seconds")
    print('prompt tokens:',
          result.response_metadata['token_usage']['prompt_tokens'])
    print('completion tokens:',
          result.response_metadata['token_usage']['completion_tokens'])
    print('total tokens:',
          result.response_metadata['token_usage']['total_tokens'])
    return json.loads(result.content)


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
