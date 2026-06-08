import prisma from "../src/client.server";
import { assignUserRole } from "../src/rbac/assignments.server";
import { Roles } from "@rbac";

const OWNER_EMAIL = "you@example.com";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
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

  if (!user) {
    throw new Error(`No user found with email: ${OWNER_EMAIL}`);
  }

  const currentRole = user.rbacRoles[0]?.role.slug ?? Roles.PlatformUser;

  if (currentRole === Roles.PlatformOwner) {
    console.log(`${user.email} is already an owner.`);
    return;
  }

  await assignUserRole(user.id, Roles.PlatformOwner, {
    allowOwnerAssignment: true,
  });

  console.log(`Assigned platform.owner to ${user.name} (${user.email})`);
  console.log("Log out and sign in again to refresh your session.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
