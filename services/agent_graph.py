"""LangGraph multi-agent routing layer.

Graph topology
--------------
START → supervisor_node → (conditional) → document_agent_node → END
                                        → general_agent_node  → END

- supervisor_node   : classifies the query as "document_rag" | "general"
- document_agent_node: retrieves Pinecone chunks → feeds to existing RAG chain
- general_agent_node : answers directly from the LLM; no vector lookup
"""

import logging
import operator
from typing import Annotated

from typing_extensions import TypedDict

from langgraph.graph import END, START, StateGraph

from services.llm_chain import generate_rag_response, robust_llm
from services.memory import get_chat_history, save_chat_history
from services.vector_store import search_documents

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    """Mutable state passed between every node in the graph."""
    messages: Annotated[list, operator.add]  # accumulates turn messages
    session_id: str
    query: str
    retrieved_docs: list         # populated by document_agent_node; [] for general
    answer: str
    route: str                   # set by supervisor; drives the conditional edge


# ---------------------------------------------------------------------------
# Supervisor — classifies the query
# ---------------------------------------------------------------------------

_SUPERVISOR_PROMPT = """\
You are a query router for DocuMind.
Documents ARE uploaded for this session.

Route to 'document_rag' if:
- The query asks about content, information, data from documents
- The query asks to summarize, analyze, explain anything
- ANY question that COULD be answered from a document
- When in doubt → ALWAYS choose document_rag

Route to 'general' ONLY if:
- Pure math calculation (e.g. '2+2')
- Greetings only (e.g. 'hello', 'how are you')
- Explicit request NOT about documents

Output ONLY one word: document_rag OR general

Query: {query}
Category:"""

# Keywords that identify a DocuMind identity question — answered inline
# without touching the LLM routing path.
_IDENTITY_TRIGGERS = (
    "are you a rag",
    "are you rag",
    "what are you",
    "who are you",
    "what is documind",
    "are you an ai",
    "are you a chatbot",
    "are you a bot",
    "are you a deep learning",
    "are you a language model",
    "are you a llm",
)

_IDENTITY_ANSWER = (
    "I am DocuMind, a RAG-based document research assistant powered by "
    "Pinecone vector search and large language models. My job is to answer "
    "your questions using only the documents you upload — I do not rely on "
    "general training knowledge."
)


async def supervisor_node(state: AgentState) -> dict:
    """Classify the query and set the route.

    Identity questions (e.g. 'are you a RAG system?') are intercepted here
    and answered directly — they never reach the general_agent_node.
    """
    from langchain_core.messages import HumanMessage

    query_lower = state["query"].strip().lower()

    # Short-circuit: answer identity questions inline so the LLM never
    # misidentifies itself as a 'deep learning model'.
    if any(trigger in query_lower for trigger in _IDENTITY_TRIGGERS):
        print(f"[SUPERVISOR] Identity question detected — answering inline.")
        return {"route": "identity", "answer": _IDENTITY_ANSWER}

    prompt = _SUPERVISOR_PROMPT.format(query=state["query"])
    try:
        result = await robust_llm.ainvoke([HumanMessage(content=prompt)])
        raw = result.content.strip().lower()
        # Normalise — accept any response that contains the keyword
        if "document" in raw:
            route = "document_rag"
        else:
            route = "general"
    except Exception as exc:
        print(f"[SUPERVISOR] Classification failed ({exc}). Defaulting to document_rag.")
        route = "document_rag"

    print(f"[SUPERVISOR] query={state['query']!r} -> route={route!r}")
    return {"route": route}


# ---------------------------------------------------------------------------
# Document agent — Pinecone retrieval + RAG chain
# ---------------------------------------------------------------------------

async def document_agent_node(state: AgentState) -> dict:
    """Retrieve relevant chunks from Pinecone and generate a cited answer."""
    query = state["query"]
    session_id = state["session_id"]

    print(f"[AGENT] Checking namespace: {session_id}")
    try:
        chunks = await search_documents(query, namespace=session_id, top_k=4)
    except ValueError as exc:
        logger.error("[DOC_AGENT] search_documents failed: %s", exc)
        return {
            "retrieved_docs": [],
            "answer": "Document search is unavailable. Please check your Pinecone configuration.",
        }

    if not chunks:
        return {
            "answer": "Please upload a document first, then ask your question.",
            "retrieved_docs": [],
        }

    # generate_rag_response handles history read, LLM call, and history write
    answer = await generate_rag_response(
        query=query,
        retrieved_chunks=chunks,
        session_id=session_id,
    )

    return {"retrieved_docs": chunks, "answer": answer}


# ---------------------------------------------------------------------------
# General agent — direct LLM answer, no RAG
# ---------------------------------------------------------------------------

_GENERAL_PROMPT = """\
You are a helpful AI assistant. Answer the user's question clearly and concisely.

Previous Conversation:
{chat_history}

Question: {query}

Answer:"""


async def general_agent_node(state: AgentState) -> dict:
    """Answer the query directly from the LLM without document retrieval."""
    from langchain_core.messages import HumanMessage

    query = state["query"]
    session_id = state["session_id"]

    chat_history = get_chat_history(session_id)
    prompt = _GENERAL_PROMPT.format(chat_history=chat_history, query=query)

    try:
        result = await robust_llm.ainvoke([HumanMessage(content=prompt)])
        answer: str = result.content if hasattr(result, "content") else str(result)
    except Exception as exc:
        logger.exception("[GENERAL_AGENT] LLM invocation failed: %s", exc)
        answer = "The AI servers are currently at capacity. Please try again after sometime."

    save_chat_history(session_id, query, answer)

    return {"retrieved_docs": [], "answer": answer}


# ---------------------------------------------------------------------------
# Conditional edge — reads route set by supervisor
# ---------------------------------------------------------------------------

def route_query(state: AgentState) -> str:
    return state.get("route", "document_rag")


# ---------------------------------------------------------------------------
# Identity node — passes the pre-built answer straight through to END
# ---------------------------------------------------------------------------

async def identity_node(state: AgentState) -> dict:
    """Return the identity answer already set by supervisor_node."""
    return {"retrieved_docs": [], "answer": state.get("answer", _IDENTITY_ANSWER)}


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("document_agent", document_agent_node)
    graph.add_node("general_agent", general_agent_node)
    graph.add_node("identity_agent", identity_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_query,
        {
            "document_rag": "document_agent",
            "general": "general_agent",
            "identity": "identity_agent",
        },
    )
    graph.add_edge("document_agent", END)
    graph.add_edge("general_agent", END)
    graph.add_edge("identity_agent", END)

    return graph.compile()


_graph = _build_graph()


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_agent(query: str, session_id: str) -> dict:
    """Run the multi-agent graph and return the final answer with sources.

    Returns
    -------
    dict
        {"answer": str, "sources": list[dict]}
        Matches the response shape previously returned by the /api/chat endpoint
        so no frontend changes are required.
    """
    initial_state: AgentState = {
        "messages": [],
        "session_id": session_id,
        "query": query,
        "retrieved_docs": [],
        "answer": "",
        "route": "",
    }

    final_state = await _graph.ainvoke(initial_state)

    return {
        "answer": final_state.get("answer", ""),
        "sources": final_state.get("retrieved_docs", []),
    }
