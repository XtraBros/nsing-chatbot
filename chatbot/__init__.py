"""Chatbot blueprint for UI and API endpoints."""

from flask import Blueprint

bp = Blueprint("chatbot", __name__)

from chatbot import routes  # noqa: E402,F401
