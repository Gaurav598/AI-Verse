'use strict';

/**
 * Request Trace Middleware
 * Attaches a unique X-Request-ID to every request for distributed tracing.
 * Also logs structured HTTP access logs.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../services/logger.service');

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    const requestId = ctx.get('X-Request-ID') || uuidv4();
    const start = Date.now();

    // Attach to context for downstream use
    ctx.requestId = requestId;
    ctx.state.requestId = requestId;

    // Set response header
    ctx.set('X-Request-ID', requestId);

    await next();

    const latencyMs = Date.now() - start;
    const userId = ctx.state?.user?.id;

    // Structured HTTP access log
    logger.http('http_request', {
      requestId,
      userId,
      method: ctx.method,
      path: ctx.path,
      status: ctx.status,
      latency_ms: latencyMs,
      ip: ctx.ip,
      userAgent: ctx.get('User-Agent')?.slice(0, 100),
      referer: ctx.get('Referer')?.slice(0, 200),
      contentLength: ctx.response.length,
    });
  };
};
