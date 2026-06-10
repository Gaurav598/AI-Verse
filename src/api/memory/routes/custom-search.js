module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/memories/search',
      handler: 'memory.search',
      config: {
        auth: false, // In production, add auth checks
      },
    },
  ],
};
