import os
import httpx
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

CLERK_ISSUER = "https://cute-escargot-85.clerk.accounts.dev"
CLERK_JWKS_URL = "https://cute-escargot-85.clerk.accounts.dev/.well-known/jwks.json"


def get_jwks() -> dict:
    response = httpx.get(CLERK_JWKS_URL, timeout=10)
    response.raise_for_status()
    return response.json()


def verify_clerk_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
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