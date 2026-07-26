CREATE TYPE "EmailProvider" AS ENUM ('resend', 'nodemailer');
CREATE TYPE "EmailProviderConnectionStatus" AS ENUM ('active', 'disabled', 'archived');
CREATE TYPE "ApplicationEmailConnectionRole" AS ENUM ('primary', 'fallback');

CREATE TABLE "email_provider_connection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" "EmailProvider" NOT NULL,
  "fromName" TEXT NOT NULL,
  "fromAddress" TEXT NOT NULL,
  "replyToAddress" TEXT,
  "encryptedSecret" TEXT NOT NULL,
  "smtpHost" TEXT,
  "smtpPort" INTEGER,
  "smtpSecure" BOOLEAN,
  "smtpUsername" TEXT,
  "credentialVersion" INTEGER NOT NULL DEFAULT 1,
  "status" "EmailProviderConnectionStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_provider_connection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_provider_connection_name_key" ON "email_provider_connection"("name");
CREATE INDEX "email_provider_connection_provider_status_idx" ON "email_provider_connection"("provider", "status");
CREATE INDEX "email_provider_connection_status_createdAt_idx" ON "email_provider_connection"("status", "createdAt");

CREATE TABLE "application_email_provider_connection" (
  "applicationId" TEXT NOT NULL,
  "role" "ApplicationEmailConnectionRole" NOT NULL,
  "emailProviderConnectionId" TEXT NOT NULL,
  CONSTRAINT "application_email_provider_connection_pkey" PRIMARY KEY ("applicationId", "role"),
  CONSTRAINT "application_email_provider_connection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "application_email_provider_connection_emailProviderConnectionId_fkey" FOREIGN KEY ("emailProviderConnectionId") REFERENCES "email_provider_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "application_email_provider_connection_emailProviderConnectionId_idx" ON "application_email_provider_connection"("emailProviderConnectionId");

CREATE TABLE "email_delivery_attempt" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT,
  "emailProviderConnectionId" TEXT,
  "provider" "EmailProvider",
  "outcome" TEXT NOT NULL,
  "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_delivery_attempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_delivery_attempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "email_delivery_attempt_emailProviderConnectionId_fkey" FOREIGN KEY ("emailProviderConnectionId") REFERENCES "email_provider_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "email_delivery_attempt_applicationId_createdAt_idx" ON "email_delivery_attempt"("applicationId", "createdAt");
CREATE INDEX "email_delivery_attempt_emailProviderConnectionId_createdAt_idx" ON "email_delivery_attempt"("emailProviderConnectionId", "createdAt");
