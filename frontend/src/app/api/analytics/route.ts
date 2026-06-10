import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const days = searchParams.get('days') || '30';
    
    let query = `${apiUrl}/api/analytics/usage?days=${days}`;
    if (workspaceId) {
      query += `&workspaceId=${workspaceId}`;
    }

    const res = await fetch(query, {
      headers: { 'Authorization': authHeader }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch analytics" }), { status: res.status });
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
