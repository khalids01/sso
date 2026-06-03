import { deleteCache, getCache, setCache } from "@redis";
import type { EffectivePermissionsPayload } from "@rbac";
import {
  EFFECTIVE_PERMISSIONS_TTL_SECONDS,
  effectivePermissionsKey,
} from "../keys";

export async function getCachedEffectivePermissions(userId: string) {
  return getCache<EffectivePermissionsPayload>(
    effectivePermissionsKey(userId),
  );
}

export async function setCachedEffectivePermissions(
  userId: string,
  payload: EffectivePermissionsPayload,
) {
  await setCache(
    effectivePermissionsKey(userId),
    payload,
    EFFECTIVE_PERMISSIONS_TTL_SECONDS,
  );
}

export async function deleteCachedEffectivePermissions(userId: string) {
  await deleteCache(effectivePermissionsKey(userId));
}
