'use strict';

const { v4: uuidv4 } = require('uuid');
const logger = require('../../services/logger.service');

const notificationController = {
  /**
   * GET /api/notifications
   */
  async list(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const { page = 1, pageSize = 20, unreadOnly } = ctx.query;
    const knex = strapi.db.connection;

    let query = knex('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(parseInt(pageSize, 10))
      .offset((parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    if (unreadOnly === 'true') {
      query = query.where('is_read', false);
    }

    const [notifications, countResult] = await Promise.all([
      query.select('*'),
      knex('notifications').where('user_id', userId).where('is_read', false).count('id as count').first(),
    ]);

    ctx.body = {
      data: notifications,
      meta: {
        unreadCount: parseInt(countResult.count),
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    };
  },

  /**
   * PATCH /api/notifications/:id/read
   */
  async markRead(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const { id } = ctx.params;
    const knex = strapi.db.connection;

    await knex('notifications')
      .where({ id, user_id: userId })
      .update({ is_read: true, read_at: new Date() });

    ctx.body = { data: { success: true } };
  },

  /**
   * PATCH /api/notifications/read-all
   */
  async markAllRead(ctx) {
    const userId = ctx.state?.user?.id;
    if (!userId) return ctx.unauthorized();

    const knex = strapi.db.connection;
    await knex('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true, read_at: new Date() });

    ctx.body = { data: { success: true } };
  },
};

module.exports = notificationController;
