"""Helpers for working with RAGFlow agent responses."""

from urllib.parse import quote


def extract_references(api_response, api_base):
    """Normalize references from the RAGFlow agent response."""

    if not isinstance(api_response, dict):
        return []

    choices = api_response.get("choices")
    if not isinstance(choices, list):
        return []

    base_url = (api_base or "").rstrip("/")
    normalized = []
    seen = set()

    for choice in choices:
        message = (choice or {}).get("message") or {}
        reference = message.get("reference") or {}
        if not reference:
            continue

        doc_aggs = reference.get("doc_aggs") or {}
        chunks = reference.get("chunks") or {}
        doc_meta = {}

        if isinstance(chunks, dict):
            for chunk in chunks.values():
                doc_id = chunk.get("document_id")
                if not doc_id:
                    continue
                entry = doc_meta.setdefault(doc_id, {})
                image_id = chunk.get("image_id")
                if image_id and not entry.get("image_id"):
                    entry["image_id"] = image_id
                doc_name = chunk.get("document_name")
                if doc_name and not entry.get("name"):
                    entry["name"] = doc_name

        chunks_data = {}
        if isinstance(chunks, dict):
            for chunk_id, chunk in chunks.items():
                chunks_data[chunk_id] = {
                    "id": chunk_id,
                    "content": chunk.get("content") or chunk.get("text") or chunk.get("chunk_content", ""),
                    "document_id": chunk.get("document_id"),
                    "document_name": chunk.get("document_name")
                }

        if isinstance(doc_aggs, dict):
            for doc in doc_aggs.values():
                doc_id = doc.get("doc_id") or doc.get("docId")
                if not doc_id or doc_id in seen:
                    continue
                seen.add(doc_id)
                doc_name = doc.get("doc_name") or doc.get("docName")
                meta = doc_meta.get(doc_id, {})
                normalized.append(
                    {
                        "id": doc_id,
                        "name": doc_name or meta.get("name") or "Reference document",
                        "url": build_document_url(base_url, doc_id, doc_name or meta.get("name")),
                        "thumbnail": build_thumbnail_url(base_url, meta.get("image_id"), doc_id),
                    }
                )

    return normalized, chunks_data


def build_document_url(base_url, doc_id, document_name=None):
    if not base_url or not doc_id:
        return ""
    encoded_id = quote(str(doc_id).strip(), safe="")
    query_params = ["prefix=document"]
    extension = ""
    if isinstance(document_name, str) and "." in document_name:
        extension = document_name.rsplit(".", 1)[-1]
    if extension:
        query_params.append(f"ext={quote(extension, safe='')}")
    query = "&".join(query_params)
    return f"{base_url}/document/{encoded_id}?{query}"


def build_thumbnail_url(base_url, image_id, doc_id):
    if not base_url or not image_id:
        return ""
    encoded_image_id = quote(str(image_id).strip(), safe="")
    suffix = ""
    if doc_id:
        suffix = f"-thumbnail_{quote(str(doc_id).strip(), safe='')}.png"
    return f"{base_url}/v1/document/image/{encoded_image_id}{suffix}"
