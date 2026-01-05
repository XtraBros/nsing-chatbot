import logging
import os
import json
from logging.handlers import RotatingFileHandler
from pathlib import Path

from flask import Flask, render_template_string, Response, jsonify, session, request

from account_bundle import init_app as init_account_management, csrf
from account_bundle.auth.ragflow_api import register_user as ragflow_register_user
from chatbot import bp as chatbot_bp
from config import Config


def build_app():
    root_dir = Path(__file__).resolve().parent
    static_dir = root_dir / "static"
    flask_app = Flask(__name__, static_folder=str(static_dir), static_url_path="")
    flask_app.config.from_object(Config)

    init_account_management(flask_app)
    flask_app.register_blueprint(chatbot_bp)

    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    file_handler = RotatingFileHandler(
        log_dir / "chatbot.log",
        maxBytes=1_000_000,  # ~1MB per file
        backupCount=5,
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
    )
    flask_app.logger.addHandler(file_handler)
    if not any(isinstance(handler, logging.StreamHandler) for handler in flask_app.logger.handlers):
        stream_handler = logging.StreamHandler()
        stream_handler.setLevel(logging.INFO)
        stream_handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
        )
        flask_app.logger.addHandler(stream_handler)
    flask_app.logger.setLevel(logging.INFO)
    return flask_app


app = build_app()


@app.route("/")
@app.route("/index")
def landing_page():
    return app.send_static_file("index.html")


@app.route("/close")
def close_popup_page():
    return render_template_string(
        """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Close</title>
    <script>
        (function() {
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.focus();
                }
            } catch (err) {}
            window.close();
        })();
    </script>
</head>
<body>
    <p>You may close this tab.</p>
</body>
</html>
        """
    )

@app.route("/static-config.js")
def static_config():
    cfg = app.config
    payload = {
        "RAGFLOW_API_BASE": cfg.get("RAGFLOW_API_BASE", ""),
        "RAGFLOW_UPLOADS_KBID": cfg.get("RAGFLOW_UPLOADS_KBID", ""),
        "RAGFLOW_API_KEY": cfg.get("RAGFLOW_API_KEY", ""),
        "RAGFLOW_AGENT_ID": cfg.get("RAGFLOW_AGENT_ID", ""),
    }
    js = "\n".join(
        [
            f"window.RAGFLOW_API_BASE = {json.dumps(payload['RAGFLOW_API_BASE'])};",
            f"window.RAGFLOW_UPLOADS_KBID = {json.dumps(payload['RAGFLOW_UPLOADS_KBID'])};",
            f"window.RAGFLOW_API_KEY = {json.dumps(payload['RAGFLOW_API_KEY'])};",
            f"window.RAGFLOW_AGENT_ID = {json.dumps(payload['RAGFLOW_AGENT_ID'])};",
        ]
    )
    return Response(js, mimetype="application/javascript")


@app.get("/api/ragflow/session-token")
def ragflow_session_token():
    token = session.get("ragflow_token")
    if not token:
        return jsonify({"token": None}), 401
    return jsonify({"token": token})


@app.post("/api/ragflow/register")
@csrf.exempt
def ragflow_register():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""
    nickname = (payload.get("nickname") or "").strip() or (email.split("@")[0] if email else "")
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    cfg = app.config
    try:
        result = ragflow_register_user(
            nickname=nickname,
            email=email,
            password=password,
            api_base=cfg.get("RAGFLOW_API_BASE", ""),
        )
    except Exception as exc:
        app.logger.exception("RAGFlow register failed")
        return jsonify({"error": str(exc)}), 502
    return jsonify(result)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9001))
    app.run(host="0.0.0.0", port=port, debug=True)
