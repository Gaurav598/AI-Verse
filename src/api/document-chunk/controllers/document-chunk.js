'use strict';

module.exports = {
  async search(ctx) {
    const { embedding, workspaceId, limit = 5 } = ctx.request.body;

    if (!embedding || !Array.isArray(embedding)) {
      return ctx.badRequest('Embedding array is required');
    }

    try {
      const strapiDb = strapi.db.connection;
      const embeddingString = `[${embedding.join(',')}]`;
      
      const query = `
        SELECT * FROM search_similar_chunks(
          ?::vector,
          ?,
          0.3,
          ?
        )
      `;
      
      const { rows } = await strapiDb.raw(query, [embeddingString, limit, workspaceId || null]);

      ctx.send({ results: rows });
    } catch (err) {
      console.error('Vector search failed', err);
      ctx.internalServerError('Failed to search vectors');
    }
  }
};
