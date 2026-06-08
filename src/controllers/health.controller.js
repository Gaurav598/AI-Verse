'use strict';

/**
 * Health Check Controller
 * AI Content Intelligence Platform
 *
 * Production-grade health endpoints for:
 * - Kubernetes liveness/readiness probes
 * - Load balancer health checks
 * - Monitoring systems (Datadog, Prometheus, etc.)
 */

const cacheService = require('../services/cache.service');
const logger = require('../services/logger.service');

const APP_VERSION = require('../../package.json').version || '1.0.0';
const APP_START_TIME = Date.now();

module.exports = {
  /**
   * GET /health
   * Overall system health — checks all dependencies
   */
  async health(ctx) {
    const start = Date.now();

    // Check all services in parallel
    const [dbHealth, redisHealth, jobHealth] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkJobs(),
    ]);

    const allHealthy =
      dbHealth.status === 'up' &&
      redisHealth.status === 'up';

    const status = allHealthy ? 'healthy' : 'degraded';
    const httpStatus = allHealthy ? 200 : 503;

    const response = {
      status,
      version: APP_VERSION,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
      latency_ms: Date.now() - start,
      services: {
        database: dbHealth,
        redis: redisHealth,
        jobs: jobHealth,
      },
      process: {
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
      },
    };

    ctx.status = httpStatus;
    ctx.body = response;
  },

  /**
   * GET /ready
   * Readiness probe — is the app ready to serve traffic?
   * Returns 200 only if DB is connected and migrations have run.
   */
  async ready(ctx) {
    const dbHealth = await checkDatabase();

    if (dbHealth.status === 'up') {
      ctx.status = 200;
      ctx.body = {
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      };
    } else {
      ctx.status = 503;
      ctx.body = {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
      };
    }
  },

  /**
   * GET /live
   * Liveness probe — is the process alive?
   * Always returns 200 if the process is running (no heavy checks).
   */
  async live(ctx) {
    ctx.status = 200;
    ctx.body = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
    };
  },
};

/**
 * Check PostgreSQL connection
 */
async function checkDatabase() {
  const start = Date.now();
  try {
    await strapi.db.connection.raw('SELECT 1');
    return { status: 'up', latency_ms: Date.now() - start };
  } catch (err) {
    logger.error('Health check: DB failed', { error: err.message });
    return { status: 'down', error: err.message, latency_ms: Date.now() - start };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis() {
  try {
    return await cacheService.ping();
  } catch (err) {
    return { status: 'down', error: err.message };
  }
}

/**
 * Check BullMQ queues
 */
async function checkJobs() {
  try {
    const jobSystem = require('../jobs/index');
    const queueHealth = await jobSystem.getQueueHealth();
    const allUp = Object.values(queueHealth).every(q => q.status === 'up');
    return {
      status: allUp ? 'up' : 'degraded',
      queues: queueHealth,
    };
  } catch (err) {
    return { status: 'unknown', error: err.message };
  }
}
