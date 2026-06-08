'use strict';

/**
 * AI Content Service
 * AI Content Intelligence Platform
 *
 * Business logic layer for all AI content operations.
 * Orchestrates Gemini calls, job queuing, and database storage.
 */

const geminiService = require('./gemini.service');
const { buildPrompt } = require('./prompt-templates');
const logger = require('../../services/logger.service');

const aiContentService = {
  /**
   * Generate a complete article from a topic
   */
  async generateArticle({ topic, tone, audience, wordCount, outline, userId }) {
    const { system, user } = buildPrompt('GENERATE_ARTICLE', { topic, tone, audience, wordCount, outline });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_article',
      jsonMode: true,
      temperature: 0.8,
      maxTokens: 8192,
    });

    let parsed;
    try {
      parsed = JSON.parse(result.text);
    } catch (e) {
      throw new Error('AI returned invalid JSON for article generation');
    }

    return {
      ...parsed,
      aiGenerated: true,
      generatedAt: new Date().toISOString(),
      model: result.model,
      tokens: result.tokens,
      costUsd: result.costUsd,
    };
  },

  /**
   * Generate article outline
   */
  async generateOutline({ topic, depth, userId }) {
    const { system, user } = buildPrompt('GENERATE_OUTLINE', { topic, depth });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_article',
      jsonMode: true,
      temperature: 0.7,
    });

    return JSON.parse(result.text);
  },

  /**
   * Generate multiple title options
   */
  async generateTitles({ topic, count, existingTitle, userId }) {
    const { system, user } = buildPrompt('GENERATE_TITLES', { topic, count, existingTitle });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_article',
      jsonMode: true,
      temperature: 0.9, // Higher creativity for titles
    });

    return JSON.parse(result.text);
  },

  /**
   * Generate summary for existing article
   */
  async generateSummary({ content, maxLength, userId, articleId }) {
    const { system, user } = buildPrompt('GENERATE_SUMMARY', { content, maxLength });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_summary',
      jsonMode: true,
      temperature: 0.5, // Lower for summaries — more factual
      articleId,
    });

    return JSON.parse(result.text);
  },

  /**
   * Generate SEO metadata
   */
  async generateSeo({ title, content, targetKeyword, userId, articleId }) {
    const { system, user } = buildPrompt('GENERATE_SEO', { title, content, targetKeyword });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_seo',
      jsonMode: true,
      temperature: 0.3, // Low — SEO should be precise
      articleId,
    });

    return JSON.parse(result.text);
  },

  /**
   * Generate tags for an article
   */
  async generateTags({ title, content, existingCategories, userId, articleId }) {
    const { system, user } = buildPrompt('GENERATE_TAGS', { title, content, existingCategories });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'generate_tags',
      jsonMode: true,
      temperature: 0.4,
      articleId,
    });

    return JSON.parse(result.text);
  },

  /**
   * Improve existing article content
   */
  async improveContent({ content, improvements, userId, articleId }) {
    const validImprovements = ['grammar', 'readability', 'engagement', 'structure', 'conciseness'];
    const filtered = improvements.filter(i => validImprovements.includes(i));

    if (filtered.length === 0) {
      throw new Error(`No valid improvements specified. Valid options: ${validImprovements.join(', ')}`);
    }

    const { system, user } = buildPrompt('IMPROVE_CONTENT', { content, improvements: filtered });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'improve_content',
      jsonMode: true,
      temperature: 0.6,
      articleId,
    });

    return JSON.parse(result.text);
  },

  /**
   * Analyze content quality
   */
  async analyzeQuality({ title, content, userId, articleId }) {
    const { system, user } = buildPrompt('ANALYZE_QUALITY', { title, content });

    const result = await geminiService.generate(system, user, {
      userId,
      requestType: 'improve_content',
      jsonMode: true,
      temperature: 0.2,
      articleId,
    });

    return JSON.parse(result.text);
  },
};

module.exports = aiContentService;
