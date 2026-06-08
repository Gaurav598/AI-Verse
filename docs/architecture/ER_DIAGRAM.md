# Entity-Relationship Diagram — AI Content Intelligence Platform

## Full ER Diagram

```mermaid
erDiagram
    UP_USERS {
        int id PK
        string email
        string username
        string password_hash
        boolean confirmed
        boolean blocked
        int role FK
    }

    USER_PROFILES {
        uuid id PK
        uuid user_id FK
        text bio
        string avatar_url
        enum role "super_admin|admin|editor|author|reader"
        int article_count
        bigint total_views
        boolean is_verified
        timestamptz last_active_at
    }

    CATEGORIES {
        uuid id PK
        string name
        string slug
        uuid parent_id FK
        int article_count
        int sort_order
    }

    TAGS {
        uuid id PK
        string name
        string slug
        int article_count
    }

    ARTICLES {
        uuid id PK
        string title
        string slug
        text description
        text content
        enum workflow_status "draft|in_review|approved|published|archived"
        uuid author_id FK
        uuid category_id FK
        text ai_summary
        string seo_title
        string seo_description
        text[] seo_keywords
        int reading_time_minutes
        int word_count
        decimal quality_score
        decimal seo_score
        decimal trending_score
        bigint view_count
        int like_count
        int bookmark_count
        enum embedding_status "pending|processing|done|failed"
        timestamptz published_at
    }

    ARTICLE_TAGS {
        uuid article_id FK
        uuid tag_id FK
        timestamptz created_at
    }

    COMMENTS {
        uuid id PK
        uuid article_id FK
        uuid author_id FK
        uuid parent_id FK
        text content
        boolean is_approved
        boolean is_flagged
        int like_count
    }

    LIKES {
        uuid id PK
        uuid user_id FK
        string entity_type "article|comment"
        uuid entity_id
    }

    BOOKMARKS {
        uuid id PK
        uuid user_id FK
        uuid article_id FK
    }

    ARTICLE_VIEWS {
        uuid id PK
        uuid article_id FK
        uuid user_id FK
        string session_id
        string ip_hash
        int reading_time_s
        int read_percent
        boolean bounced
        string device_type
    }

    ARTICLE_ANALYTICS_DAILY {
        uuid id PK
        uuid article_id FK
        date date
        int views
        int unique_views
        int likes
        int bookmarks
        decimal bounce_rate
    }

    EMBEDDINGS {
        uuid id PK
        uuid article_id FK
        int chunk_index
        text chunk_text
        vector embedding "768-dim"
        int token_count
        string model
    }

    AI_REQUESTS {
        uuid id PK
        uuid user_id FK
        uuid article_id FK
        enum request_type
        string model
        text prompt
        text response
        int tokens_total
        decimal cost_usd
        int latency_ms
        boolean success
        int retry_count
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        enum type
        string title
        text body
        boolean is_read
        timestamptz read_at
    }

    AUDIT_LOGS {
        uuid id PK
        string entity
        uuid entity_id
        enum action
        jsonb old_value
        jsonb new_value
        text[] changed_fields
        uuid user_id
        inet ip_address
        timestamptz created_at
    }

    API_KEYS {
        uuid id PK
        uuid user_id FK
        string name
        string key_hash
        text[] scopes
        timestamptz expires_at
        boolean is_active
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash
        uuid family
        boolean is_revoked
        timestamptz expires_at
    }

    UP_USERS ||--o| USER_PROFILES : "has profile"
    UP_USERS ||--o{ ARTICLES : "authors"
    UP_USERS ||--o{ COMMENTS : "writes"
    UP_USERS ||--o{ LIKES : "gives"
    UP_USERS ||--o{ BOOKMARKS : "saves"
    UP_USERS ||--o{ NOTIFICATIONS : "receives"
    UP_USERS ||--o{ API_KEYS : "owns"
    UP_USERS ||--o{ REFRESH_TOKENS : "has"
    UP_USERS ||--o{ AI_REQUESTS : "makes"

    CATEGORIES ||--o{ ARTICLES : "contains"
    CATEGORIES ||--o{ CATEGORIES : "parent_of"

    ARTICLES ||--o{ ARTICLE_TAGS : "tagged_with"
    TAGS ||--o{ ARTICLE_TAGS : "applied_to"
    ARTICLES ||--o{ COMMENTS : "receives"
    ARTICLES ||--o{ BOOKMARKS : "bookmarked_in"
    ARTICLES ||--o{ ARTICLE_VIEWS : "tracked_by"
    ARTICLES ||--o{ ARTICLE_ANALYTICS_DAILY : "aggregated_in"
    ARTICLES ||--o{ EMBEDDINGS : "chunked_into"
    ARTICLES ||--o{ AI_REQUESTS : "processed_by"

    COMMENTS ||--o{ COMMENTS : "parent_of"
    COMMENTS ||--o{ LIKES : "receives"
```

---

## Key Relationships

| Relationship | Type | Notes |
|-------------|------|-------|
| User → Articles | 1:Many | Author ownership |
| Articles → Categories | Many:1 | Single category per article |
| Articles → Tags | Many:Many | Via `article_tags` join |
| Articles → Embeddings | 1:Many | Multiple chunks per article |
| Comments → Comments | Self-referential | Threading via `parent_id` |
| Likes | Polymorphic | `entity_type` + `entity_id` pattern |
| Audit Logs | Immutable | Insert-only, tracks all changes |
