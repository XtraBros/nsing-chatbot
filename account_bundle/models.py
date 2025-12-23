"""
Module to contain objects for the app.
"""

from datetime import datetime, timezone
from typing import Optional
import os

from flask import current_app
from flask_login import UserMixin
from pymongo import MongoClient, errors
from werkzeug.security import check_password_hash, generate_password_hash

_mongo_client: Optional[MongoClient] = None
_indexes_ensured = False


def _get_config_value(key: str, default=None):
    if current_app:
        return current_app.config.get(key, default)
    return os.getenv(key, default)


def _get_client() -> MongoClient:
    global _mongo_client

    if _mongo_client is None:
        mongo_uri = _get_config_value("MONGO_URI")
        _mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    return _mongo_client


def _get_database():
    db_name = _get_config_value("MONGO_DB_NAME", "Users")
    return _get_client()[db_name]


def _get_user_collection():
    return _get_database()["user_details"]


def _ensure_indexes(collection):
    global _indexes_ensured
    if not _indexes_ensured:
        collection.create_index("name", unique=True)
        collection.create_index("email", unique=False)
        _indexes_ensured = True


class User(UserMixin):
    """
    User object that can be manipulated with mongo.
    The collection name is 'user_details'.
    """

    def __init__(self, username=None, email=None, password=None):
        self.username = username
        self.email = email
        self.password = password
        self.password_hash = None
        self.collection = _get_user_collection()
        _ensure_indexes(self.collection)

    def get_id(self):
        return self.username

    def set_password(self, password):
        """Hash the password with Werkzeug hash generator."""
        if not password:
            raise ValueError("Password cannot be empty.")
        self.password_hash = generate_password_hash(password)

    @staticmethod
    def check_password(hashed_password, password):
        """Validating the hashed password."""
        return check_password_hash(hashed_password, password)

    def get_by_username(self, username):
        """Getting user details by username."""
        return self.collection.find_one({"name": username})

    def get_by_email(self, email):
        """Getting user details by email."""
        return self.collection.find_one({"email": email})

    def register(self):
        """Inserting user details into mongo collection."""
        if not self.password_hash:
            raise ValueError("Password must be set before registering a user.")
        document = self.to_dict()
        try:
            self.collection.insert_one(document)
        except errors.DuplicateKeyError as exc:
            raise ValueError("Username or email already exists.") from exc

    def to_dict(self):
        """Transform to dict to insert into mongo collection."""
        return {
            "name": self.username,
            "email": self.email,
            # Storing hashed password, you should NEVER store the password itself in the database
            "password": self.password_hash,
        }


class ConversationStore:
    """Helper to persist chatbot interactions per user."""

    def __init__(self):
        db = _get_database()
        self.collection = db["conversation_logs"]
        self._ensure_indexes()

    def _ensure_indexes(self):
        self.collection.create_index([("username", 1), ("created_at", -1)])
        self.collection.create_index("session_id")

    def log_message(self, username: str, role: str, content: str, session_id: Optional[str] = None):
        if not username or not role:
            raise ValueError("Username and role are required to log a message.")
        document = {
            "username": username,
            "role": role,
            "content": content,
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc),
        }
        self.collection.insert_one(document)

    def get_history(self, username: str, limit: int = 20):
        query = {"username": username}
        cursor = (
            self.collection.find(query)
            .sort("created_at", -1)
            .limit(max(limit, 1))
        )
        return list(cursor)
