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
You are an expert research assistant. Your task is to synthesize a comprehensive, \
detailed answer to the user's question using the provided context passages below. \
Each passage includes a Source (filename) and Page number in its metadata.

Guidelines:
- Read all context passages carefully and reason across them to construct your answer.
- You MUST cite every passage you draw information from. Place the citation \
immediately after the relevant sentence using this exact format: \
[Source: <filename>, Page: <number>]. Do not group citations at the end.
- If multiple passages support the same point, cite all of them.
- If the context passages do not contain information relevant to the question, \
respond with: "I cannot answer this based on the provided documents."
- Do NOT refuse to answer simply because the context does not contain a \
word-for-word match — synthesize and reason from what is present.

Previous Conversation:
{chat_history}

Context Passages:
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
