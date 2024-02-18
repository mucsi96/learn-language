from math import inf, sqrt
from os import makedirs, path
import re
from shutil import rmtree
from typing import List, Tuple
from requests import get
import fitz

type WordBlock = Tuple[int, int, int, int, str]
type ImageWithBBox = Tuple[int, int, int, int, int, str, str, str, str, int]
type Box = Tuple[int, int, int, int]


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
    return max(gapx, gapy)


def get_unique_word_positions(page: fitz.Page) -> List[WordBlock]:
    return sorted(list(
        set(
            map(
                lambda word: (word[0], word[1], word[2], word[3], word[4]),
                page.get_textpage().extractBLOCKS(),
            )
        )
    ), key=lambda word: word[1])


def extract_data_from_pdf(pdf_path: str) -> None:
    document = fitz.open(pdf_path)
    # for page_number in range(document.page_count):
    # page_number = 17
    page_number = 22
    # page_number = 16
    page = document[page_number]
    words = get_unique_word_positions(page)
    for word_block in words:
        (
            x0,
            y0,
            x1,
            y1,
            word,
        ) = word_block
        if x0 < 131:
            print(x0, y0, x1, y1, word)


def main():
    pdf_url = "https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_B1_Wortliste.pdf"
    pdf_path = ".cache/b1-wortliste.pdf"

    makedirs(path.dirname(pdf_path), exist_ok=True)

    if not path.exists(pdf_path):
        download_pdf(pdf_url, pdf_path)
    extract_data_from_pdf(pdf_path)


if __name__ == "__main__":
    main()
