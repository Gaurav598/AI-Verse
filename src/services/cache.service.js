'use strict';

/**
 * Redis Cache Service
 * AI Content Intelligence Platform
 *
 * Multi-layer caching with namespace prefixes, TTL management,
 * cache invalidation patterns, and hit/miss metrics.
 */

const { Redis } = require('ioredis');
const logger = require('./logger.service');

// ----------------------------------------------------------------
// Cache namespace prefixes
// ----------------------------------------------------------------
const NAMESPACES = {
  ARTICLE: 'article:',
  ARTICLES_LIST: 'articles:list:',
  CATEGORY: 'category:',
  CATEGORIES_LIST: 'categories:list',
  SEARCH: 'search:',
  RECS: 'recs:',
  ANALYTICS: 'analytics:',
  TRENDING: 'trending:',
  LEADERBOARD: 'leaderboard:',
  AI_RATE: 'ai:rate:',
  RATE_LIMIT: 'rl:',
  USER: 'user:',
  NOTIFICATIONS_COUNT: 'notif:count:',
};

// ----------------------------------------------------------------
// Default TTLs (seconds)
// ----------------------------------------------------------------
const DEFAULT_TTL = {
  ARTICLE: parseInt(process.env.CACHE_TTL_ARTICLE || '900', 10),        // 15 min
  CATEGORY: parseInt(process.env.CACHE_TTL_CATEGORY || '3600', 10),     // 1 hour
  SEARCH: parseInt(process.env.CACHE_TTL_SEARCH || '300', 10),          // 5 min
  RECS: parseInt(process.env.CACHE_TTL_RECS || '3600', 10),             // 1 hour
  TRENDING: parseInt(process.env.CACHE_TTL_TRENDING || '600', 10),      // 10 min
  ANALYTICS: parseInt(process.env.CACHE_TTL_ANALYTICS || '300', 10),    // 5 min
};

// ----------------------------------------------------------------
// Metrics tracking
// ----------------------------------------------------------------
const metrics = {
  hits: 0,
  misses: 0,
  errors: 0,
  invalidations: 0,
};

// ----------------------------------------------------------------
// Redis client
// ----------------------------------------------------------------
let client = null;

function getClient() {
  if (!client) {
    throw new Error('Cache service not initialized. Call cacheService.initialize() first.');
  }
  return client;
}

// ----------------------------------------------------------------
// Cache Service
// ----------------------------------------------------------------
const cacheService = {
  NAMESPACES,
  DEFAULT_TTL,

  /**
   * Initialize the Redis connection
   */
  async initialize() {
    if (client) return client;

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    };

    client = new Redis(redisConfig);

    client.on('connect', () => logger.info('Redis connected'));
    client.on('ready', () => logger.info('Redis ready'));
    client.on('error', (err) => {
      metrics.errors++;
      logger.error('Redis error', { error: err.message });
    });
    client.on('close', () => logger.warn('Redis connection closed'));

    return client;
  },

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    const start = Date.now();
    try {
      const raw = await getClient().get(key);
      const latencyMs = Date.now() - start;

      if (raw === null) {
        metrics.misses++;
        logger.cacheEvent({ key, hit: false, latencyMs });
        return null;
      }

      metrics.hits++;
      logger.cacheEvent({ key, hit: true, latencyMs });
      return JSON.parse(raw);
    } catch (err) {
      metrics.errors++;
      logger.error('Cache get error', { key, error: err.message });
      return null; // Graceful degradation
    }
  },

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} [ttl] - TTL in seconds
   */
  async set(key, value, ttl) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await getClient().setex(key, ttl, serialized);
      } else {
        await getClient().set(key, serialized);
      }
    } catch (err) {
      metrics.errors++;
      logger.error('Cache set error', { key, error: err.message });
    }
  },

  /**
   * Delete a specific key
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    try {
      await getClient().del(key);
      metrics.invalidations++;
    } catch (err) {
      logger.error('Cache del error', { key, error: err.message });
    }
  },

  /**
   * Delete all keys matching a pattern (uses SCAN for safety)
   * @param {string} pattern - Key pattern (e.g., 'article:*')
   */
  async invalidatePattern(pattern) {
    try {
      const redis = getClient();
      let cursor = '0';
      let count = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          count += keys.length;
        }
      } while (cursor !== '0');

      metrics.invalidations += count;
      logger.debug(`Cache invalidated ${count} keys matching: ${pattern}`);
      return count;
    } catch (err) {
      logger.error('Cache invalidate error', { pattern, error: err.message });
      return 0;
    }
  },

  /**
   * Cache-aside pattern: get from cache or compute and store
   * @param {string} key - Cache key
   * @param {Function} fn - Async function to compute value on miss
   * @param {number} ttl - TTL in seconds
   */
  async remember(key, fn, ttl) {
    const cached = await this.get(key);
    if (cached !== null) return cached;

    const value = await fn();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }
    return value;
  },

  /**
   * Invalidate all caches related to an article
   * @param {string} articleId
   * @param {string} slug
   */
  async invalidateArticle(articleId, slug) {
    await Promise.all([
      this.del(`${NAMESPACES.ARTICLE}${articleId}`),
      this.del(`${NAMESPACES.ARTICLE}slug:${slug}`),
      this.del(`${NAMESPACES.RECS}${articleId}`),
      this.invalidatePattern(`${NAMESPACES.ARTICLES_LIST}*`),
      this.invalidatePattern(`${NAMESPACES.SEARCH}*`),
    ]);
  },

  /**
   * Sliding window rate limit check
   * @param {string} identifier - user ID or IP
   * @param {string} action - Action being rate limited
   * @param {number} limit - Max requests
   * @param {number} windowSec - Window in seconds
   * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
   */
  async checkRateLimit(identifier, action, limit, windowSec) {
    const key = `${NAMESPACES.RATE_LIMIT}${action}:${identifier}`;
    const now = Date.now();
    const windowMs = windowSec * 1000;

    try {
      const redis = getClient();
      const pipeline = redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      // Count current entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      // Set expiry
      pipeline.expire(key, windowSec + 1);

      const results = await pipeline.exec();
      const count = results[1][1];

      const allowed = count < limit;
      const remaining = Math.max(0, limit - count - (allowed ? 1 : 0));

      return { allowed, remaining, resetAt: now + windowMs };
    } catch (err) {
      logger.error('Rate limit check error', { key, error: err.message });
      return { allowed: true, remaining: limit, resetAt: now + windowMs * 1000 };
    }
  },

  /**
   * Add item to a sorted set (for leaderboards)
   * @param {string} key
   * @param {string} member
   * @param {number} score
   * @param {number} ttl
   */
  async zset(key, member, score, ttl) {
    try {
      const redis = getClient();
      await redis.zadd(key, score, member);
      if (ttl) await redis.expire(key, ttl);
    } catch (err) {
      logger.error('Cache zset error', { key, error: err.message });
    }
  },

  /**
   * Get top N from sorted set (leaderboard)
   * @param {string} key
   * @param {number} n
   */
  async zTopN(key, n = 10) {
    try {
      return await getClient().zrevrange(key, 0, n - 1, 'WITHSCORES');
    } catch (err) {
      logger.error('Cache zTopN error', { key, error: err.message });
      return [];
    }
  },

  /**
   * Check if Redis is healthy
   */
  async ping() {
    try {
      const start = Date.now();
      await getClient().ping();
      return { status: 'up', latency_ms: Date.now() - start };
    } catch (err) {
      return { status: 'down', error: err.message };
    }
  },

  /**
   * Get cache metrics
   */
  getMetrics() {
    const total = metrics.hits + metrics.misses;
    return {
      ...metrics,
      hit_rate: total > 0 ? ((metrics.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  },

  /**
   * Graceful shutdown
   */
  async disconnect() {
    if (client) {
      await client.quit();
      client = null;
      logger.info('Redis disconnected');
    }
  },
};

module.exports = cacheService;
