import os
from typing import Any

from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from services.memory import get_chat_history, save_chat_history

load_dotenv()

# ---------------------------------------------------------------------------
# LLM initialisation
# ---------------------------------------------------------------------------

_primary_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)

_fallback_llm = ChatGroq(
    model_name="llama-3.1-8b-instant",
    temperature=0.2,
    groq_api_key=os.getenv("GROQ_API_KEY"),
)

# Primary with automatic fallback to Groq when Gemini rate-limits or errors.
robust_llm = _primary_llm.with_fallbacks([_fallback_llm])

# ---------------------------------------------------------------------------
# Citation-enforcing prompt
# ---------------------------------------------------------------------------

_RAG_TEMPLATE = """\
You are an expert research assistant. Answer the user's question using ONLY \
the provided context below. Every piece of context has a Source (filename) and \
a Page number. If you use information from a piece of context you MUST append \
the citation immediately after the relevant sentence in this exact format: \
[Source: <filename>, Page: <number>]. Do not group all citations at the end — \
each citation must follow the specific sentence it supports. If the answer \
cannot be found in the provided context, respond with exactly: \
"I cannot answer this based on the provided documents."

Previous Conversation:
{chat_history}

Current Context:
{context}

Question: {question}

Answer:"""

_prompt = PromptTemplate(
    input_variables=["chat_history", "context", "question"],
    template=_RAG_TEMPLATE,
)

# ---------------------------------------------------------------------------
# Public generator
# ---------------------------------------------------------------------------

def _format_chunks(chunks: list[dict]) -> str:
    """Render retrieved chunks into a numbered, metadata-rich string."""
    lines: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        meta = chunk.get("metadata", {})
        source = meta.get("source_file", meta.get("source", "unknown"))
        page = meta.get("page_number", meta.get("page", "N/A"))
        content = chunk.get("content", "").strip()
        lines.append(
            f"[{i}] Context: {content} | Metadata: Source: {source}, Page: {page}"
        )
    return "\n\n".join(lines)


async def generate_rag_response(
    query: str, retrieved_chunks: list[dict], session_id: str
) -> str:
    """Feed *retrieved_chunks*, *query*, and conversation history to the LLM
    chain and return the answer.

    Falls back from Gemini Flash -> Groq Llama automatically via LangChain's
    ``with_fallbacks`` mechanism. If both models fail a graceful message is
    returned instead of raising.
    """
    context_str = _format_chunks(retrieved_chunks)
    chat_history = get_chat_history(session_id)
    chain = _prompt | robust_llm

    try:
        result: Any = await chain.ainvoke(
            {
                "chat_history": chat_history,
                "context": context_str,
                "question": query,
            }
        )
        # LangChain chat models return an AIMessage; extract plain text.
        answer: str = result.content if hasattr(result, "content") else str(result)
    except Exception:
        answer = (
            "The AI servers are currently at capacity. "
            "Please try again after sometime."
        )

    save_chat_history(session_id, query, answer)
    return answer
