import { assignUserRole as dbAssignUserRole } from "@db/rbac/assignments";

import { invalidateUser } from "./cache/invalidate";

export async function assignUserRoleAndInvalidate(
  userId: string,
  slug: string,
) {
  await dbAssignUserRole(userId, slug);
  await invalidateUser(userId);
}
