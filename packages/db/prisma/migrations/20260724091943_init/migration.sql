-- CreateEnum
CREATE TYPE "ApplicationUsageEventType" AS ENUM ('signup', 'login', 'social_callback', 'authorization', 'token', 'logout', 'membership');

-- CreateEnum
CREATE TYPE "ApplicationUsageOutcome" AS ENUM ('success', 'denied', 'error');

-- CreateEnum
CREATE TYPE "ApplicationUsageAuthMethod" AS ENUM ('password', 'magic_link', 'google', 'github', 'facebook', 'linkedin', 'existing_session');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('active', 'disabled', 'archived');

-- CreateEnum
CREATE TYPE "ApplicationMemberStatus" AS ENUM ('active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "ApplicationRegistrationMode" AS ENUM ('closed', 'invite_only', 'open');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'github', 'facebook', 'linkedin');

-- CreateEnum
CREATE TYPE "OAuthProviderConnectionStatus" AS ENUM ('active', 'disabled', 'archived');

-- CreateTable
CREATE TABLE "activity_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_usage_event" (
    "id" TEXT NOT NULL,
    "type" "ApplicationUsageEventType" NOT NULL,
    "outcome" "ApplicationUsageOutcome" NOT NULL,
    "userId" TEXT,
    "applicationId" TEXT,
    "applicationClientId" TEXT,
    "oauthProviderConnectionId" TEXT,
    "authMethod" "ApplicationUsageAuthMethod",
    "requestId" TEXT,
    "reason" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'active',
    "logoUrl" TEXT,
    "homepageUrl" TEXT,
    "signInMethods" TEXT[] DEFAULT ARRAY['magic_link', 'password']::TEXT[],
    "signUpMethods" TEXT[] DEFAULT ARRAY['magic_link', 'password']::TEXT[],
    "registrationMode" "ApplicationRegistrationMode" NOT NULL DEFAULT 'closed',
    "passwordEmailVerificationRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_invitation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_member" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationMemberStatus" NOT NULL DEFAULT 'active',
    "authorizationVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_member_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "application_subject" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_client" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'public',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'active',
    "oauthDisabled" BOOLEAN NOT NULL DEFAULT false,
    "skipConsent" BOOLEAN NOT NULL DEFAULT true,
    "enableEndSession" BOOLEAN NOT NULL DEFAULT false,
    "scopes" TEXT[] DEFAULT ARRAY['openid']::TEXT[],
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "grantTypes" TEXT[] DEFAULT ARRAY['authorization_code']::TEXT[],
    "responseTypes" TEXT[] DEFAULT ARRAY['code']::TEXT[],
    "public" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "redirectUris" TEXT[],
    "allowedOrigins" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_provider_connection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "clientId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "credentialVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "OAuthProviderConnectionStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_provider_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_oauth_provider_connection" (
    "applicationId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "oauthProviderConnectionId" TEXT NOT NULL,

    CONSTRAINT "application_oauth_provider_connection_pkey" PRIMARY KEY ("applicationId","provider")
);

-- CreateTable
CREATE TABLE "oauth_consent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "polarCustomerId" TEXT,
    "subscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "rawProfile" JSONB,
    "profileUpdatedAt" TIMESTAMP(3),
    "oauthProviderConnectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_settings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "publicMaxRequests" INTEGER NOT NULL DEFAULT 60,
    "authEnabled" BOOLEAN NOT NULL DEFAULT true,
    "authWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "authMaxRequests" INTEGER NOT NULL DEFAULT 10,
    "protectedEnabled" BOOLEAN NOT NULL DEFAULT true,
    "protectedWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "protectedMaxRequests" INTEGER NOT NULL DEFAULT 120,
    "adminEnabled" BOOLEAN NOT NULL DEFAULT true,
    "adminWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "adminMaxRequests" INTEGER NOT NULL DEFAULT 300,
    "specialEnabled" BOOLEAN NOT NULL DEFAULT true,
    "specialWindowSeconds" INTEGER NOT NULL DEFAULT 60,
    "specialMaxRequests" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rbac_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_role" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'platform',
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "seedVersion" INTEGER NOT NULL DEFAULT 1,
    "customizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rbac_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rbac_role_permission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "rbac_role_permission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "rbac_user_role" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "rbac_user_role_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "rbac_user_permission_override" (
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "effect" TEXT NOT NULL,

    CONSTRAINT "rbac_user_permission_override_pkey" PRIMARY KEY ("userId","permissionId","effect")
);

-- CreateTable
CREATE TABLE "webhook_event" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_event_createdAt_idx" ON "activity_event"("createdAt");

-- CreateIndex
CREATE INDEX "activity_event_type_createdAt_idx" ON "activity_event"("type", "createdAt");

-- CreateIndex
CREATE INDEX "activity_event_actorUserId_createdAt_idx" ON "activity_event"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_event_targetUserId_createdAt_idx" ON "activity_event"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_createdAt_idx" ON "application_usage_event"("createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_userId_createdAt_idx" ON "application_usage_event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_applicationId_createdAt_idx" ON "application_usage_event"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_applicationClientId_createdAt_idx" ON "application_usage_event"("applicationClientId", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_oauthProviderConnectionId_createdAt_idx" ON "application_usage_event"("oauthProviderConnectionId", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_type_outcome_createdAt_idx" ON "application_usage_event"("type", "outcome", "createdAt");

-- CreateIndex
CREATE INDEX "application_usage_event_authMethod_createdAt_idx" ON "application_usage_event"("authMethod", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "application_slug_key" ON "application"("slug");

-- CreateIndex
CREATE INDEX "application_status_createdAt_idx" ON "application"("status", "createdAt");

-- CreateIndex
CREATE INDEX "application_invitation_applicationId_email_status_idx" ON "application_invitation"("applicationId", "email", "status");

-- CreateIndex
CREATE INDEX "application_invitation_expiresAt_idx" ON "application_invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "application_invitation_inviterId_idx" ON "application_invitation"("inviterId");

-- CreateIndex
CREATE INDEX "application_member_userId_idx" ON "application_member"("userId");

-- CreateIndex
CREATE INDEX "application_member_applicationId_status_createdAt_idx" ON "application_member"("applicationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "application_member_applicationId_userId_key" ON "application_member"("applicationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "application_revocation_endpoint_applicationId_key" ON "application_revocation_endpoint"("applicationId");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_status_nextAttemptAt_idx" ON "application_revocation_delivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_applicationId_createdAt_idx" ON "application_revocation_delivery"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_endpointId_idx" ON "application_revocation_delivery"("endpointId");

-- CreateIndex
CREATE INDEX "application_revocation_delivery_membershipId_idx" ON "application_revocation_delivery"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "application_subject_subject_key" ON "application_subject"("subject");

-- CreateIndex
CREATE INDEX "application_subject_userId_idx" ON "application_subject"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "application_subject_applicationId_userId_key" ON "application_subject"("applicationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "application_client_clientId_key" ON "application_client"("clientId");

-- CreateIndex
CREATE INDEX "application_client_applicationId_status_createdAt_idx" ON "application_client"("applicationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "oauth_provider_connection_provider_status_idx" ON "oauth_provider_connection"("provider", "status");

-- CreateIndex
CREATE INDEX "oauth_provider_connection_status_createdAt_idx" ON "oauth_provider_connection"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_connection_provider_name_key" ON "oauth_provider_connection"("provider", "name");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_connection_provider_clientId_key" ON "oauth_provider_connection"("provider", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_connection_id_provider_key" ON "oauth_provider_connection"("id", "provider");

-- CreateIndex
CREATE INDEX "application_oauth_provider_connection_oauthProviderConnecti_idx" ON "application_oauth_provider_connection"("oauthProviderConnectionId");

-- CreateIndex
CREATE INDEX "oauth_consent_clientId_idx" ON "oauth_consent"("clientId");

-- CreateIndex
CREATE INDEX "oauth_consent_userId_idx" ON "oauth_consent"("userId");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "user_banned_createdAt_idx" ON "user"("banned", "createdAt");

-- CreateIndex
CREATE INDEX "user_archived_createdAt_idx" ON "user"("archived", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_expiresAt_idx" ON "invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "invitation_roleId_idx" ON "invitation"("roleId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "account_oauthProviderConnectionId_idx" ON "account"("oauthProviderConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "jwks_createdAt_idx" ON "jwks"("createdAt");

-- CreateIndex
CREATE INDEX "jwks_expiresAt_idx" ON "jwks"("expiresAt");

-- CreateIndex
CREATE INDEX "feedback_userId_idx" ON "feedback"("userId");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_permission_name_key" ON "rbac_permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rbac_role_slug_key" ON "rbac_role"("slug");

-- CreateIndex
CREATE INDEX "rbac_user_role_roleId_idx" ON "rbac_user_role"("roleId");

-- CreateIndex
CREATE INDEX "webhook_event_status_createdAt_idx" ON "webhook_event"("status", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_event_eventType_createdAt_idx" ON "webhook_event"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_provider_eventId_key" ON "webhook_event"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_usage_event" ADD CONSTRAINT "application_usage_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_usage_event" ADD CONSTRAINT "application_usage_event_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_usage_event" ADD CONSTRAINT "application_usage_event_applicationClientId_fkey" FOREIGN KEY ("applicationClientId") REFERENCES "application_client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_usage_event" ADD CONSTRAINT "application_usage_event_oauthProviderConnectionId_fkey" FOREIGN KEY ("oauthProviderConnectionId") REFERENCES "oauth_provider_connection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_invitation" ADD CONSTRAINT "application_invitation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_invitation" ADD CONSTRAINT "application_invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_member" ADD CONSTRAINT "application_member_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_member" ADD CONSTRAINT "application_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_endpoint" ADD CONSTRAINT "application_revocation_endpoint_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "application_revocation_endpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_revocation_delivery" ADD CONSTRAINT "application_revocation_delivery_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "application_member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_subject" ADD CONSTRAINT "application_subject_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_subject" ADD CONSTRAINT "application_subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_client" ADD CONSTRAINT "application_client_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_oauth_provider_connection" ADD CONSTRAINT "application_oauth_provider_connection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_oauth_provider_connection" ADD CONSTRAINT "application_oauth_provider_connection_oauthProviderConnect_fkey" FOREIGN KEY ("oauthProviderConnectionId", "provider") REFERENCES "oauth_provider_connection"("id", "provider") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "application_client"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_oauthProviderConnectionId_fkey" FOREIGN KEY ("oauthProviderConnectionId") REFERENCES "oauth_provider_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_role_permission" ADD CONSTRAINT "rbac_role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_role_permission" ADD CONSTRAINT "rbac_role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "rbac_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_role" ADD CONSTRAINT "rbac_user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_role" ADD CONSTRAINT "rbac_user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rbac_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rbac_user_permission_override" ADD CONSTRAINT "rbac_user_permission_override_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "rbac_permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
