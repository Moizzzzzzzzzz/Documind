from typing import Optional

from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    session_id: Optional[str] = Field(default=None)  # ignored — namespace derived from JWT
    query: str = Field(..., min_length=2)
    top_k: int = Field(default=4, ge=1, le=10)
