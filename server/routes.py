from fastapi import APIRouter, HTTPException
from pdf_parser import process_document

router = APIRouter()

# Define your sources here
sources = ['../sources/A1_SD1_Wortliste_02.pdf']

@router.get("/api/source/{source_index}/page/{page_number}")
async def get_page(source_index: int, page_number: int):
    try:
        document_path = sources[source_index]
    except IndexError:
        raise HTTPException(status_code=404, detail="Source index out of range")

    result = process_document(document_path, page_number)
    return result
