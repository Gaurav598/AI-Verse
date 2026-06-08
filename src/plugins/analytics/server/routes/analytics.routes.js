'use strict';

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/analytics/view',
        handler: 'analytics.recordView',
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/analytics/dashboard',
        handler: 'analytics.getDashboard',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'GET',
        path: '/analytics/trending',
        handler: 'analytics.getTrending',
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/analytics/leaderboard/authors',
        handler: 'analytics.getAuthorLeaderboard',
        config: { auth: false },
      },
    ],
  },
};
