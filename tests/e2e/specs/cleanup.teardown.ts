import { test as teardown } from "@playwright/test";
import {
  disconnectActorLockRedis,
  releaseActorLock,
} from "../helpers/actor-lock";
import { cleanupRunOwnedResources } from "../helpers/cleanup";
import { readRunState, removeRunState } from "../helpers/run-state";

teardown("clean run-owned resources and release the actor", async () => {
  const state = readRunState();
  try {
    await cleanupRunOwnedResources();
  } finally {
    await releaseActorLock(state.lockToken);
    await disconnectActorLockRedis();
    removeRunState();
  }
});
