from fastapi import APIRouter, HTTPException
from pdf_parser import process_document
from ai_parser import parse

router = APIRouter()

sources = [
    {
        'id': 'goethe-a1',
        'name': 'Goethe A1',
        'startPage': 9,
        'blob_url': 'https://ibari.blob.core.windows.net/learn-german/A1_SD1_Wortliste_02.pdf'
    },
    {
        'id': 'goethe-a2',
        'name': 'Goethe A2',
        'startPage': 8,
        'blob_url': 'https://ibari.blob.core.windows.net/learn-german/Goethe-Zertifikat_A2_Wortliste.pdf'
    },
    {
        'id': 'goethe-b1',
        'name': 'Goethe B1',
        'startPage': 16,
        'blob_url': 'https://ibari.blob.core.windows.net/learn-german/Goethe-Zertifikat_B1_Wortliste.pdf'
    },
]


@router.get("/api/sources")
async def get_sources():
    return [{k: v for k, v in source.items() if k != 'blob_url'} for source in sources]


@router.get("/api/source/{source_id}/page/{page_number}")
async def get_page(source_id: str, page_number: int):
    try:
        source = next((src for src in sources if src['id'] == source_id), None)
        if source is None:
            raise HTTPException(status_code=404, detail="Source not found")
    except IndexError:
        raise HTTPException(
            status_code=404, detail="Source index out of range")

    result = process_document(source['blob_url'], page_number)
    result['sourceName'] = source['name']
    result['ai_wordlist'] = parse(result['image'].tobytes())
    return {k: v for k, v in result.items() if k != 'image'}
