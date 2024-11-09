import re
from typing import Dict, List
from fastapi import HTTPException
import fitz
from fitz import Page
from blob_storage import fetch_blob
from ai_parser import parse
import os
import tempfile


def get_document_from_cache(blob_name: str) -> str:
    cache_dir = tempfile.gettempdir()
    cached_file_path = os.path.join(cache_dir, blob_name)
    if os.path.exists(cached_file_path):
        with open(cached_file_path, 'rb') as f:
            return f.read()
    else:
        return None


def cache_document(blob_name: str, blob_data: bytes) -> str:
    cache_dir = tempfile.gettempdir()
    cached_file_path = os.path.join(cache_dir, blob_name)
    with open(cached_file_path, 'wb') as f:
        f.write(blob_data)
    return cached_file_path


def get_page(source: str, page_number: int) -> Page:
    try:
        blob_name = os.path.basename(source)
        blob_data = get_document_from_cache(blob_name)
        if not blob_data:
            blob_data = fetch_blob(source)
            cache_document(blob_name, blob_data)
        document = fitz.open(blob_name, blob_data)
        return document[page_number - 1]
    except IndexError:
        raise HTTPException(status_code=404, detail="Page number out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def process_document(source: str, page_number: int) -> dict:
    page = get_page(source, page_number)

    return {
        'spans': list(map(map_span(page.rect.width), extract_spans(page))),
        'height': page.rect.height / page.rect.width,
    }


def get_area_words(source: str, page_number: int, x: float, y: float, width: float, height: float) -> dict:
    page = get_page(source, page_number)
    rect = fitz.Rect(x * page.rect.width, y * page.rect.width, (x + width) * page.rect.width, (y + height) * page.rect.width)
    pixel_map = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect)
    words = parse(pixel_map.tobytes())
    return {
        'words': words,
        'x': x,
        'y': y,
        'width': width,
        'height': height
    }


def extract_spans(page: Page) -> list:
    spans = []
    for block in page.get_textpage().extractRAWDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                spans.extend(split_span(span))
    return spans


def map_span(page_width: float):
    def mapper(item: dict) -> dict:
        bbox = item['bbox']
        search_term = re.split(r'\s?[,/(-]', item['text'])[0].strip()
        return {
            **item,
            'bbox': {
                'x': bbox[0] / page_width,
                'y': bbox[1] / page_width,
                'width': (bbox[2] - bbox[0]) / page_width,
                'height': (bbox[3] - bbox[1]) / page_width,
            },
            'searchTerm': search_term
        }
    return mapper


def split_span(span: Dict) -> List[Dict]:
    chars = span['chars']
    spans = []
    current_chars = []
    current_bbox = [span['bbox'][0], span['bbox']
                    [1], span['bbox'][0], span['bbox'][3]]
    for i, char in enumerate(chars):
        text = ''.join(c['c'] for c in current_chars).strip()
        if current_chars and len(current_chars) >= 2 and current_chars[-2]['c'] == ' ' and current_chars[-1]['c'] == ' ' and char['c'] != ' ' and text:
            # Split here
            spans.append({
                'text': text,
                'bbox': current_bbox,
                'bbox': get_bbox_of_chars(current_chars),
                'font': span['font'],
                'size': span['size'],
                'color': span['color']
            })
            current_chars = [char]
        else:
            current_chars.append(char)
    text = ''.join(c['c'] for c in current_chars).strip()
    if text:
        spans.append({
            'text': text,
            'bbox': get_bbox_of_chars(current_chars),
            'font': span['font'],
            'size': span['size'],
            'color': span['color']
        })
    return spans


def get_bbox_of_chars(chars: List[Dict]) -> List[float]:
    return [
        min(c['bbox'][0] for c in chars if c['c'] != ' '),
        min(c['bbox'][1] for c in chars if c['c'] != ' '),
        max(c['bbox'][2] for c in chars if c['c'] != ' '),
        max(c['bbox'][3] for c in chars if c['c'] != ' ')
    ]
