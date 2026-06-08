'use strict';

module.exports = {
  register({ strapi }) {},
  bootstrap({ strapi }) {},
  controllers: { recommendations: require('./controllers/recommendations.controller') },
  services: { recommendations: require('./services/recommendations.service') },
  routes: require('./routes/recommendations.routes'),
};
