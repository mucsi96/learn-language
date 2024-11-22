from pydantic import BaseModel


class Word(BaseModel):
    id: str
    word: str
    forms: list[str]
    examples: list[str]
    
class ImageSource(BaseModel):
    id: str
    input: str
    index: int
    
class SpeechSource(BaseModel):
    id: str
    input: str
    language: str
    index: int