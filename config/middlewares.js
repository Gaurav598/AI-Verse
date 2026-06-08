module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: ['*'],
      origin: (env('ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:3000')) || '').split(','),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Custom middlewares
  {
    name: 'global::request-trace',
    config: {},
  },
  {
    name: 'global::rate-limit',
    config: {
      windowSec: parseInt(env('RATE_LIMIT_WINDOW_MS', '60000'), 10) / 1000,
      maxGlobal: parseInt(env('RATE_LIMIT_MAX_GLOBAL', '200'), 10),
      maxAuth: parseInt(env('RATE_LIMIT_MAX_AUTH', '20'), 10),
    },
  },
  {
    name: 'global::api-key',
    config: {},
  },
];
