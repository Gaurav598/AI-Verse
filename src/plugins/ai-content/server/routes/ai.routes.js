'use strict';

/**
 * AI Content Plugin Routes
 */

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/ai/generate-article',
        handler: 'ai.generateArticle',
        config: {
          policies: [],
          middlewares: [],
          auth: { scope: ['authenticated'] },
        },
      },
      {
        method: 'POST',
        path: '/ai/generate-outline',
        handler: 'ai.generateOutline',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/generate-titles',
        handler: 'ai.generateTitles',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/generate-summary',
        handler: 'ai.generateSummary',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/generate-seo',
        handler: 'ai.generateSeo',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/generate-tags',
        handler: 'ai.generateTags',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/improve-content',
        handler: 'ai.improveContent',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'POST',
        path: '/ai/analyze-quality',
        handler: 'ai.analyzeQuality',
        config: { auth: { scope: ['authenticated'] } },
      },
    ],
  },
};
