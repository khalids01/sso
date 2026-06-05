import type { AuthUser } from "@auth";

export function getAccountStatusRejection(user?: AuthUser | null) {
  if (!user) {
    return null;
  }

  if (user.banned) {
    return {
      message: "Account is banned",
      status: 403,
    };
  }

  if (user.archived) {
    return {
      message: "Account is archived",
      status: 403,
    };
  }

  return null;
}
