from langchain_core.messages import HumanMessage, SystemMessage
from llm import llm
from models import Word
import json


def detect_word_type(word: Word) -> dict:
    system_message = SystemMessage(
        """
        You are a linguistic expert.
        Your task is to determine the type of the given word (e.g., noun, verb, adjective) and reply in hungarian.
        !IMPORTANT! Please provide the word type in the following JSON structure:
        {
            "word": "apple",
            "type": "noun"
        }
        """
    )
    human_message = HumanMessage(
        f"""
        The word is: {word.word}.
        """
    )
    result = llm.invoke([system_message, human_message])
    return json.loads(result.content)
