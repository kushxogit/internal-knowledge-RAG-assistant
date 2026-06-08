<h1 align="center">FastAPI + pgvector RAG Boilerplate</h1>

<p align="center">
  <em>A batteries-included, production-ready starting point for building AI-powered RAG applications. Built heavily off of standard Domain-Driven Design patterns for FastAPI.</em>
</p>

## ✨ Features

- **End-to-End RAG Pipeline**: Ingest documents (PDF, DOCX, Markdown), chunk them, and query them.
- **pgvector Integration**: Stores `sentence-transformers` embeddings right alongside your relational data in PostgreSQL for highly efficient cosine similarity searches.
- **OpenRouter Fallbacks**: Connects to [OpenRouter](https://openrouter.ai/) for scalable, robust LLM generation, gracefully falling back across free or paid models.
- **Background Workers**: Heavy ML tasks (like embedding and text extraction) are shifted off the main event loop to keep the API blazing fast.
- **Dockerized**: Out of the box `docker-compose` setup with PostgreSQL, pgvector, pgcrypto, Redis, and Python ready to go.

---

## 🚀 Quickstart

### 1. Prerequisites
You will need Docker and Docker Compose installed.

### 2. Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and add your **OpenRouter API Key**:
   ```env
   OPENROUTER_API_KEY=sk-or-v1-...
   ```

### 3. Run the Stack
Start up the entire infrastructure:
```bash
docker compose up -d --build
```

### 4. Run Migrations
Before the API works, you must apply the SQLAlchemy migrations to create the pgvector tables:
```bash
docker compose exec api alembic upgrade head
```

---

## 🧠 How it Works

The RAG (Retrieval-Augmented Generation) pipeline consists of two phases:

### Phase 1: Ingestion
When a user uploads a document, the system:
1. Extracts text while preserving structure (using `pdfplumber`, `python-docx`, or raw markdown).
2. Uses chunking strategies to split text intelligently.
3. Generates 384-dimensional vectors locally using `sentence-transformers/all-MiniLM-L6-v2`.
4. Stores chunks and vectors via `pgvector`.

*You can test ingestion by running:*
```bash
docker compose exec worker python -m app.test_ingestion
```

### Phase 2: Retrieval & Generation
When a user asks a question via the `/api/v1/chat/` endpoint:
1. The **Retriever** embeds the user's query and performs a cosine-distance search against `pgvector` to find the top most relevant chunks.
2. The **Generator** bundles the retrieved context into a strict prompt.
3. The prompt is sent to **OpenRouter**, falling back across models if there are timeouts or rate limits.

*You can test retrieval by running:*
```bash
docker compose exec worker python -m app.test_rag
```

---

## 📂 Project Structure

```
├── src/app/
│   ├── api/v1/        # FastAPI HTTP endpoints (e.g. /chat/)
│   ├── core/          # Configuration, DB connections, setup
│   ├── models/        # SQLAlchemy tables (Document, ChunkEmbedding, etc.)
│   ├── schemas/       # Pydantic schemas for data validation
│   └── rag/           # Core AI Logic
│       ├── embedders/ # Local SentenceTransformers integration
│       ├── extractors/# PDF, DOCX, Markdown parsers
│       ├── assistant.py # RAG orchestrator
│       ├── generator.py # OpenRouter LLM interface
│       └── ingestion.py # Document to Chunk pipeline
```

## 🛠 Operational Requirements

- **Memory**: The local `sentence-transformers` model requires ~2GB of RAM inside the Docker container to load. Ensure your Docker engine is allocated at least 4GB.
- **Extensions**: `pgvector` and `pgcrypto` must be installed on the Postgres server. The included docker-compose image handles this automatically.
- **Model Cost Checks**: If using free models on OpenRouter, the application strictly enforces `max_tokens: 1024` and passes an `HTTP-Referer` header to bypass 402 Cost Check errors.
