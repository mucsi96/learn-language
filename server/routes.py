from fastapi import APIRouter, HTTPException, Request, Depends
from blob_storage import upload_blob, blob_exists, generate_sas_token
from services.speech import generate_speech
from services.images import generate_image
from services.pdf_parser import get_area_words, process_document
from services.translate import translate
from models import ImageSource, SpeechSource, Word, CardCreate
from auth import is_card_deck_writer, is_card_deck_reader
from services.word_type import detect_word_type
from database import Card, get_db

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


@router.get("/api/sources", dependencies=[is_card_deck_writer])
async def get_sources():
    return [{k: v for k, v in source.items() if k != 'blob_url'} for source in sources]


@router.get("/api/source/{source_id}/page/{page_number}", dependencies=[is_card_deck_writer])
async def get_page(source_id: str, page_number: int, db=Depends(get_db)):
    try:
        source = next((src for src in sources if src['id'] == source_id), None)
        if source is None:
            raise HTTPException(status_code=404, detail="Source not found")
    except IndexError:
        raise HTTPException(
            status_code=404, detail="Source index out of range")

    result = process_document(source['blob_url'], page_number)
    ids = [word['id'] for word in result['spans']]
    cards = db.query(Card).filter(Card.id.in_(ids)).all()
    result['spans'] = list(map(lambda span: {
        **span,
        **({'exists': True} if any(card.id == span['id'] for card in cards) else {})
    }, result['spans']))
    result['number'] = page_number
    result['sourceId'] = source_id
    result['sourceName'] = source['name']
    return result


@router.get("/api/source/{source_id}/page/{page_number}/words", dependencies=[is_card_deck_writer])
async def get_words(source_id: str, page_number: int, request: Request, db=Depends(get_db)):
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

    area_words = get_area_words(source['blob_url'], page_number, x, y, width, height)
    ids = [word['id'] for word in area_words['words']]
    cards = db.query(Card).filter(Card.id.in_(ids)).all()
    area_words['words'] = list(map(lambda word: {
        **word,
        **({'exists': True} if any(card.id == word['id'] for card in cards) else {})
    }, area_words['words']))
    return area_words


@router.post("/api/translate/{language_code}", dependencies=[is_card_deck_writer])
async def get_translation(word: Word, language_code: str):
    return translate(word, language_code)


@router.post("/api/image", dependencies=[is_card_deck_writer])
async def get_image(imageSource: ImageSource):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{
        imageSource.id}-{imageSource.index}.png"

    if not imageSource.override and blob_exists(blob_url):
        return {
            'url': f"{blob_url}?{generate_sas_token(blob_url=blob_url)}"
        }

    data = generate_image(imageSource.input)
    upload_blob(data, blob_url)
    return {
        'url': f"{blob_url}?{generate_sas_token(blob_url=blob_url)}"
    }


@router.post("/api/speech", dependencies=[is_card_deck_writer])
async def get_speech(speechSource: SpeechSource):
    blob_url = f"https://ibari.blob.core.windows.net/learn-german/{
        speechSource.id}-{speechSource.language}-{speechSource.index}.mp3"

    if not speechSource.override and blob_exists(blob_url):
        return {
            'url': f"{blob_url}?{generate_sas_token(blob_url=blob_url)}"
        }

    data = generate_speech(speechSource.input)
    upload_blob(data, blob_url)
    return {
        'url': f"{blob_url}?{generate_sas_token(blob_url=blob_url)}"
    }


@router.post("/api/word-type", dependencies=[is_card_deck_writer])
async def get_word_type(word: Word):
    return detect_word_type(word)


@router.get("/api/card/{card_id}", dependencies=[is_card_deck_reader])
async def get_card(card_id: str, db=Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return card.data

@router.post("/api/card", dependencies=[is_card_deck_writer])
async def create_card(card: CardCreate, db=Depends(get_db)):
    db.add(Card(id=card.id, data=card.model_dump()))
    db.commit()
    return {}
