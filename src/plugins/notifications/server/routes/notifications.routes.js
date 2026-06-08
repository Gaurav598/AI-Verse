'use strict';

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'GET',
        path: '/notifications',
        handler: 'notifications.list',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'PATCH',
        path: '/notifications/:id/read',
        handler: 'notifications.markRead',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'PATCH',
        path: '/notifications/read-all',
        handler: 'notifications.markAllRead',
        config: { auth: { scope: ['authenticated'] } },
      },
    ],
  },
};
