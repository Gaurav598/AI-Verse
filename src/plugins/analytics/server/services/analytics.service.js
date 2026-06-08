'use strict';

/**
 * Analytics Service
 * AI Content Intelligence Platform
 *
 * Tracks views, engagement, calculates trending scores,
 * builds leaderboards, and supports daily aggregation.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const cacheService = require('../../services/cache.service');
const logger = require('../../services/logger.service');

// Trending score formula weights
const TRENDING_WEIGHTS = {
  VIEWS_7D: 1.0,
  LIKES_7D: 3.0,
  BOOKMARKS_7D: 2.0,
  COMMENTS_7D: 1.5,
};

const analyticsService = {
  /**
   * Record an article view
   * Deduplicates by session within 30 minutes
   */
  async recordView({ articleId, userId, sessionId, ipAddress, userAgent, referrer, deviceType }) {
    const knex = strapi.db.connection;

    // IP anonymization (SHA-256 hash of IP)
    const ipHash = ipAddress
      ? crypto.createHash('sha256').update(ipAddress).digest('hex')
      : null;

    // Deduplication: same session + article within 30 min = don't count
    if (sessionId) {
      const recentView = await knex('article_views')
        .where({ article_id: articleId, session_id: sessionId })
        .where('created_at', '>', new Date(Date.now() - 30 * 60 * 1000))
        .first();

      if (recentView) {
        return { counted: false, reason: 'duplicate_session' };
      }
    }

    // Insert view event
    await knex('article_views').insert({
      id: uuidv4(),
      article_id: articleId,
      user_id: userId || null,
      session_id: sessionId,
      ip_hash: ipHash,
      user_agent: userAgent?.slice(0, 500),
      referrer: referrer?.slice(0, 500),
      device_type: deviceType || 'unknown',
      created_at: new Date(),
    });

    // Update denormalized counter (atomic increment)
    await knex('articles')
      .where('id', articleId)
      .increment('view_count', 1);

    // Update unique view count (by IP hash)
    if (ipHash) {
      const uniqueView = await knex('article_views')
        .where({ article_id: articleId, ip_hash: ipHash })
        .count('id as count')
        .first();
      if (parseInt(uniqueView.count) === 1) {
        await knex('articles').where('id', articleId).increment('unique_view_count', 1);
      }
    }

    // Invalidate analytics cache
    await cacheService.del(`${cacheService.NAMESPACES.ANALYTICS}article:${articleId}`);

    return { counted: true };
  },

  /**
   * Record reading progress
   */
  async recordReadProgress({ viewId, articleId, readPercent, readingTimeS }) {
    const knex = strapi.db.connection;

    await knex('article_views')
      .where({ id: viewId, article_id: articleId })
      .update({
        read_percent: readPercent,
        reading_time_s: readingTimeS,
        bounced: readingTimeS < 30,
      });
  },

  /**
   * Get analytics dashboard for an article or author
   */
  async getDashboard(authorId, options = {}) {
    const { days = 30 } = options;
    const knex = strapi.db.connection;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const cacheKey = `${cacheService.NAMESPACES.ANALYTICS}dashboard:${authorId}:${days}d`;
    return cacheService.remember(cacheKey, async () => {
      const [articleStats, viewsTrend, topArticles] = await Promise.all([
        // Article-level aggregate stats
        knex('articles as a')
          .where('a.author_id', authorId)
          .select(
            knex.raw('COUNT(*) AS total_articles'),
            knex.raw('SUM(a.view_count) AS total_views'),
            knex.raw('SUM(a.like_count) AS total_likes'),
            knex.raw('SUM(a.bookmark_count) AS total_bookmarks'),
            knex.raw('SUM(a.comment_count) AS total_comments'),
            knex.raw("COUNT(*) FILTER (WHERE a.workflow_status = 'published') AS published_count"),
            knex.raw("COUNT(*) FILTER (WHERE a.workflow_status = 'draft') AS draft_count"),
          )
          .first(),

        // Daily views trend
        knex('article_views as av')
          .join('articles as a', 'av.article_id', 'a.id')
          .where('a.author_id', authorId)
          .where('av.created_at', '>=', since)
          .groupBy(knex.raw("DATE(av.created_at)"))
          .select(
            knex.raw("DATE(av.created_at) AS date"),
            knex.raw('COUNT(*) AS views'),
            knex.raw('COUNT(DISTINCT av.ip_hash) AS unique_views'),
          )
          .orderBy('date', 'asc'),

        // Top performing articles
        knex('articles')
          .where('author_id', authorId)
          .where('workflow_status', 'published')
          .orderBy('view_count', 'desc')
          .limit(5)
          .select('id', 'title', 'slug', 'view_count', 'like_count', 'published_at'),
      ]);

      return {
        summary: articleStats,
        viewsTrend,
        topArticles,
        period: `${days}d`,
        generatedAt: new Date().toISOString(),
      };
    }, cacheService.DEFAULT_TTL.ANALYTICS);
  },

  /**
   * Get trending articles
   */
  async getTrending(options = {}) {
    const { limit = 10, days = 7, categoryId } = options;
    const cacheKey = `${cacheService.NAMESPACES.TRENDING}${categoryId || 'all'}:${days}d:${limit}`;

    return cacheService.remember(cacheKey, async () => {
      const knex = strapi.db.connection;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      let query = knex('articles as a')
        .where('a.workflow_status', 'published')
        .where('a.published_at', '>=', since);

      if (categoryId) query = query.where('a.category_id', categoryId);

      const articles = await query
        .leftJoin('categories as c', 'a.category_id', 'c.id')
        .select(
          'a.id', 'a.title', 'a.slug', 'a.description', 'a.cover_url',
          'a.view_count', 'a.like_count', 'a.bookmark_count', 'a.comment_count',
          'a.trending_score', 'a.published_at', 'a.reading_time_minutes',
          'c.name as category_name', 'c.slug as category_slug'
        )
        .orderBy('a.trending_score', 'desc')
        .limit(limit);

      return articles;
    }, cacheService.DEFAULT_TTL.TRENDING);
  },

  /**
   * Get author leaderboard
   */
  async getAuthorLeaderboard(limit = 10) {
    return cacheService.remember(
      `${cacheService.NAMESPACES.LEADERBOARD}authors:${limit}`,
      async () => {
        const knex = strapi.db.connection;
        return knex('user_profiles as up')
          .leftJoin('articles as a', 'up.user_id', 'a.author_id')
          .where('a.workflow_status', 'published')
          .groupBy('up.id', 'up.user_id', 'up.total_views', 'up.article_count', 'up.bio', 'up.avatar_url')
          .select(
            'up.user_id',
            'up.bio',
            'up.avatar_url',
            'up.total_views',
            knex.raw('COUNT(a.id) AS article_count'),
            knex.raw('SUM(a.like_count) AS total_likes'),
          )
          .orderBy('up.total_views', 'desc')
          .limit(limit);
      },
      cacheService.DEFAULT_TTL.ANALYTICS
    );
  },

  /**
   * Recalculate trending scores for all published articles
   * Called by BullMQ cron job every 10 minutes
   */
  async recalculateTrendingScores() {
    const knex = strapi.db.connection;
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Calculate engagement in last 7 days per article
    const stats = await knex('article_views as av')
      .where('av.created_at', '>=', since7d)
      .groupBy('av.article_id')
      .select(
        'av.article_id',
        knex.raw('COUNT(*) AS views_7d')
      );

    const viewsMap = new Map(stats.map(s => [s.article_id, parseInt(s.views_7d)]));

    const likeStats = await knex.raw(`
      SELECT entity_id AS article_id, COUNT(*) AS likes_7d
      FROM likes
      WHERE entity_type = 'article' AND created_at >= ?
      GROUP BY entity_id
    `, [since7d]);

    const likesMap = new Map((likeStats.rows || []).map(s => [s.article_id, parseInt(s.likes_7d)]));

    const bookmarkStats = await knex('bookmarks')
      .where('created_at', '>=', since7d)
      .groupBy('article_id')
      .select('article_id', knex.raw('COUNT(*) AS bookmarks_7d'));

    const bookmarksMap = new Map(bookmarkStats.map(s => [s.article_id, parseInt(s.bookmarks_7d)]));

    // Update trending scores
    const allArticleIds = new Set([
      ...viewsMap.keys(),
      ...likesMap.keys(),
      ...bookmarksMap.keys(),
    ]);

    const updates = [];
    for (const articleId of allArticleIds) {
      const score =
        TRENDING_WEIGHTS.VIEWS_7D * (viewsMap.get(articleId) || 0) +
        TRENDING_WEIGHTS.LIKES_7D * (likesMap.get(articleId) || 0) +
        TRENDING_WEIGHTS.BOOKMARKS_7D * (bookmarksMap.get(articleId) || 0);

      updates.push(knex('articles').where('id', articleId).update({ trending_score: score }));
    }

    await Promise.all(updates);

    // Invalidate trending cache
    await cacheService.invalidatePattern(`${cacheService.NAMESPACES.TRENDING}*`);

    logger.info('Trending scores recalculated', { articlesUpdated: allArticleIds.size });
    return allArticleIds.size;
  },

  /**
   * Daily analytics aggregation (rollup)
   * Called by BullMQ cron job at 02:00 daily
   */
  async dailyRollup() {
    const knex = strapi.db.connection;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];

    const stats = await knex('article_views')
      .whereRaw("DATE(created_at) = ?", [date])
      .groupBy('article_id')
      .select(
        'article_id',
        knex.raw('COUNT(*) AS views'),
        knex.raw('COUNT(DISTINCT ip_hash) AS unique_views'),
        knex.raw('AVG(reading_time_s) AS avg_read_time_s'),
        knex.raw('COUNT(*) FILTER (WHERE bounced = true) * 100.0 / COUNT(*) AS bounce_rate'),
      );

    for (const row of stats) {
      await knex('article_analytics_daily')
        .insert({
          id: uuidv4(),
          article_id: row.article_id,
          date,
          views: parseInt(row.views),
          unique_views: parseInt(row.unique_views),
          avg_read_time_s: Math.round(parseFloat(row.avg_read_time_s) || 0),
          bounce_rate: parseFloat(row.bounce_rate || 0).toFixed(2),
        })
        .onConflict(['article_id', 'date'])
        .merge(['views', 'unique_views', 'avg_read_time_s', 'bounce_rate']);
    }

    logger.info('Daily analytics rollup complete', { date, articlesProcessed: stats.length });
    return stats.length;
  },
};

module.exports = analyticsService;
