import { Redis } from "@upstash/redis";

type ReadThroughCacheOptions<T> = {
  key: string;
  ttlSeconds: number;
  loader: () => Promise<T>;
};

let cacheRedisClient: Redis | null | undefined;

function getCacheRedisClient(): Redis | null {
  if (cacheRedisClient !== undefined) {
    return cacheRedisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  cacheRedisClient = url && token ? new Redis({ url, token }) : null;
  return cacheRedisClient;
}

export async function readThroughRedisCache<T>({
  key,
  ttlSeconds,
  loader,
}: ReadThroughCacheOptions<T>): Promise<T> {
  const redis = getCacheRedisClient();

  if (!redis) {
    return loader();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    console.warn("Redis cache read failed", { key, error });
  }

  const value = await loader();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn("Redis cache write failed", { key, error });
  }

  return value;
}
