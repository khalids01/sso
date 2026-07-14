ALTER TABLE "application_client"
ADD COLUMN "oauthDisabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "skipConsent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enableEndSession" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY['openid']::TEXT[],
ADD COLUMN "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "grantTypes" TEXT[] NOT NULL DEFAULT ARRAY['authorization_code']::TEXT[],
ADD COLUMN "responseTypes" TEXT[] NOT NULL DEFAULT ARRAY['code']::TEXT[],
ADD COLUMN "public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "metadata" JSONB;

UPDATE "application_client"
SET "oauthDisabled" = ("status" <> 'active'),
    "metadata" = jsonb_build_object('applicationId', "applicationId");

CREATE TABLE "oauth_consent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "scopes" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_consent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oauth_consent_clientId_idx" ON "oauth_consent"("clientId");
CREATE INDEX "oauth_consent_userId_idx" ON "oauth_consent"("userId");

ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "application_client"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
