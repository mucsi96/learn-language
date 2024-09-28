from math import inf
from os import makedirs, path
import re
import sqlite3
from contextlib import closing
import psycopg
from requests import get
import fitz

type WordBlock = tuple[int, int, int, int, str]
type Box = tuple[int, int, int, int]


class Word:
    word: str
    forms: list[str]
    examples: list[str]

    def __init__(self, word: str, forms: list[str], examples: list[str]) -> None:
        self.word = word
        self.forms = forms
        self.examples = examples


def get_existing_words() -> None:
    with closing(sqlite3.connect("anki/collection.anki2")) as conn:
        return conn.execute("SELECT sfld FROM notes;").fetchall()


def save_wordlist(category: str, words: list[Word]) -> None:
    with psycopg.connect("postgres://postgres:postgres@localhost:5432/language") as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS imports (
                    id SERIAL PRIMARY KEY,
                    category VARCHAR,
                    word VARCHAR,
                    forms text[],
                    examples text[],
                    imported_at timestamp default current_timestamp,
                    processed_at timestamp
                )
            """)
            conn.commit()
            for word in words:
                conn.execute("""
                    INSERT INTO imports (
                        category,
                        word,
                        forms,
                        examples
                    ) VALUES (
                        %s,
                        %s,
                        %s,
                        %s
                    )
                """, (category, word.word, word.forms, word.examples))
                conn.commit()


def download_pdf(url: str, save_path: str) -> None:
    response = get(url)
    with open(save_path, "wb") as pdf_file:
        pdf_file.write(response.content)


def box_distance(a: Box, b: Box) -> int:
    (ax0, ay0, ax1, ay1) = a
    (bx0, by0, bx1, by1) = b
    gapx = bx0 - ax1 if bx0 > ax0 else ax0 - bx1
    gapy = by0 - ay1 if by0 > ay0 else ay0 - by1
    if gapx < -2 and gapy < -2:
        return inf
    return gapx + gapy


def get_closest_block(all_words: list[WordBlock], word_block: WordBlock) -> tuple[WordBlock, float]:
    closest = None
    closest_dist = None
    for x0, y0, x1, y1, word in all_words:
        dist = box_distance(
            (word_block[0], word_block[1], word_block[2], word_block[3]),
            (x0, y0, x1, y1),
        )
        if closest_dist == None or dist < closest_dist:
            closest = (x0, y0, x1, y1, word)
            closest_dist = dist
    return (closest, closest_dist)


def get_unique_word_positions(page: fitz.Page, min_x: float, max_x: float) -> list[WordBlock]:
    blocks = []

    for block in page.get_textpage().extractDICT()['blocks']:
        lines = []
        for line in block['lines']:
            for span in line['spans']:
                # print(span['size'], span['font'], span['flags'], span['color'])
                if span['size'] == 8.0 and span['font'] == 'GoetheFFClan' and span['color'] == 2236191:
                    lines.append(span['text'].strip())
        if len(lines) > 0 and block['bbox'][0] > min_x and block['bbox'][0] < max_x:
            blocks.append((*block['bbox'], ' '.join(lines).replace('- ', '')))

    return sorted(blocks, key=lambda block: block[1])


def strip_items(items: list[str]) -> list[str]:
    return list(map(lambda part: part.strip(), items))


def split_word(word: str) -> tuple[str, list[str]]:
    parts = word.split(',')
    return (parts[0].strip(), [part.strip() for part in parts[1:]])


def split_examples(examples: str) -> list[str]:
    sentence_pattern = re.compile(r'[A-Za-z]')

    return [s.strip() + "." for s in examples.split('.') if sentence_pattern.match(s)]


def extract_data_from_pdf(pdf_path: str, from_page: int, to_page: int) -> None:
    document = fitz.open(pdf_path)
    existing_word = get_existing_words()
    for page_number in range(document.page_count):
        if page_number < from_page or page_number > to_page:
            continue
        
        page = document[page_number]
        words = []
        col1_a = get_unique_word_positions(page, 0, 131)
        col1_b = get_unique_word_positions(page, 131, 314)
        col2_a = get_unique_word_positions(page, 314, 411)
        col2_b = get_unique_word_positions(page, 411, 900)
        for word_block in col1_a:
            (main_word, word_forms) = split_word(word_block[4])
            words.append(
                Word(main_word, word_forms, split_examples(get_closest_block(
                    col1_b, word_block)[0][4]))
            )
        for word_block in col2_a:
            (main_word, word_forms) = split_word(word_block[4])
            words.append(
                Word(main_word, word_forms, split_examples(get_closest_block(
                    col1_b, word_block)[0][4]))
            )
        save_wordlist("B1", words)


def main():
    pdf_url = "https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_B1_Wortliste.pdf"
    pdf_path = ".cache/b1-wortliste.pdf"

    makedirs(path.dirname(pdf_path), exist_ok=True)

    if not path.exists(pdf_path):
        download_pdf(pdf_url, pdf_path)
    extract_data_from_pdf(pdf_path, 16, 102)


if __name__ == "__main__":
    main()
