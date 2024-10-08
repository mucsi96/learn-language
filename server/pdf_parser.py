from fastapi import HTTPException
import fitz
from pdf_utils import extract_style, map_bbox, merge_bboxes, split_span
from fitz import Page

def process_document(source: str, page_number: int) -> dict:
    try:
        document = fitz.open(source)
        page = document[page_number]
    except IndexError:
        raise HTTPException(status_code=404, detail="Page number out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    spans = extract_spans(page)

    styles = calculate_styles(spans)
    styles_percentage = calculate_styles_percentage(styles, len(spans))

    columns = determine_columns(spans, styles_percentage)

    words = find_related_words(columns)

    return {
        "spans": list(map(map_bbox(page.rect.width), spans)),
        "styles": styles,
        "stylesPercentage": styles_percentage,
        "columns": list(map(map_bbox(page.rect.width), columns)),
        "words": list(map(map_bbox(page.rect.width), words)),
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

def calculate_styles(spans: list) -> dict:
    styles = {}
    for span in spans:
        style = extract_style(span)
        styles[style] = styles.get(style, 0) + 1
    return styles

def calculate_styles_percentage(styles: dict, total_spans: int) -> dict:
    return {style: (100 * count) / total_spans for style, count in styles.items()}

def determine_columns(spans: list, styles_percentage: dict) -> list:
    columns = []
    for span in spans:
        bbox = span['bbox']
        span['excluded'] = styles_percentage[extract_style(span)] < 10 or not span['text'].strip()

        if span['excluded']:
            continue

        column_found = False
        for column in columns:
            if not (bbox[2] < column['bbox'][0] or bbox[0] > column['bbox'][2]):
                column['spans'].append(span)
                column['bbox'] = merge_bboxes(column['bbox'], bbox)
                column_found = True
                break

        if not column_found:
            columns.append({'spans': [span], 'bbox': bbox})

    for column in columns:
        total_words = sum(len(span['text'].split()) for span in column['spans'])
        avg_words_per_span = total_words / len(column['spans'])
        column['avgWordsPerSpan'] = avg_words_per_span
        column['type'] = 'example_sentence' if avg_words_per_span > 3 else 'word'

    return columns

def find_related_words(columns: list) -> list:
    words = []
    for column in columns:
        if column['type'] == 'example_sentence':
            for span in column['spans']:
                span_bbox = span['bbox']
                related_word = None
                for word_column in columns:
                    if word_column['type'] == 'word':
                        for word_span in word_column['spans']:
                            word_bbox = word_span['bbox']
                            if word_bbox[2] < span_bbox[0] and word_bbox[1] <= span_bbox[3]:
                                if related_word is None or word_bbox[1] > related_word['bbox'][1]:
                                    related_word = word_span
                if related_word:
                    if related_word['text'] not in [word['text'] for word in words]:
                        words.append({
                            'text': related_word['text'],
                            'exampleSentences': [span['text']],
                            'bbox': merge_bboxes(related_word['bbox'], span_bbox),
                        })
                    else:
                        for word in words:
                            if word['text'] == related_word['text']:
                                word['exampleSentences'].append(span['text'])
                                word['bbox'] = merge_bboxes(word['bbox'], span_bbox)
    return words
