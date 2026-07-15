import { createHash, randomUUID } from "node:crypto";
import { e2eEnv } from "./environment";

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

function lockKey() {
  const identity = `${new URL(e2eEnv.E2E_API_ORIGIN).host}:${e2eEnv.E2E_ACTOR_EMAIL}`;
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 24);
  return `e2e:actor-lock:${digest}`;
}

export async function acquireActorLock() {
  const { connectRedis } = await import("../../../packages/redis/src/index.server");
  const redis = await connectRedis();
  const token = randomUUID();
  const result = await redis.set(lockKey(), token, "EX", 30 * 60, "NX");
  if (result !== "OK") {
    throw new Error(
      `Another E2E run is already using actor ${e2eEnv.E2E_ACTOR_EMAIL}`,
    );
  }
  return token;
}

export async function releaseActorLock(token: string | undefined) {
  if (!token) return;
  const { connectRedis } = await import("../../../packages/redis/src/index.server");
  const redis = await connectRedis();
  await redis.eval(RELEASE_SCRIPT, 1, lockKey(), token);
}

export async function disconnectActorLockRedis() {
  const { getRedis } = await import("../../../packages/redis/src/index.server");
  getRedis().disconnect();
}
