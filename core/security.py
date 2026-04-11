import time
from collections import defaultdict

from fastapi import HTTPException, Request

# in-memory store: ip -> list of request timestamps (sliding window)
_request_log: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT: int = 10        # max requests
WINDOW_SECONDS: int = 3600  # per hour (rolling window)


def rate_limiter(request: Request) -> None:
    """FastAPI dependency that enforces 10 requests/hour per client IP.

    Uses a sliding-window algorithm: only timestamps within the last 3600 s
    are counted, so the bucket replenishes gradually rather than resetting
    all at once on the hour boundary.
    """
    client_ip: str = request.client.host if request.client else "unknown"
    now: float = time.time()
    window_start: float = now - WINDOW_SECONDS

    # Drop timestamps that have aged out of the window.
    _request_log[client_ip] = [
        ts for ts in _request_log[client_ip] if ts > window_start
    ]

    if len(_request_log[client_ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
        )

    _request_log[client_ip].append(now)
