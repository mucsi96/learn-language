from fastapi import HTTPException
import fitz
from blob_storage import fetch_blob
from ai_parser import parse


def process_document(source: str, page_number: int) -> dict:
    try:
        (blob_name, blob_data) = fetch_blob(source)
        document = fitz.open(blob_name, blob_data)
        page = document[page_number - 1]
    except IndexError:
        raise HTTPException(status_code=404, detail="Page number out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    wordlist = parse(page.get_pixmap(matrix=fitz.Matrix(2, 2)).tobytes())

    spans = []
    for block in page.get_textpage().extractDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                spans.append(map_span(page.rect.width, wordlist)(span))

    return {
        'spans': spans
    }


def map_span(page_width: float, wordlist: list):
    def mapper(item: dict) -> dict:
        bbox = item['bbox']
        prefix = item['text'].split(',')[0].strip()
        return {
            **item,
            'bbox': {
                'x': bbox[0] / page_width,
                'y': bbox[1] / page_width,
                'width': (bbox[2] - bbox[0]) / page_width,
                'height': (bbox[3] - bbox[1]) / page_width,
            },
            'word': next((word for word in wordlist if prefix and word['word'].startswith(prefix)), None)
        }
    return mapper
