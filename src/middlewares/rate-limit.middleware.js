'use strict';

/**
 * Rate Limit Middleware
 * AI Content Intelligence Platform
 *
 * Redis-backed sliding window rate limiter.
 * Supports per-IP and per-user limits with configurable windows.
 */

const cacheService = require('../services/cache.service');
const logger = require('../services/logger.service');

const DEFAULT_WINDOW_SEC = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10) / 1000;
const DEFAULT_MAX_GLOBAL = parseInt(process.env.RATE_LIMIT_MAX_GLOBAL || '200', 10);
const DEFAULT_MAX_AUTH = parseInt(process.env.RATE_LIMIT_MAX_AUTH || '20', 10);

module.exports = (config = {}, { strapi }) => {
  const {
    windowSec = DEFAULT_WINDOW_SEC,
    maxGlobal = DEFAULT_MAX_GLOBAL,
    maxAuth = DEFAULT_MAX_AUTH,
    skipSuccessfulRequests = false,
    keyGenerator,
  } = config;

  return async (ctx, next) => {
    // Skip rate limiting for health checks
    if (ctx.path === '/health' || ctx.path === '/ready' || ctx.path === '/live') {
      return next();
    }

    const userId = ctx.state?.user?.id;
    const ip = ctx.ip;

    // Determine rate limit params
    const isAuthRoute = ctx.path.includes('/api/auth/');
    const limit = isAuthRoute ? maxAuth : maxGlobal;
    const identifier = userId ? `user:${userId}` : `ip:${ip}`;
    const action = isAuthRoute ? 'auth' : 'api';

    const { allowed, remaining, resetAt } = await cacheService.checkRateLimit(
      identifier,
      action,
      limit,
      windowSec
    );

    // Set rate limit headers (following IETF draft)
    ctx.set('RateLimit-Limit', String(limit));
    ctx.set('RateLimit-Remaining', String(remaining));
    ctx.set('RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      logger.warn('rate_limit_exceeded', {
        identifier,
        action,
        ip,
        userId,
        path: ctx.path,
        requestId: ctx.requestId,
      });

      ctx.status = 429;
      ctx.body = {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowSec)} seconds.`,
        retryAfter: Math.ceil(resetAt / 1000),
      };
      return;
    }

    await next();
  };
};
