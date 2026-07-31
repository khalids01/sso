import prisma, { Prisma } from "@sso/db/server";
import { env } from "@sso/env/server";
import {
  decryptSocialProviderSecret,
} from "./social-provider-credentials.service";

export const platformAuthMethods = [
  "magic_link",
  "password",
  "google",
  "facebook",
  "github",
  "linkedin",
] as const;
export type PlatformAuthMethod = (typeof platformAuthMethods)[number];
export type PlatformOAuthProvider = Exclude<
  PlatformAuthMethod,
  "magic_link" | "password"
>;

const settingsSelect = {
  signInMethods: true,
  signUpMethods: true,
  registrationMode: true,
  oauthProviderConnections: {
    select: {
      provider: true,
      oauthProviderConnection: {
        select: {
          id: true,
          name: true,
          provider: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.PlatformAuthSettingsSelect;

export async function getPlatformAuthSettings() {
  const row = await prisma.platformAuthSettings.upsert({
    where: { id: "platform" },
    create: {
      id: "platform",
      signInMethods: ["magic_link"],
      signUpMethods: ["magic_link"],
      registrationMode: "open",
    },
    update: {},
    select: settingsSelect,
  });
  return {
    signInMethods: row.signInMethods as PlatformAuthMethod[],
    signUpMethods: row.signUpMethods as PlatformAuthMethod[],
    registrationMode: row.registrationMode,
    emailProvider: "server_env" as const,
    emailConfigured: Boolean(env.SMTP_HOST && env.EMAIL && env.EMAIL_PASSWORD),
    passwordAvailable: env.ENABLE_PASSWORD_AUTH,
    oauthConnections: Object.fromEntries(
      row.oauthProviderConnections.map((assignment) => [
        assignment.provider,
        assignment.oauthProviderConnection,
      ]),
    ) as Partial<
      Record<
        PlatformOAuthProvider,
        {
          id: string;
          name: string;
          provider: PlatformOAuthProvider;
          status: string;
        }
      >
    >,
  };
}

export async function getPlatformOAuthConnection(
  provider: PlatformOAuthProvider,
) {
  const assignment = await prisma.platformOAuthProviderConnection.findUnique({
    where: {
      settingsId_provider: { settingsId: "platform", provider },
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
  if (!connection || connection.status !== "active") return null;
  return {
    id: connection.id,
    provider: connection.provider as PlatformOAuthProvider,
    clientId: connection.clientId,
    clientSecret: decryptSocialProviderSecret(connection.encryptedSecret),
    credentialVersion: connection.credentialVersion,
  };
}
