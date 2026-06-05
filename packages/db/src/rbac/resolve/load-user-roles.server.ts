import prisma from "../prisma.server";
import type { SessionRoleSummary } from "@rbac";

export type UserRoleSummary = SessionRoleSummary;

export async function loadUserRoles(
  userId: string,
): Promise<UserRoleSummary[]> {
  const assignments = await prisma.rbacUserRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  return assignments.map((assignment) => ({
    slug: assignment.role.slug as UserRoleSummary["slug"],
    name: assignment.role.name,
  }));
}
