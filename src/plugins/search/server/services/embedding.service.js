'use strict';

/**
 * Embedding Service
 * AI Content Intelligence Platform
 *
 * Generates, stores, and manages vector embeddings for articles.
 * Uses text-embedding-004 via Gemini API and stores in pgvector.
 *
 * Chunking strategy:
 * - Split article content into 512-token chunks
 * - 50-token overlap between chunks (context preservation)
 * - Store each chunk with its embedding separately
 */

const geminiService = require('../../ai-content/server/services/gemini.service');
const logger = require('../../services/logger.service');
const { v4: uuidv4 } = require('uuid');

const CHUNK_SIZE_CHARS = 2000;    // ~512 tokens
const CHUNK_OVERLAP_CHARS = 200;  // ~50 tokens overlap

const embeddingService = {
  /**
   * Split text into overlapping chunks
   */
  chunkText(text, chunkSize = CHUNK_SIZE_CHARS, overlap = CHUNK_OVERLAP_CHARS) {
    if (!text || text.trim().length === 0) return [];

    const cleanText = text.replace(/\s+/g, ' ').trim();
    const chunks = [];
    let start = 0;

    while (start < cleanText.length) {
      const end = Math.min(start + chunkSize, cleanText.length);
      let chunkEnd = end;

      // Try to end at a sentence boundary if not at the very end
      if (end < cleanText.length) {
        const lastPeriod = cleanText.lastIndexOf('.', end);
        const lastNewline = cleanText.lastIndexOf('\n', end);
        const boundary = Math.max(lastPeriod, lastNewline);
        if (boundary > start + chunkSize / 2) {
          chunkEnd = boundary + 1;
        }
      }

      const chunk = cleanText.slice(start, chunkEnd).trim();
      if (chunk.length > 50) { // Skip very short chunks
        chunks.push(chunk);
      }

      start = chunkEnd - overlap;
      if (start >= cleanText.length) break;
    }

    return chunks;
  },

  /**
   * Build embeddable text from article fields
   */
  buildArticleText(article) {
    const parts = [
      article.title,
      article.description,
      article.ai_summary,
      article.content,
    ].filter(Boolean);
    return parts.join('\n\n');
  },

  /**
   * Generate and store embeddings for an article
   */
  async generateAndStore(articleId, article) {
    const knex = strapi.db.connection;

    try {
      // Mark as processing
      await knex('articles')
        .where({ id: articleId })
        .update({ embedding_status: 'processing' });

      const text = this.buildArticleText(article);
      if (!text || text.trim().length < 50) {
        logger.warn('Article has insufficient content for embedding', { articleId });
        await knex('articles').where({ id: articleId }).update({ embedding_status: 'done' });
        return;
      }

      const chunks = this.chunkText(text);
      logger.info('Generating embeddings', { articleId, chunkCount: chunks.length });

      // Generate embeddings in batches (API limit: 100 per batch)
      const BATCH_SIZE = 20;
      const allEmbeddings = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const embeddings = await geminiService.generateEmbeddings(batch);
        allEmbeddings.push(...embeddings);
      }

      // Delete existing embeddings for this article (for updates)
      await knex('embeddings').where({ article_id: articleId }).delete();

      // Insert all chunks with embeddings
      const rows = chunks.map((chunk, index) => ({
        id: uuidv4(),
        article_id: articleId,
        chunk_index: index,
        chunk_text: chunk,
        token_count: Math.ceil(chunk.length / 4), // Rough estimate
        model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
        // embedding stored as pgvector string format: '[x,y,z,...]'
        created_at: new Date(),
        updated_at: new Date(),
      }));

      // Insert embeddings using raw SQL to handle vector type
      for (let i = 0; i < rows.length; i++) {
        const embeddingStr = `[${allEmbeddings[i].join(',')}]`;
        await knex.raw(`
          INSERT INTO embeddings 
            (id, article_id, chunk_index, chunk_text, token_count, model, embedding, created_at, updated_at)
          VALUES 
            (?, ?, ?, ?, ?, ?, ?::vector, ?, ?)
        `, [
          rows[i].id,
          rows[i].article_id,
          rows[i].chunk_index,
          rows[i].chunk_text,
          rows[i].token_count,
          rows[i].model,
          embeddingStr,
          rows[i].created_at,
          rows[i].updated_at,
        ]);
      }

      // Mark as done
      await knex('articles')
        .where({ id: articleId })
        .update({
          embedding_status: 'done',
          embedding_updated_at: new Date(),
        });

      logger.info('Embeddings stored successfully', {
        articleId,
        chunkCount: chunks.length,
        dimensions: allEmbeddings[0]?.length,
      });

      return { chunks: chunks.length, dimensions: allEmbeddings[0]?.length };

    } catch (err) {
      await knex('articles')
        .where({ id: articleId })
        .update({ embedding_status: 'failed' });

      logger.error('Embedding generation failed', { articleId, error: err.message });
      throw err;
    }
  },

  /**
   * Generate embedding for a search query
   */
  async generateQueryEmbedding(query) {
    return geminiService.generateQueryEmbedding(query);
  },

  /**
   * Find articles pending embedding generation
   */
  async findPendingArticles(limit = 10) {
    const knex = strapi.db.connection;
    return knex('articles')
      .where({ embedding_status: 'pending' })
      .orWhere({ embedding_status: 'failed' })
      .select('id', 'title', 'description', 'content', 'ai_summary')
      .limit(limit);
  },
};

module.exports = embeddingService;
