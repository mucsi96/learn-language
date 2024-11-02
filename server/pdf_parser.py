from fastapi import HTTPException
import fitz
from blob_storage import fetch_blob


def process_document(source: str, page_number: int) -> dict:
    try:
        (blob_name, blob_data) = fetch_blob(source)
        document = fitz.open(blob_name, blob_data)
        page = document[page_number - 1]
    except IndexError:
        raise HTTPException(status_code=404, detail="Page number out of range")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    spans = []
    for block in page.get_textpage().extractDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                spans.append(span)

    return {
        "spans": list(map(map_bbox(page.rect.width), spans)),
        "image": page.get_pixmap(matrix=fitz.Matrix(2, 2)),
    }
    
def map_bbox(page_width: float):
    def mapper(item: dict) -> dict:
        bbox = item['bbox']
        return {
            **item,
            'bbox': {
                'x': bbox[0] / page_width,
                'y': bbox[1] / page_width,
                'width': (bbox[2] - bbox[0]) / page_width,
                'height': (bbox[3] - bbox[1]) / page_width,
            },
        }
    return mapper