import logging
import os
from typing import Any

from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from services.memory import get_chat_history, save_chat_history

logger = logging.getLogger(__name__)

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
You are DocuMind, an expert document research assistant.

CONTEXT EXCERPTS FROM THE UPLOADED DOCUMENT:
{context}

INSTRUCTIONS:
1. Read the context excerpts carefully above.
2. If the excerpts contain relevant information → answer thoroughly \
using ONLY that information. Cite every fact: [Source: filename, Page: X]
3. Be THOROUGH and DETAILED. Do not summarize vaguely — \
extract and present the specific information, examples, \
frameworks, and details from the excerpts. \
If the document lists stages, name each stage. \
If it gives examples, include them. \
If it has frameworks or models, explain them fully.
4. ONLY say 'I could not find this information in the uploaded documents' \
if the excerpts are completely unrelated to the question.
5. Never use training knowledge. Never say 'I am a deep learning model'. \
You are DocuMind.

IMPORTANT: The user wants to learn from their document. \
Give complete, detailed answers — not surface summaries. \
More detail from the document = better answer.

Chat history: {chat_history}
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

    # --- DIAGNOSTIC LOGGING ---
    print("\n" + "=" * 70)
    print(f"[LLM DEBUG] Query: {query!r}")
    print(f"[LLM DEBUG] Chunks received: {len(retrieved_chunks)}")
    print("=== INJECTED CONTEXT ===")
    print(context_str if context_str else "<EMPTY — no context was built>")
    print("=== END INJECTED CONTEXT ===")

    formatted_prompt = _prompt.format(
        chat_history=chat_history,
        context=context_str,
        question=query,
    )
    print("=== LLM PROMPT ===")
    print(formatted_prompt)
    print("=== END LLM PROMPT ===")
    print("=" * 70 + "\n")
    # --------------------------

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
        print(f"[LLM DEBUG] LLM answer: {answer[:300]!r}")
    except Exception as exc:
        logger.exception("[LLM DEBUG] LLM invocation failed: %s", exc)
        print(f"[LLM DEBUG] ERROR — LLM invocation raised: {type(exc).__name__}: {exc}")
        answer = (
            "The AI servers are currently at capacity. "
            "Please try again after sometime."
        )

    save_chat_history(session_id, query, answer)
    return answer
