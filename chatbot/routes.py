"""Routes serving the chatbot UI and APIs."""

import uuid

import requests
from flask import current_app, jsonify, request
from flask_login import current_user, login_required

from account_bundle.models import ConversationStore
from chatbot import bp
from utils.helpers import extract_references

AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions"
conversation_store = ConversationStore()


def _get_config_value(key: str):
    return current_app.config.get(key)


def _get_api_base():
    return (_get_config_value("RAGFLOW_API_BASE") or "").rstrip("/")


def _get_agent_id():
    return _get_config_value("RAGFLOW_AGENT_ID") or ""


def _get_api_key():
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
    limit = request.args.get("limit", type=int) or 20
    entries = conversation_store.get_history(current_user.get_id(), limit=limit)
    for entry in entries:
        entry["_id"] = str(entry["_id"])
        entry["created_at"] = entry["created_at"].isoformat()
    return jsonify(entries)


@bp.post("/api/chatbot/send")
def send_message():
    agent_id = _get_agent_id()
    if not agent_id:
        current_app.logger.error("Chat ID missing; cannot send message.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    payload = request.get_json(force=True)
    session_id = payload.get("session_id") or str(uuid.uuid4())
    user_message = payload.get("message", "")
    if not user_message:
        return jsonify({"error": "Missing message"}), 400

    if current_user.is_authenticated:
        conversation_store.log_message(current_user.get_id(), "user", user_message, session_id=session_id)

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
            current_app.logger.warning("AGENT ID not found: %s", agent_id)
            return jsonify({"error": "Session not found"}), 404

        response.raise_for_status()
        data = response.json()
        data["references"], data["chunks"] = extract_references(data, _get_api_base())
        message = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if current_user.is_authenticated:
            conversation_store.log_message(current_user.get_id(), "assistant", message, session_id=session_id)
            current_app.logger.info("User %s message: %s", current_user.get_id(), user_message)
        else:
            current_app.logger.info("Anonymous user message: %s", user_message)
        current_app.logger.info("RAGFlow API response: %s", data)
        return jsonify(data)
    except requests.HTTPError as http_error:
        current_app.logger.error("Failed to send message: %s", http_error)
        if http_error.response is not None:
            current_app.logger.error("Response body: %s", http_error.response.text)
        raise
    except requests.RequestException as request_error:
        current_app.logger.error("Request to RAGFlow failed: %s", request_error)
        raise
