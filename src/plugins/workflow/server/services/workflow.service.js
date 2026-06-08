'use strict';

/**
 * Workflow Service
 * AI Content Intelligence Platform
 *
 * Content state machine with role-based transition enforcement
 * and immutable audit logging.
 *
 * States: draft → in_review → approved → published → archived
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../services/logger.service');

// ----------------------------------------------------------------
// State Machine Definition
// ----------------------------------------------------------------
const TRANSITIONS = {
  draft: {
    in_review: ['author', 'editor', 'admin', 'super_admin'],
    published: ['admin', 'super_admin'], // Skip review for admin
  },
  in_review: {
    approved: ['editor', 'admin', 'super_admin'],
    draft: ['editor', 'admin', 'super_admin'], // Reject = back to draft
  },
  approved: {
    published: ['admin', 'super_admin'],
    in_review: ['editor', 'admin', 'super_admin'], // Un-approve
  },
  published: {
    archived: ['admin', 'super_admin'],
    draft: ['admin', 'super_admin'], // Unpublish
  },
  archived: {
    draft: ['admin', 'super_admin'], // Restore
    published: ['admin', 'super_admin'],
  },
};

const workflowService = {
  /**
   * Validate a state transition
   */
  validateTransition(currentStatus, targetStatus, userRole) {
    const allowedTargets = TRANSITIONS[currentStatus];

    if (!allowedTargets) {
      return { valid: false, error: `Unknown current status: ${currentStatus}` };
    }

    if (!allowedTargets[targetStatus]) {
      const validTransitions = Object.keys(allowedTargets).join(', ');
      return {
        valid: false,
        error: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Valid transitions: ${validTransitions}`,
      };
    }

    const allowedRoles = allowedTargets[targetStatus];
    if (!allowedRoles.includes(userRole)) {
      return {
        valid: false,
        error: `Role '${userRole}' cannot transition to '${targetStatus}'. Required roles: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN_TRANSITION',
      };
    }

    return { valid: true };
  },

  /**
   * Execute a workflow transition
   */
  async transition({ articleId, toStatus, comment, user, ipAddress, requestId }) {
    const knex = strapi.db.connection;

    // Get current article
    const article = await knex('articles')
      .where('id', articleId)
      .first('id', 'title', 'workflow_status', 'author_id');

    if (!article) {
      throw Object.assign(new Error('Article not found'), { status: 404 });
    }

    const fromStatus = article.workflow_status;

    // Get user's role
    const userProfile = await knex('user_profiles')
      .where('user_id', user.id)
      .first('role');

    const userRole = userProfile?.role || 'reader';

    // Validate transition
    const validation = this.validateTransition(fromStatus, toStatus, userRole);
    if (!validation.valid) {
      throw Object.assign(new Error(validation.error), {
        status: validation.code === 'FORBIDDEN_TRANSITION' ? 403 : 400,
        code: validation.code,
      });
    }

    // Apply transition
    const updateData = { workflow_status: toStatus, updated_at: new Date() };
    if (toStatus === 'published' && fromStatus !== 'published') {
      updateData.published_at = new Date();
    }

    await knex('articles').where('id', articleId).update(updateData);

    // Write audit log (immutable)
    await this.writeAuditLog({
      entity: 'article',
      entityId: articleId,
      action: 'workflow_transition',
      oldValue: { workflow_status: fromStatus },
      newValue: { workflow_status: toStatus },
      changedFields: ['workflow_status'],
      userId: user.id,
      userEmail: user.email,
      ipAddress,
      requestId,
      metadata: { comment: comment?.slice(0, 500) },
    });

    // Trigger notification (async)
    this._triggerWorkflowNotification({ article, fromStatus, toStatus, actor: user });

    logger.info('workflow_transition', {
      articleId,
      articleTitle: article.title,
      from: fromStatus,
      to: toStatus,
      userId: user.id,
      userRole,
    });

    return {
      articleId,
      fromStatus,
      toStatus,
      transitionedAt: new Date().toISOString(),
      actor: { id: user.id, email: user.email },
    };
  },

  /**
   * Write an immutable audit log entry
   */
  async writeAuditLog({ entity, entityId, action, oldValue, newValue, changedFields, userId, userEmail, ipAddress, requestId, metadata }) {
    const knex = strapi.db.connection;
    try {
      await knex('audit_logs').insert({
        id: uuidv4(),
        entity,
        entity_id: entityId,
        action,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        changed_fields: changedFields || [],
        user_id: userId || null,
        user_email: userEmail || null,
        ip_address: ipAddress || null,
        request_id: requestId || null,
        created_at: new Date(),
      });
    } catch (err) {
      logger.error('Failed to write audit log', { error: err.message, entity, entityId });
    }
  },

  /**
   * Get audit trail for an entity
   */
  async getAuditTrail(entityId, entity = 'article') {
    const knex = strapi.db.connection;
    return knex('audit_logs')
      .where({ entity, entity_id: entityId })
      .orderBy('created_at', 'desc')
      .select('id', 'action', 'old_value', 'new_value', 'user_email', 'created_at');
  },

  /**
   * Trigger notifications for workflow events
   */
  async _triggerWorkflowNotification({ article, fromStatus, toStatus, actor }) {
    try {
      const notificationMap = {
        approved: {
          userId: article.author_id,
          type: 'article_approved',
          title: 'Article Approved! 🎉',
          body: `"${article.title}" has been approved by ${actor.email}`,
        },
        draft: fromStatus === 'in_review' ? {
          userId: article.author_id,
          type: 'article_rejected',
          title: 'Article Needs Revision',
          body: `"${article.title}" was sent back for revision by ${actor.email}`,
        } : null,
        published: {
          userId: article.author_id,
          type: 'article_published',
          title: 'Article Published! 🚀',
          body: `"${article.title}" is now live!`,
        },
      };

      const notif = notificationMap[toStatus];
      if (notif && notif.userId) {
        const knex = strapi.db.connection;
        await knex('notifications').insert({
          id: uuidv4(),
          ...notif,
          action_url: `/articles/${article.id}`,
          metadata: JSON.stringify({ articleId: article.id }),
          is_read: false,
          created_at: new Date(),
        });
      }
    } catch (err) {
      logger.error('Failed to send workflow notification', { error: err.message });
    }
  },
};

module.exports = workflowService;
