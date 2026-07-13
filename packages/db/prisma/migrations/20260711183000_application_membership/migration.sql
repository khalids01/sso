CREATE TABLE "application_member" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_member_applicationId_userId_key" ON "application_member"("applicationId", "userId");
CREATE INDEX "application_member_applicationId_idx" ON "application_member"("applicationId");
CREATE INDEX "application_member_userId_idx" ON "application_member"("userId");
CREATE INDEX "application_member_status_idx" ON "application_member"("status");

ALTER TABLE "application_member" ADD CONSTRAINT "application_member_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_member" ADD CONSTRAINT "application_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
