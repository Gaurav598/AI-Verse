"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspaceStore } from "@/store/workspaceStore";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const { activeWorkspace } = useWorkspaceStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function fetchAnalytics() {
      try {
        setLoading(true);
        let url = '/api/analytics?days=30';
        if (activeWorkspace) {
          url += `&workspaceId=${activeWorkspace.id}`;
        }
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [token, activeWorkspace]);

  if (loading) {
    return <div className="p-8 text-zinc-400 animate-pulse">Loading Analytics...</div>;
  }

  if (!data) {
    return <div className="p-8 text-red-500">Failed to load analytics data.</div>;
  }

  const summary = data.summary || {};
  const cost = parseFloat(summary.total_cost || "0").toFixed(4);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">Usage & Analytics</h1>
      <p className="text-zinc-400">
        Monitor your AI consumption {activeWorkspace ? `for workspace: ${activeWorkspace.name}` : 'across all workspaces'}.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-sm text-zinc-500 font-medium uppercase">Total Requests</p>
          <p className="text-4xl font-bold text-white mt-2">{summary.total_requests || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-sm text-zinc-500 font-medium uppercase">Tokens Used</p>
          <p className="text-4xl font-bold text-white mt-2">{summary.total_tokens || 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-sm text-zinc-500 font-medium uppercase">Estimated Cost</p>
          <p className="text-4xl font-bold text-emerald-400 mt-2">${cost}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <p className="text-sm text-zinc-500 font-medium uppercase">Avg Latency</p>
          <p className="text-4xl font-bold text-white mt-2">{parseFloat(summary.avg_latency || 0).toFixed(0)} ms</p>
        </div>
      </div>

      {/* Placeholder for Charts */}
      <div className="mt-8 bg-zinc-900 border border-zinc-800 p-6 rounded-xl h-96 flex items-center justify-center">
        <p className="text-zinc-600 font-mono text-sm">
          [Recharts / Chart.js Time-Series Visualization Goes Here]<br/>
          (Showing Daily Request Volume & Cost)
        </p>
      </div>
    </div>
  );
}
