'use strict';

module.exports = {
  register({ strapi }) {},
  bootstrap({ strapi }) {},
  controllers: { search: require('./controllers/search.controller') },
  services: {
    embedding: require('./services/embedding.service'),
    search: require('./services/search.service'),
  },
  routes: require('./routes/search.routes'),
};
