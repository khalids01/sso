import prisma from "@db";

export type UserRoleSummary = {
  slug: string;
  name: string;
};

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
    slug: assignment.role.slug,
    name: assignment.role.name,
  }));
}
