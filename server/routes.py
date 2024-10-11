from fastapi import APIRouter, HTTPException
from pdf_parser import process_document

router = APIRouter()

# Define your sources here
sources = ['https://ibari.blob.core.windows.net/learn-german/A1_SD1_Wortliste_02.pdf',
           'https://ibari.blob.core.windows.net/learn-german/Goethe-Zertifikat_A2_Wortliste.pdf',
           'https://ibari.blob.core.windows.net/learn-german/Goethe-Zertifikat_B1_Wortliste.pdf']


@router.get("/api/source/{source_index}/page/{page_number}")
async def get_page(source_index: int, page_number: int):
    try:
        document_path = sources[source_index]
    except IndexError:
        raise HTTPException(
            status_code=404, detail="Source index out of range")

    result = process_document(document_path, page_number)
    return result
