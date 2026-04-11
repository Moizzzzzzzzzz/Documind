from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from core.security import rate_limiter
from services.ingestion import ingest_document
from services.vector_store import create_index

UPLOAD_DIR = Path("data/uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

router = APIRouter(prefix="/api", tags=["ingestion"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    _: None = Depends(rate_limiter),
) -> JSONResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    dest_path = UPLOAD_DIR / file.filename
    # Phase 2: reads entire file into memory; stream in chunks for very large files in future
    content = await file.read()
    async with aiofiles.open(dest_path, "wb") as out_file:
        await out_file.write(content)

    try:
        chunks = await ingest_document(dest_path, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not chunks:
        raise HTTPException(status_code=422, detail=f"No content could be extracted from '{file.filename}'.")

    try:
        await create_index(chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector index error: {e}")

    return JSONResponse(content={
        "filename": file.filename,
        "chunk_count": len(chunks),
        "message": f"Successfully ingested '{file.filename}' into {len(chunks)} chunks and updated the vector index.",
    })
