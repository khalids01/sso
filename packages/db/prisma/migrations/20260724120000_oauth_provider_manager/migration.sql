BEGIN;

CREATE TABLE "oauth_provider_connection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "credentialVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_provider_connection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_oauth_provider_connection" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "oauthProviderConnectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_oauth_provider_connection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "account"
ADD COLUMN "oauthProviderConnectionId" TEXT;

CREATE UNIQUE INDEX "oauth_provider_connection_provider_name_key"
ON "oauth_provider_connection"("provider", "name");

CREATE UNIQUE INDEX "oauth_provider_connection_provider_clientId_key"
ON "oauth_provider_connection"("provider", "clientId");

CREATE UNIQUE INDEX "oauth_provider_connection_id_provider_key"
ON "oauth_provider_connection"("id", "provider");

CREATE INDEX "oauth_provider_connection_provider_status_idx"
ON "oauth_provider_connection"("provider", "status");

CREATE INDEX "oauth_provider_connection_status_idx"
ON "oauth_provider_connection"("status");

CREATE UNIQUE INDEX "application_oauth_provider_connection_applicationId_provide_key"
ON "application_oauth_provider_connection"("applicationId", "provider");

CREATE INDEX "application_oauth_provider_connection_oauthProviderConnecti_idx"
ON "application_oauth_provider_connection"("oauthProviderConnectionId");

CREATE UNIQUE INDEX "account_oauthProviderConnectionId_providerId_accountId_key"
ON "account"("oauthProviderConnectionId", "providerId", "accountId");

CREATE INDEX "account_oauthProviderConnectionId_idx"
ON "account"("oauthProviderConnectionId");

ALTER TABLE "application_oauth_provider_connection"
ADD CONSTRAINT "application_oauth_provider_connection_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "application"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_oauth_provider_connection"
ADD CONSTRAINT "application_oauth_provider_connection_oauthProviderConnect_fkey"
FOREIGN KEY ("oauthProviderConnectionId", "provider")
REFERENCES "oauth_provider_connection"("id", "provider")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account"
ADD CONSTRAINT "account_oauthProviderConnectionId_fkey"
FOREIGN KEY ("oauthProviderConnectionId") REFERENCES "oauth_provider_connection"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "rbac_permission" ("id", "name", "description", "group", "isSystem", "createdAt")
VALUES
  ('perm_admin_oauth_connections_read', 'admin.oauth_connections.read', 'View OAuth provider connections', 'admin.oauth_connections', true, CURRENT_TIMESTAMP),
  ('perm_admin_oauth_connections_manage', 'admin.oauth_connections.manage', 'Manage OAuth provider connections', 'admin.oauth_connections', true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "rbac_role_permission" ("roleId", "permissionId")
SELECT role.id, permission.id
FROM "rbac_role" AS role
CROSS JOIN "rbac_permission" AS permission
WHERE permission.name IN (
    'admin.oauth_connections.read',
    'admin.oauth_connections.manage'
  )
  AND (
    role.slug = 'platform.owner'
    OR (role.slug = 'platform.admin' AND role."customizedAt" IS NULL)
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

DROP TABLE "application_social_provider_credential";

COMMIT;
