"""Routes serving the chatbot static UI."""

from flask import current_app

from chatbot import bp

@bp.get("/chat")
def chat_page():
    return current_app.send_static_file("index.html")
