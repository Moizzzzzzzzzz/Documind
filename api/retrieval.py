from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from core.schemas import SearchQuery
from core.security import rate_limiter
from services.agent_graph import run_agent
from services.vector_store import search_documents

router = APIRouter(prefix="/api", tags=["retrieval"])


@router.post("/search")
async def search(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
) -> JSONResponse:
    try:
        chunks = await search_documents(
            payload.query,
            namespace=payload.session_id,
            top_k=payload.top_k,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return JSONResponse(content={"query": payload.query, "results": chunks})


@router.post("/chat")
async def chat(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
) -> JSONResponse:
    try:
        result = await run_agent(payload.query, payload.session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return JSONResponse(content=result)
