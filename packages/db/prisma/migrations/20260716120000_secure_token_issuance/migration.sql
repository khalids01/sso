CREATE TABLE "application_subject" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_subject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "application_subject_subject_key" ON "application_subject"("subject");
CREATE UNIQUE INDEX "application_subject_applicationId_userId_key" ON "application_subject"("applicationId", "userId");
CREATE INDEX "application_subject_applicationId_idx" ON "application_subject"("applicationId");
CREATE INDEX "application_subject_userId_idx" ON "application_subject"("userId");

ALTER TABLE "application_subject" ADD CONSTRAINT "application_subject_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_subject" ADD CONSTRAINT "application_subject_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "application_subject" ("id", "applicationId", "userId", "subject")
SELECT
    gen_random_uuid()::text,
    member."applicationId",
    member."userId",
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
FROM "application_member" AS member;

CREATE TABLE "jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jwks_createdAt_idx" ON "jwks"("createdAt");
CREATE INDEX "jwks_expiresAt_idx" ON "jwks"("expiresAt");
