# API Reference — AI Content Intelligence Platform

## Base URL
```
http://localhost:1337
```

## Authentication
```http
Authorization: Bearer <jwt_token>
Authorization: ApiKey ak_<your_api_key>
```

---

## Health Checks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Full system health + service status |
| GET | `/ready` | None | Kubernetes readiness probe |
| GET | `/live` | None | Kubernetes liveness probe |

### GET /health
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-06-08T10:00:00Z",
  "uptime_seconds": 3600,
  "services": {
    "database": { "status": "up", "latency_ms": 2 },
    "redis": { "status": "up", "latency_ms": 1 },
    "jobs": { "status": "up", "queues": { "ai-generation": { "active": 2, "waiting": 5 } } }
  }
}
```

---

## AI Content Generation

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-article` | Generate complete article |
| POST | `/api/ai/generate-outline` | Generate article outline |
| POST | `/api/ai/generate-titles` | Generate 5 title options |
| POST | `/api/ai/generate-summary` | Summarize existing content |
| POST | `/api/ai/generate-seo` | Generate SEO metadata |
| POST | `/api/ai/generate-tags` | Auto-tag from content |
| POST | `/api/ai/improve-content` | Improve grammar/readability |
| POST | `/api/ai/analyze-quality` | Quality score analysis |

### POST /api/ai/generate-article
```json
// Request
{
  "topic": "Introduction to Machine Learning",
  "tone": "professional",
  "audience": "developers",
  "wordCount": 1200,
  "outline": "Optional outline to follow"
}

// Response 200
{
  "data": {
    "title": "Machine Learning Fundamentals: A Developer's Guide",
    "slug": "machine-learning-fundamentals-developers-guide",
    "description": "Comprehensive guide to ML concepts for software developers...",
    "content": "## Introduction\n\n...",
    "readingTimeMinutes": 6,
    "wordCount": 1247,
    "keyTakeaways": ["...", "...", "..."],
    "aiGenerated": true,
    "model": "gemini-1.5-flash",
    "tokens": { "input": 450, "output": 2100, "total": 2550 },
    "costUsd": 0.000788
  }
}

// Response 429 (rate limited)
{
  "error": "AI rate limit exceeded",
  "reason": "per_minute",
  "retryAfter": 1717840860000
}
```

### POST /api/ai/generate-seo
```json
// Request
{
  "title": "Machine Learning Guide",
  "content": "Full article content...",
  "targetKeyword": "machine learning tutorial",
  "articleId": "uuid-optional"
}

// Response 200
{
  "data": {
    "seoTitle": "Machine Learning Tutorial: Complete Beginner's Guide (2026)",
    "seoDescription": "Learn machine learning from scratch with our step-by-step guide...",
    "ogTitle": "...",
    "primaryKeyword": "machine learning tutorial",
    "secondaryKeywords": ["ml basics", "supervised learning"],
    "longTailKeywords": ["machine learning for beginners", "..."],
    "seoScore": 87,
    "keywordDensity": 1.8,
    "recommendations": ["Add more internal links", "Include FAQ section"]
  }
}
```

---

## Semantic Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/search/semantic` | None | Vector similarity search |
| POST | `/api/search/hybrid` | None | Semantic + BM25 fusion |
| GET | `/api/search/suggest?q=query` | None | Autocomplete suggestions |

### POST /api/search/semantic
```json
// Request
{
  "query": "deep learning neural networks image recognition",
  "limit": 10,
  "scoreThreshold": 0.5,
  "categoryId": "optional-category-uuid"
}

// Response 200
{
  "data": {
    "query": "deep learning neural networks image recognition",
    "results": [
      {
        "id": "article-uuid",
        "title": "Convolutional Neural Networks Explained",
        "slug": "cnn-explained",
        "description": "...",
        "coverUrl": "https://...",
        "readingTimeMinutes": 8,
        "publishedAt": "2026-06-01T00:00:00Z",
        "category": { "name": "AI/ML", "slug": "ai-ml" },
        "tags": [{ "name": "deep-learning", "slug": "deep-learning" }],
        "relevance": {
          "score": "0.8734",
          "matchingChunks": 3,
          "type": "semantic"
        },
        "stats": { "views": 12450, "likes": 234 }
      }
    ],
    "total": 7,
    "latencyMs": 145,
    "searchType": "semantic"
  }
}
```

---

## Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/articles/:id/recommendations` | None | Get AI recommendations |

### GET /api/articles/:id/recommendations?limit=10
```json
{
  "data": {
    "articleId": "source-uuid",
    "recommendations": [
      {
        "id": "rec-uuid",
        "title": "Related Article Title",
        "slug": "related-article-slug",
        "score": {
          "final": 0.7823,
          "breakdown": {
            "vectorSimilarity": 0.8500,
            "categoryMatch": 1.0000,
            "tagOverlap": 0.6667,
            "engagement": 0.2100
          }
        }
      }
    ],
    "total": 8,
    "latencyMs": 42
  }
}
```

---

## Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/analytics/view` | None | Record article view |
| GET | `/api/analytics/dashboard` | Required | Author dashboard |
| GET | `/api/analytics/trending` | None | Trending articles |
| GET | `/api/analytics/leaderboard/authors` | None | Top authors |

---

## Workflow

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/articles/:id/workflow/transition` | Required | Change workflow state |
| GET | `/api/articles/:id/workflow/history` | Required | View audit trail |

### POST /api/articles/:id/workflow/transition
```json
// Request
{
  "to": "in_review",
  "comment": "Ready for review — all sections completed"
}

// Response 200
{
  "data": {
    "articleId": "uuid",
    "fromStatus": "draft",
    "toStatus": "in_review",
    "transitionedAt": "2026-06-08T10:00:00Z",
    "actor": { "id": "user-uuid", "email": "author@example.com" }
  }
}

// Response 403 (wrong role)
{
  "error": "Forbidden",
  "message": "Role 'reader' cannot transition to 'approved'. Required roles: editor, admin"
}
```

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Required | List notifications |
| PATCH | `/api/notifications/:id/read` | Required | Mark as read |
| PATCH | `/api/notifications/read-all` | Required | Mark all read |

---

## Error Response Format

All errors follow a consistent format:
```json
{
  "error": {
    "status": 400,
    "name": "BadRequestError",
    "message": "Human-readable error description",
    "details": { "optional": "additional context" }
  }
}
```

## Rate Limit Headers
```http
RateLimit-Limit: 200
RateLimit-Remaining: 195
RateLimit-Reset: 1717840860
```
