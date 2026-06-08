'use strict';

module.exports = {
  register({ strapi }) {},
  bootstrap({ strapi }) {},
  controllers: { analytics: require('./controllers/analytics.controller') },
  services: { analytics: require('./services/analytics.service') },
  routes: require('./routes/analytics.routes'),
};
