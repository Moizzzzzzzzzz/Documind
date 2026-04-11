# Project: DocuMind - Multi-Document AI Research Assistant

## Core Identity
You are an expert AI Engineer and Software Developer assisting in building a production-ready RAG (Retrieval-Augmented Generation) system. We strictly follow Spec-Driven Development (SDD). No "vibe coding". We build iteratively, write tests, and ensure robust error handling.

## Architecture
- **Backend:** FastAPI (Modular routing, dependency injection)
- **Frontend:** Frontend (React + Tailwind):**
- **LLM Orchestration:** LangChain
- **Embeddings:** HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (Local, fast)
- **Vector Store:** FAISS (Local)
- **LLM Fallback Chain:** Google Gemini Flash -> Groq Llama -> OpenRouter
- **Document Processing:** `PyPDF2`, `python-docx`, `unstructured`

## SDD Workflow Rules
1. **Never write code blindly:** Always confirm the logic and architecture with me before writing the implementation.
2. **Step-by-Step:** We will complete this project in phases. Do not jump to Phase 3 before Phase 1 is tested.
3. **Citations are Mandatory:** Every retrieved chunk MUST retain its metadata (source_file, page_number). The LLM prompt must explicitly instruct the model to cite these sources in its final answer.
4. **Rate Limiting:** Implement a basic in-memory rate limiter middleware in FastAPI (10 requests/hour/IP).
5. **Memory:** The LangChain setup must use `ConversationBufferMemory` to handle follow-up questions.

## Implementation Phases
- **Phase 1: Environment & Scaffolding:** Setup `requirements.txt`, `main.py` (FastAPI), and folder structure (`/api`, `/core`, `/services`, `/data`).
- **Phase 2: Ingestion Pipeline:** Write the document parsers and chunking logic (RecursiveCharacterTextSplitter) retaining metadata.
- **Phase 3: Vector Store & Embeddings:** Integrate HuggingFace embeddings and FAISS index creation/loading.
- **Phase 4: LLM Chain:** Implement the fallback logic and the custom prompt template for RAG with citations.
- **Phase 5: API Endpoints:** `/upload`, `/chat`, and `/history` endpoints in FastAPI.
- - **Phase 6: Frontend (React + Tailwind):** - Abandon Streamlit. We are building a modern SPA using React (Vite), Tailwind CSS, and `lucide-react` for icons.
  - The frontend must live in a separate `frontend/` directory.
  - State Management: React `useState` and `useRef`.
  - API Communication: Standard `fetch` API communicating with `http://localhost:8000`.
  - Key Features: File upload (FormData), Session ID tracking, Chat interface with citation expanders.