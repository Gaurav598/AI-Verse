'use strict';

/**
 * API Key Middleware
 * AI Content Intelligence Platform
 *
 * Validates scoped API keys for programmatic access.
 * API keys can be used as an alternative to JWT tokens.
 *
 * Header: Authorization: ApiKey <key>
 */

const crypto = require('crypto');
const cacheService = require('../services/cache.service');
const logger = require('../services/logger.service');

const API_KEY_PREFIX = 'ak_';
const CACHE_TTL = 300; // 5 min

module.exports = (config = {}, { strapi }) => {
  return async (ctx, next) => {
    const authHeader = ctx.get('Authorization');

    // Only handle ApiKey scheme (JWT handled by Strapi natively)
    if (!authHeader || !authHeader.startsWith('ApiKey ')) {
      return next();
    }

    const rawKey = authHeader.slice(7).trim();

    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid API key format' };
      return;
    }

    try {
      // Check cache first
      const cacheKey = `apikey:${rawKey.slice(0, 16)}`;
      let apiKeyRecord = await cacheService.get(cacheKey);

      if (!apiKeyRecord) {
        // Hash the key for DB lookup
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        // Look up in database via raw Knex query
        const knex = strapi.db.connection;
        const records = await knex('api_keys')
          .where({ key_hash: keyHash, is_active: true })
          .whereNull('expires_at')
          .orWhere('expires_at', '>', new Date())
          .limit(1);

        if (!records || records.length === 0) {
          logger.warn('api_key_invalid', { prefix: rawKey.slice(0, 12), ip: ctx.ip });
          ctx.status = 401;
          ctx.body = { error: 'Invalid or expired API key' };
          return;
        }

        apiKeyRecord = records[0];

        // Update last_used_at (async, don't block)
        knex('api_keys')
          .where({ id: apiKeyRecord.id })
          .update({ last_used_at: new Date() })
          .catch(() => {});

        // Cache for 5 minutes
        await cacheService.set(cacheKey, apiKeyRecord, CACHE_TTL);
      }

      // Attach user and scopes to context
      ctx.state.apiKey = {
        id: apiKeyRecord.id,
        userId: apiKeyRecord.user_id,
        scopes: apiKeyRecord.scopes || [],
      };

      // Load user and set on context (Strapi pattern)
      if (apiKeyRecord.user_id) {
        const user = await strapi.query('plugin::users-permissions.user').findOne({
          where: { id: apiKeyRecord.user_id },
          populate: ['role'],
        });
        if (user) {
          ctx.state.user = user;
          ctx.state.isAuthenticatedUser = true;
        }
      }

      logger.debug('api_key_authenticated', {
        keyId: apiKeyRecord.id,
        userId: apiKeyRecord.user_id,
        scopes: apiKeyRecord.scopes,
      });

      return next();
    } catch (err) {
      logger.error('api_key_error', { error: err.message, requestId: ctx.requestId });
      ctx.status = 500;
      ctx.body = { error: 'Authentication error' };
    }
  };
};
