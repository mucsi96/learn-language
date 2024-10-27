from os import environ
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI


load_dotenv()

llm = AzureChatOpenAI(azure_deployment="openai-deployment", azure_endpoint=environ.get(
    "AZURE_OPENAI_ENDPOINT"), openai_api_key=environ.get("AZURE_OPENAI_KEY"), api_version=environ.get("AZURE_OPENAI_API_VERSION"))

result = llm.invoke("Why the sky is blue?")

print(result.content)
