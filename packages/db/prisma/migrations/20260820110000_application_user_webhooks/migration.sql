CREATE TABLE "application_webhook_endpoint" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subscribedEvents" TEXT[] NOT NULL DEFAULT ARRAY['user.created', 'user.updated', 'user.deleted']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "application_webhook_endpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_webhook_delivery" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "endpointId" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
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
    CONSTRAINT "application_webhook_delivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_webhook_endpoint_applicationId_key" ON "application_webhook_endpoint"("applicationId");
CREATE INDEX "application_webhook_delivery_status_nextAttemptAt_idx" ON "application_webhook_delivery"("status", "nextAttemptAt");
CREATE INDEX "application_webhook_delivery_applicationId_createdAt_idx" ON "application_webhook_delivery"("applicationId", "createdAt");
CREATE INDEX "application_webhook_delivery_endpointId_idx" ON "application_webhook_delivery"("endpointId");
ALTER TABLE "application_webhook_endpoint" ADD CONSTRAINT "application_webhook_endpoint_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_webhook_delivery" ADD CONSTRAINT "application_webhook_delivery_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_webhook_delivery" ADD CONSTRAINT "application_webhook_delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "application_webhook_endpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
