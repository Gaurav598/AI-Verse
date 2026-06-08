'use strict';

/**
 * AI Content Controller
 * AI Content Intelligence Platform
 *
 * Handles all AI content generation endpoints.
 * Validates input, enforces auth, returns structured responses.
 */

const aiContentService = require('../services/ai-content.service');
const logger = require('../../services/logger.service');

const aiController = {
  /**
   * POST /api/ai/generate-article
   */
  async generateArticle(ctx) {
    const userId = ctx.state?.user?.id;
    const { topic, tone, audience, wordCount, outline } = ctx.request.body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 5) {
      return ctx.badRequest('Topic must be at least 5 characters');
    }

    if (wordCount && (wordCount < 200 || wordCount > 5000)) {
      return ctx.badRequest('wordCount must be between 200 and 5000');
    }

    try {
      const result = await aiContentService.generateArticle({
        topic: topic.trim(),
        tone,
        audience,
        wordCount,
        outline,
        userId,
      });

      ctx.body = { data: result };
    } catch (err) {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        ctx.status = 429;
        ctx.body = {
          error: 'AI rate limit exceeded',
          reason: err.reason,
          retryAfter: err.retryAfter,
        };
        return;
      }
      logger.error('generate_article_error', { error: err.message, userId, requestId: ctx.requestId });
      ctx.internalServerError('AI generation failed: ' + err.message);
    }
  },

  /**
   * POST /api/ai/generate-outline
   */
  async generateOutline(ctx) {
    const userId = ctx.state?.user?.id;
    const { topic, depth } = ctx.request.body;

    if (!topic?.trim()) return ctx.badRequest('Topic is required');

    try {
      const result = await aiContentService.generateOutline({ topic, depth, userId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'generate_outline_error', userId);
    }
  },

  /**
   * POST /api/ai/generate-titles
   */
  async generateTitles(ctx) {
    const userId = ctx.state?.user?.id;
    const { topic, count, existingTitle } = ctx.request.body;

    if (!topic?.trim()) return ctx.badRequest('Topic is required');
    if (count && (count < 1 || count > 10)) return ctx.badRequest('count must be 1-10');

    try {
      const result = await aiContentService.generateTitles({ topic, count, existingTitle, userId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'generate_titles_error', userId);
    }
  },

  /**
   * POST /api/ai/generate-summary
   */
  async generateSummary(ctx) {
    const userId = ctx.state?.user?.id;
    const { content, maxLength, articleId } = ctx.request.body;

    if (!content || content.trim().length < 100) {
      return ctx.badRequest('Content must be at least 100 characters');
    }

    try {
      const result = await aiContentService.generateSummary({ content, maxLength, userId, articleId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'generate_summary_error', userId);
    }
  },

  /**
   * POST /api/ai/generate-seo
   */
  async generateSeo(ctx) {
    const userId = ctx.state?.user?.id;
    const { title, content, targetKeyword, articleId } = ctx.request.body;

    if (!title?.trim()) return ctx.badRequest('Title is required');
    if (!content || content.trim().length < 50) return ctx.badRequest('Content must be at least 50 characters');

    try {
      const result = await aiContentService.generateSeo({ title, content, targetKeyword, userId, articleId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'generate_seo_error', userId);
    }
  },

  /**
   * POST /api/ai/generate-tags
   */
  async generateTags(ctx) {
    const userId = ctx.state?.user?.id;
    const { title, content, existingCategories, articleId } = ctx.request.body;

    if (!title?.trim()) return ctx.badRequest('Title is required');
    if (!content || content.trim().length < 50) return ctx.badRequest('Content must be at least 50 characters');

    try {
      const result = await aiContentService.generateTags({
        title, content, existingCategories, userId, articleId,
      });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'generate_tags_error', userId);
    }
  },

  /**
   * POST /api/ai/improve-content
   */
  async improveContent(ctx) {
    const userId = ctx.state?.user?.id;
    const { content, improvements, articleId } = ctx.request.body;

    if (!content || content.trim().length < 100) {
      return ctx.badRequest('Content must be at least 100 characters');
    }

    if (!improvements || !Array.isArray(improvements) || improvements.length === 0) {
      return ctx.badRequest('improvements must be a non-empty array');
    }

    try {
      const result = await aiContentService.improveContent({ content, improvements, userId, articleId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'improve_content_error', userId);
    }
  },

  /**
   * POST /api/ai/analyze-quality
   */
  async analyzeQuality(ctx) {
    const userId = ctx.state?.user?.id;
    const { title, content, articleId } = ctx.request.body;

    if (!title?.trim()) return ctx.badRequest('Title is required');
    if (!content || content.trim().length < 100) return ctx.badRequest('Content must be at least 100 characters');

    try {
      const result = await aiContentService.analyzeQuality({ title, content, userId, articleId });
      ctx.body = { data: result };
    } catch (err) {
      this._handleError(ctx, err, 'analyze_quality_error', userId);
    }
  },

  /**
   * Centralized error handler
   */
  _handleError(ctx, err, logKey, userId) {
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      ctx.status = 429;
      ctx.body = { error: 'AI rate limit exceeded', reason: err.reason, retryAfter: err.retryAfter };
      return;
    }
    logger.error(logKey, { error: err.message, userId, requestId: ctx.requestId });
    ctx.internalServerError('AI operation failed: ' + err.message);
  },
};

module.exports = aiController;
