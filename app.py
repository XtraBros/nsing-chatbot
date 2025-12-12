import os
from flask import Flask, jsonify, request, send_from_directory
import requests

API_BASE = os.environ.get("RAGFLOW_API_BASE", "http://xtraragflow.ddns.net").rstrip("/")
CHAT_ID = os.environ.get("RAGFLOW_CHAT_ID", "")
API_KEY = os.environ.get("RAGFLOW_API_KEY", "")
SYSTEM_PROMPT = os.environ.get(
    "RAGFLOW_SYSTEM_PROMPT",
    "You are the NSING Assistant. Respond in Markdown with concise paragraphs, bullet lists, and tables when helpful. Summarize references at the end when available.",
)

app = Flask(__name__, static_folder="static", static_url_path="")

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/api/chatbot-config")
def chatbot_config():
    return jsonify(
        {
            "ragflowApiBase": API_BASE,
            "ragflowChatId": CHAT_ID,
            "ragflowSystemPrompt": SYSTEM_PROMPT,
        }
    )


@app.post("/api/chatbot/session")
def create_session():
    if not CHAT_ID:
        app.logger.error("Chat ID missing; cannot create session.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    return jsonify({"session_id": CHAT_ID})


@app.post("/api/chatbot/send")
def send_message():
    if not CHAT_ID:
        app.logger.error("Chat ID missing; cannot send message.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    payload = request.get_json(force=True)
    session_id = payload.get("session_id")
    user_message = payload.get("message", "")
    if not user_message:
        return jsonify({"error": "Missing message"}), 400

    system_prompt = payload.get("system_prompt") or SYSTEM_PROMPT

    url = f"{API_BASE}/api/v1/chats_openai/{session_id}/chat/completions"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": payload.get("model") or "default",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
            },
            timeout=60,
        )
        if response.status_code == 404:
            app.logger.warning("Chat session not found: %s", session_id)
            return jsonify({"error": "Session not found"}), 404

        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.HTTPError as http_error:
        app.logger.error("Failed to send message: %s", http_error)
        if http_error.response is not None:
            app.logger.error("Response body: %s", http_error.response.text)
        raise
    except requests.RequestException as request_error:
        app.logger.error("Request to RAGFlow failed: %s", request_error)
        raise


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9001))
    app.run(host="0.0.0.0", port=port)
