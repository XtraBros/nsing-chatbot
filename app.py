import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from flask import Flask, jsonify, render_template_string

from account_bundle import init_app as init_account_management
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

@app.get("/api/ragflow/config")
def ragflow_config():
    cfg = app.config
    return jsonify(
        {
            "apiBase": cfg.get("RAGFLOW_API_BASE", ""),
            "apiKey": cfg.get("RAGFLOW_API_KEY", ""),
            "agentId": cfg.get("RAGFLOW_AGENT_ID", ""),
        }
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 9001))
    app.run(host="0.0.0.0", port=port, debug=True)
