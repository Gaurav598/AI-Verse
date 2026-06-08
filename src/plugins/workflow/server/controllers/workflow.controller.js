'use strict';

const workflowService = require('../services/workflow.service');
const logger = require('../../services/logger.service');

module.exports = {
  /**
   * POST /api/articles/:id/workflow/transition
   */
  async transition(ctx) {
    const { id } = ctx.params;
    const { to, comment } = ctx.request.body;
    const user = ctx.state?.user;

    if (!user) return ctx.unauthorized();
    if (!to) return ctx.badRequest('Target status (to) is required');

    const validStatuses = ['draft', 'in_review', 'approved', 'published', 'archived'];
    if (!validStatuses.includes(to)) {
      return ctx.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    try {
      const result = await workflowService.transition({
        articleId: id,
        toStatus: to,
        comment,
        user,
        ipAddress: ctx.ip,
        requestId: ctx.requestId,
      });

      ctx.body = { data: result };
    } catch (err) {
      if (err.status === 403) {
        return ctx.forbidden(err.message);
      }
      if (err.status === 404) {
        return ctx.notFound(err.message);
      }
      if (err.status === 400) {
        return ctx.badRequest(err.message);
      }

      logger.error('workflow_transition_error', { error: err.message, articleId: id });
      ctx.internalServerError(err.message);
    }
  },

  /**
   * GET /api/articles/:id/workflow/history
   */
  async history(ctx) {
    const { id } = ctx.params;
    const trail = await workflowService.getAuditTrail(id, 'article');
    ctx.body = { data: trail };
  },
};
