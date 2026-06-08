'use strict';

module.exports = {
  register({ strapi }) {},
  bootstrap({ strapi }) {},
  controllers: { notifications: require('./controllers/notifications.controller') },
  services: { email: require('./services/email.service') },
  routes: require('./routes/notifications.routes'),
};
