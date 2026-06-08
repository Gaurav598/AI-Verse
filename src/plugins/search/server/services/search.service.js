'use strict';

/**
 * Search Service
 * AI Content Intelligence Platform
 *
 * Semantic search using pgvector + hybrid BM25 ranking.
 * Returns results with relevance scores and rich metadata.
 */

const embeddingService = require('./embedding.service');
const cacheService = require('../../services/cache.service');
const logger = require('../../services/logger.service');

const searchService = {
  /**
   * Semantic search using vector similarity
   * @param {string} query - User search query
   * @param {Object} options - Search options
   */
  async semanticSearch(query, options = {}) {
    const {
      limit = 10,
      scoreThreshold = 0.5,
      categoryId,
      tagIds,
      excludeIds = [],
      userId,
    } = options;

    // Check cache
    const cacheKey = `${cacheService.NAMESPACES.SEARCH}sem:${Buffer.from(query).toString('base64').slice(0, 32)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    const knex = strapi.db.connection;

    // Generate query embedding
    const queryEmbedding = await embeddingService.generateQueryEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build semantic search query
    let sqlQuery = knex.raw(`
      WITH semantic_results AS (
        SELECT
          e.article_id,
          MAX(1 - (e.embedding <=> ?::vector)) AS similarity_score,
          COUNT(*) AS matching_chunks
        FROM embeddings e
        INNER JOIN articles a ON e.article_id = a.id
        WHERE
          a.workflow_status = 'published'
          AND 1 - (e.embedding <=> ?::vector) >= ?
          ${excludeIds.length > 0 ? `AND e.article_id NOT IN (${excludeIds.map(() => '?').join(',')})` : ''}
        GROUP BY e.article_id
        ORDER BY similarity_score DESC
        LIMIT ?
      )
      SELECT
        sr.article_id,
        sr.similarity_score,
        sr.matching_chunks,
        a.title,
        a.slug,
        a.description,
        a.cover_url,
        a.reading_time_minutes,
        a.published_at,
        a.view_count,
        a.like_count,
        a.ai_summary,
        c.name AS category_name,
        c.slug AS category_slug
      FROM semantic_results sr
      INNER JOIN articles a ON sr.article_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY sr.similarity_score DESC
    `, [
      embeddingStr,
      embeddingStr,
      scoreThreshold,
      ...excludeIds,
      limit,
    ]);

    const results = await sqlQuery;
    const rows = results.rows || [];

    // Enrich with tags
    const articleIds = rows.map(r => r.article_id);
    const tagMap = await this.fetchTagsForArticles(articleIds);

    const enriched = rows.map(row => ({
      id: row.article_id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      coverUrl: row.cover_url,
      readingTimeMinutes: row.reading_time_minutes,
      publishedAt: row.published_at,
      summary: row.ai_summary,
      category: row.category_name ? { name: row.category_name, slug: row.category_slug } : null,
      tags: tagMap[row.article_id] || [],
      relevance: {
        score: parseFloat(row.similarity_score).toFixed(4),
        matchingChunks: parseInt(row.matching_chunks),
        type: 'semantic',
      },
      stats: {
        views: row.view_count,
        likes: row.like_count,
      },
    }));

    const searchResult = {
      query,
      results: enriched,
      total: enriched.length,
      latencyMs: Date.now() - start,
      searchType: 'semantic',
    };

    // Cache results
    await cacheService.set(cacheKey, searchResult, cacheService.DEFAULT_TTL.SEARCH);

    logger.info('semantic_search', {
      query,
      results: enriched.length,
      latencyMs: Date.now() - start,
      userId,
    });

    return searchResult;
  },

  /**
   * Hybrid search: combines semantic + full-text BM25
   */
  async hybridSearch(query, options = {}) {
    const { limit = 10, semanticWeight = 0.7, userId } = options;

    const [semanticResults, fulltextResults] = await Promise.allSettled([
      this.semanticSearch(query, { ...options, limit: limit * 2 }),
      this.fulltextSearch(query, { ...options, limit: limit * 2 }),
    ]);

    // Reciprocal Rank Fusion (RRF) scoring
    const k = 60; // RRF constant
    const scores = new Map();

    if (semanticResults.status === 'fulfilled') {
      semanticResults.value.results.forEach((doc, rank) => {
        const rrf = semanticWeight * (1 / (k + rank + 1));
        scores.set(doc.id, { doc, score: rrf });
      });
    }

    if (fulltextResults.status === 'fulfilled') {
      fulltextResults.value.results.forEach((doc, rank) => {
        const rrf = (1 - semanticWeight) * (1 / (k + rank + 1));
        const existing = scores.get(doc.id);
        if (existing) {
          existing.score += rrf;
        } else {
          scores.set(doc.id, { doc, score: rrf });
        }
      });
    }

    const fused = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc, score }) => ({
        ...doc,
        relevance: { ...doc.relevance, score: score.toFixed(4), type: 'hybrid' },
      }));

    return {
      query,
      results: fused,
      total: fused.length,
      searchType: 'hybrid',
    };
  },

  /**
   * PostgreSQL full-text search (BM25 via ts_rank)
   */
  async fulltextSearch(query, options = {}) {
    const { limit = 10 } = options;
    const knex = strapi.db.connection;

    const results = await knex.raw(`
      SELECT
        a.id AS article_id,
        a.title,
        a.slug,
        a.description,
        a.cover_url,
        a.reading_time_minutes,
        a.published_at,
        a.view_count,
        a.like_count,
        ts_rank(
          to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.description, '')),
          plainto_tsquery('english', ?)
        ) AS bm25_score
      FROM articles a
      WHERE
        a.workflow_status = 'published'
        AND to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.description, ''))
            @@ plainto_tsquery('english', ?)
      ORDER BY bm25_score DESC
      LIMIT ?
    `, [query, query, limit]);

    const rows = results.rows || [];
    return {
      query,
      results: rows.map(row => ({
        id: row.article_id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        relevance: { score: parseFloat(row.bm25_score).toFixed(4), type: 'fulltext' },
      })),
      total: rows.length,
      searchType: 'fulltext',
    };
  },

  /**
   * Search autocomplete suggestions
   */
  async suggest(query, limit = 5) {
    const knex = strapi.db.connection;
    const results = await knex('articles')
      .where('workflow_status', 'published')
      .where('title', 'ilike', `%${query}%`)
      .select('id', 'title', 'slug')
      .limit(limit);

    return results.map(r => ({ id: r.id, title: r.title, slug: r.slug }));
  },

  /**
   * Fetch tags for multiple articles
   */
  async fetchTagsForArticles(articleIds) {
    if (!articleIds.length) return {};
    const knex = strapi.db.connection;

    const rows = await knex('article_tags as at')
      .join('tags as t', 'at.tag_id', 't.id')
      .whereIn('at.article_id', articleIds)
      .select('at.article_id', 't.name', 't.slug');

    const map = {};
    rows.forEach(row => {
      if (!map[row.article_id]) map[row.article_id] = [];
      map[row.article_id].push({ name: row.name, slug: row.slug });
    });
    return map;
  },
};

module.exports = searchService;
