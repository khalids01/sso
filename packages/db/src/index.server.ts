export * from "../prisma/generated/client";
export {
  assignUserRole,
  countActivePlatformOwners,
  getPrimaryRoleSlug,
  getRoleIdBySlug,
  hasPlatformOwner,
} from "./rbac/assignments.server";
export { default } from "./client.server";
export { default as prisma } from "./client.server";
