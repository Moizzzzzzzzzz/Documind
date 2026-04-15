import asyncio
import os
import uuid
from pathlib import Path

import boto3
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from core.security import rate_limiter
from services.ingestion import ingest_document
from services.vector_store import create_index

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

router = APIRouter(prefix="/api", tags=["ingestion"])


def _s3_client():
    """Lazy boto3 client — reads env vars at call time, not at import time."""
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


async def _upload_to_s3(content: bytes, s3_key: str) -> None:
    bucket = os.getenv("S3_BUCKET", "documind-uploads")
    await asyncio.to_thread(
        _s3_client().put_object,
        Bucket=bucket,
        Key=s3_key,
        Body=content,
    )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session_id: str = Form(...),
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

    content = await file.read()
    s3_key = f"uploads/{uuid.uuid4()}{suffix}"

    # Parse first — if the document is unreadable, we don't pollute S3.
    try:
        chunks, page_count = await ingest_document(content, file.filename, s3_key)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail=f"No content could be extracted from '{file.filename}'.",
        )

    # Upload to object storage only after successful parse.
    try:
        await _upload_to_s3(content, s3_key)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {e}")

    # Upsert into the session-scoped namespace so vectors from other sessions
    # never contaminate this conversation's search results.
    try:
        await create_index(chunks, namespace=session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector index error: {e}")

    return JSONResponse(content={
        "filename": file.filename,
        "s3_key": s3_key,
        "chunk_count": len(chunks),
        "page_count": page_count,
        "session_id": session_id,
        "message": (
            f"Successfully ingested '{file.filename}' into {len(chunks)} chunks "
            "and updated the vector index."
        ),
    })
