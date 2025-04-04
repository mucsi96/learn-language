from os import environ
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", api_key=str(environ.get("OPENAI_API_KEY")), max_tokens=2048, # type: ignore
                 temperature=0.3, top_p=1,
                 ).bind(response_format={"type": "json_object"})
