import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import type {
  ApplicationSocialProviderId,
  OAuthProviderConnectionCredentials,
} from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import { connectRedis, getRedis, setCache } from "@redis/server";

const encryptionKey = createHmac(
  "sha256",
  env.SOCIAL_PROVIDER_CREDENTIALS_KEY ?? env.BETTER_AUTH_SECRET,
)
  .update("platform-oauth-provider-connections")
  .digest();
const contextTtlSeconds = 10 * 60;

export function encryptSocialProviderSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSocialProviderSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted social provider secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export type SocialProviderContext = {
  scope?: "application" | "platform";
  provider: ApplicationSocialProviderId;
  applicationId?: string;
  applicationClientId?: string;
  downstreamClientId?: string;
  oauthProviderConnectionId: string;
  credentialVersion: number;
  intent: "login" | "signup";
  requestId: string;
  expiresAt: number;
};

type AssignedConnection = {
  applicationId: string;
  applicationClientId: string;
  downstreamClientId: string;
  connection: OAuthProviderConnectionCredentials;
};

function contextKey(state: string) {
  const stateHash = createHash("sha256").update(state).digest("base64url");
  return `oauth:state-context:${stateHash}`;
}

function isProvider(value: unknown): value is ApplicationSocialProviderId {
  return (
    value === "google" ||
    value === "github" ||
    value === "facebook" ||
    value === "linkedin"
  );
}

function isSocialProviderContext(value: unknown): value is SocialProviderContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<SocialProviderContext>;
  const common =
    isProvider(context.provider) &&
    typeof context.oauthProviderConnectionId === "string" &&
    typeof context.credentialVersion === "number" &&
    (context.intent === "login" || context.intent === "signup") &&
    typeof context.requestId === "string" &&
    typeof context.expiresAt === "number" &&
    context.expiresAt > Date.now();
  if (!common) return false;
  if (context.scope === "platform") return true;
  return (
    typeof context.applicationId === "string" &&
    typeof context.applicationClientId === "string" &&
    typeof context.downstreamClientId === "string"
  );
}

function toRuntimeConnection(connection: {
  id: string;
  provider: string;
  clientId: string;
  encryptedSecret: string;
  credentialVersion: number;
}): OAuthProviderConnectionCredentials {
  if (!isProvider(connection.provider)) {
    throw new Error("Unsupported OAuth provider");
  }
  return {
    id: connection.id,
    provider: connection.provider,
    clientId: connection.clientId,
    clientSecret: decryptSocialProviderSecret(connection.encryptedSecret),
    credentialVersion: connection.credentialVersion,
  };
}

export async function getApplicationSocialProviderConnection(
  downstreamClientId: string,
  provider: ApplicationSocialProviderId,
): Promise<AssignedConnection | null> {
  const downstreamClient = await prisma.applicationClient.findFirst({
    where: {
      clientId: downstreamClientId,
      status: "active",
      oauthDisabled: false,
      application: { status: "active" },
    },
    select: {
      id: true,
      clientId: true,
      applicationId: true,
      application: {
        select: {
          oauthProviderConnections: {
            where: { provider },
            select: {
              oauthProviderConnection: {
                select: {
                  id: true,
                  provider: true,
                  clientId: true,
                  encryptedSecret: true,
                  credentialVersion: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const selected =
    downstreamClient?.application.oauthProviderConnections[0]
      ?.oauthProviderConnection;
  if (!downstreamClient || !selected || selected.status !== "active") return null;
  return {
    applicationId: downstreamClient.applicationId,
    applicationClientId: downstreamClient.id,
    downstreamClientId: downstreamClient.clientId,
    connection: toRuntimeConnection(selected),
  };
}

export async function storeSocialProviderContext(
  state: string,
  context: Omit<SocialProviderContext, "expiresAt">,
) {
  await setCache(
    contextKey(state),
    {
      ...context,
      expiresAt: Date.now() + contextTtlSeconds * 1_000,
    } satisfies SocialProviderContext,
    contextTtlSeconds,
  );
}

export async function consumeSocialProviderContext(state: string) {
  await connectRedis();
  const serialized = await getRedis().getdel(contextKey(state));
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as unknown;
    return isSocialProviderContext(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function getOAuthProviderConnectionForCallback(
  context: SocialProviderContext,
): Promise<OAuthProviderConnectionCredentials | null> {
  if (context.scope === "platform") {
    const assignment = await prisma.platformOAuthProviderConnection.findFirst({
      where: {
        settingsId: "platform",
        provider: context.provider,
        oauthProviderConnectionId: context.oauthProviderConnectionId,
      },
      select: {
        oauthProviderConnection: {
          select: {
            id: true,
            provider: true,
            clientId: true,
            encryptedSecret: true,
            credentialVersion: true,
            status: true,
          },
        },
      },
    });
    const connection = assignment?.oauthProviderConnection;
    if (
      !connection ||
      connection.status !== "active" ||
      connection.credentialVersion !== context.credentialVersion
    ) {
      return null;
    }
    return toRuntimeConnection(connection);
  }
  const assignment = await prisma.applicationOAuthProviderConnection.findFirst({
    where: {
      applicationId: context.applicationId!,
      provider: context.provider,
      oauthProviderConnectionId: context.oauthProviderConnectionId,
      application: {
        status: "active",
        clients: {
          some: {
            clientId: context.downstreamClientId!,
            status: "active",
            oauthDisabled: false,
          },
        },
      },
    },
    select: {
      oauthProviderConnection: {
        select: {
          id: true,
          provider: true,
          clientId: true,
          encryptedSecret: true,
          credentialVersion: true,
          status: true,
        },
      },
    },
  });
  const connection = assignment?.oauthProviderConnection;
  if (
    !connection ||
    connection.status !== "active" ||
    connection.credentialVersion !== context.credentialVersion
  ) {
    return null;
  }
  return toRuntimeConnection(connection);
}
