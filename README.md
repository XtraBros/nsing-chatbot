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
# configure SECRET_KEY, MONGO_URI, MONGO_DB_NAME, etc.
init_account_management(app, url_prefix="/auth")
```

That call wires up:
- Flask-Login + CSRF protection for all forms and API calls.
- Password hashing, username uniqueness enforcement, and password-complexity validation backed by MongoDB.
- A shared MongoDB connection pool with collections for both `user_details` and `conversation_logs`.
- Session-aware logout endpoint (POST-only, CSRF protected).
- Login optionality—anonymous users can chat, authenticated users get persistent history.

Once authenticated, users are redirected to `/chat`, which serves the NSing front-end. All chatbot APIs (`/api/chatbot/*`) require an authenticated session and automatically persist user/assistant exchanges per account.

## Local Development Setup

1. **Install MongoDB locally** (e.g., `brew install mongodb-community@7.0` on macOS) and start it with `mongod --config /opt/homebrew/etc/mongod.conf`.
2. **Configure environment variables**
   ```bash
   cd nsing-chatbot
   cp .env.example .env
   # Edit .env with your SECRET_KEY, Mongo URI (default points to localhost),
   # and the RAGFlow API base/agent credentials.
   ```
3. **Create a virtual environment and install dependencies**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
4. **Run the Flask app**
   ```bash
   export FLASK_APP=app.py
   flask run  # or python app.py
   ```

## Testing the Flow

1. Visit `/auth/register` to create a new account (password must be 8+ chars with letters and numbers). User records are stored in the `user_details` collection.
2. Log in via `/auth/login` (optional). After successful authentication you are redirected to `/chat`.
3. Use the chatbot UI:
   - Anonymous users can ask questions without creating an account; nothing is stored in MongoDB.
   - Authenticated users have every prompt/response saved in `conversation_logs` with timestamps and session IDs.
4. Retrieve recent conversation history via `GET /api/chatbot/history?limit=20` while logged in (history requires authentication).

These steps exercise the entire stack—authentication, session management, chatbot proxying, and MongoDB persistence—ensuring the module is ready for production-style testing inside the NSing platform. Because the account bundle is self-contained (templates, static assets, blueprints, and data layer in one folder), you can drop it into another repo and repeat the same integration process with minimal wiring.
