module.exports = ({ env }) => ({
  'users-permissions': {
    enabled: true,
    config: {
      jwt: {
        expiresIn: '7d',
      },
    },
  },
  'ai-content': {
    enabled: true,
    resolve: './src/plugins/ai-content',
  },
  'search': {
    enabled: true,
    resolve: './src/plugins/search',
  },
  'recommendations': {
    enabled: true,
    resolve: './src/plugins/recommendations',
  },
  'analytics': {
    enabled: true,
    resolve: './src/plugins/analytics',
  },
  'workflow': {
    enabled: true,
    resolve: './src/plugins/workflow',
  },
  'notifications': {
    enabled: true,
    resolve: './src/plugins/notifications',
  },
});
