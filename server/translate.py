import json
from langchain_core.messages import HumanMessage, SystemMessage
from models import Word
from llm import llm


def translate(word: Word, language_code: str) -> dict:
    language_map = {
        "hu": "Hungarian",
        "ch": "Swiss German",
        "en": "English"
    }

    language = language_map.get(language_code)
    system_message = SystemMessage(
        f"""
        You are a {language} language expert.
        Your task is to translate the given word and examples to {language}.
        !IMPORTANT! Please provide the translations in the following JSON structure:
        {{
            "translation": "aafange",
            "examples": ["Ich fange an.", "Er fängt an."]
        }}
        The wordType should be always in hungarian. The examples are optional.
    """
    )
    human_message = HumanMessage(
        f"""
        The word is: {word.word}.
        The examples are: {word.examples}.
    """
    )
    result = llm.invoke([system_message, human_message])
    return json.loads(result.content)
