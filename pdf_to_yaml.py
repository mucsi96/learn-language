from math import inf, sqrt
from os import makedirs, path
import re
from shutil import rmtree
from sqlite3 import connect
from typing import List, Tuple
from pandas import DataFrame
from requests import get
import fitz

type WordBlock = Tuple[int, int, int, int, str]
type Box = Tuple[int, int, int, int]

db = connect("data/collection.db")
cursor = db.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print(cursor.fetchall())

cursor.execute("SELECT * FROM cards;")
print(cursor.fetchall())


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


def get_closest_block(all_words: List[WordBlock], word_block: WordBlock) -> Tuple[WordBlock, float]:
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


def get_unique_word_positions(page: fitz.Page, min_x: float, max_x: float) -> List[WordBlock]:
    blocks = []

    for block in page.get_textpage().extractDICT()['blocks']:
        lines = []
        for line in block['lines']:
            for span in line['spans']:
                # print(span['size'], span['font'], span['flags'], span['color'])
                if span['size'] == 8.0 and span['font'] == 'GoetheFFClan' and span['color'] == 2236191:
                    lines.append(span['text'].strip())
        if len(lines) > 0 and block['bbox'][0] > min_x and block['bbox'][0] < max_x:
            blocks.append((*block['bbox'], ' '.join(lines)))

    return sorted(blocks, key=lambda block: block[1])


def extract_data_from_pdf(pdf_path: str, csv_path: str) -> None:
    document = fitz.open(pdf_path)
    # for page_number in range(document.page_count):
    # page_number = 17
    page_number = 22
    # page_number = 16
    page = document[page_number]
    words = []
    col1_a = get_unique_word_positions(page, 0, 131)
    col1_b = get_unique_word_positions(page, 131, 314)
    col2_a = get_unique_word_positions(page, 314, 411)
    col2_b = get_unique_word_positions(page, 411, 900)
    for word_block in col1_a:
        (
            x0,
            y0,
            x1,
            y1,
            word,
        ) = word_block
        words.append(
            {'word': word, 'example': get_closest_block(col1_b, word_block)[0][4]})
    for word_block in col2_a:
        (
            x0,
            y0,
            x1,
            y1,
            word,
        ) = word_block
        words.append(
            {'word': word, 'example': get_closest_block(col2_b, word_block)[0][4]})
    df = DataFrame(data=words)
    df.to_csv(csv_path, index=False)


def main():
    pdf_url = "https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_B1_Wortliste.pdf"
    pdf_path = ".cache/b1-wortliste.pdf"
    csv_path = "data/b1-wortliste.csv"

    makedirs(path.dirname(pdf_path), exist_ok=True)
    makedirs(path.dirname(csv_path), exist_ok=True)

    if not path.exists(pdf_path):
        download_pdf(pdf_url, pdf_path)
    extract_data_from_pdf(pdf_path, csv_path)


if __name__ == "__main__":
    main()
