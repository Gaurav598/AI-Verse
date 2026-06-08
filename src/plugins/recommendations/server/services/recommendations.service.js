'use strict';

/**
 * Recommendations Service
 * AI Content Intelligence Platform
 *
 * Multi-signal recommendation engine combining:
 * - Vector similarity (40%)
 * - Category matching (25%)
 * - Tag overlap (20%)
 * - Engagement score (15%)
 *
 * Results cached in Redis for 1 hour.
 */

const cacheService = require('../../services/cache.service');
const logger = require('../../services/logger.service');

const WEIGHTS = {
  VECTOR_SIMILARITY: 0.40,
  CATEGORY_MATCH: 0.25,
  TAG_OVERLAP: 0.20,
  ENGAGEMENT: 0.15,
};

const recommendationsService = {
  /**
   * Get recommendations for an article
   */
  async getRecommendations(articleId, options = {}) {
    const { limit = 10, userId } = options;

    const cacheKey = `${cacheService.NAMESPACES.RECS}${articleId}:${limit}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const knex = strapi.db.connection;
    const start = Date.now();

    // Get source article metadata
    const sourceArticle = await knex('articles')
      .where('id', articleId)
      .first('id', 'category_id', 'view_count', 'like_count', 'bookmark_count');

    if (!sourceArticle) {
      throw new Error('Article not found');
    }

    // Get source article tags
    const sourceTags = await knex('article_tags')
      .where('article_id', articleId)
      .pluck('tag_id');

    // ---- Signal 1: Vector Similarity via pgvector SQL function ----
    let vectorCandidates = [];
    try {
      const vectorResult = await knex.raw(`
        SELECT * FROM get_article_recommendations(?, ?, ?)
      `, [articleId, limit * 3, 0.4]);
      vectorCandidates = vectorResult.rows || [];
    } catch (err) {
      logger.warn('Vector similarity failed for recommendations', { articleId, error: err.message });
    }

    // ---- Signal 2: Category + Tag based candidates ----
    const contentCandidates = await knex('articles as a')
      .leftJoin('article_tags as at', 'a.id', 'at.article_id')
      .where('a.workflow_status', 'published')
      .where('a.id', '!=', articleId)
      .where(builder => {
        builder.where('a.category_id', sourceArticle.category_id);
        if (sourceTags.length > 0) {
          builder.orWhereIn('at.tag_id', sourceTags);
        }
      })
      .groupBy('a.id', 'a.category_id', 'a.view_count', 'a.like_count', 'a.bookmark_count', 'a.trending_score')
      .select(
        'a.id',
        'a.category_id',
        'a.view_count',
        'a.like_count',
        'a.bookmark_count',
        'a.trending_score',
        knex.raw('COUNT(at.tag_id) AS matching_tags'),
        knex.raw('SUM(CASE WHEN at.tag_id = ANY(?) THEN 1 ELSE 0 END) AS tag_overlap_count', [sourceTags])
      )
      .limit(limit * 3);

    // ---- Merge and score all candidates ----
    const candidateMap = new Map();

    // Add vector similarity scores
    vectorCandidates.forEach(c => {
      candidateMap.set(c.article_id, {
        id: c.article_id,
        vectorScore: parseFloat(c.avg_similarity) || 0,
        categoryScore: 0,
        tagScore: 0,
        engagementScore: 0,
      });
    });

    // Add/merge content-based scores
    contentCandidates.forEach(c => {
      const existing = candidateMap.get(c.id) || {
        id: c.id,
        vectorScore: 0,
        categoryScore: 0,
        tagScore: 0,
        engagementScore: 0,
      };

      // Category match (binary for now, can be hierarchy-aware)
      existing.categoryScore = c.category_id === sourceArticle.category_id ? 1.0 : 0;

      // Tag overlap (Jaccard-like)
      const overlap = parseInt(c.tag_overlap_count) || 0;
      existing.tagScore = sourceTags.length > 0 ? overlap / sourceTags.length : 0;

      // Engagement score (time-decayed trending)
      existing.engagementScore = Math.min(1.0, parseFloat(c.trending_score || 0) / 100);

      candidateMap.set(c.id, existing);
    });

    // ---- Calculate weighted final scores ----
    const scored = Array.from(candidateMap.values())
      .map(c => ({
        ...c,
        finalScore:
          WEIGHTS.VECTOR_SIMILARITY * c.vectorScore +
          WEIGHTS.CATEGORY_MATCH * c.categoryScore +
          WEIGHTS.TAG_OVERLAP * c.tagScore +
          WEIGHTS.ENGAGEMENT * c.engagementScore,
      }))
      .filter(c => c.finalScore > 0)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    if (scored.length === 0) {
      return { articleId, recommendations: [], total: 0, latencyMs: Date.now() - start };
    }

    // ---- Fetch article details ----
    const ids = scored.map(c => c.id);
    const articles = await knex('articles as a')
      .whereIn('a.id', ids)
      .leftJoin('categories as c', 'a.category_id', 'c.id')
      .select(
        'a.id', 'a.title', 'a.slug', 'a.description', 'a.cover_url',
        'a.reading_time_minutes', 'a.published_at', 'a.view_count', 'a.like_count',
        'a.ai_summary', 'c.name as category_name', 'c.slug as category_slug'
      );

    const articleMap = new Map(articles.map(a => [a.id, a]));

    const recommendations = scored
      .map(s => {
        const article = articleMap.get(s.id);
        if (!article) return null;
        return {
          id: article.id,
          title: article.title,
          slug: article.slug,
          description: article.description,
          coverUrl: article.cover_url,
          readingTimeMinutes: article.reading_time_minutes,
          publishedAt: article.published_at,
          summary: article.ai_summary,
          category: article.category_name
            ? { name: article.category_name, slug: article.category_slug }
            : null,
          stats: { views: article.view_count, likes: article.like_count },
          score: {
            final: parseFloat(s.finalScore.toFixed(4)),
            breakdown: {
              vectorSimilarity: parseFloat(s.vectorScore.toFixed(4)),
              categoryMatch: parseFloat(s.categoryScore.toFixed(4)),
              tagOverlap: parseFloat(s.tagScore.toFixed(4)),
              engagement: parseFloat(s.engagementScore.toFixed(4)),
            },
          },
        };
      })
      .filter(Boolean);

    const result = {
      articleId,
      recommendations,
      total: recommendations.length,
      latencyMs: Date.now() - start,
    };

    await cacheService.set(cacheKey, result, cacheService.DEFAULT_TTL.RECS);
    return result;
  },
};

module.exports = recommendationsService;
