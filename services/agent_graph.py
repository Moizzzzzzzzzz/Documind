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
from services.vector_store import has_documents, search_documents

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
You are a routing assistant. Classify the user query into exactly one of two categories:

  document_rag  — the query requires information from uploaded documents
  general       — the query can be answered from general knowledge alone

Rules:
- If the query asks about specific documents, files, reports, data, or references
  content that would only be found in uploaded material, respond with: document_rag
- If the query is a general question (coding help, definitions, open-ended chat,
  math, writing, etc.) that does not depend on uploaded documents, respond with: general
- Reply with ONLY the category label — no explanation, no punctuation, no extra text.

Query: {query}
Category:"""


async def supervisor_node(state: AgentState) -> dict:
    """Classify the query and set the route."""
    from langchain_core.messages import HumanMessage

    session_id = state["session_id"]

    # Short-circuit: if no documents have been uploaded for this session,
    # skip the LLM classifier and go straight to the general agent.
    docs_exist = await has_documents(session_id)
    if not docs_exist:
        print(f"[SUPERVISOR] No documents in namespace '{session_id}' — routing to general.")
        return {"route": "general"}

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
# Build the graph
# ---------------------------------------------------------------------------

def _build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("document_agent", document_agent_node)
    graph.add_node("general_agent", general_agent_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_query,
        {
            "document_rag": "document_agent",
            "general": "general_agent",
        },
    )
    graph.add_edge("document_agent", END)
    graph.add_edge("general_agent", END)

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
