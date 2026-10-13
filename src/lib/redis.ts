import { Redis } from '@upstash/redis';

let client: Redis | null | undefined;

/**
 * Returns an Upstash Redis client, or null when no database is connected.
 * Accepts the env names set by the Vercel Upstash/KV integration and by Upstash directly.
 */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
