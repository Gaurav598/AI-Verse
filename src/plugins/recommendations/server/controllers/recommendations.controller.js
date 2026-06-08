'use strict';

const recommendationsService = require('../services/recommendations.service');

module.exports = {
  async getRecommendations(ctx) {
    const { id } = ctx.params;
    const { limit } = ctx.query;

    if (!id) return ctx.badRequest('Article ID is required');

    const result = await recommendationsService.getRecommendations(id, {
      limit: limit ? parseInt(limit, 10) : 10,
      userId: ctx.state?.user?.id,
    });

    ctx.body = { data: result };
  },
};
