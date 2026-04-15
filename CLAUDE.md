# DocuMind AI - Professional Technical Context

## Project Mission
An Enterprise-grade AI Document Curator capable of processing massive multi-document datasets with high-fidelity RAG, agentic routing, and stateless cloud architecture.

## Tech Stack & Architecture
- **Backend:** FastAPI (Python), LangChain/LangGraph, Pydantic V2.
- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons.
- **Vector DB:** FAISS (Local/Disk-sync) -> *Migration planned to Pinecone/Qdrant*.
- **Deployment:** Docker, DigitalOcean App Platform.

## Core Development Standards (MANDATORY)
1. **Stateless Logic:** No persistent state should be stored solely in-memory. Always sync state to disk or external DB.
2. **Modular Services:** Logic must be split into independent services (e.g., `vector_store.py`, `llm_chain.py`, `document_processor.py`).
3. **Type Safety:** Use Python Type Hints and Pydantic models for all API requests/responses.
4. **Error Handling:** Never return silent failures. Use custom exception handlers and toast-friendly error messages.
5. **RAG Reliability:** - Always append documents to index; never overwrite unless explicitly requested.
   - Every retrieved chunk must retain metadata (source, page_number).

## Build & Command SOPs
- **Backend Dev:** `uvicorn main:app --reload`
- **Frontend Dev:** `npm run dev`
- **Docker Build:** `docker build -t documind-backend .`
- **Linting:** `ruff check .` (Backend), `eslint .` (Frontend)

## Critical Constraints for Claude
- **Memory Management:** Use threading locks for FAISS operations to prevent race conditions.
- **UI/UX:** Always implement loading states for async operations. Use Dark Mode as the primary theme.
- **Security:** Sanitize filenames and validate file types before ingestion.