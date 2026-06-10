module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/analytics/usage',
      handler: 'tool-run.getUsageAnalytics',
      config: {
        auth: false, // In production add policies to restrict to owners
      },
    },
  ],
};
