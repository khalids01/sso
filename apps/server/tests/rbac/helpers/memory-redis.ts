export type MemoryRedisStore = {
  values: Map<string, string>;
  ttl: Map<string, number>;
};

export function createMemoryRedisStore(): MemoryRedisStore {
  return {
    values: new Map(),
    ttl: new Map(),
  };
}

export function createMemoryRedis(store: MemoryRedisStore, keyPrefix = "") {
  const withPrefix = (key: string) => `${keyPrefix}${key}`;

  return {
    options: { keyPrefix },
    status: "ready" as const,
    async get(key: string) {
      const full = withPrefix(key);
      const expiresAt = store.ttl.get(full);
      if (expiresAt && expiresAt < Date.now()) {
        store.values.delete(full);
        store.ttl.delete(full);
        return null;
      }
      return store.values.get(full) ?? null;
    },
    async set(key: string, value: string, mode?: string, ttl?: number) {
      const full = withPrefix(key);
      store.values.set(full, value);
      if (mode === "EX" && typeof ttl === "number") {
        store.ttl.set(full, Date.now() + ttl * 1000);
      }
      return "OK";
    },
    async del(...keys: string[]) {
      let removed = 0;
      for (const key of keys) {
        const full = key.startsWith(keyPrefix) ? key : withPrefix(key);
        if (store.values.delete(full)) {
          removed += 1;
        }
        store.ttl.delete(full);
      }
      return removed;
    },
    async scan(
      cursor: string,
      _matchKeyword: string,
      pattern: string,
      _countKeyword: string,
      _count: number,
    ) {
      const prefix = pattern.replace("*", "");
      const keys = [...store.values.keys()].filter((key) =>
        key.startsWith(prefix),
      );
      return [cursor === "0" ? "0" : "0", keys] as [string, string[]];
    },
  };
}
