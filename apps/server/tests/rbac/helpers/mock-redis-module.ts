import { mock } from "bun:test";
import { createMemoryRedis, createMemoryRedisStore } from "./memory-redis";

export function mockRedisModule(store = createMemoryRedisStore()) {
  const redis = createMemoryRedis(store);

  mock.module("@redis", () => ({
    getCache: async (key: string) => {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },
    setCache: async (key: string, value: unknown, ttl?: number) => {
      await redis.set(
        key,
        JSON.stringify(value),
        ttl ? "EX" : undefined,
        ttl,
      );
    },
    deleteCache: async (key: string) => {
      await redis.del(key);
    },
    connectRedis: async () => redis,
    getRedis: () => redis,
  }));

  return { store, redis };
}
