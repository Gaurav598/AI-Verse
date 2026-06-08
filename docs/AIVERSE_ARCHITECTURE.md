# AIverse High-Level Architecture (HLD)

## 1. System Overview
AIverse is a multi-modal AI workspace built with a microservice-like monolith architecture. It is divided into two primary layers:
1. **Frontend (Next.js 14):** Provides a unified UI for Chat, Code, Image, and Video generation, managing client-side state and streaming UI.
2. **Backend API (Node.js/Strapi v5):** Serves as the persistence layer, background job processor, and integration hub for external LLM APIs.

## 2. Component Architecture

### 2.1 Frontend Architecture
* **Framework:** Next.js 14 App Router
* **Styling:** Tailwind CSS + CSS Modules + Framer Motion
* **Streaming Engine:** Next.js Edge API routes use Server-Sent Events (SSE) to stream responses directly from Google Gemini.
* **State Management:** React Context / Zustand for workspace state, local caching for chat history.

### 2.2 Backend Architecture (aiverse-api)
* **Core Engine:** Custom API built on Strapi v5 routing and ORM.
* **Database:** PostgreSQL 16
* **Vector Store:** `pgvector` extension for storing and querying embeddings (RRF fusion enabled).
* **Caching & Queues:** Redis 7 (sliding window rate limits, BullMQ backing store).
* **Workers:** BullMQ orchestrates heavy background tasks (embeddings generation, email delivery, scheduled analytics).
* **Models:** `workspace`, `conversation`, `message`, `prompt`, `tool_run`, `generated_output`.

### 2.3 External Integrations
* **LLM Provider:** Google Gemini (`gemini-1.5-flash`, `gemini-1.5-pro`, `text-embedding-004`).
* **Image Generation:** DALL-E 3 / Imagen (Architecture implemented, currently returning mocks + enhanced prompts).
* **Auth:** JWT-based stateless authentication.

## 3. Core Workflows

### 3.1 Streaming AI Generation (e.g., Chat / Code)
1. User submits prompt via Next.js UI.
2. Next.js API Route `/api/chat` validates input and initiates streaming connection with Gemini.
3. Next.js streams chunks back to the client UI via Server-Sent Events.
4. *Post-stream:* Frontend makes async REST API call to `aiverse-api` to persist the `message` to the database.

### 3.2 Workspace Persistence
1. User creates a new workspace.
2. Frontend calls POST `/api/workspaces`.
3. Backend creates workspace and links it to the User ID via JWT.
4. Future conversations are linked to this workspace ID.

## 4. Scalability & Production Readiness
* **Stateless API:** Backend is horizontally scalable (managed via Kubernetes Deployment replicas).
* **Connection Pooling:** PostgreSQL uses pgBouncer/internal pooling (`DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`).
* **Job Offloading:** Heavy synchronous logic (like generating embeddings for long documents) is immediately pushed to BullMQ workers to prevent event loop blocking.
* **Observability:** Winston JSON logger integrated; X-Request-ID trace IDs propagated through middlewares.
* **Rate Limiting:** Redis-based sliding window prevents API abuse per user/IP.
