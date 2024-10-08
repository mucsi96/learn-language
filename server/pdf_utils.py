from typing import List, Dict

def extract_style(span: Dict) -> str:
    return f"font: {span['font']} | size: {span['size']} | color: {span['color']}"

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

def split_span(span: Dict) -> List[Dict]:
    text = span['text']
    parts = text.split('  ')  # Split by multiple spaces
    spans = []
    current_x = span['bbox'][0]
    for part in parts:
        part_width = len(part) / len(text) * (span['bbox'][2] - span['bbox'][0])
        new_bbox = [current_x, span['bbox'][1], current_x + part_width, span['bbox'][3]]
        spans.append({
            'text': part,
            'bbox': new_bbox,
            'font': span['font'],
            'size': span['size'],
            'color': span['color']
        })
        current_x += part_width + (span['size'] * 0.5)  # Adjust for space width
    return spans

def process_spans(page) -> List[Dict]:
    spans = []
    for block in page.get_textpage().extractRAWDICT()['blocks']:
        for line in block['lines']:
            for span in line['spans']:
                span['text'] = ''.join(char_dict['c'] for char_dict in span['chars'])
                if '  ' in span['text'].strip():  # Detect multiple spaces
                    spans.extend(split_span(span))
                else:
                    spans.append(span)
    return spans

def calculate_styles(spans: List[Dict]) -> Dict:
    styles = {}
    for span in spans:
        style = extract_style(span)
        if style in styles:
            styles[style] += 1
        else:
            styles[style] = 1
    return styles