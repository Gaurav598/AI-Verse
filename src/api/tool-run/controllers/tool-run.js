'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tool-run.tool-run', ({ strapi }) => ({
  async getUsageAnalytics(ctx) {
    const { workspaceId, ownerId, days = 30 } = ctx.request.query;
    const strapiDb = strapi.db.connection;

    try {
      // 1. Total Aggregation
      const totalQuery = `
        SELECT 
          COUNT(id) as total_requests,
          SUM(tokens_used) as total_tokens,
          SUM(estimated_cost_usd) as total_cost,
          AVG(latency_ms) as avg_latency
        FROM tool_runs tr
        LEFT JOIN tool_runs_workspace_links trwl ON tr.id = trwl.tool_run_id
        LEFT JOIN tool_runs_owner_links trol ON tr.id = trol.tool_run_id
        WHERE tr.created_at >= NOW() - INTERVAL '? days'
        ${workspaceId ? 'AND trwl.workspace_id = ?' : ''}
        ${ownerId ? 'AND trol.user_id = ?' : ''}
      `;
      
      const bindings = [days];
      if (workspaceId) bindings.push(workspaceId);
      if (ownerId && !workspaceId) bindings.push(ownerId); // simplifier for prototype

      const totalRes = await strapiDb.raw(totalQuery, bindings);
      const totals = totalRes.rows[0];

      // 2. Daily Chart Data
      const dailyQuery = `
        SELECT 
          DATE(tr.created_at) as date,
          COUNT(id) as requests,
          SUM(tokens_used) as tokens,
          SUM(estimated_cost_usd) as cost
        FROM tool_runs tr
        LEFT JOIN tool_runs_workspace_links trwl ON tr.id = trwl.tool_run_id
        WHERE tr.created_at >= NOW() - INTERVAL '? days'
        ${workspaceId ? 'AND trwl.workspace_id = ?' : ''}
        GROUP BY DATE(tr.created_at)
        ORDER BY DATE(tr.created_at) ASC
      `;
      const dailyRes = await strapiDb.raw(dailyQuery, bindings);

      // 3. Tool usage breakdown
      const toolQuery = `
        SELECT tool, COUNT(id) as count
        FROM tool_runs tr
        LEFT JOIN tool_runs_workspace_links trwl ON tr.id = trwl.tool_run_id
        WHERE tr.created_at >= NOW() - INTERVAL '? days'
        ${workspaceId ? 'AND trwl.workspace_id = ?' : ''}
        GROUP BY tool
      `;
      const toolRes = await strapiDb.raw(toolQuery, bindings);

      ctx.send({
        summary: totals,
        chartData: dailyRes.rows,
        tools: toolRes.rows
      });

    } catch (err) {
      console.error('Analytics aggregation failed', err);
      ctx.internalServerError('Failed to aggregate analytics');
    }
  }
}));
