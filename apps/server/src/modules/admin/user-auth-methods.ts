import type { Prisma } from "@sso/db/server";

export const userAuthMethodSelect = {
  accounts: {
    select: {
      providerId: true,
      oauthProviderConnection: {
        select: { id: true, name: true, provider: true },
      },
    },
  },
  usageEvents: {
    where: {
      outcome: "success",
      authMethod: { in: ["password", "magic_link"] },
    },
    distinct: ["authMethod"],
    select: { authMethod: true },
  },
} satisfies Prisma.UserSelect;

type UserAuthMethodSource = Partial<
  Prisma.UserGetPayload<{
    select: typeof userAuthMethodSelect;
  }>
>;

const labels: Record<string, string> = {
  credential: "Password",
  password: "Password",
  magic_link: "Magic link",
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export function mapUserAuthMethods(user: UserAuthMethodSource) {
  const methods = new Map<
    string,
    {
      id: string;
      label: string;
      oauthConnection: {
        id: string;
        name: string;
        provider: string;
      } | null;
    }
  >();

  for (const account of user.accounts ?? []) {
    const id =
      account.providerId === "credential" ? "password" : account.providerId;
    const connection = account.oauthProviderConnection;
    methods.set(`${id}:${connection?.id ?? "default"}`, {
      id,
      label: labels[id] ?? id,
      oauthConnection: connection
        ? {
            id: connection.id,
            name: connection.name,
            provider: connection.provider,
          }
        : null,
    });
  }

  for (const event of user.usageEvents ?? []) {
    if (!event.authMethod) continue;
    const id = event.authMethod;
    if (![...methods.values()].some((method) => method.id === id)) {
      methods.set(`${id}:usage`, {
        id,
        label: labels[id] ?? id,
        oauthConnection: null,
      });
    }
  }

  return [...methods.values()];
}
