/**
 * Redis Client
 * Upstash Redis configuration for caching and rate limiting
 */

// TODO: Uncomment when @upstash/redis is installed
// import { Redis } from '@upstash/redis'

// export const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// })

// Placeholder Redis implementation for development
class MockRedis {
  private cache = new Map<string, { value: unknown; expiry?: number }>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.value as T
  }

  async set(key: string, value: unknown): Promise<void> {
    this.cache.set(key, { value })
  }

  async setex(key: string, ttlSeconds: number, value: unknown): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    })
  }

  async del(...keys: string[]): Promise<void> {
    keys.forEach((key) => this.cache.delete(key))
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
    return Array.from(this.cache.keys()).filter((key) => regex.test(key))
  }
}

export const redis = new MockRedis()

/**
 * Get cached value or fetch and cache
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached) return cached

  const fresh = await fetchFn()
  await redis.setex(key, ttlSeconds, fresh)
  return fresh
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

/**
 * Session storage helpers
 */
export const sessionStore = {
  async get(sessionId: string) {
    return redis.get(`session:${sessionId}`)
  },
  async set(sessionId: string, data: unknown, ttlSeconds: number = 86400) {
    return redis.setex(`session:${sessionId}`, ttlSeconds, data)
  },
  async delete(sessionId: string) {
    return redis.del(`session:${sessionId}`)
  },
}
