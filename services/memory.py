import json
import os
from typing import Optional

import redis

_TTL_SECONDS = 86400  # 24 hours — reset on every write

_client: Optional[redis.Redis] = None


def _get_client() -> redis.Redis:
    """Lazy Redis client — constructed once from REDIS_URL, reused across calls.

    Deferred initialisation means a missing REDIS_URL during unit tests or
    local dev without Redis does not crash the process at import time.
    """
    global _client
    if _client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _client = redis.from_url(url, decode_responses=True)
    return _client


def get_chat_history(session_id: str) -> str:
    """Return conversation history for *session_id* as a formatted string.

    Each exchange is rendered as:
        Human: <query>
        AI: <response>

    Returns an empty string when no history exists yet so the prompt stays
    clean on the very first turn. Redis errors are logged and treated as
    empty history so a transient Redis outage does not break the LLM chain.
    """
    try:
        raw = _get_client().get(f"chat:{session_id}")
    except redis.RedisError as exc:
        print(f"[MEMORY] Redis read error for session {session_id!r}: {exc}")
        return ""

    if not raw:
        return ""

    exchanges: list[dict] = json.loads(raw)
    lines: list[str] = []
    for exchange in exchanges:
        lines.append(f"Human: {exchange['human']}")
        lines.append(f"AI: {exchange['ai']}")
    return "\n".join(lines)


def save_chat_history(
    session_id: str, human_query: str, ai_response: str
) -> None:
    """Append a new exchange to *session_id*'s history and reset the 24h TTL.

    The full history is stored as a JSON list under the key ``chat:{session_id}``.
    The TTL is refreshed on every write so active sessions never expire mid-conversation.
    Redis errors are logged but do not raise — a failed write degrades gracefully
    (history missing on next turn) rather than surfacing a 500 to the user.
    """
    key = f"chat:{session_id}"
    try:
        client = _get_client()
        raw = client.get(key)
        exchanges: list[dict] = json.loads(raw) if raw else []
        exchanges.append({"human": human_query, "ai": ai_response})
        client.setex(key, _TTL_SECONDS, json.dumps(exchanges))
    except redis.RedisError as exc:
        print(f"[MEMORY] Redis write error for session {session_id!r} (history not saved): {exc}")
