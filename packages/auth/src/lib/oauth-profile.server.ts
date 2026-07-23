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
  oauthProviderConnectionId: string;
  profile: Record<string, unknown>;
};

const pendingProfiles = new Map<string, CapturedOAuthProfile>();

function profileKey(provider: string, accountId: string) {
  return `${provider}:${accountId}`;
}

export function namespaceOAuthAccountId(
  oauthProviderConnectionId: string,
  providerAccountId: string,
) {
  return `${oauthProviderConnectionId}:${providerAccountId}`;
}

export function stageOAuthProfile(
  provider: OAuthProfileProvider,
  profile: unknown,
  oauthProviderConnectionId: string,
  providerAccountId: string,
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
  const accountId = namespaceOAuthAccountId(
    oauthProviderConnectionId,
    providerAccountId,
  );

  const captured = {
    provider,
    accountId,
    oauthProviderConnectionId,
    profile: profileRecord,
  };
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
  oauthProviderConnectionId: string,
  providerAccountId: string,
) {
  const captured = stageOAuthProfile(
    provider,
    profile,
    oauthProviderConnectionId,
    providerAccountId,
  );
  if (!captured) return {};

  const updated = await prisma.account.updateMany({
    where: {
      providerId: captured.provider,
      accountId: captured.accountId,
      oauthProviderConnectionId: captured.oauthProviderConnectionId,
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
      oauthProviderConnectionId: captured.oauthProviderConnectionId,
    },
  };
}
