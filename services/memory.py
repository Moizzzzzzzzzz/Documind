# Simple in-memory conversation store keyed by session_id.
# Each session holds an ordered list of {"human": str, "ai": str} exchanges.
# This is intentionally kept in-process; swap for Redis/DB in production.

chat_histories: dict[str, list[dict[str, str]]] = {}


def get_chat_history(session_id: str) -> str:
    """Return the conversation history for *session_id* as a formatted string.

    Returns an empty string when no history exists yet so the prompt stays
    clean on the very first turn.
    """
    history = chat_histories.get(session_id, [])
    if not history:
        return ""

    lines: list[str] = []
    for exchange in history:
        lines.append(f"Human: {exchange['human']}")
        lines.append(f"AI: {exchange['ai']}")
    return "\n".join(lines)


def save_chat_history(
    session_id: str, human_query: str, ai_response: str
) -> None:
    """Append a new exchange to *session_id*'s history."""
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    chat_histories[session_id].append(
        {"human": human_query, "ai": ai_response}
    )
