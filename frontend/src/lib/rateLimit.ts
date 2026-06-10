import Redis from "ioredis";

let redisClient: Redis | null = null;

if (process.env.REDIS_HOST) {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  });
}

/**
 * Sliding window rate limiter using Redis
 * 
 * @param identifier e.g., user IP or User ID
 * @param limit Max requests
 * @param windowInSec Window size in seconds
 */
export async function rateLimit(identifier: string, limit: number, windowInSec: number) {
  if (!redisClient) {
    console.warn("Redis not configured, skipping rate limit.");
    return { success: true, remaining: limit };
  }

  const now = Date.now();
  const windowStart = now - (windowInSec * 1000);
  const key = `rate_limit:${identifier}`;

  // Use a pipeline to execute atomic operations
  const pipeline = redisClient.pipeline();
  
  // Remove scores older than windowStart
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Get count of items currently in the sorted set
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Set expiry to keep redis clean
  pipeline.expire(key, windowInSec);

  const results = await pipeline.exec();
  
  if (!results) {
    return { success: false, remaining: 0 };
  }

  const requestCount = results[1][1] as number;
  
  if (requestCount >= limit) {
    return { success: false, remaining: 0, limit };
  }

  return { success: true, remaining: limit - requestCount - 1, limit };
}

export function getTieredLimit(plan: 'free' | 'pro' | 'team') {
  switch (plan) {
    case 'team': return { limit: 100, window: 60 }; // 100 req per min
    case 'pro': return { limit: 50, window: 60 }; // 50 req per min
    case 'free':
    default: return { limit: 10, window: 60 }; // 10 req per min
  }
}
