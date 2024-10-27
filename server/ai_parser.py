from base64 import b64encode
import json
from os import environ
from langchain_core.messages import HumanMessage
from langchain_openai import AzureChatOpenAI

llm = AzureChatOpenAI(
    azure_deployment="openai-deployment",
    azure_endpoint=environ.get(
        "AZURE_OPENAI_ENDPOINT"),
    openai_api_key=environ.get("AZURE_OPENAI_KEY"),
    api_version=environ.get("AZURE_OPENAI_API_VERSION"),
    max_tokens=5000
).bind(response_format={"type": "json_object"})


def parse(image_bytes: bytes) -> dict:
    image_base64 = b64encode(image_bytes).decode("utf-8")
    message = HumanMessage(content=[
        {
            "type": "text",
            "text":
                """
                Please extract the wordlist data from this page?
                In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
                The word property holds a string. it's the basic form of the word without any forms.
                The forms is a string array representing the different forms. In case of a noun it the plural form.
                In case of verb it's the 3 forms of conjugation (Eg. Du gehst, Er/Sie/Es geht, Er/Sie/Es ist gegangen). Please enhance it to make those full words. Not just endings.
                The examples property is a string array enlisting the examples provided in the document.
                json_structure:
                {
                    word_list: [
                        {
                            "word": "das Haus",
                            "forms": ["die Häuser"],
                            "examples": ["Das Haus ist groß."]
                        },
                        {
                            "word": "gehen",
                            "forms": ["gehst", "geht", "ist gegangen"],
                            "examples": ["Ich gehe jetzt.", "Er ist nach Hause gegangen."],
                        }
                    ]
                }
                """
        },
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{image_base64}"}
        }
    ])
    return json.loads(llm.invoke([message], config={''}).content)['word_list']