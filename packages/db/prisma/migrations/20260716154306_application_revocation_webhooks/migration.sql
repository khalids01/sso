-- AlterTable
ALTER TABLE "application_member" ADD COLUMN     "authorizationVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "application_revocation_endpoint" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_revocation_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_revocation_delivery" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "endpointId" TEXT,
    "membershipId" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'application.access.revoked',
    "reason" TEXT NOT NULL,
    "subject" TEXT,
    "authorizationVersion" INTEGER,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "lastHttpStatus" INTEGER,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_revocation_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_revocation_endpoint_applicationId_key" ON "application_revocation_endpoint"("applicationId");

-- CreateIndex
CREATE INDEX "application_revocation_endpoint_enabled_idx" ON "application_revocation_endpoint"("enabled");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_status_nextAttemptAt_idx" ON "application_revocation_delivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_applicationId_createdAt_idx" ON "application_revocation_delivery"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_endpointId_idx" ON "application_revocation_delivery"("endpointId");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_membershipId_idx" ON "application_revocation_delivery"("membershipId");

-- AddForeignKey
ALTER TABLE "application_revocation_endpoint" ADD CONSTRAINT "application_revocation_endpoint_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "application_revocation_endpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "application_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
