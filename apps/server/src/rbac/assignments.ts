import { assignUserRole as dbAssignUserRole } from "@db/server/rbac/assignments";

import { invalidateUser } from "./cache/invalidate";

export async function assignUserRoleAndInvalidate(
  userId: string,
  slug: string,
  options?: { allowOwnerAssignment?: boolean },
) {
  await dbAssignUserRole(userId, slug, options);
  await invalidateUser(userId);
}
