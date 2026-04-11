import asyncio
from pathlib import Path
from typing import List, Optional

from langchain_core.documents import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

VECTOR_STORE_PATH = "data/vector_store"
_FAISS_FILE = "index.faiss"

# Initialized once at module load; model is downloaded on first use and cached locally.
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# ---------------------------------------------------------------------------
# Module-level in-memory index — survives across requests within one process.
# This prevents the overwrite bug that occurs when each upload cold-loads the
# FAISS index from disk independently, races with the previous save, and then
# overwrites the full index file with only the newest document's embeddings.
# ---------------------------------------------------------------------------
_index: Optional[FAISS] = None


def _load_from_disk() -> Optional[FAISS]:
    """Load the persisted FAISS index from disk. Returns None if none exists."""
    index_path = Path(VECTOR_STORE_PATH)
    if not index_path.exists() or not (index_path / _FAISS_FILE).exists():
        return None
    return FAISS.load_local(
        VECTOR_STORE_PATH,
        embeddings,
        allow_dangerous_deserialization=True,
    )


def _sync_upsert_index(chunks: List[Document]) -> None:
    """Add *chunks* to the global in-memory index, creating it if necessary,
    then persist the updated index to disk.

    MUST run in a single dedicated thread (via asyncio.to_thread) because the
    native FAISS C++ objects are not thread-safe.
    """
    global _index

    Path(VECTOR_STORE_PATH).mkdir(parents=True, exist_ok=True)

    if _index is None:
        # Try to warm the in-memory index from a previous run's disk snapshot.
        _index = _load_from_disk()

    if _index is None:
        # First document ever — initialise a brand-new index.
        _index = FAISS.from_documents(chunks, embeddings)
    else:
        # Subsequent document — APPEND to the existing in-memory index.
        # Never reassign _index here; that would lose all prior embeddings.
        _index.add_documents(chunks)

    # Persist after every modification so restarts can resume from disk.
    _index.save_local(VECTOR_STORE_PATH)


async def create_index(chunks: List[Document]) -> None:
    """Embed *chunks* and merge them into the persistent FAISS index.

    If an index already exists (in memory or on disk) the new chunks are
    appended with add_documents() — the existing index is never overwritten.
    """
    if not chunks:
        raise ValueError("Cannot create a vector index from an empty chunk list.")

    await asyncio.to_thread(_sync_upsert_index, chunks)


def load_index() -> Optional[FAISS]:
    """Return the live in-memory index, falling back to disk on a cold start.

    Callers inside this module should prefer the module-level ``_index``
    directly; this function exists for any external code that needs a reference.
    """
    global _index
    if _index is None:
        _index = _load_from_disk()
    return _index


async def search_documents(query: str, top_k: int = 4) -> list[dict]:
    """Embed *query* and return the top-k most similar chunks.

    Searches the in-memory index so that documents uploaded earlier in the
    session are always visible, even before a disk round-trip completes.

    Raises ``ValueError`` when no documents have been ingested yet.
    """
    # Ensure the in-memory index is populated (handles server restarts).
    index = await asyncio.to_thread(load_index)

    if index is None:
        raise ValueError("No documents have been ingested yet.")

    results = await asyncio.to_thread(index.similarity_search, query, top_k)
    return [{"content": doc.page_content, "metadata": doc.metadata} for doc in results]
