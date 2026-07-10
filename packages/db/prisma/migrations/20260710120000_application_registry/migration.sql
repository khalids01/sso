CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "logoUrl" TEXT,
    "homepageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "application_client" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'public',
    "status" TEXT NOT NULL DEFAULT 'active',
    "redirectUris" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "allowedOrigins" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_slug_key" ON "application"("slug");
CREATE INDEX "application_status_idx" ON "application"("status");
CREATE UNIQUE INDEX "application_client_clientId_key" ON "application_client"("clientId");
CREATE INDEX "application_client_applicationId_idx" ON "application_client"("applicationId");
CREATE INDEX "application_client_status_idx" ON "application_client"("status");

ALTER TABLE "application_client" ADD CONSTRAINT "application_client_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
