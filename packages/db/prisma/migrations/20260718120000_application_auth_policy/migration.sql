ALTER TABLE "application"
ADD COLUMN "signInMethods" TEXT[] NOT NULL DEFAULT ARRAY['magic_link', 'password']::TEXT[],
ADD COLUMN "signUpMethods" TEXT[] NOT NULL DEFAULT ARRAY['magic_link']::TEXT[],
ADD COLUMN "registrationMode" TEXT NOT NULL DEFAULT 'closed';

CREATE TABLE "application_invitation" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "inviterId" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "application_invitation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_invitation_applicationId_email_status_idx"
ON "application_invitation"("applicationId", "email", "status");
CREATE INDEX "application_invitation_expiresAt_idx"
ON "application_invitation"("expiresAt");
CREATE INDEX "application_invitation_inviterId_idx"
ON "application_invitation"("inviterId");

ALTER TABLE "application_invitation"
ADD CONSTRAINT "application_invitation_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_invitation"
ADD CONSTRAINT "application_invitation_inviterId_fkey"
FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
