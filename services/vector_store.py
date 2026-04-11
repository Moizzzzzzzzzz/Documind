import asyncio
import threading
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

# Mutex that serialises all mutations and reads of _index so that a concurrent
# query cannot observe a partially-written index or a stale object reference.
_index_lock = threading.Lock()


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

    Runs in a single thread via asyncio.to_thread. The _index_lock ensures
    that concurrent uploads or queries never observe a half-written index.
    """
    global _index

    Path(VECTOR_STORE_PATH).mkdir(parents=True, exist_ok=True)

    with _index_lock:
        if _index is None:
            # Try to warm the in-memory index from a previous run's disk snapshot.
            _index = _load_from_disk()

        if _index is None:
            # First document ever — initialise a brand-new index.
            print(f"[VS DEBUG] Creating new FAISS index with {len(chunks)} chunks.")
            _index = FAISS.from_documents(chunks, embeddings)
        else:
            # Subsequent document — APPEND to the existing in-memory index.
            # add_documents mutates _index in-place; do NOT reassign _index.
            doc_count_before = _index.index.ntotal
            _index.add_documents(chunks)
            doc_count_after = _index.index.ntotal
            print(
                f"[VS DEBUG] Appended {len(chunks)} chunks to existing index. "
                f"Vectors: {doc_count_before} -> {doc_count_after}."
            )

        # Persist after every modification so restarts can resume from disk.
        _index.save_local(VECTOR_STORE_PATH)
        print(f"[VS DEBUG] Index saved. Total vectors in index: {_index.index.ntotal}")


async def create_index(chunks: List[Document]) -> None:
    """Embed *chunks* and merge them into the persistent FAISS index.

    If an index already exists (in memory or on disk) the new chunks are
    appended with add_documents() — the existing index is never overwritten.
    """
    if not chunks:
        raise ValueError("Cannot create a vector index from an empty chunk list.")

    await asyncio.to_thread(_sync_upsert_index, chunks)


def _sync_search(query: str, top_k: int) -> list[dict]:
    """Run similarity_search under the lock so the index cannot be mutated
    mid-search and so we always read the latest _index reference."""
    global _index

    with _index_lock:
        if _index is None:
            _index = _load_from_disk()

        if _index is None:
            raise ValueError("No documents have been ingested yet.")

        results = _index.similarity_search(query, top_k)

    sources = [doc.metadata.get("source_file", doc.metadata.get("source", "unknown")) for doc in results]
    print(f"[VS DEBUG] Query: {query!r}")
    print(f"[VS DEBUG] Retrieved {len(results)} chunks from sources: {sources}")
    for i, doc in enumerate(results, 1):
        meta = doc.metadata
        print(
            f"[VS DEBUG]   [{i}] source={meta.get('source_file', meta.get('source', 'unknown'))!r} "
            f"page={meta.get('page_number', meta.get('page', 'N/A'))} "
            f"content_preview={doc.page_content[:80]!r}"
        )

    return [{"content": doc.page_content, "metadata": doc.metadata} for doc in results]


async def search_documents(query: str, top_k: int = 4) -> list[dict]:
    """Embed *query* and return the top-k most similar chunks.

    Both the index lookup and the similarity search run inside a single
    _sync_search call (one asyncio.to_thread hop) so the _index reference
    cannot be swapped out between the two operations.

    Raises ``ValueError`` when no documents have been ingested yet.
    """
    return await asyncio.to_thread(_sync_search, query, top_k)


def load_index() -> Optional[FAISS]:
    """Return the live in-memory index, falling back to disk on a cold start.

    External callers that need a direct reference should use this function.
    For searches prefer search_documents(), which is lock-safe.
    """
    global _index
    with _index_lock:
        if _index is None:
            _index = _load_from_disk()
        return _index
