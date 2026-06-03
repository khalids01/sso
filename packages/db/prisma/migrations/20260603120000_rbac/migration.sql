-- CreateTable
CREATE TABLE "rbac_permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rbac_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_role" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'platform',
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "seedVersion" INTEGER NOT NULL DEFAULT 1,
    "customizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rbac_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_role_permission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "rbac_role_permission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "rbac_user_role" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "rbac_user_role_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "rbac_user_permission_override" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "rbac_user_permission_override_pkey" PRIMARY KEY ("userId","permissionId","effect")
);

-- CreateIndex
CREATE UNIQUE INDEX "rbac_permission_name_key" ON "rbac_permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_role_slug_key" ON "rbac_role"("slug");

-- CreateIndex
CREATE INDEX "rbac_user_role_roleId_idx" ON "rbac_user_role"("roleId");

-- AddForeignKey
ALTER TABLE "rbac_role_permission" ADD CONSTRAINT "rbac_role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_role_permission" ADD CONSTRAINT "rbac_role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "rbac_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_role" ADD CONSTRAINT "rbac_user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_role" ADD CONSTRAINT "rbac_user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "rbac_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
