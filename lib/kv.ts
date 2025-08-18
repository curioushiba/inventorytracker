import { Redis } from "@upstash/redis"

export const kv = Redis.fromEnv()

export function isKvConfigured(): boolean {
  // Upstash Redis uses these env vars
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}


