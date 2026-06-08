'use strict';

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/articles/:id/workflow/transition',
        handler: 'workflow.transition',
        config: { auth: { scope: ['authenticated'] } },
      },
      {
        method: 'GET',
        path: '/articles/:id/workflow/history',
        handler: 'workflow.history',
        config: { auth: { scope: ['authenticated'] } },
      },
    ],
  },
};
