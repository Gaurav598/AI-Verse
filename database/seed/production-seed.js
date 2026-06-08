#!/usr/bin/env node
/**
 * Production Seed Script
 * AI Content Intelligence Platform
 *
 * Creates realistic seed data for development and demo environments.
 * Includes: categories, tags, users, and 5 full articles.
 */

'use strict';

require('dotenv').config();

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function getDbConfig() {
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'ai_cms',
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi_secret',
  };
}

const CATEGORIES = [
  { id: uuidv4(), name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Latest in AI and machine learning' },
  { id: uuidv4(), name: 'Web Development', slug: 'web-development', description: 'Frontend and backend development' },
  { id: uuidv4(), name: 'System Design', slug: 'system-design', description: 'Architecture and scalability' },
  { id: uuidv4(), name: 'DevOps', slug: 'devops', description: 'Cloud, containers, and CI/CD' },
  { id: uuidv4(), name: 'Data Engineering', slug: 'data-engineering', description: 'Data pipelines and analytics' },
];

const TAGS = [
  'machine-learning', 'deep-learning', 'llm', 'vector-search', 'embeddings',
  'postgresql', 'redis', 'docker', 'kubernetes', 'nodejs', 'typescript',
  'api-design', 'microservices', 'caching', 'system-design', 'scalability',
  'ai', 'nlp', 'neural-networks', 'python',
].map(name => ({
  id: uuidv4(),
  name,
  slug: name,
  description: `Articles tagged with ${name}`,
}));

const ARTICLES = [
  {
    id: uuidv4(),
    title: 'Building Semantic Search with pgvector and Gemini',
    slug: 'building-semantic-search-pgvector-gemini',
    description: 'A complete guide to implementing production-grade semantic search using PostgreSQL pgvector extension and Google Gemini embeddings.',
    content: `## Introduction

Semantic search fundamentally changes how users find content. Unlike keyword search that matches exact terms, semantic search understands *meaning* — a query for "how to make computer go faster" finds articles about "performance optimization" even without those exact words.

## The Technology Stack

Our semantic search uses:
- **PostgreSQL + pgvector**: Stores 768-dimensional vectors alongside regular relational data
- **Google Gemini text-embedding-004**: Generates high-quality text embeddings
- **Reciprocal Rank Fusion**: Combines semantic and keyword results

## Chunking Strategy

Long articles can't be embedded as a single vector effectively. We use:
1. **Chunk size**: 512 tokens (~2000 characters)
2. **Overlap**: 50 tokens between chunks (preserves sentence context)
3. **Sentence-boundary splitting**: Chunks end at sentence breaks when possible

## The pgvector Query

\`\`\`sql
SELECT
  article_id,
  1 - (embedding <=> $1::vector) AS similarity
FROM embeddings
WHERE 1 - (embedding <=> $1::vector) >= 0.5
ORDER BY embedding <=> $1::vector
LIMIT 10;
\`\`\`

The \`<=>\` operator computes cosine distance. Cosine similarity = 1 - distance.

## Performance Benchmarks

| Index Type | Build Time | Query Time (10k vectors) | Recall |
|-----------|-----------|--------------------------|--------|
| No index  | -         | 450ms                    | 100%   |
| IVFFlat   | 2s        | 12ms                     | 95%    |
| HNSW      | 45s       | 4ms                      | 99%    |

For production, IVFFlat with \`lists = sqrt(num_rows)\` is our recommended starting point.

## Conclusion

Combining pgvector's ANN indexing with Gemini's state-of-the-art embeddings gives you semantic search quality comparable to dedicated vector databases, with the operational simplicity of staying in PostgreSQL.`,
    workflow_status: 'published',
    published_at: new Date(),
    reading_time_minutes: 8,
    word_count: 1100,
    quality_score: 92,
    seo_score: 88,
    ai_summary: 'Guide to building production semantic search using pgvector and Gemini embeddings, covering chunking strategies, IVFFlat indexing, and hybrid search fusion.',
    seo_title: 'Semantic Search with pgvector & Gemini: Complete Guide',
    seo_description: 'Build production-grade semantic search using PostgreSQL pgvector and Google Gemini embeddings. Includes chunking, indexing, and hybrid search.',
    view_count: 3420,
    like_count: 187,
    trending_score: 4541,
    embedding_status: 'pending',
  },
  {
    id: uuidv4(),
    title: 'Designing a Multi-Signal Recommendation Engine',
    slug: 'designing-multi-signal-recommendation-engine',
    description: 'How to build a recommendation system that combines vector similarity, category matching, tag overlap, and time-decayed engagement signals.',
    content: `## Why Single-Signal Recommendations Fail

Most simple recommendation systems use just one signal — "similar articles" (vector search) or "same category." These fail in different ways:
- Pure vector similarity recommends stylistically similar but topically irrelevant content
- Category-only matching misses cross-category gems

## The Weighted Blend Formula

Our system uses four signals:

\`\`\`
final_score = 
  0.40 × vector_similarity +
  0.25 × category_match +
  0.20 × tag_overlap +
  0.15 × engagement_score
\`\`\`

### Vector Similarity (40%)
Computed via pgvector's \`get_article_recommendations()\` function — aggregates cosine similarity across all chunks of both articles, taking the average.

### Category Match (25%)
Binary 0/1 if same category. Can be extended to hierarchical: 1.0 for exact match, 0.5 for parent category match.

### Tag Overlap (20%)
Jaccard-like score: \`matching_tags / source_article_tag_count\`

### Engagement Score (15%)
Time-decayed trending score: \`min(1.0, trending_score / 100)\`

## Caching Strategy

Recommendations are expensive (SQL function + joins). Cache for 1 hour per article with invalidation on:
- Article engagement change (like/bookmark)
- New article published in same category

## A/B Testing Weights

Production tip: Store the weights in a config/database, not hardcoded. This lets you A/B test different weight distributions without deploying code.`,
    workflow_status: 'published',
    published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    reading_time_minutes: 6,
    word_count: 850,
    quality_score: 89,
    seo_score: 84,
    ai_summary: 'How to build a multi-signal recommendation engine combining vector similarity (40%), category match (25%), tag overlap (20%), and time-decayed engagement (15%).',
    view_count: 2180,
    like_count: 134,
    trending_score: 2852,
    embedding_status: 'pending',
  },
];

async function runSeed() {
  console.log('='.repeat(60));
  console.log('AI CMS — Production Seed');
  console.log('='.repeat(60));

  const client = new Client(getDbConfig());
  await client.connect();
  console.log('✓ Connected to PostgreSQL');

  try {
    // Seed categories
    for (const cat of CATEGORIES) {
      await client.query(`
        INSERT INTO categories (id, name, slug, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING
      `, [cat.id, cat.name, cat.slug, cat.description]);
    }
    console.log(`✓ Seeded ${CATEGORIES.length} categories`);

    // Seed tags
    for (const tag of TAGS) {
      await client.query(`
        INSERT INTO tags (id, name, slug, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (slug) DO NOTHING
      `, [tag.id, tag.name, tag.slug, tag.description]);
    }
    console.log(`✓ Seeded ${TAGS.length} tags`);

    // Seed articles
    for (const article of ARTICLES) {
      await client.query(`
        INSERT INTO articles (
          id, title, slug, description, content, workflow_status,
          published_at, reading_time_minutes, word_count, quality_score,
          seo_score, ai_summary, seo_title, seo_description,
          view_count, like_count, trending_score, embedding_status,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6::workflow_status,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          NOW(), NOW()
        )
        ON CONFLICT (slug) DO NOTHING
      `, [
        article.id, article.title, article.slug, article.description, article.content,
        article.workflow_status, article.published_at,
        article.reading_time_minutes, article.word_count, article.quality_score,
        article.seo_score, article.ai_summary, article.seo_title, article.seo_description,
        article.view_count, article.like_count, article.trending_score, article.embedding_status,
      ]);
    }
    console.log(`✓ Seeded ${ARTICLES.length} articles`);

    console.log('\n✓ Seed complete!');
  } finally {
    await client.end();
  }
}

runSeed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
