import io
from typing import List

from langchain_core.documents import Document

from core.parsers import parse_document
from core.chunker import chunk_documents


async def ingest_document(
    file_bytes: bytes,
    filename: str,
    s3_key: str,
) -> List[Document]:
    """Parse document from raw bytes and chunk it.

    No local file is written. The s3_key is embedded in every chunk's
    metadata so retrieval results can reference the canonical storage location.
    """
    file_like = io.BytesIO(file_bytes)
    pages = parse_document(file_like, filename, s3_key)

    if not pages:
        return []

    return chunk_documents(pages)
