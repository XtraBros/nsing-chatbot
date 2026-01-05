"""Auth provider adapters for the account bundle."""

from dataclasses import dataclass
from typing import Optional

from flask import current_app, session
from flask_login import UserMixin

from account_bundle.auth.ragflow_api import (
    login_user as ragflow_login_user,
    normalize_public_key_pem,
    register_user as ragflow_register_user,
)


@dataclass
class AuthResult:
    user: UserMixin
    token: Optional[str] = None


class RagflowUser(UserMixin):
    def __init__(self, user_id: str, username: str, email: Optional[str] = None, raw=None):
        self.id = user_id
        self.username = username
        self.email = email
        self.raw = raw or {}

    def get_id(self):
        return self.id


def _unwrap_payload(payload):
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict):
        return payload["data"]
    return payload or {}


def _build_user(data) -> Optional[RagflowUser]:
    if not isinstance(data, dict):
        return None
    user_id = data.get("id") or data.get("user_id") or data.get("uid")
    username = data.get("nickname") or data.get("username") or data.get("name") or data.get("email")
    if not user_id and not username:
        return None
    if not user_id:
        user_id = username
    return RagflowUser(user_id=user_id, username=username, email=data.get("email"), raw=data)


def _store_session(user: RagflowUser, token: Optional[str]) -> None:
    session["ragflow_user"] = {
        "id": user.get_id(),
        "username": user.username,
        "email": user.email,
        **(user.raw or {}),
    }
    if token:
        session["ragflow_token"] = token


def get_auth_provider():
    provider = (current_app.config.get("ACCOUNT_BUNDLE_PROVIDER") or "mongo").lower()
    if provider == "ragflow_api":
        return RagflowAPIProvider()
    return RagflowAPIProvider()


class RagflowAPIProvider:
    def __init__(self):
        cfg = current_app.config
        self.api_base = cfg.get("RAGFLOW_API_BASE", "")

    def register(self, username: str, email: str, password: str) -> AuthResult:
        if not email:
            raise RuntimeError("Email is required for Ragflow user creation.")
        nickname = username or (email.split("@")[0] if email else "")
        response = ragflow_register_user(
            nickname=nickname,
            email=email,
            password=password,
            api_base=self.api_base,
            public_key_pem=normalize_public_key_pem(
                current_app.config.get("RAGFLOW_PUBLIC_KEY_PEM", "")
            ),
        )
        current_app.logger.info("RAGFlow register API response for %s: %s", email, response)
        _assert_ragflow_register_success(response)
        user_id = None
        if isinstance(response, dict):
            data = response.get("data") or {}
            user_id = data.get("id") or data.get("user_id") or data.get("uid")
        return AuthResult(user=RagflowUser(user_id=user_id or email, username=nickname or email, email=email))

    def authenticate(self, username: str, password: str) -> Optional[AuthResult]:
        if not username:
            return None
        response = ragflow_login_user(
            email=username,
            password=password,
            api_base=self.api_base,
            public_key_pem=normalize_public_key_pem(
                current_app.config.get("RAGFLOW_PUBLIC_KEY_PEM", "")
            ),
        )
        _assert_ragflow_register_success(response)
        data = {}
        if isinstance(response, dict):
            data = response.get("data") or {}
        user = _build_user(data) or RagflowUser(
            user_id=data.get("id") or username,
            username=data.get("nickname") or data.get("username") or username,
            email=data.get("email") or username,
            raw=data,
        )
        token = data.get("access_token") or data.get("token")
        _store_session(user, token)
        return AuthResult(user=user, token=token)

    def get_user(self, user_id: str) -> Optional[UserMixin]:
        cached = session.get("ragflow_user")
        if cached and cached.get("id") == user_id:
            return _build_user(cached)
        return None

    def logout(self) -> None:
        session.pop("ragflow_user", None)
        session.pop("ragflow_token", None)


def _assert_ragflow_register_success(response) -> None:
    if not isinstance(response, dict):
        return
    if response.get("error"):
        raise RuntimeError(str(response.get("error")))
    if "success" in response and not response.get("success"):
        raise RuntimeError(response.get("message") or "RAGFlow registration failed.")
    if "code" in response and response.get("code") not in (0, 200):
        raise RuntimeError(response.get("message") or "RAGFlow registration failed.")
    if "ret" in response and response.get("ret") not in (0, 200):
        raise RuntimeError(response.get("message") or "RAGFlow registration failed.")


def _truncate_output(output: str, limit: int = 800) -> str:
    if len(output) <= limit:
        return output
    return f"{output[:limit]}... (truncated)"
