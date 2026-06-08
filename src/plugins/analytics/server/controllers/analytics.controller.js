'use strict';

const analyticsService = require('../services/analytics.service');

module.exports = {
  /**
   * POST /api/analytics/view
   */
  async recordView(ctx) {
    const { articleId, sessionId, referrer, deviceType, readPercent, readingTimeS } = ctx.request.body;

    if (!articleId) return ctx.badRequest('articleId is required');

    const result = await analyticsService.recordView({
      articleId,
      userId: ctx.state?.user?.id,
      sessionId,
      ipAddress: ctx.ip,
      userAgent: ctx.get('User-Agent'),
      referrer,
      deviceType,
    });

    ctx.body = { data: result };
  },

  /**
   * GET /api/analytics/dashboard
   */
  async getDashboard(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const { days } = ctx.query;
    const result = await analyticsService.getDashboard(userId, { days: parseInt(days || '30', 10) });
    ctx.body = { data: result };
  },

  /**
   * GET /api/analytics/trending
   */
  async getTrending(ctx) {
    const { limit, days, categoryId } = ctx.query;
    const result = await analyticsService.getTrending({
      limit: parseInt(limit || '10', 10),
      days: parseInt(days || '7', 10),
      categoryId,
    });
    ctx.body = { data: result };
  },

  /**
   * GET /api/analytics/leaderboard/authors
   */
  async getAuthorLeaderboard(ctx) {
    const { limit } = ctx.query;
    const result = await analyticsService.getAuthorLeaderboard(parseInt(limit || '10', 10));
    ctx.body = { data: result };
  },
};
