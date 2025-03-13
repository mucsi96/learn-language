from fastapi import APIRouter, HTTPException, Request, Depends
from blob_storage import get_download_url, upload_blob, blob_exists
from services.speech import generate_speech
from services.images import generate_image
from services.pdf_parser import get_area_words, process_document
from services.translate import translate
from models import ImageSource, SpeechSource, Word, CardCreate
from auth import is_card_deck_writer, is_card_deck_reader
from services.word_type import detect_word_type
from database import Card, CardSource, get_db, Source
from sqlalchemy.orm import Session
import fsrs

router = APIRouter()


@router.get("/api/sources", dependencies=[is_card_deck_writer])
async def get_sources(db: Session = Depends(get_db)):
    sources = db.query(Source).order_by(Source.id).all()
    return list(map(lambda source: {
        'id': source.id,
        'name': source.name,
        'startPage': source.bookmarked_page or source.start_page,
    }, sources))


@router.get("/api/source/{source_id}/page/{page_number}", dependencies=[is_card_deck_writer])
async def get_page(source_id: str, page_number: int, db=Depends(get_db)):
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source is None:
            raise HTTPException(status_code=404, detail="Source not found")
    except IndexError:
        raise HTTPException(
            status_code=404, detail="Source index out of range")

    result = process_document('sources/' + source.file_name, page_number)
    ids = [word['id'] for word in result['spans']]
    cards = db.query(Card).filter(Card.id.in_(ids)).all()
    result['spans'] = list(map(lambda span: {
        **span,
        **({'exists': True} if any(card.id == span['id'] for card in cards) else {})
    }, result['spans']))
    result['number'] = page_number
    result['sourceId'] = source_id
    result['sourceName'] = source.name

    source.bookmarked_page = page_number
    db.commit()

    return result


@router.get("/api/source/{source_id}/page/{page_number}/words", dependencies=[is_card_deck_writer])
async def get_words(source_id: str, page_number: int, request: Request, db=Depends(get_db)):
    source = db.query(Source).filter(Source.id == source_id).first()
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

    area_words = get_area_words(
        source.file_name, page_number, x, y, width, height)
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


@router.post("/api/image/{source}", dependencies=[is_card_deck_writer])
async def get_image(source: str, imageSource: ImageSource):
    blob_name = f"images/{source}/{imageSource.id}-{imageSource.index}.png"

    if not imageSource.override and blob_exists(blob_name):
        return {
            'url': get_download_url(blob_name)
        }

    data = generate_image(imageSource.input)
    upload_blob(data, blob_name)
    return {
        'url': get_download_url(blob_name)
    }


@router.get("/api/image/{source}/{image_id}", dependencies=[is_card_deck_reader])
async def get_image(source: str, image_id: str):
    return {
        'url': get_download_url(f"images/{source}/{image_id}.png")
    }


@router.post("/api/speech/{source}", dependencies=[is_card_deck_writer])
async def get_speech(source: str, speechSource: SpeechSource):
    blob_name = f"speech/{source}/{speechSource.id}-{speechSource.language}-{speechSource.index}.mp3"

    if not speechSource.override and blob_exists(blob_name):
        return {
            'url': get_download_url(blob_name)
        }

    data = generate_speech(speechSource.input)
    upload_blob(data, blob_name)
    return {
        'url': get_download_url(blob_name)
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
    card = fsrs.Card()
    db.add(Card(id=card.id, data=card.model_dump(), **card.model_dump()))
    db.add(CardSource(card_id=card.id, source_id=card.sourceId,
           page_number=card.pageNumber))
    db.commit()
    return {}


@router.put("/api/card/{card_id}", dependencies=[is_card_deck_writer])
async def update_card(card_id: str, card: CardCreate, db=Depends(get_db)):
    existing_card = db.query(Card).filter(Card.id == card_id).first()
    if existing_card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    existing_card.data = card.model_dump()
    db.commit()
    return {"detail": "Card updated successfully"}


@router.delete("/api/card/{card_id}", dependencies=[is_card_deck_writer])
async def delete_card(card_id: str, db=Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    return {"detail": "Card deleted successfully"}
