# Sequence Diagrams — AI Content Intelligence Platform

## 1. AI Article Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Strapi as Strapi API
    participant RL as Rate Limiter (Redis)
    participant AI as AI Content Service
    participant Gemini as Gemini API
    participant DB as PostgreSQL
    participant Queue as BullMQ

    Client->>Strapi: POST /api/ai/generate-article
    Strapi->>RL: Check user rate limit (10/min)
    alt Rate limit exceeded
        RL-->>Strapi: blocked
        Strapi-->>Client: 429 Too Many Requests
    else
        RL-->>Strapi: allowed
        Strapi->>AI: generateArticle(topic, tone, userId)
        AI->>Gemini: generateContent(systemPrompt, userPrompt)
        note over Gemini: Attempt 1 — model: gemini-1.5-flash
        alt API Error (retryable)
            Gemini-->>AI: 503 UNAVAILABLE
            note over AI: Wait 1s (exponential backoff)
            AI->>Gemini: Retry attempt 2
        end
        Gemini-->>AI: Article JSON + usage metadata
        AI->>DB: INSERT ai_requests (tokens, cost, latency)
        AI-->>Strapi: { title, content, seoTitle, ... }
        Strapi->>Queue: Add embedding job (articleId)
        Strapi-->>Client: 200 { data: { article } }
        Queue-->>DB: Generate + store embeddings (async)
    end
```

---

## 2. Semantic Search Flow

```mermaid
sequenceDiagram
    participant Client
    participant Strapi as Strapi API
    participant Cache as Redis Cache
    participant AI as Embedding Service
    participant Gemini as Gemini API
    participant DB as PostgreSQL + pgvector

    Client->>Strapi: POST /api/search/semantic { query: "machine learning" }
    Strapi->>Cache: GET search:sem:{query_hash}
    alt Cache HIT
        Cache-->>Strapi: cached results
        Strapi-->>Client: 200 results (fast path ~2ms)
    else Cache MISS
        Cache-->>Strapi: null
        Strapi->>AI: generateQueryEmbedding("machine learning")
        AI->>Gemini: embedContent(query, taskType: RETRIEVAL_QUERY)
        Gemini-->>AI: [0.1, 0.2, ...768 dims]
        AI-->>Strapi: query vector
        Strapi->>DB: SELECT ... FROM search_similar_articles(vector, threshold)
        note over DB: IVFFlat ANN index scan<br/>cosine similarity <=>
        DB-->>Strapi: [{article_id, similarity_score, chunk_text}]
        Strapi->>DB: Enrich with article metadata + tags
        DB-->>Strapi: Full result set
        Strapi->>Cache: SET search:sem:{hash} TTL=300s
        Strapi-->>Client: 200 { results, latencyMs, searchType: "semantic" }
    end
```

---

## 3. Content Workflow Transition

```mermaid
sequenceDiagram
    participant Author
    participant Strapi as Strapi API
    participant WF as Workflow Service
    participant Auth as Auth Middleware
    participant DB as PostgreSQL
    participant Notif as Notification Service

    Author->>Strapi: POST /api/articles/:id/workflow/transition { to: "in_review" }
    Strapi->>Auth: Validate JWT + extract user role
    Auth-->>Strapi: { userId, role: "author" }
    Strapi->>WF: transition(articleId, "in_review", user)
    WF->>DB: SELECT article.workflow_status (current: "draft")
    DB-->>WF: { workflow_status: "draft" }
    WF->>WF: validateTransition("draft" → "in_review", "author")
    note over WF: TRANSITIONS["draft"]["in_review"] includes "author" ✓
    WF->>DB: UPDATE articles SET workflow_status="in_review"
    WF->>DB: INSERT audit_logs (immutable, IP logged)
    DB-->>WF: ok
    WF->>Notif: trigger notification to editor
    Notif->>DB: INSERT notifications (type: workflow_transition)
    Notif-->>WF: ok
    WF-->>Strapi: { fromStatus: "draft", toStatus: "in_review" }
    Strapi-->>Author: 200 { data: transition result }
```

---

## 4. Recommendation Engine

```mermaid
sequenceDiagram
    participant Client
    participant Strapi as Strapi API
    participant Cache as Redis
    participant Recs as Recommendations Service
    participant DB as PostgreSQL + pgvector

    Client->>Strapi: GET /api/articles/:id/recommendations?limit=10
    Strapi->>Cache: GET recs:{articleId}:10
    alt Cache HIT (TTL=1hr)
        Cache-->>Strapi: cached recommendations
        Strapi-->>Client: 200 recommendations (fast)
    else Cache MISS
        Strapi->>Recs: getRecommendations(articleId)
        Recs->>DB: get_article_recommendations(articleId) [pgvector SQL function]
        note over DB: Cross-article embedding similarity<br/>aggregated from all chunks
        DB-->>Recs: [(article_id, avg_similarity, max_similarity)]
        Recs->>DB: SELECT articles by category + shared tags
        DB-->>Recs: content-based candidates
        Recs->>Recs: Score = 0.40*vector + 0.25*category + 0.20*tags + 0.15*engagement
        Recs->>DB: Enrich top N with full article data
        DB-->>Recs: full articles
        Recs->>Cache: SET recs:{articleId}:10 TTL=3600s
        Recs-->>Strapi: recommendations with score breakdown
        Strapi-->>Client: 200 { recommendations, total }
    end
```

---

## 5. Embedding Generation (Background Job)

```mermaid
sequenceDiagram
    participant Hook as Lifecycle Hook
    participant Queue as BullMQ embedding queue
    participant Worker as Embedding Worker
    participant Chunker as Text Chunker
    participant Gemini as Gemini API
    participant DB as PostgreSQL

    Hook->>Queue: add("generate-embeddings", {articleId, article})
    note over Queue: Persisted in Redis<br/>Survives server restart
    Queue-->>Worker: process job
    Worker->>DB: UPDATE articles SET embedding_status="processing"
    Worker->>Chunker: chunkText(article.content, 2000 chars, 200 overlap)
    Chunker-->>Worker: ["chunk 0", "chunk 1", ... "chunk N"]
    Worker->>Gemini: batchEmbedContents([chunk0...chunk19])
    note over Gemini: Batched in groups of 20<br/>model: text-embedding-004
    Gemini-->>Worker: [[0.1, 0.2...], [0.3...], ...]  768-dim vectors
    Worker->>DB: DELETE FROM embeddings WHERE article_id=?
    loop For each chunk
        Worker->>DB: INSERT INTO embeddings (chunk_text, embedding::vector)
    end
    Worker->>DB: UPDATE articles SET embedding_status="done"
    note over Worker: If fails: status="failed"<br/>Retried up to 2x
```

---

## 6. Authentication + Refresh Token Flow

```mermaid
sequenceDiagram
    participant Client
    participant Strapi as Auth API
    participant DB as PostgreSQL

    Client->>Strapi: POST /api/auth/local { identifier, password }
    Strapi->>DB: Verify credentials (bcrypt)
    DB-->>Strapi: user object
    Strapi->>DB: INSERT refresh_tokens (family, hash, expires: 30d)
    Strapi-->>Client: { jwt (15min), refreshToken }

    note over Client: JWT expires after 15 minutes

    Client->>Strapi: POST /api/auth/refresh { refreshToken }
    Strapi->>DB: SELECT refresh_token WHERE hash=? AND is_revoked=false
    DB-->>Strapi: token record
    alt Token already used (family compromise detected)
        Strapi->>DB: Revoke ALL tokens in family (security breach)
        Strapi-->>Client: 401 Token family compromised
    else
        Strapi->>DB: Mark old token as used
        Strapi->>DB: INSERT new refresh_token (same family)
        Strapi-->>Client: { jwt (new 15min), newRefreshToken }
    end
```
