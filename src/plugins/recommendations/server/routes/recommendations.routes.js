'use strict';

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/articles/:id/recommendations',
        handler: 'recommendations.getRecommendations',
        config: { auth: false },
      },
    ],
  },
};
