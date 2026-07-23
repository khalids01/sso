import prisma from "../../../db/src/client.server";
import type { Prisma } from "../../../db/prisma/generated/client";

export type OAuthProfileProvider =
  | "google"
  | "github"
  | "facebook"
  | "linkedin";

type CapturedOAuthProfile = {
  provider: OAuthProfileProvider;
  accountId: string;
  profile: Record<string, unknown>;
};

const pendingProfiles = new Map<string, CapturedOAuthProfile>();

function profileKey(provider: string, accountId: string) {
  return `${provider}:${accountId}`;
}

function getProviderAccountId(
  provider: OAuthProfileProvider,
  profile: Record<string, unknown>,
) {
  const value =
    provider === "google" || provider === "linkedin"
      ? profile.sub
      : profile.id;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const accountId = String(value);
  return accountId ? accountId : null;
}

export function stageOAuthProfile(
  provider: OAuthProfileProvider,
  profile: unknown,
) {
  let serializedProfile: unknown;
  try {
    const serialized = JSON.stringify(profile);
    if (!serialized) return null;
    serializedProfile = JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }
  if (
    !serializedProfile ||
    typeof serializedProfile !== "object" ||
    Array.isArray(serializedProfile)
  ) {
    return null;
  }

  const profileRecord = serializedProfile as Record<string, unknown>;
  const accountId = getProviderAccountId(provider, profileRecord);
  if (!accountId) return null;

  const captured = { provider, accountId, profile: profileRecord };
  pendingProfiles.set(profileKey(provider, accountId), captured);
  if (pendingProfiles.size > 1_000) {
    const oldestKey = pendingProfiles.keys().next().value;
    if (oldestKey) pendingProfiles.delete(oldestKey);
  }
  return captured;
}

export async function captureOAuthProfile(
  provider: OAuthProfileProvider,
  profile: unknown,
) {
  const captured = stageOAuthProfile(provider, profile);
  if (!captured) return {};

  const updated = await prisma.account.updateMany({
    where: {
      providerId: captured.provider,
      accountId: captured.accountId,
    },
    data: {
      rawProfile: captured.profile as Prisma.InputJsonValue,
      profileUpdatedAt: new Date(),
    },
  });
  if (updated.count > 0) {
    pendingProfiles.delete(profileKey(captured.provider, captured.accountId));
  }
  return {};
}

export function attachCapturedOAuthProfileOnCreate<
  TAccount extends { providerId: string; accountId: string },
>(account: TAccount) {
  const key = profileKey(account.providerId, account.accountId);
  const captured = pendingProfiles.get(key);
  if (!captured) return;
  pendingProfiles.delete(key);

  return {
    data: {
      ...account,
      rawProfile: captured.profile,
      profileUpdatedAt: new Date(),
    },
  };
}
