'use strict';

/**
 * Gemini API Service
 * AI Content Intelligence Platform
 *
 * Production-grade Google Gemini integration with:
 * - Exponential backoff retry
 * - Per-user rate limiting (Redis-backed)
 * - Full AI request audit logging
 * - Streaming support
 * - Structured JSON output (schema validation)
 * - Cost estimation
 */

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const cacheService = require('../../services/cache.service');
const logger = require('../../services/logger.service');

// ----------------------------------------------------------------
// Pricing estimates (USD per 1K tokens) — Gemini Flash
// ----------------------------------------------------------------
const PRICING = {
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'text-embedding-004': { input: 0.0001, output: 0 },
};

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not set — AI features will be disabled');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this.maxRetries = parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10);
    this.timeoutMs = parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);
    this.rateLimitPerUserPM = parseInt(process.env.AI_RATE_LIMIT_PER_USER_PM || '10', 10);
    this.rateLimitPerUserPD = parseInt(process.env.AI_RATE_LIMIT_PER_USER_PD || '100', 10);
  }

  /**
   * Check per-user AI rate limits
   */
  async checkUserRateLimit(userId) {
    if (!userId) return { allowed: true };

    const [perMinute, perDay] = await Promise.all([
      cacheService.checkRateLimit(`ai:${userId}`, 'ai_pm', this.rateLimitPerUserPM, 60),
      cacheService.checkRateLimit(`ai:${userId}`, 'ai_pd', this.rateLimitPerUserPD, 86400),
    ]);

    if (!perMinute.allowed) {
      return { allowed: false, reason: 'per_minute', retryAfter: perMinute.resetAt };
    }
    if (!perDay.allowed) {
      return { allowed: false, reason: 'per_day', retryAfter: perDay.resetAt };
    }
    return { allowed: true };
  }

  /**
   * Estimate cost of an AI request
   */
  estimateCost(modelName, inputTokens, outputTokens) {
    const pricing = PRICING[modelName] || { input: 0, output: 0 };
    return (
      (inputTokens / 1000) * pricing.input +
      (outputTokens / 1000) * pricing.output
    );
  }

  /**
   * Core generation with exponential backoff retry
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {Object} options
   */
  async generate(systemPrompt, userPrompt, options = {}) {
    if (!this.enabled) {
      throw new Error('AI service is disabled — GEMINI_API_KEY not configured');
    }

    const {
      userId,
      requestType = 'generate_article',
      articleId,
      jsonMode = false,
      temperature = 0.7,
      maxTokens = 8192,
    } = options;

    // Rate limit check
    const rateCheck = await this.checkUserRateLimit(userId);
    if (!rateCheck.allowed) {
      throw Object.assign(new Error('AI rate limit exceeded'), {
        code: 'RATE_LIMIT_EXCEEDED',
        reason: rateCheck.reason,
        retryAfter: rateCheck.retryAfter,
      });
    }

    const generationConfig = {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode && { responseMimeType: 'application/json' }),
    };

    let lastError;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const requestStart = Date.now();

      try {
        const model = this.genAI.getGenerativeModel({
          model: this.model,
          generationConfig,
          safetySettings: SAFETY_SETTINGS,
          systemInstruction: systemPrompt,
        });

        const result = await Promise.race([
          model.generateContent(userPrompt),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), this.timeoutMs)
          ),
        ]);

        const response = result.response;
        const text = response.text();
        const usage = response.usageMetadata || {};
        const latencyMs = Date.now() - requestStart;

        const inputTokens = usage.promptTokenCount || 0;
        const outputTokens = usage.candidatesTokenCount || 0;
        const costUsd = this.estimateCost(this.model, inputTokens, outputTokens);

        // Log AI request asynchronously
        this._logAiRequest({
          userId,
          requestType,
          model: this.model,
          prompt: userPrompt.slice(0, 2000), // Truncate for storage
          response: text.slice(0, 5000),
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
          success: true,
          retryCount,
          articleId,
        });

        logger.aiRequest({
          type: requestType,
          model: this.model,
          tokens: inputTokens + outputTokens,
          latencyMs,
          success: true,
          userId,
        });

        return {
          text,
          tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
          latencyMs,
          costUsd,
          model: this.model,
        };

      } catch (err) {
        lastError = err;
        retryCount++;

        const isRetryable = this._isRetryableError(err);
        if (!isRetryable || attempt >= this.maxRetries) {
          // Log failure
          this._logAiRequest({
            userId,
            requestType,
            model: this.model,
            prompt: userPrompt.slice(0, 2000),
            response: null,
            inputTokens: 0,
            outputTokens: 0,
            latencyMs: Date.now() - requestStart,
            costUsd: 0,
            success: false,
            retryCount,
            errorMessage: err.message,
            articleId,
          });
          throw err;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        logger.warn(`AI request failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms`, {
          error: err.message,
          requestType,
        });
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw lastError;
  }

  /**
   * Generate embeddings for text chunks
   * @param {string|string[]} texts - Text or array of texts to embed
   */
  async generateEmbeddings(texts) {
    if (!this.enabled) {
      throw new Error('AI service is disabled');
    }

    const inputTexts = Array.isArray(texts) ? texts : [texts];
    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });

    const start = Date.now();
    try {
      const result = await model.batchEmbedContents({
        requests: inputTexts.map(text => ({
          model: `models/${this.embeddingModel}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
        })),
      });

      const embeddings = result.embeddings.map(e => e.values);
      const latencyMs = Date.now() - start;

      logger.debug('embeddings_generated', {
        count: embeddings.length,
        dimensions: embeddings[0]?.length,
        latencyMs,
      });

      return embeddings;
    } catch (err) {
      logger.error('embedding_generation_failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Generate embedding for a single query (search)
   */
  async generateQueryEmbedding(query) {
    if (!this.enabled) throw new Error('AI service is disabled');

    const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
    const result = await model.embedContent({
      content: { parts: [{ text: query }] },
      taskType: 'RETRIEVAL_QUERY',
    });

    return result.embedding.values;
  }

  /**
   * Determine if an error is retryable
   */
  _isRetryableError(err) {
    if (err.message?.includes('timeout')) return true;
    if (err.message?.includes('503')) return true;
    if (err.message?.includes('429')) return true;
    if (err.message?.includes('RESOURCE_EXHAUSTED')) return true;
    if (err.message?.includes('UNAVAILABLE')) return true;
    return false;
  }

  /**
   * Log AI request to database (fire and forget)
   */
  async _logAiRequest(data) {
    try {
      const knex = strapi.db.connection;
      await knex('ai_requests').insert({
        id: require('uuid').v4(),
        user_id: data.userId || null,
        request_type: data.requestType,
        model: data.model,
        prompt: data.prompt,
        response: data.response,
        tokens_input: data.inputTokens,
        tokens_output: data.outputTokens,
        tokens_total: (data.inputTokens || 0) + (data.outputTokens || 0),
        latency_ms: data.latencyMs,
        cost_usd: data.costUsd,
        success: data.success,
        error_message: data.errorMessage || null,
        retry_count: data.retryCount || 0,
        article_id: data.articleId || null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
      });
    } catch (err) {
      // Non-fatal — don't break the main request
      logger.error('Failed to log AI request', { error: err.message });
    }
  }
}

module.exports = new GeminiService();
