from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import fitz

load_dotenv()
app = FastAPI()


sources = ['../sources/A1_SD1_Wortliste_02.pdf']


def extract_style(span):
    return f"font: {span['font']} | size: {span['size']} | color: {span['color']}"


@app.get("/api/sources/{source_index}/page/{page_number}")
def root(source_index: int, page_number: int):
    try:
        document = fitz.open(sources[source_index])
    except IndexError:
        raise HTTPException(status_code=404, detail="Source index out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        page = document[page_number]
    except IndexError:
        raise HTTPException(status_code=404, detail="Page number out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    spans = []

    for block in page.get_textpage().extractDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                spans.append(span)

    # Calculate the frequency of each style
    styles = {}
    for span in spans:
        style = extract_style(span)
        if style in styles:
            styles[style] += 1
        else:
            styles[style] = 1

    # Calculate the percentage of each style
    styles_percentage = {style: (100 * count) / len(spans)
                         for style, count in styles.items()}

    # Apply logic to determine border and background color
    # Determine columns based on spans and their bounding boxes (bboxes)
    columns = []

    for span in spans:
        bbox = span['bbox']
        span['excluded'] = styles_percentage[extract_style(
            span)] < 10 or not span['text'].strip()

        if span['excluded']:
            continue

        # Check if the span belongs to an existing column
        column_found = False
        for column in columns:
            # Check if the span overlaps with the existing column
            if not (bbox[2] < column['bbox'][0] or bbox[0] > column['bbox'][2]):
                column['spans'].append(span)
                column['bbox'] = [
                    min(column['bbox'][0], bbox[0]),
                    min(column['bbox'][1], bbox[1]),
                    max(column['bbox'][2], bbox[2]),
                    max(column['bbox'][3], bbox[3])
                ]
                column_found = True
                break

        # If no existing column is found, create a new column
        if not column_found:
            columns.append({
                'spans': [span],
                'bbox': bbox
            })

    # Determine if a column represents a word or an example sentence
    for column in columns:
        total_words = sum(len(span['text'].split())
                          for span in column['spans'])
        avg_words_per_span = total_words / len(column['spans'])
        column['avg_words_per_span'] = avg_words_per_span
        column['type'] = 'example_sentence' if avg_words_per_span > 3 else 'word'

    # Add column information to spans
    for column_index, column in enumerate(columns):
        for span in column['spans']:
            span['column'] = column_index

    # Find related words for example sentences
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
                            # Check if the word is to the left and on the same row or above
                            if word_bbox[2] < span_bbox[0] and word_bbox[1] <= span_bbox[3]:
                                if related_word is None or word_bbox[1] > related_word['bbox'][1]:
                                    related_word = word_span
                if related_word:
                    if related_word['text'] not in [word['text'] for word in words]:
                        words.append({
                            'text': related_word['text'],
                            'example_sentences': [span['text']],
                            'bbox': [
                                min(related_word['bbox']
                                    [0], span_bbox[0]),
                                min(related_word['bbox']
                                    [1], span_bbox[1]),
                                max(related_word['bbox']
                                    [2], span_bbox[2]),
                                max(related_word['bbox']
                                    [3], span_bbox[3])
                            ]
                        })
                    else:
                        for word in words:
                            if word['text'] == related_word['text']:
                                word['example_sentences'].append(
                                    span['text'])
                                word['bbox'] = [
                                    min(word['bbox'][0],
                                        span_bbox[0]),
                                    min(word['bbox'][1],
                                        span_bbox[1]),
                                    max(word['bbox'][2],
                                        span_bbox[2]),
                                    max(word['bbox'][3],
                                        span_bbox[3])
                                ]

    # Map each span's bbox to an object with x, y, width, and height using map function
    def map_bbox(span):
        bbox = span['bbox']
        span['bbox'] = {
            'x': bbox[0],
            'y': bbox[1],
            'width': bbox[2] - bbox[0],
            'height': bbox[3] - bbox[1]
        }
        return span

    return {
        "spans": list(map(map_bbox, spans)),
        "styles": styles,
        "stylesPercentage": styles_percentage,
        "columns": columns,
        "words": words
    }


app.mount("/", StaticFiles(directory="../client", html=True), name="static")
