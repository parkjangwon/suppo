let redis: RedisLike | null = null;

interface RedisLike {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(...keys: string[]): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  incrby(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  on(event: string, callback: (err: Error) => void): void;
}

async function createRedisClient(): Promise<RedisLike | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    const dynamicRequire = eval("require") as NodeRequire;
    const { Redis } = dynamicRequire("ioredis") as {
      Redis: new (
        url: string,
        options: {
          retryStrategy: (times: number) => number;
          maxRetriesPerRequest: number;
        }
      ) => RedisLike;
    };
    const client = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    client.on("error", (err: Error) => {
      console.error("Redis connection error:", err);
    });

    return client as RedisLike;
  } catch {
    console.warn("ioredis not available, falling back to memory cache");
    return null;
  }
}

async function initRedis(): Promise<RedisLike | null> {
  if (redis) return redis;
  redis = await createRedisClient();
  return redis;
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = await initRedis();
  return client !== null;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export async function getCache<T>(key: string): Promise<T | null> {
  const client = await initRedis();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const client = await initRedis();
  if (!client) return;

  const { ttl = 3600 } = options;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function deleteCache(key: string): Promise<void> {
  const client = await initRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = await initRedis();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error("Cache delete pattern error:", error);
  }
}

export async function incrementCache(key: string, amount = 1): Promise<number> {
  const client = await initRedis();
  if (!client) return 0;

  try {
    return await client.incrby(key, amount);
  } catch {
    return 0;
  }
}

export async function expireCache(key: string, seconds: number): Promise<void> {
  const client = await initRedis();
  if (!client) return;

  try {
    await client.expire(key, seconds);
  } catch (error) {
    console.error("Cache expire error:", error);
  }
}
