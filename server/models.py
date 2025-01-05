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
    override: bool = False
    
class SpeechSource(BaseModel):
    id: str
    input: str
    language: str
    index: int
    override: bool = False

class CardCreate(BaseModel):
    id: str
    word: str
    type: str
    image: str
    translation: dict[str, str]
    forms: list[str]
    examples: list[dict[str, str]]