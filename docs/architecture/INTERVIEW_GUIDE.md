# Interview Guide — AI Content Intelligence Platform

## How to Use This Guide

Each section covers a topic from the system you just built, with:
1. **What we built** — brief summary
2. **Key talking points** — what to explain in interviews
3. **Hard questions** — challenging questions with model answers

---

## 1. System Design

### What We Built
A horizontally scalable CMS backend with AI features, vector search, async job processing, and multi-layer caching.

### Key Talking Points

**"Walk me through your architecture"**
> "The system has 4 main layers: an API layer (Strapi on Node.js), an AI layer (Gemini via a service wrapper with retry and rate limiting), a data layer (PostgreSQL for relational + pgvector for semantic search, Redis for caching), and a job layer (BullMQ workers for async processing). All AI operations are async-first — the API returns immediately and the heavy work happens in background workers."

**"Why Strapi instead of building from scratch?"**
> "Strapi gives us the admin UI, file upload, role management, and ORM for free, letting us focus engineering time on the unique AI/search/analytics features. All business logic is in isolated custom plugins with zero Strapi-specific code — they could be extracted to separate services if we needed to move away from Strapi."

### Hard Questions

**Q: How does this scale to 1 million users?**
> A: "Currently runs on a single server — handles ~100 req/s. For 1M users: (1) Add PostgreSQL read replicas, route reads there via connection pool. (2) Put Strapi behind a load balancer with 3-5 instances — it's stateless so horizontal scaling is trivial. (3) Move session state to Redis. (4) Add CDN in front for published article reads (they're mostly static). (5) The vector index might need an upgrade from IVFFlat to HNSW or migration to Qdrant. (6) BullMQ can be replaced with SQS/Kafka when queue volume exceeds Redis's capacity."

---

## 2. Caching Strategy

### What We Built
Redis-backed multi-layer cache with namespace prefixes, sliding window rate limiting, and pattern-based invalidation.

### Key Talking Points

**Cache TTL design decisions:**
| Resource | TTL | Why |
|----------|-----|-----|
| Article | 15 min | Changes infrequently after publish |
| Search | 5 min | Query diversity means short cache is still valuable |
| Recommendations | 1 hour | Engagement data changes slowly |
| Trending | 10 min | Balance freshness with Redis load |

**Invalidation strategy:** Cache-aside pattern. On article update, we `DEL` specific keys and `SCAN + DEL` pattern matches (using SCAN, not KEYS, to avoid blocking Redis).

### Hard Questions

**Q: What's a cache stampede and how do you prevent it?**
> A: "Cache stampede happens when a popular cached item expires and hundreds of requests hit the DB simultaneously to repopulate it. Prevention: (1) **Probabilistic early expiration** — start refreshing slightly before TTL expires. (2) **Cache locking** — use Redis SETNX to let only one request repopulate. (3) **Jitter** — add random offset to TTLs so they don't all expire at the same time. In our system, we use TTL jitter in the remember() function."

**Q: When would you NOT use Redis for caching?**
> A: "When data is highly personalized (every user sees different content), caching becomes ineffective. Also avoid caching sensitive data (PII, financial) without encryption. And don't cache what's already fast — if a DB query returns in 2ms, caching adds complexity for no benefit."

---

## 3. Database Design

### What We Built
15+ table PostgreSQL schema with strategic indexes, pgvector for embeddings, ENUM types, and PostgreSQL functions.

### Key Talking Points

**Index design decisions:**
- **Partial indexes** on `articles WHERE workflow_status = 'published'` — avoids scanning draft articles in the hot path
- **GIN index** on full-text search vector column — enables fast `tsquery` searches
- **IVFFlat index** on embeddings — trades 5-10% recall for 10x query speed over exact search

**Denormalization decisions:**
- `view_count`, `like_count` on articles table — avoid COUNT(*) queries on every page load
- `trending_score` precomputed — the trending feed is a simple `ORDER BY trending_score DESC`
- Trade-off: slight data staleness for much faster reads

### Hard Questions

**Q: Why UUID primary keys instead of auto-increment integers?**
> A: "UUIDs enable distributed ID generation — no central sequence required. This matters when: (1) merging data from multiple shards/databases, (2) generating IDs client-side (offline-first apps), (3) avoiding ID enumeration attacks (sequential IDs let attackers guess /api/articles/1, /2, ...). Trade-off: UUIDs are 16 bytes vs 4 bytes for int, and slightly worse index locality."

**Q: How would you partition the articles table?**
> A: "Partition by `published_at` using PostgreSQL range partitioning — e.g., one partition per month. This makes cleanup of old articles fast (drop a partition instead of DELETE), and queries with date filters only scan relevant partitions. The `article_views` table is the better immediate candidate — it grows linearly with traffic and most queries filter by date."

---

## 4. Vector Search

### What We Built
Semantic search using Gemini `text-embedding-004` (768 dimensions), stored in pgvector with IVFFlat index, with hybrid BM25+vector fusion.

### Key Talking Points

**Embedding pipeline:**
1. Split article into 512-token chunks with 50-token overlap (preserves sentence context across boundaries)
2. Generate embedding for each chunk via Gemini API
3. Store in `embeddings` table as `vector(768)`
4. At search time: embed query → cosine similarity via `<=>` operator → aggregate chunk scores → surface top articles

**Why chunking?**
> Long documents can't be embedded as one vector — the late content gets diluted. Chunking ensures all parts of a long article are searchable.

**Hybrid search (RRF fusion):**
> Semantic search alone fails on exact names, brand terms, new topics. BM25 (keyword) fails on conceptual queries. Reciprocal Rank Fusion merges both ranked lists: `score = w1 * (1/(k + rank_semantic)) + w2 * (1/(k + rank_bm25))` where k=60 prevents high-rank items from dominating.

### Hard Questions

**Q: When would you move from pgvector to a dedicated vector DB like Pinecone or Qdrant?**
> A: "At ~10M+ vectors, pgvector's IVFFlat index starts showing query time degradation above ~50ms P99. Signs to migrate: (1) vector search queries dominate DB load, (2) need sub-10ms P99 at scale, (3) need multi-tenant vector isolation. Qdrant offers HNSW with better recall/speed tradeoff at scale. Migration path: dual-write to both, gradually shift reads to Qdrant, validate recall quality."

**Q: What's the difference between IVFFlat and HNSW?**
> A: "IVFFlat: divides vectors into `lists` clusters, probes `ef_search` nearest clusters at query time. Faster to build, less memory. Good for up to ~1M vectors. HNSW: hierarchical graph of vectors, logarithmic search complexity, better recall. Uses more memory (roughly 100 bytes/vector for M=16). Better for production at scale. We use IVFFlat now; would switch to HNSW around 500k vectors."

---

## 5. Message Queues & Background Jobs

### What We Built
BullMQ with 5 queues (ai-generation, embedding, analytics, email, notification), exponential backoff retry, dead-letter queue, and scheduled cron jobs.

### Key Talking Points

**Why queues for AI operations?**
> Gemini API calls take 2-15 seconds. Blocking the HTTP request that long would: (1) tie up a Node.js thread, (2) cause client timeouts, (3) make the system appear slow. Queuing the job returns 202 Accepted immediately, the AI work happens in the background, and results are polled or pushed via notification.

**Retry strategy:**
- AI jobs: exponential backoff (1s, 2s, 4s) — Gemini rate limits need cool-off time
- Email jobs: fixed 30s delay × 5 retries — email servers might be temporarily unavailable
- After all retries exhausted: moves to dead-letter queue for manual inspection

### Hard Questions

**Q: What's the difference between at-most-once, at-least-once, and exactly-once delivery?**
> A: "**At-most-once**: job may be dropped if worker crashes — use for analytics events where losing a few is acceptable. **At-least-once**: job will be retried until success — may cause duplicates. Our system uses this for emails (need to deliver) with idempotency keys to detect duplicates. **Exactly-once**: guaranteed no duplicates or losses — very hard to achieve without distributed transactions (2PC). For most real-world systems, at-least-once + idempotency is the practical choice."

**Q: How would you handle a queue backlog of 1 million jobs?**
> A: "(1) Add more workers (horizontal scaling) — our workers are stateless. (2) Prioritize critical jobs (email) over batch jobs (embeddings) using BullMQ priority queues. (3) Rate limit new job intake to prevent cascade failures. (4) If backlog is permanent, move to Kafka which can handle millions of events/second with durable persistence."

---

## 6. AI Engineering

### What We Built
Gemini API integration with exponential backoff retry, per-user rate limiting (Redis sliding window), structured JSON output, cost tracking, and full audit logging.

### Key Talking Points

**Prompt engineering principles used:**
- System prompt separates AI "persona" from task instructions
- Explicit JSON schema in the prompt — Gemini's JSON mode ensures valid JSON
- Temperature tuning: 0.2 for SEO (precise), 0.9 for titles (creative)
- Content length limits in prompts (`content.slice(0, 4000)`) prevent token overuse

**Cost optimization:**
- Use `gemini-1.5-flash` (not Pro) for standard operations — 10x cheaper
- Cache AI-generated content (don't regenerate on every request)
- Store tokens and cost per request in `ai_requests` table — identify expensive operations
- Rate limit per user (10/min, 100/day) prevents runaway costs

### Hard Questions

**Q: How do you prevent prompt injection attacks?**
> A: "(1) Never concatenate user input directly into system prompts. (2) Use separate system/user prompt roles — Gemini gives them different trust levels. (3) Strip or escape special characters from user input before interpolation. (4) Implement output validation — if AI returns unexpected format, reject and retry. (5) Log all prompts in `ai_requests` for audit trail."

**Q: How do you handle hallucinations in AI-generated content?**
> A: "(1) Use structured output (JSON schema) — reduces hallucination by constraining output format. (2) Temperature tuning — lower for factual tasks (SEO, tags), higher for creative tasks. (3) Human review in workflow — AI generates, human approves before publish. (4) Quality scoring — our analyze-quality endpoint gives a score that editors can use to decide if AI content needs revision. (5) Never auto-publish AI content without human review."

---

## 7. Security

### What We Built
API key management, JWT refresh token rotation with family tracking, rate limiting, audit logging, and role-based access control.

### Key Talking Points

**Refresh token rotation with family invalidation:**
> If a refresh token is used twice (attacker stole it and used it), the server detects the "token family" has been compromised and revokes ALL tokens in that family — forcing the legitimate user to log in again. This prevents token theft from being silently exploitable.

**API key security:**
- Keys stored as bcrypt hash — not the raw key
- Short prefix stored for display ("ak_xyz12345...") without exposing full key
- Keys are scoped: `read`, `write`, `admin` — principle of least privilege
- Cached for 5 minutes to avoid DB hit on every request

### Hard Questions

**Q: Walk me through how you'd prevent a DDoS attack**
> A: "(1) **Rate limiting at API level** — our Redis sliding window limiter. (2) **CDN DDoS protection** — Cloudflare/AWS Shield at the edge before traffic reaches our servers. (3) **IP blocklisting** — automatically block IPs exceeding thresholds. (4) **Query cost limiting** — expensive operations (AI generation, semantic search) have separate lower limits. (5) **Circuit breaker pattern** — automatically pause endpoints under extreme load to protect the DB."

---

## 8. Observability

### What We Built
Winston structured logging, X-Request-ID tracing, /health /ready /live endpoints, cache metrics, job monitoring (Bull Board).

### Talking Points

**The three pillars of observability:**
1. **Logs**: Structured JSON with `requestId`, `userId`, `latency_ms` — correlatable across services
2. **Metrics**: Cache hit rate, AI latency P99, queue depth (Bull Board)
3. **Traces**: `X-Request-ID` propagated through all downstream calls (AI, DB, cache)

**Health check design:**
- `/health` — comprehensive check, used by monitoring
- `/ready` — Kubernetes readiness probe (traffic stops if DB is down)
- `/live` — Kubernetes liveness probe (just "is the process alive?")

The separation matters: if DB is temporarily down, `/live` still returns 200 (don't restart the pod) but `/ready` returns 503 (stop sending traffic until recovered).

---

## Summary: "Tell Me About Your Most Complex Project"

> "I built an AI Content Intelligence Platform — think Strapi meets Notion AI meets Surfer SEO. It's a production-grade backend with 14 major systems:

> The foundation is PostgreSQL with pgvector for both relational data and semantic vector search, replacing SQLite. On top of that I built a Gemini API integration layer with exponential backoff retry, per-user rate limiting via Redis sliding windows, structured prompt templates, and full cost/token audit logging.

> The search system uses 768-dimensional text embeddings (text-embedding-004), stored with IVFFlat indexing in pgvector, with a hybrid semantic+BM25 search using Reciprocal Rank Fusion scoring. Recommendations use a multi-signal weighted model: 40% vector similarity, 25% category match, 20% tag overlap, 15% time-decayed engagement.

> For reliability: BullMQ handles all async operations with exponential backoff, dead-letter queues, and daily cron jobs. Redis provides multi-layer caching with pattern-based invalidation. The content workflow state machine enforces role-based transitions with immutable audit logs. Winston gives structured logging with X-Request-ID tracing, and Kubernetes-compatible health endpoints.

> It's containerized with a multi-stage Docker build and Docker Compose stack, and designed to scale horizontally from a single server to 10k+ req/s."
