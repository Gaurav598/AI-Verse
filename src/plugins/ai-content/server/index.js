'use strict';

module.exports = {
  register({ strapi }) {
    // Plugin registration
  },

  bootstrap({ strapi }) {
    // Plugin bootstrap
  },

  controllers: {
    ai: require('./controllers/ai.controller'),
  },

  services: {
    gemini: require('./services/gemini.service'),
    'ai-content': require('./services/ai-content.service'),
  },

  routes: require('./routes/ai.routes'),
};
