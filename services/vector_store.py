import asyncio
import os
from typing import List

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# ---------------------------------------------------------------------------
# Embedding model — loaded once at module import, cached locally by
# sentence-transformers. Dimension must match the Pinecone index (384).
# ---------------------------------------------------------------------------
_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_DIMENSION = 384
_METRIC = "cosine"

_embeddings = HuggingFaceEmbeddings(model_name=_EMBEDDING_MODEL)


# ---------------------------------------------------------------------------
# Pinecone client & index — lazy-initialised so missing env vars during
# unit tests do not crash the process at import time.
# ---------------------------------------------------------------------------
_pc: Pinecone | None = None
_pinecone_index = None  # pinecone.Index object, reused across requests


def _get_pinecone_index():
    """Return a live Pinecone Index, creating the serverless index if needed.

    Called inside asyncio.to_thread so blocking network I/O never stalls the
    event loop. The resolved index object is cached in module state and reused
    for every subsequent call.
    """
    global _pc, _pinecone_index

    if _pinecone_index is not None:
        return _pinecone_index

    api_key = os.environ["PINECONE_API_KEY"]
    index_name = os.getenv("PINECONE_INDEX_NAME", "documind")

    _pc = Pinecone(api_key=api_key)

    existing = [i.name for i in _pc.list_indexes()]
    if index_name not in existing:
        print(f"[VS] Pinecone index '{index_name}' not found — creating (dim={_DIMENSION}, metric={_METRIC}).")
        _pc.create_index(
            name=index_name,
            dimension=_DIMENSION,
            metric=_METRIC,
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            timeout=-1,  # block until the index reports ready
        )
        print(f"[VS] Index '{index_name}' is ready.")
    else:
        print(f"[VS] Using existing Pinecone index '{index_name}'.")

    _pinecone_index = _pc.Index(index_name)
    return _pinecone_index


def _sync_upsert(chunks: List[Document], namespace: str) -> int:
    """Embed *chunks* and upsert into Pinecone under *namespace*.

    All existing vectors in the namespace are deleted first so that
    re-uploading a document never produces duplicate chunks.
    """
    index = _get_pinecone_index()

    # Only delete if the namespace already exists — calling delete on a
    # non-existent namespace raises a Pinecone 404 "Namespace not found".
    stats = index.describe_index_stats()
    existing_namespaces = getattr(stats, "namespaces", {}) or {}
    if namespace in existing_namespaces:
        print(f"[VS] Deleting all vectors in namespace '{namespace}' before upsert.")
        index.delete(delete_all=True, namespace=namespace)
    else:
        print(f"[VS] Namespace '{namespace}' does not exist yet — skipping delete.")

    store = PineconeVectorStore(index=index, embedding=_embeddings, namespace=namespace)
    store.add_documents(chunks)

    # Sanity-check: print live index stats after every upsert.
    # describe_index_stats() returns a protobuf-style object in Pinecone v7;
    # access total_vector_count as an attribute, not a dict key.
    stats = index.describe_index_stats()
    total = getattr(stats, "total_vector_count", "?")
    print(f"[VS] Upserted {len(chunks)} chunks into namespace '{namespace}'. Pinecone total vectors: {total}")
    return len(chunks)


def _sync_search(query: str, namespace: str, top_k: int = 4) -> list[dict]:
    """Check namespace existence first, then run similarity search.

    Pre-checking via describe_index_stats() avoids the langchain-pinecone
    custom 404 exception that is not reliably catchable as a plain Exception.
    """
    try:
        index = _get_pinecone_index()

        # Guard: check namespace exists and has vectors before searching.
        stats = index.describe_index_stats()
        namespaces = getattr(stats, "namespaces", {}) or {}

        if namespace not in namespaces:
            print(f"[VS] Namespace '{namespace}' does not exist — returning []")
            return []

        ns_stats = namespaces[namespace]
        # DescribeIndexStatsResponse namespace entries expose vector_count as an
        # attribute in Pinecone SDK v3+; fall back to dict-style for older SDKs.
        vector_count = getattr(ns_stats, "vector_count", 0)
        if vector_count is None:
            vector_count = 0
        if vector_count == 0:
            print(f"[VS] Namespace '{namespace}' is empty — returning []")
            return []

        # Only search if namespace exists and has vectors.
        store = PineconeVectorStore(
            index=index,
            embedding=_embeddings,
            namespace=namespace,
        )
        results: List[Document] = store.similarity_search(query, k=top_k)

        print(f"[VS] Query: {query!r} (namespace={namespace!r}) — retrieved {len(results)} chunks")
        for i, doc in enumerate(results, 1):
            meta = doc.metadata
            print(
                f"[VS]   [{i}] source={meta.get('source_file', 'unknown')!r} "
                f"page={meta.get('page_number', 'N/A')} "
                f"s3_key={meta.get('s3_key', 'N/A')!r} "
                f"preview={doc.page_content[:80]!r}"
            )

        return [{"content": doc.page_content, "metadata": doc.metadata} for doc in results]

    except Exception as e:
        print(f"[VS] Search error for namespace '{namespace}': {e}")
        return []


# ---------------------------------------------------------------------------
# Public interface — signatures are identical to the old FAISS implementation
# so no callers (api/ingest.py, api/retrieval.py) need to change.
# ---------------------------------------------------------------------------

async def create_index(chunks: List[Document], namespace: str) -> None:
    """Embed *chunks* and upsert them into a session-scoped Pinecone namespace.

    The shared index is created automatically on first call.  All existing
    vectors in *namespace* are deleted before the new chunks are upserted,
    so re-uploading a document never produces duplicate results.

    Parameters
    ----------
    chunks:
        Non-empty list of ``Document`` objects produced by the ingestion pipeline.
    namespace:
        Pinecone namespace that isolates this session's vectors.  Pass the
        session_id from the API layer so each conversation is fully isolated.
    """
    if not chunks:
        raise ValueError("Cannot index an empty chunk list.")
    await asyncio.to_thread(_sync_upsert, chunks, namespace)


async def search_documents(query: str, namespace: str, top_k: int = 4) -> list[dict]:
    """Return the top-k chunks most similar to *query* within *namespace*.

    Parameters
    ----------
    query:
        User question / search string.
    namespace:
        Pinecone namespace to search — must be the same session_id used
        during ``create_index`` so results are scoped to this session only.
    top_k:
        Maximum number of chunks to return.

    Raises ``ValueError`` if PINECONE_API_KEY is not set.
    """
    if not os.getenv("PINECONE_API_KEY"):
        raise ValueError("PINECONE_API_KEY is not configured.")
    return await asyncio.to_thread(_sync_search, query, namespace, top_k)
