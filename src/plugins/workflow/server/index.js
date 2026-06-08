'use strict';

module.exports = {
  register({ strapi }) {},
  bootstrap({ strapi }) {},
  controllers: { workflow: require('./controllers/workflow.controller') },
  services: { workflow: require('./services/workflow.service') },
  routes: require('./routes/workflow.routes'),
};
