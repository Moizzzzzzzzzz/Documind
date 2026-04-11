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


def _sync_create_or_merge_index(chunks: List[Document]) -> None:
    """Run entirely in one thread: load existing index (if any), add new chunks,
    and persist.  Keeping all FAISS operations in a single thread avoids
    cross-thread mutation hazards with the native FAISS C++ objects.
    """
    Path(VECTOR_STORE_PATH).mkdir(parents=True, exist_ok=True)
    existing = load_index()
    if existing is not None:
        existing.add_documents(chunks)
        existing.save_local(VECTOR_STORE_PATH)
    else:
        vector_store = FAISS.from_documents(chunks, embeddings)
        vector_store.save_local(VECTOR_STORE_PATH)


async def create_index(chunks: List[Document]) -> None:
    """Embed *chunks* and persist the FAISS index to disk.

    If an index already exists the new chunks are merged into it so that
    documents uploaded in separate requests are all searchable together.
    The entire load-add-save sequence runs inside a single thread to prevent
    cross-thread mutation issues with the native FAISS C++ objects.
    """
    if not chunks:
        raise ValueError("Cannot create a vector index from an empty chunk list.")

    await asyncio.to_thread(_sync_create_or_merge_index, chunks)


def load_index() -> Optional[FAISS]:
    """Load the persisted FAISS index from disk.

    Returns ``None`` when no index has been created yet.
    """
    index_path = Path(VECTOR_STORE_PATH)
    if not index_path.exists() or not (index_path / _FAISS_FILE).exists():
        return None

    return FAISS.load_local(
        VECTOR_STORE_PATH,
        embeddings,
        allow_dangerous_deserialization=True,
    )


async def search_documents(query: str, top_k: int = 4) -> list[dict]:
    """Embed *query* and return the top-k most similar chunks from the index.

    Raises ``ValueError`` when no index exists yet.
    Each result is a plain dict so the caller has no LangChain dependency.
    """
    index_path = Path(VECTOR_STORE_PATH)
    if not index_path.exists() or not (index_path / _FAISS_FILE).exists():
        raise ValueError("No documents have been ingested yet.")

    index = await asyncio.to_thread(load_index)
    results = await asyncio.to_thread(index.similarity_search, query, top_k)

    return [{"content": doc.page_content, "metadata": doc.metadata} for doc in results]
