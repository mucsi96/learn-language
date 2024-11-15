from pydantic import BaseModel


class Word(BaseModel):
    word: str
    forms: list[str]
    examples: list[str]
