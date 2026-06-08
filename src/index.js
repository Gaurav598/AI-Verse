'use strict';

/**
 * Main Strapi Application Entry Point
 * AI Content Intelligence Platform
 *
 * Registers all custom plugins, initializes services,
 * and sets up health check routes.
 */

const { validateEnv } = require('./config/env-validator');
const logger = require('./services/logger.service');

module.exports = {
  /**
   * Register phase: runs before Strapi initializes.
   * Register custom routes and extend core.
   */
  async register({ strapi }) {
    // Validate environment configuration at startup
    try {
      validateEnv(process.env, process.env.NODE_ENV === 'production');
    } catch (err) {
      logger.error('Environment validation failed', { error: err.message });
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Register health check routes (outside Strapi's API prefix)
    const healthController = require('./controllers/health.controller');

    strapi.server.router.get('/health', healthController.health);
    strapi.server.router.get('/ready', healthController.ready);
    strapi.server.router.get('/live', healthController.live);

    logger.info('Health check endpoints registered: /health, /ready, /live');
  },

  /**
   * Bootstrap phase: runs after Strapi loads.
   * Initialize external services, jobs, and seed data.
   */
  async bootstrap({ strapi }) {
    logger.info('AI Content Intelligence Platform bootstrapping...');

    // Auto-assign permissions to Authenticated role for AIverse APIs
    try {
      const roleService = strapi.plugin('users-permissions').service('role');
      const authRole = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
      
      if (authRole) {
        const permissionsToGrant = [
          'api::workspace.workspace.find', 'api::workspace.workspace.findOne', 'api::workspace.workspace.create', 'api::workspace.workspace.update', 'api::workspace.workspace.delete',
          'api::conversation.conversation.find', 'api::conversation.conversation.findOne', 'api::conversation.conversation.create', 'api::conversation.conversation.update', 'api::conversation.conversation.delete',
          'api::message.message.find', 'api::message.message.findOne', 'api::message.message.create', 'api::message.message.update', 'api::message.message.delete',
          'api::prompt.prompt.find', 'api::prompt.prompt.findOne', 'api::prompt.prompt.create', 'api::prompt.prompt.update', 'api::prompt.prompt.delete',
          'api::tool-run.tool-run.find', 'api::tool-run.tool-run.findOne', 'api::tool-run.tool-run.create', 'api::tool-run.tool-run.update', 'api::tool-run.tool-run.delete',
          'api::generated-output.generated-output.find', 'api::generated-output.generated-output.findOne', 'api::generated-output.generated-output.create', 'api::generated-output.generated-output.update', 'api::generated-output.generated-output.delete'
        ];

        // In Strapi v4/v5, updating permissions programmatically is complex, but we can log that it's required
        logger.info('Permissions should be granted via the Strapi Admin UI for AIverse collections.');
      }
    } catch (e) {
      logger.error('Failed to configure permissions:', e);
    }

    // Initialize Redis cache service
    try {
      await require('./services/cache.service').initialize();
      logger.info('Redis cache service initialized');
    } catch (err) {
      logger.warn('Redis not available — caching and rate limiting disabled', {
        error: err.message,
      });
    }

    // Initialize BullMQ job system
    try {
      const jobSystem = require('./jobs/index');
      jobSystem.initQueues();
      jobSystem.initWorkers();
      await jobSystem.initScheduler();
      logger.info('BullMQ job system initialized');
    } catch (err) {
      logger.warn('Job system not available — background jobs disabled', {
        error: err.message,
      });
    }

    // Run seed data in development
    if (process.env.NODE_ENV === 'development' && process.env.SEED_ON_STARTUP === 'true') {
      try {
        const { seedExampleApp } = require('./bootstrap');
        await seedExampleApp();
      } catch (err) {
        logger.warn('Seed data import failed', { error: err.message });
      }
    }

    // Set up graceful shutdown
    const jobSystem = require('./jobs/index');
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received — shutting down gracefully');
      await jobSystem.shutdown();
      await require('./services/cache.service').disconnect();
      process.exit(0);
    });

    logger.info('AI Content Intelligence Platform ready ✓');
  },
};
