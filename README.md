# NSing Enterprise Knowledge Base & Chatbot Interface

Welcome to the official repository for the NSing Enterprise Knowledge Base and Chatbot System, an enterprise-grade AI solution designed to power intelligent information retrieval, automated assistance, and seamless user interaction for NSing.com.sg. This project integrates a centralized enterprise knowledge base with a conversational AI chatbot interface, enabling employees, partners, and users to easily access structured organizational knowledge through natural language queries.

## Project Overview

The NSing Enterprise Knowledge Base and Chatbot System aims to:
- Centralize organization-wide knowledge into a unified, searchable repository.
- Provide accurate and context-aware responses using Retrieval-Augmented Generation (RAG).
- Offer a chat-based interface for intuitive and efficient information access.
- Support multi-department content, policy documents, SOPs, FAQs, technical manuals, and more.
- Ensure enterprise-level security, access control, and data governance.

## Key Features
### Enterprise Knowledge Base
- Structured content ingestion pipeline
- Document chunking, metadata tagging, and embedding
- Vector search + hybrid retrieval support
- Versioning and update workflows

### Chatbot Interface
- Natural language Q&A
- Context retention and clarification prompts
- Safety & compliance filters
- Web-based front-end interface (React)
- API gateway for authentication and service routing

### Backend Services
- Knowledge retrieval service
- LLM response orchestration
- Logging and analytics for usage insights
- Scalable Docker-based deployment

## Account Management & Security

All authentication assets now live in the `account_bundle/` folder, which can be copied directly into any Flask project. To enable it:

```python
from account_bundle import init_app as init_account_management

app = Flask(__name__)
# configure SECRET_KEY and Ragflow settings.
init_account_management(app, url_prefix="/auth")
```

That call wires up:
- Flask-Login + CSRF protection for all forms and API calls.
- Session-aware logout endpoint (POST-only, CSRF protected).
- Login optionality—anonymous visitors can still use the chatbot, while authenticated users unlock gated app capabilities.

Once authenticated, users are redirected to `/chat`, which serves the NSing front-end. The chatbot experience now calls RAGFlow directly from the browser, so the Flask app no longer proxies chat requests; only the account features remain server-side.

### RAGFlow admin CLI over SSH

If Ragflow does not expose registration APIs, you can create users via SSH using the admin CLI:

```
ACCOUNT_BUNDLE_PROVIDER=ragflow_ssh
RAGFLOW_SSH_HOST=ragflow-host
RAGFLOW_SSH_PORT=22
RAGFLOW_SSH_USERNAME=ragflow-admin
RAGFLOW_SSH_PASSWORD=replace-with-ssh-password
RAGFLOW_ADMIN_HOST=127.0.0.1
RAGFLOW_ADMIN_PORT=9381
RAGFLOW_ADMIN_PASSWORD=admin
RAGFLOW_ADMIN_ENV_PATH=.env
RAGFLOW_ADMIN_ENV_KEY=RAGFLOW_ADMIN_PASSWORD
RAGFLOW_CLI_PATH=ragflow-cli
```

In this mode, registration uses the CLI via SSH. Login can be handled by a separate system.

## Local Development Setup

1. **Configure environment variables**
   ```bash
   cd nsing-chatbot
   cp .env.example .env
   # Edit .env with your SECRET_KEY and Ragflow SSH/API credentials.
   ```
2. **Create a virtual environment and install dependencies**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Run the Flask app**
   ```bash
   export FLASK_APP=app.py
   flask run  # or python app.py
   ```

## Testing the Flow

1. Visit `/auth/register` to create a new account (password must be 8+ chars with letters and numbers). User records are stored in the `user_details` collection.
2. Log in via `/auth/login` (optional). After successful authentication you are redirected to `/chat`.
3. Use the chatbot UI:
   - Anonymous users can ask questions without creating an account; requests hit RAGFlow directly from the browser.
   - Authenticated users access the same chat UI plus any additional gated functionality you layer on (e.g., file uploads, admin tools).

These steps exercise the entire stack—authentication, session management, and static asset delivery—ensuring the module is ready for production-style testing inside the NSing platform. Because the account bundle is self-contained (templates, static assets, blueprints, and data layer in one folder), you can drop it into another repo and repeat the same integration process with minimal wiring.
