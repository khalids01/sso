export const Roles = {
  PlatformOwner: "platform.owner",
  PlatformAdmin: "platform.admin",
  PlatformUser: "platform.user",
} as const;

export type RoleSlug = (typeof Roles)[keyof typeof Roles];

export type RoleDefinition = {
  slug: RoleSlug;
  name: string;
  scope: "platform";
  isSystem: boolean;
  isProtected: boolean;
};

export const RoleDefinitions: Record<RoleSlug, RoleDefinition> = {
  [Roles.PlatformOwner]: {
    slug: Roles.PlatformOwner,
    name: "Owner",
    scope: "platform",
    isSystem: true,
    isProtected: true,
  },
  [Roles.PlatformAdmin]: {
    slug: Roles.PlatformAdmin,
    name: "Admin",
    scope: "platform",
    isSystem: true,
    isProtected: false,
  },
  [Roles.PlatformUser]: {
    slug: Roles.PlatformUser,
    name: "User",
    scope: "platform",
    isSystem: true,
    isProtected: false,
  },
};

export const AllRoleSlugs: readonly RoleSlug[] = Object.values(Roles);
