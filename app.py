import os

from flask import Flask, jsonify, request, send_from_directory
import requests

from utils.helpers import extract_references

API_BASE = os.environ.get("RAGFLOW_API_BASE", "http://xtraragflow.ddns.net").rstrip("/")
AGENT_ID = os.environ.get("RAGFLOW_AGENT_ID", "")
API_KEY = os.environ.get("RAGFLOW_API_KEY", "")
AGENT_COMPLETION_PATH = "/api/v1/agents_openai/{agent_id}/chat/completions"

app = Flask(__name__, static_folder="static", static_url_path="")

@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.get("/api/chatbot-config")
def chatbot_config():
    return jsonify(
        {
            "ragflowApiBase": API_BASE,
            "ragflowAgentId": AGENT_ID,
        }
    )


@app.post("/api/chatbot/session")
def create_session():
    if not AGENT_ID:
        app.logger.error("Chat ID missing; cannot create session.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    return jsonify({"session_id": AGENT_ID})


@app.post("/api/chatbot/send")
def send_message():
    if not AGENT_ID:
        app.logger.error("Chat ID missing; cannot send message.")
        return jsonify({"error": "Chat ID is not configured on the server."}), 500
    payload = request.get_json(force=True)
    # session_id = payload.get("session_id")
    user_message = payload.get("message", "")
    if not user_message:
        return jsonify({"error": "Missing message"}), 400

    url = f"{API_BASE}{AGENT_COMPLETION_PATH.format(agent_id=AGENT_ID)}"
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
                    {"role": "user", "content": user_message},
                ],
                "stream": False,
            },
            timeout=60,
        )
        if response.status_code == 404:
            app.logger.warning("AGENT ID not found: %s", AGENT_ID)
            return jsonify({"error": "Session not found"}), 404

        response.raise_for_status()
        data = response.json()
        data["references"] = extract_references(data, API_BASE)
        # print(f"===> RAGFlow API Response: {data}")
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
