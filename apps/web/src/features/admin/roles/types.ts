export type AdminRoleSummary = {
  id: string;
  slug: string;
  name: string;
  scope: string;
  isSystem: boolean;
  isProtected: boolean;
  customizedAt: string | null;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminRoleDetail = {
  id: string;
  slug: string;
  name: string;
  scope: string;
  isSystem: boolean;
  isProtected: boolean;
  customizedAt: string | null;
  permissions: string[];
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PermissionCatalogEntry = {
  id: string;
  name: string;
  group: string | null;
  description: string | null;
  isSystem: boolean;
};

export type AssignableRole = {
  id: string;
  slug: string;
  name: string;
  isSystem: boolean;
};
