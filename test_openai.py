import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)


def translate_word(word: str, context_sentence: str, language: str) -> str:
    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f'Translate the "{word}" German word to {language} in context of following sentence "{context_sentence}. Please omit the articel and any quotes."',
            }
        ],
        model="gpt-3.5-turbo",
        temperature=0.2
    )

    return response.choices[0].message.content


print(translate_word("die Bank",
      "Kommt, wir setzen uns auf die Bank da vorne.", "Hungarian"))
print(translate_word("backen",
      "Wenn du kommst, backe ich einen Kuchen.", "Hungarian"))
print(translate_word("die Bäckerei",
      "Wir kaufen unser Brot immer in der Bäckerei am Markt.", "Hungarian"))
