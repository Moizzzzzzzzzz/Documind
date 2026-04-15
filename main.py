from dotenv import load_dotenv
load_dotenv()  # must run before any service module reads os.environ

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.ingest import router as ingest_router
from api.retrieval import router as retrieval_router

app = FastAPI(
    title="DocuMind",
    description="Multi-Document AI Research Assistant",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(ingest_router)
app.include_router(retrieval_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
