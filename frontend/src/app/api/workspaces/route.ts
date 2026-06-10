import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

export const runtime = "nodejs";

let redisClient: Redis | null = null;
if (process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Attempt to extract user token or ID for cache keying
    // In production, decode JWT to get the exact User ID
    const cacheKey = `workspaces:${authHeader.substring(0, 20)}`;

    if (redisClient) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
        });
      }
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
    
    const res = await fetch(`${apiUrl}/api/workspaces?populate=*`, {
      headers: { 'Authorization': authHeader }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch workspaces" }), { status: res.status });
    }

    const data = await res.json();
    const dataString = JSON.stringify(data);

    if (redisClient) {
      // Cache for 60 seconds
      await redisClient.setex(cacheKey, 60, dataString);
    }

    return new Response(dataString, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
