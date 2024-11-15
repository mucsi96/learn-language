import json
from langchain_core.messages import HumanMessage, SystemMessage
from time import time
from models import Word
from llm import llm


def populate(word: Word) -> dict:
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
