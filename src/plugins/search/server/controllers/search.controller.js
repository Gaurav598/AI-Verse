'use strict';

const searchService = require('../services/search.service');

const searchController = {
  /**
   * POST /api/search/semantic
   */
  async semantic(ctx) {
    const { query, limit, scoreThreshold, categoryId, tagIds } = ctx.request.body;

    if (!query || query.trim().length < 2) {
      return ctx.badRequest('Query must be at least 2 characters');
    }
    if (limit && (limit < 1 || limit > 50)) {
      return ctx.badRequest('limit must be between 1 and 50');
    }

    const result = await searchService.semanticSearch(query.trim(), {
      limit: limit || 10,
      scoreThreshold: scoreThreshold || 0.5,
      categoryId,
      tagIds,
      userId: ctx.state?.user?.id,
    });

    ctx.body = { data: result };
  },

  /**
   * POST /api/search/hybrid
   */
  async hybrid(ctx) {
    const { query, limit, semanticWeight } = ctx.request.body;
    if (!query?.trim()) return ctx.badRequest('Query is required');

    const result = await searchService.hybridSearch(query.trim(), {
      limit: limit || 10,
      semanticWeight: semanticWeight || 0.7,
      userId: ctx.state?.user?.id,
    });

    ctx.body = { data: result };
  },

  /**
   * GET /api/search/suggest?q=...
   */
  async suggest(ctx) {
    const query = ctx.query.q;
    if (!query || query.trim().length < 2) {
      ctx.body = { data: [] };
      return;
    }

    const suggestions = await searchService.suggest(query.trim(), 8);
    ctx.body = { data: suggestions };
  },
};

module.exports = searchController;
