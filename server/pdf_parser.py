import re
from typing import Dict, List
from fastapi import HTTPException
import fitz
from fitz import Page
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

    return {
        'spans': list(map(map_span(page.rect.width, wordlist), extract_spans(page)))
    }


def extract_spans(page: Page) -> list:
    spans = []
    for block in page.get_textpage().extractRAWDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                span['text'] = ''.join(char['c'] for char in span['chars'])
                if '  ' in span['text'].strip():  # Detect multiple spaces
                    spans.extend(split_span(span))
                else:
                    spans.append(span)
    return spans


def map_span(page_width: float, wordlist: list):
    def mapper(item: dict) -> dict:
        bbox = item['bbox']
        search_term = re.split(r'[,/(-]', item['text'])[0].strip()
        matches = list((word for word in wordlist if len(search_term) > 1 and word['word'].startswith(
            search_term)))
        return {
            **item,
            'bbox': {
                'x': bbox[0] / page_width,
                'y': bbox[1] / page_width,
                'width': (bbox[2] - bbox[0]) / page_width,
                'height': (bbox[3] - bbox[1]) / page_width,
            },
            'matches': matches
        }
    return mapper


def split_span(span: Dict) -> List[Dict]:
    chars = span['chars']
    spans = []
    current_chars = []
    current_bbox = [span['bbox'][0], span['bbox']
                    [1], span['bbox'][0], span['bbox'][3]]
    for i, char in enumerate(chars):
        if current_chars and current_chars[-1]['c'] == ' ' and char['c'] == ' ':
            # Split here
            spans.append({
                'text': ''.join(c['c'] for c in current_chars).strip(),
                'bbox': current_bbox,
                'font': span['font'],
                'size': span['size'],
                'color': span['color']
            })
            current_chars = []
            if i + 1 < len(chars):
                current_bbox = [chars[i + 1]['bbox'][0], span['bbox']
                                [1], chars[i + 1]['bbox'][0], span['bbox'][3]]
        else:
            current_chars.append(char)
            current_bbox[2] = char['bbox'][2]
    if current_chars:
        spans.append({
            'text': ''.join(c['c'] for c in current_chars).strip(),
            'bbox': current_bbox,
            'font': span['font'],
            'size': span['size'],
            'color': span['color']
        })
    return spans
