import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config({
  path: new URL("../../../apps/server/.env", import.meta.url),
  quiet: true,
});

type OwnerArgs = {
  email: string;
  name: string;
};

function readOption(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getOwnerArgs(): OwnerArgs {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: bun make-owner [--email owner@example.com] [--name Owner]");
    console.log("Defaults: OWNER_EMAIL and OWNER_NAME.");
    process.exit(0);
  }

  const email = readOption("email") ?? process.env.OWNER_EMAIL;
  const name = readOption("name") ?? process.env.OWNER_NAME ?? "Owner";

  if (!email) {
    throw new Error(
      "Owner email is required. Set OWNER_EMAIL or pass --email someone@example.com.",
    );
  }

  return {
    email: email.trim().toLowerCase(),
    name: name.trim(),
  };
}

async function main() {
  const owner = getOwnerArgs();

  const [
    { default: prisma },
    { assignUserRole },
    { invalidateUser },
    { getRedis },
    { Roles },
  ] = await Promise.all([
    import("../src/client.server"),
    import("../src/rbac/assignments.server"),
    import("../src/rbac/cache/invalidate.server"),
    import("../../redis/src/index.server"),
    import("@rbac"),
  ]);

  try {
    const user = await prisma.user.upsert({
      where: { email: owner.email },
      create: {
        id: randomUUID(),
        email: owner.email,
        name: owner.name,
        emailVerified: true,
        banned: false,
        banReason: null,
        archived: false,
      },
      update: {
        name: owner.name,
        emailVerified: true,
        banned: false,
        banReason: null,
        archived: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        rbacRoles: {
          take: 1,
          select: {
            role: {
              select: { slug: true },
            },
          },
        },
      },
    });

    const currentRole = user.rbacRoles[0]?.role.slug ?? Roles.PlatformUser;

    if (currentRole !== Roles.PlatformOwner) {
      await assignUserRole(user.id, Roles.PlatformOwner, {
        allowOwnerAssignment: true,
      });
    } else {
      await invalidateUser(user.id);
    }

    const smtpEmail = process.env.EMAIL?.trim().toLowerCase();

    if (smtpEmail && smtpEmail !== owner.email) {
      const mistakenOwner = await prisma.user.findFirst({
        where: {
          email: smtpEmail,
          rbacRoles: {
            some: {
              role: { slug: Roles.PlatformOwner },
            },
          },
        },
        select: { id: true, email: true },
      });

      if (mistakenOwner) {
        await prisma.$transaction([
          // Visitor analytics stores denormalized user IDs without foreign keys.
          prisma.visitorSession.updateMany({
            where: { userId: mistakenOwner.id },
            data: { userId: null },
          }),
          prisma.visitorIdentity.updateMany({
            where: { firstUserId: mistakenOwner.id },
            data: { firstUserId: null },
          }),
          prisma.visitorIdentity.updateMany({
            where: { lastUserId: mistakenOwner.id },
            data: { lastUserId: null },
          }),
          // All declared user relations cascade or become null from this delete.
          prisma.user.delete({ where: { id: mistakenOwner.id } }),
        ]);

        try {
          await invalidateUser(mistakenOwner.id);
        } catch (error) {
          console.warn(
            `Deleted mistaken SMTP owner ${mistakenOwner.email}, but Redis cache invalidation failed:`,
            error,
          );
        }

        console.log(
          `Removed mistaken SMTP owner and associated records: ${mistakenOwner.email}`,
        );
      }
    }

    console.log(`Upserted platform.owner: ${user.name} <${user.email}>`);
    console.log("Log out and sign in again to refresh your session.");
  } finally {
    await prisma.$disconnect();
    getRedis().disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
