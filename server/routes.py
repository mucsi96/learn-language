from fastapi import APIRouter, HTTPException, Request, Response
from blob_storage import upload_blob, fetch_blob, blob_exists
from services.speech import generate_speech
from services.images import generate_image
from services.pdf_parser import get_area_words, process_document
from services.translate import translate
from models import ImageSource, SpeechSource, Word

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
    result['number'] = page_number
    result['sourceId'] = source_id
    result['sourceName'] = source['name']
    return result


@router.get("/api/source/{source_id}/page/{page_number}/words")
async def get_words(source_id: str, page_number: int, request: Request):
    source = next((src for src in sources if src['id'] == source_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")

    x = request.query_params.get('x')
    y = request.query_params.get('y')
    width = request.query_params.get('width')
    height = request.query_params.get('height')

    if not all([x, y, width, height]):
        raise HTTPException(
            status_code=400, detail="Missing rectangle coordinates")

    try:
        x, y, width, height = map(float, [x, y, width, height])
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid rectangle coordinates")

    return get_area_words(source['blob_url'], page_number, x, y, width, height)


@router.post("/api/translate/{language_code}")
async def get_translation(word: Word, language_code: str):
    return translate(word, language_code)


@router.post("/api/image")
async def get_image(imageSource: ImageSource):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{
        imageSource.id}-{imageSource.index}.png"

    if not imageSource.override and blob_exists(blob_url):
        return Response(status_code=304)

    data = generate_image(imageSource.input)
    upload_blob(data, blob_url)
    return Response(status_code=204)


@router.post("/api/speech")
async def get_speech(speechSource: SpeechSource):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{
        speechSource.id}-{speechSource.language}-{speechSource.index}.mp3"

    if not speechSource.override and blob_exists(blob_url):
        return Response(status_code=304)

    data = generate_speech(speechSource.input)
    upload_blob(data, blob_url)
    return Response(status_code=204)


@router.get("/api/image/{file_name}")
async def proxy_image_request(file_name: str):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{file_name}"
    blob_data = fetch_blob(blob_url)
    return Response(blob_data, media_type="image/png")


@router.get("/api/speech/{file_name}")
async def proxy_speech_request(file_name: str):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{file_name}"
    blob_data = fetch_blob(blob_url)
    return Response(blob_data, media_type="audio/mpeg")
