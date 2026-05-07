import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from core.schemas import SearchQuery
from core.security import rate_limiter
from services.agent_graph import run_agent, stream_agent
from services.auth import verify_clerk_token
from services.vector_store import search_documents

router = APIRouter(prefix="/api", tags=["retrieval"])


@router.post("/search")
async def search(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
    user: dict = Depends(verify_clerk_token),
) -> JSONResponse:
    namespace = f"user_{user['sub']}"
    try:
        chunks = await search_documents(
            payload.query,
            namespace=namespace,
            top_k=payload.top_k,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return JSONResponse(content={"query": payload.query, "results": chunks})


@router.post("/chat")
async def chat(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
    user: dict = Depends(verify_clerk_token),
) -> JSONResponse:
    namespace = f"user_{user['sub']}"
    try:
        result = await run_agent(payload.query, namespace)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return JSONResponse(content=result)


@router.post("/chat-stream")
async def chat_stream(
    payload: SearchQuery,
    _: None = Depends(rate_limiter),
    user: dict = Depends(verify_clerk_token),
) -> StreamingResponse:
    namespace = f"user_{user['sub']}"

    async def event_stream():
        try:
            async for chunk in stream_agent(payload.query, namespace):
                yield chunk
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
