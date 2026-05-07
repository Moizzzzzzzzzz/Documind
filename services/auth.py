import os
from functools import lru_cache

import httpx
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()
CLERK_ISSUER = os.getenv("CLERK_ISSUER")


@lru_cache(maxsize=1)
def get_jwks() -> dict:
    """Fetch and cache Clerk JWKS — refreshes on process restart."""
    jwks_url = f"{CLERK_ISSUER}/.well-known/jwks.json"
    response = httpx.get(jwks_url, timeout=10)
    response.raise_for_status()
    return response.json()


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Verify a Clerk-issued RS256 JWT and return its payload.

    payload["sub"] is the stable Clerk userId — use it as the user identity.
    """
    token = credentials.credentials
    try:
        jwks = get_jwks()
        public_keys = {
            key_data["kid"]: jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
            for key_data in jwks["keys"]
        }

        header = jwt.get_unverified_header(token)
        key = public_keys.get(header["kid"])
        if not key:
            raise HTTPException(status_code=401, detail="Unknown signing key")

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
