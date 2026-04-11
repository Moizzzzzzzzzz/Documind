from pathlib import Path
from typing import List

from langchain_core.documents import Document

from core.parsers import parse_document
from core.chunker import chunk_documents


async def ingest_document(file_path: Path, filename: str) -> List[Document]:
    # Phase 3+: wrap parse_document in asyncio.to_thread() if large files become a bottleneck
    pages = parse_document(file_path, filename)

    if not pages:
        return []

    return chunk_documents(pages)
