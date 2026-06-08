'use strict';

module.exports = {
  'content-api': {
    type: 'content-api',
    routes: [
      {
        method: 'POST',
        path: '/search/semantic',
        handler: 'search.semantic',
        config: { auth: false },
      },
      {
        method: 'POST',
        path: '/search/hybrid',
        handler: 'search.hybrid',
        config: { auth: false },
      },
      {
        method: 'GET',
        path: '/search/suggest',
        handler: 'search.suggest',
        config: { auth: false },
      },
    ],
  },
};
