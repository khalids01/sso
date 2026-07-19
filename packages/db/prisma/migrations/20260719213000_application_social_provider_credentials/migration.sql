CREATE TABLE "application_social_provider_credential" (
    "id" TEXT NOT NULL,
    "applicationClientId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_social_provider_credential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_social_provider_credential_applicationClientId_provider_key"
ON "application_social_provider_credential"("applicationClientId", "provider");

CREATE INDEX "application_social_provider_credential_provider_idx"
ON "application_social_provider_credential"("provider");

ALTER TABLE "application_social_provider_credential"
ADD CONSTRAINT "application_social_provider_credential_applicationClientId_fkey"
FOREIGN KEY ("applicationClientId") REFERENCES "application_client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
