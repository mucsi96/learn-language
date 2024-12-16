import re


def word_id(word: str) -> str:
    return re.split(r'\s?[,/(-]', word)[0].strip().lower().replace(' ', '-')
