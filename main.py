from dotenv import load_dotenv
load_dotenv()  # must run before any service module reads os.environ

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.ingest import router as ingest_router
from api.retrieval import router as retrieval_router

app = FastAPI(
    title="DocuMind",
    description="Multi-Document AI Research Assistant",
    version="0.1.0",
)

_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if frontend_url := os.getenv("FRONTEND_URL"):
    _allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ingest_router)
app.include_router(retrieval_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
