"""RAGFlow API helpers for user registration."""

import base64
import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding


def register_user(
    *,
    nickname: str,
    email: str,
    password: str,
    api_base: str,
    public_key_pem: str,
    timeout: int = 10,
):
    if not api_base:
        raise RuntimeError("RAGFLOW_API_BASE must be configured.")
    if not public_key_pem:
        raise RuntimeError("RAGFLOW_PUBLIC_KEY_PEM must be configured.")
    encrypted_password = encrypt_password(password, public_key_pem)
    payload = {"nickname": nickname, "email": email, "password": encrypted_password}
    url = f"{api_base.rstrip('/')}/v1/user/register"
    resp = requests.post(url, json=payload, timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"RAGFlow register failed ({resp.status_code}): {resp.text}")
    try:
        return resp.json()
    except ValueError as exc:
        raise RuntimeError(f"RAGFlow register returned invalid JSON: {resp.text}") from exc


def normalize_public_key_pem(value: str) -> str:
    if not value:
        return value
    return value.replace("\\n", "\n")


def login_user(
    *,
    email: str,
    password: str,
    api_base: str,
    public_key_pem: str,
    timeout: int = 10,
):
    if not api_base:
        raise RuntimeError("RAGFLOW_API_BASE must be configured.")
    if not public_key_pem:
        raise RuntimeError("RAGFLOW_PUBLIC_KEY_PEM must be configured.")
    encrypted_password = encrypt_password(password, public_key_pem)
    payload = {"email": email, "password": encrypted_password}
    url = f"{api_base.rstrip('/')}/v1/user/login"
    resp = requests.post(url, json=payload, timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"RAGFlow login failed ({resp.status_code}): {resp.text}")
    try:
        return resp.json()
    except ValueError as exc:
        raise RuntimeError(f"RAGFlow login returned invalid JSON: {resp.text}") from exc


def encrypt_password(password: str, public_key_pem: str) -> str:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    encrypted = public_key.encrypt(password.encode("utf-8"), padding.PKCS1v15())
    return base64.b64encode(encrypted).decode("utf-8")
