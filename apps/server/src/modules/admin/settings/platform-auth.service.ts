import prisma from "@db/server";
import { env } from "@env/server";
import {
  getPlatformAuthSettings,
  platformAuthMethods,
  type PlatformOAuthProvider,
} from "../../auth/platform-auth-settings.service";
import type { UpdatePlatformAuthInput } from "./platform-auth.dto";

export class PlatformAuthSettingsError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function updatePlatformAuthSettings(
  input: UpdatePlatformAuthInput,
  actorUserId?: string,
) {
  const signInMethods = [...new Set(input.signInMethods)];
  const signUpMethods = [...new Set(input.signUpMethods)];
  if (signInMethods.some((method) => !platformAuthMethods.includes(method))) {
    throw new PlatformAuthSettingsError("Invalid platform sign-in method");
  }
  if (signUpMethods.some((method) => !signInMethods.includes(method))) {
    throw new PlatformAuthSettingsError(
      "Every signup method must also be enabled for sign-in",
    );
  }
  if (
    (signInMethods.includes("password") || signUpMethods.includes("password")) &&
    !env.ENABLE_PASSWORD_AUTH
  ) {
    throw new PlatformAuthSettingsError(
      "Password authentication is disabled in the server environment",
    );
  }
  if (
    (signInMethods.includes("magic_link") ||
      signUpMethods.includes("magic_link")) &&
    !(env.SMTP_HOST && env.EMAIL && env.EMAIL_PASSWORD)
  ) {
    throw new PlatformAuthSettingsError(
      "Magic-link authentication requires the server email environment",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.platformAuthSettings.upsert({
      where: { id: "platform" },
      create: {
        id: "platform",
        signInMethods,
        signUpMethods,
        registrationMode: input.registrationMode,
      },
      update: {
        signInMethods,
        signUpMethods,
        registrationMode: input.registrationMode,
      },
    });
    for (const provider of [
      "google",
      "facebook",
      "github",
      "linkedin",
    ] as const) {
      if (!(provider in (input.oauthConnections ?? {}))) continue;
      const connectionId = input.oauthConnections?.[provider];
      if (!connectionId) {
        await tx.platformOAuthProviderConnection.deleteMany({
          where: { settingsId: "platform", provider },
        });
        continue;
      }
      const connection = await tx.oAuthProviderConnection.findUnique({
        where: { id: connectionId },
        select: { id: true, provider: true, status: true },
      });
      if (
        !connection ||
        connection.provider !== provider ||
        connection.status !== "active"
      ) {
        throw new PlatformAuthSettingsError(
          `Select an active ${provider} OAuth connection`,
        );
      }
      await tx.platformOAuthProviderConnection.upsert({
        where: {
          settingsId_provider: { settingsId: "platform", provider },
        },
        create: {
          settingsId: "platform",
          provider,
          oauthProviderConnectionId: connection.id,
        },
        update: { oauthProviderConnectionId: connection.id },
      });
    }
    const socialMethods = [...signInMethods, ...signUpMethods].filter(
      (method): method is PlatformOAuthProvider =>
        !["magic_link", "password"].includes(method),
    );
    const assigned = await tx.platformOAuthProviderConnection.findMany({
      where: {
        settingsId: "platform",
        provider: { in: socialMethods },
        oauthProviderConnection: { status: "active" },
      },
      select: { provider: true },
    });
    const assignedProviders = new Set(assigned.map((item) => item.provider));
    const missing = socialMethods.find((method) => !assignedProviders.has(method));
    if (missing) {
      throw new PlatformAuthSettingsError(
        `Assign an active ${missing} OAuth connection before enabling it`,
      );
    }
  });
  await prisma.activityEvent.create({
    data: {
      type: "platform_auth_settings.updated",
      actorUserId: actorUserId ?? null,
      message: "Platform authentication settings updated",
      metadata: { signInMethods, signUpMethods, registrationMode: input.registrationMode },
    },
  });
  return getPlatformAuthSettings();
}
