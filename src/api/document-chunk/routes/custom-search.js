module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/document-chunks/search',
      handler: 'document-chunk.search',
      config: {
        auth: false, // In production, add appropriate auth policies
      },
    },
  ],
};
