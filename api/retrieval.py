from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from core.schemas import SearchQuery
from core.security import rate_limiter
from services.llm_chain import generate_rag_response
from services.vector_store import search_documents

router = APIRouter(prefix="/api", tags=["retrieval"])


@router.post("/search")
async def search(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
) -> JSONResponse:
    try:
        chunks = await search_documents(payload.query, payload.top_k)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return JSONResponse(content={"query": payload.query, "results": chunks})


@router.post("/chat")
async def chat(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
) -> JSONResponse:
    try:
        chunks = await search_documents(payload.query, payload.top_k)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    answer = await generate_rag_response(
        query=payload.query,
        retrieved_chunks=chunks,
        session_id=payload.session_id,
    )

    return JSONResponse(content={"answer": answer, "sources": chunks})
