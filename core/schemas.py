from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    session_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=2)
    top_k: int = Field(default=4, ge=1, le=10)
