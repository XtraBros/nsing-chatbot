"""Routes serving the chatbot UI and APIs."""

import uuid

import requests
from flask import current_app, jsonify, request
from flask_login import current_user, login_required

from account_bundle import csrf
from account_bundle.models import ConversationStore
from chatbot import bp
from utils.helpers import extract_references

AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions"
conversation_store = ConversationStore()


def _serialize_session(document, include_messages=True):
    if not document:
        return None
    session = {
        "id": str(document.get("_id")) if document.get("_id") else None,
        "session_id": document.get("session_id"),
        "username": document.get("username"),
        "title": document.get("title"),
        "created_at": document.get("created_at").isoformat() if document.get("created_at") else None,
        "updated_at": document.get("updated_at").isoformat() if document.get("updated_at") else None,
        "message_count": document.get("message_count", len(document.get("messages", []))),
        "metadata": document.get("metadata") or {},
    }
    if include_messages:
        session["messages"] = [
            {
                "role": message.get("role"),
                "content": message.get("content"),
                "timestamp": message.get("timestamp").isoformat()
                if message.get("timestamp")
                else None,
                "metadata": message.get("metadata") or {},
            }
            for message in document.get("messages", [])
        ]
    return session


def _get_config_value(key: str):
    return current_app.config.get(key)


def _get_api_base():
    base = (_get_config_value("RAGFLOW_API_BASE") or "").rstrip("/")
    if not base:
        return ""
    if base.startswith("http://") or base.startswith("https://"):
        return base
    # Build absolute URL when a relative path (e.g. "/ragflow") is provided.
    scheme = request.scheme if request else "https"
    host = request.host if request else current_app.config.get("SERVER_NAME", "")
    prefix = f"{scheme}://{host}".rstrip("/")
    return f"{prefix}{base}"


def _get_agent_id():
    print(_get_config_value("RAGFLOW_AGENT_ID"))
    return _get_config_value("RAGFLOW_AGENT_ID") or ""


def _get_api_key():
    print(_get_config_value("RAGFLOW_API_KEY"))
    return _get_config_value("RAGFLOW_API_KEY") or ""


@bp.get("/chat")
def chat_page():
    return current_app.send_static_file("index.html")


@bp.get("/api/chatbot-config")
def chatbot_config():
    return jsonify(
        {
            "ragflowApiBase": _get_api_base(),
            "ragflowAgentId": _get_agent_id(),
        }
    )


@bp.post("/api/chatbot/session")
@csrf.exempt
def create_session():
    agent_id = _get_agent_id()
    if not agent_id:
        current_app.logger.error("Chat ID missing; cannot create session.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    session_id = request.json.get("session_id") if request.is_json else None
    if not session_id:
        session_id = str(uuid.uuid4())
    return jsonify({"session_id": session_id})


@bp.get("/api/chatbot/history")
@login_required
def conversation_history():
    session_id = request.args.get("session_id")
    if session_id:
        session = conversation_store.get_session(current_user.get_id(), session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        serialized = _serialize_session(session)
        return jsonify(serialized)

    limit = request.args.get("limit", type=int) or 20
    sessions = conversation_store.list_sessions(current_user.get_id(), limit=limit)
    serialized_sessions = [_serialize_session(session) for session in sessions]
    return jsonify(serialized_sessions)


@bp.post("/api/chatbot/send")
@csrf.exempt
def send_message():
    agent_id = _get_agent_id()
    print(f"===> Agent ID: {agent_id}")
    if not agent_id:
        current_app.logger.error("Chat ID missing; cannot send message.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    raw_body = request.get_data(as_text=True)
    print("[chatbot] raw request body:", raw_body, flush=True)
    payload = request.get_json(force=True, silent=True) or {}
    session_id = payload.get("session_id") or str(uuid.uuid4())
    print("[chatbot] payload:", payload, flush=True)

    user_message = (payload.get("message") or payload.get("prompt") or "").strip()
    if not user_message:
        print("[chatbot] Missing 'message' in payload", payload, flush=True)
        return jsonify({"error": "Missing message"}), 400

    user_name = current_user.get_id() if current_user.is_authenticated else None
    print(f"[chatbot] processing session_id={session_id} user={user_name}")
    session_metadata = {"agent_id": _get_agent_id(), "model": payload.get("model") or "default"}
    if user_name:
        conversation_store.append_message(
            session_id=session_id,
            username=user_name,
            role="user",
            content=user_message,
            title=user_message[:80] or "Conversation",
            message_metadata={"model": session_metadata["model"]},
            session_metadata=session_metadata,
        )

    url = f"{_get_api_base()}{AGENT_COMPLETION_PATH.format(agent_id=agent_id)}"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {_get_api_key()}",
                "Content-Type": "application/json",
            },
            json={
                "model": payload.get("model") or "default",
                "messages": [
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
            },
            timeout=120,
        )
        if response.status_code == 404:
            print("[chatbot] agent id not found", agent_id)
            return jsonify({"error": "Session not found"}), 404

        response.raise_for_status()
        data = response.json()
        data["references"], data["chunks"] = extract_references(data, _get_api_base())
        message = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if user_name:
            conversation_store.append_message(
                session_id=session_id,
                username=user_name,
                role="assistant",
                content=message,
                message_metadata={
                    "model": session_metadata["model"],
                    "references": data.get("references", []),
                },
            )
            print(f"[chatbot] stored convo for {user_name}", flush=True)
        else:
            print("[chatbot] anonymous user message", flush=True)
        print("[chatbot] ragflow response keys", list(data.keys()), flush=True)
        return jsonify(data)
    except requests.HTTPError as http_error:
        print("[chatbot] http error", http_error)
        if http_error.response is not None:
            print("[chatbot] http error body", http_error.response.text)
        raise
    except requests.RequestException as request_error:
        print("[chatbot] request error", request_error)
        raise
