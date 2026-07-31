-- CreateTable
CREATE TABLE "platform_auth_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "signInMethods" TEXT[] DEFAULT ARRAY['magic_link']::TEXT[],
    "signUpMethods" TEXT[] DEFAULT ARRAY['magic_link']::TEXT[],
    "registrationMode" "ApplicationRegistrationMode" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_auth_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_oauth_provider_connection" (
    "settingsId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "oauthProviderConnectionId" TEXT NOT NULL,

    CONSTRAINT "platform_oauth_provider_connection_pkey" PRIMARY KEY ("settingsId","provider")
);

-- CreateIndex
CREATE INDEX "platform_oauth_provider_connection_oauthProviderConnectionI_idx" ON "platform_oauth_provider_connection"("oauthProviderConnectionId");

-- RenameForeignKey
ALTER TABLE "application_email_provider_connection" RENAME CONSTRAINT "application_email_provider_connection_emailProviderConnectionId" TO "application_email_provider_connection_emailProviderConnect_fkey";

-- AddForeignKey
ALTER TABLE "platform_oauth_provider_connection" ADD CONSTRAINT "platform_oauth_provider_connection_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "platform_auth_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_oauth_provider_connection" ADD CONSTRAINT "platform_oauth_provider_connection_oauthProviderConnection_fkey" FOREIGN KEY ("oauthProviderConnectionId", "provider") REFERENCES "oauth_provider_connection"("id", "provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "application_email_provider_connection_emailProviderConnectionId" RENAME TO "application_email_provider_connection_emailProviderConnecti_idx";
