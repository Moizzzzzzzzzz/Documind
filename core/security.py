import os
import time
import uuid

import redis
from fastapi import HTTPException, Request

RATE_LIMIT: int = 100      # max requests per window
WINDOW_SECONDS: int = 3600  # rolling 1-hour window

_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    """Lazy Redis client — same REDIS_URL used by memory.py."""
    global _client
    if _client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _client = redis.from_url(url, decode_responses=True)
    return _client


def rate_limiter(request: Request) -> None:
    """FastAPI dependency: 100 requests/hour per client IP, Redis-backed.

    Algorithm — sorted-set sliding window:
      1. ZREMRANGEBYSCORE  — evict timestamps older than (now - 3600 s)
      2. ZADD              — record this request (UUID member, unix-ts score)
      3. ZCARD             — count requests still inside the window
      4. EXPIRE            — auto-delete the key after one idle hour

    All four commands run in a single pipeline so the check-and-record is
    atomic from Redis's perspective, preventing the TOCTOU race that would
    exist if we checked the count before adding the new entry.

    Fail-open: a Redis outage logs an error and lets the request through
    rather than taking down the entire API.
    """
    client_ip: str = request.client.host if request.client else "unknown"
    now: float = time.time()
    key: str = f"ratelimit:{client_ip}"

    try:
        r = _get_client()
        with r.pipeline() as pipe:
            pipe.zremrangebyscore(key, 0, now - WINDOW_SECONDS)
            pipe.zadd(key, {str(uuid.uuid4()): now})
            pipe.zcard(key)
            pipe.expire(key, WINDOW_SECONDS)
            _, _, count, _ = pipe.execute()
    except redis.RedisError as exc:
        print(f"[SECURITY] Redis error, failing open for {client_ip!r}: {exc}")
        return

    if count > RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
        )
