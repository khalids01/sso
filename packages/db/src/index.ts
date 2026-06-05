export * from "../prisma/generated/client";
export {
  assignUserRole,
  countActivePlatformOwners,
  getPrimaryRoleSlug,
  getRoleIdBySlug,
  hasPlatformOwner,
} from "./rbac/assignments";
export { default } from "./client";
export { default as prisma } from "./client";
