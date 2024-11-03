from base64 import b64encode
import json
from os import environ
from langchain_core.messages import HumanMessage
from langchain_openai import AzureChatOpenAI
from langchain.globals import set_llm_cache
from langchain_community.cache import InMemoryCache
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from time import time

credentials = DefaultAzureCredential()
llm = AzureChatOpenAI(
    azure_deployment=environ.get("AZURE_OPENAI_DEPLOYMENT"),
    azure_endpoint=environ.get(
        "AZURE_OPENAI_ENDPOINT"),
    api_version=environ.get("AZURE_OPENAI_API_VERSION"),
    max_tokens=2500,
    azure_ad_token_provider=get_bearer_token_provider(
        credentials, "https://cognitiveservices.azure.com/.default")
).bind(response_format={"type": "json_object"})

set_llm_cache(InMemoryCache())

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
    start_time = time()
    result = llm.invoke([message])
    end_time = time()
    print(f"Execution time: {end_time - start_time} seconds")
    print('prompt tokens:',
          result.response_metadata['token_usage']['prompt_tokens'])
    print('completion tokens:',
          result.response_metadata['token_usage']['completion_tokens'])
    print('total tokens:',
          result.response_metadata['token_usage']['total_tokens'])
    return json.loads(result.content)['word_list']
