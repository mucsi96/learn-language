def extract_style(span: dict) -> str:
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

def split_span(span: dict) -> list:
    chars = span['chars']
    spans = []
    current_chars = []
    current_bbox = [span['bbox'][0], span['bbox'][1], span['bbox'][0], span['bbox'][3]]

    for i, char in enumerate(chars):
        if current_chars and current_chars[-1]['c'] == ' ' and char['c'] == ' ':
            spans.append({
                'text': ''.join(c['c'] for c in current_chars).strip(),
                'bbox': current_bbox,
                'font': span['font'],
                'size': span['size'],
                'color': span['color'],
            })
            current_chars = []
            if i + 1 < len(chars):
                current_bbox = [chars[i + 1]['bbox'][0], span['bbox'][1], chars[i + 1]['bbox'][0], span['bbox'][3]]
        else:
            current_chars.append(char)
            current_bbox[2] = char['bbox'][2]

    if current_chars:
        spans.append({
            'text': ''.join(c['c'] for c in current_chars).strip(),
            'bbox': current_bbox,
            'font': span['font'],
            'size': span['size'],
            'color': span['color'],
        })

    return spans
