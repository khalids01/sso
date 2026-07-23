import { randomBytes, randomUUID } from "node:crypto";
import { auth, createS256Challenge, hashOAuthToken } from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { oauthTokenController } from "../../src/modules/oauth/oauth-token.controller";

const runId = randomUUID();
const applicationId = `token-test-app-${runId}`;
const userId = `token-test-user-${runId}`;
const clientId = `sso_client_token_test_${runId}`;
const memberId = `token-test-member-${runId}`;
const subject = randomBytes(32).toString("base64url");
const sessionId = `token-test-session-${runId}`;
const origin = "http://127.0.0.1:48621";
const redirectUri = `${origin}/callback`;
const verificationIds: string[] = [];
const requestIds: string[] = [];

function verifier() {
  return randomBytes(48).toString("base64url");
}

async function createCode(codeVerifier: string, expiresAt = new Date(Date.now() + 60_000)) {
  const code = randomBytes(24).toString("base64url");
  const id = randomUUID();
  verificationIds.push(id);
  await prisma.verification.create({
    data: {
      id,
      identifier: hashOAuthToken(code),
      value: JSON.stringify({
        type: "authorization_code",
        userId,
        sessionId,
        // Better Auth 1.6.x persists the original authentication time with
        // authorization codes. The SSO parser must remain forward-compatible
        // with that payload while deriving claims from the live session.
        authTime: new Date().toISOString(),
        query: {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid",
          code_challenge_method: "S256",
          code_challenge: createS256Challenge(codeVerifier),
          nonce: "nonce-1",
        },
      }),
      expiresAt,
    },
  });
  return code;
}

async function exchange(
  code: string,
  codeVerifier: string,
  overrides: { origin?: string; clientId?: string; redirectUri?: string } = {},
) {
  const response = await oauthTokenController.handle(
    new Request("http://localhost:5001/api/auth/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: overrides.origin ?? origin,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: overrides.clientId ?? clientId,
        code,
        redirect_uri: overrides.redirectUri ?? redirectUri,
        code_verifier: codeVerifier,
      }),
    }),
  );
  const requestId = response.headers.get("x-request-id");
  if (requestId) requestIds.push(requestId);
  return response;
}

try {
  await prisma.user.create({
    data: {
      id: userId,
      name: "OAuth Token Test User",
      email: `oauth-token-${runId}@example.test`,
      emailVerified: true,
      image: "https://example.test/avatar.png",
    },
  });
  await prisma.application.create({
    data: {
      id: applicationId,
      slug: `oauth-token-${runId}`,
      name: "OAuth Token Test Application",
      clients: {
        create: {
          id: `token-test-client-${runId}`,
          clientId,
          name: "OAuth Token Test Client",
          redirectUris: [redirectUri],
          allowedOrigins: [origin],
        },
      },
      members: {
        create: { id: memberId, userId, status: "active" },
      },
      subjects: {
        create: { id: `token-test-subject-${runId}`, userId, subject },
      },
    },
  });
  await prisma.session.create({
    data: {
      id: sessionId,
      token: randomBytes(32).toString("base64url"),
      userId,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const firstVerifier = verifier();
  const firstCode = await createCode(firstVerifier);
  const preflight = await oauthTokenController.handle(
    new Request("http://localhost:5001/api/auth/oauth2/token", {
      method: "OPTIONS",
      headers: { origin },
    }),
  );
  const success = await exchange(firstCode, firstVerifier);
  const tokens = await success.json() as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
  };
  const jwks = await auth.handler(
    new Request("http://localhost:5001/api/auth/jwks"),
  );
  const jwksBody = await jwks.json() as JSONWebKeySet;
  const keySet = createLocalJWKSet(jwksBody);
  const access = await jwtVerify(tokens.access_token, keySet, {
    issuer: env.SSO_ISSUER,
    audience: `urn:sso:application:${applicationId}`,
  });
  const id = await jwtVerify(tokens.id_token, keySet, {
    issuer: env.SSO_ISSUER,
    audience: clientId,
  });

  const resourceVerifier = verifier();
  const resourceCode = await createCode(resourceVerifier);
  const resourceIndicator = await oauthTokenController.handle(
    new Request("http://localhost:5001/api/auth/oauth2/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code: resourceCode,
        redirect_uri: redirectUri,
        code_verifier: resourceVerifier,
        resource: "https://resource.example.test",
      }),
    }),
  );

  const concurrentVerifier = verifier();
  const concurrentCode = await createCode(concurrentVerifier);
  const concurrent = await Promise.all([
    exchange(concurrentCode, concurrentVerifier),
    exchange(concurrentCode, concurrentVerifier),
  ]);

  const burnedVerifier = verifier();
  const burnedCode = await createCode(burnedVerifier);
  const wrongVerifier = await exchange(burnedCode, `${burnedVerifier}x`);
  const afterWrongVerifier = await exchange(burnedCode, burnedVerifier);

  const expiredVerifier = verifier();
  const expiredCode = await createCode(
    expiredVerifier,
    new Date(Date.now() - 1_000),
  );
  const expired = await exchange(expiredCode, expiredVerifier);

  const redirectVerifier = verifier();
  const redirectCode = await createCode(redirectVerifier);
  const wrongRedirect = await exchange(redirectCode, redirectVerifier, {
    redirectUri: `${origin}/wrong-callback`,
  });

  const clientVerifier = verifier();
  const clientCode = await createCode(clientVerifier);
  const wrongClient = await exchange(clientCode, clientVerifier, {
    clientId: `${clientId}-wrong`,
  });

  const inactiveStatuses: Record<string, number> = {};
  for (const scenario of [
    {
      name: "client",
      disable: () => prisma.applicationClient.update({
        where: { clientId },
        data: { oauthDisabled: true },
      }),
      restore: () => prisma.applicationClient.update({
        where: { clientId },
        data: { oauthDisabled: false },
      }),
    },
    {
      name: "application",
      disable: () => prisma.application.update({
        where: { id: applicationId },
        data: { status: "archived" },
      }),
      restore: () => prisma.application.update({
        where: { id: applicationId },
        data: { status: "active" },
      }),
    },
    {
      name: "membership",
      disable: () => prisma.applicationMember.update({
        where: { id: memberId },
        data: { status: "suspended" },
      }),
      restore: () => prisma.applicationMember.update({
        where: { id: memberId },
        data: { status: "active" },
      }),
    },
    {
      name: "user",
      disable: () => prisma.user.update({
        where: { id: userId },
        data: { banned: true },
      }),
      restore: () => prisma.user.update({
        where: { id: userId },
        data: { banned: false },
      }),
    },
    {
      name: "session",
      disable: () => prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      }),
      restore: () => prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(Date.now() + 60_000) },
      }),
    },
  ]) {
    const scenarioVerifier = verifier();
    const scenarioCode = await createCode(scenarioVerifier);
    await scenario.disable();
    inactiveStatuses[scenario.name] = (
      await exchange(scenarioCode, scenarioVerifier)
    ).status;
    await scenario.restore();
  }

  const unregisteredPreflight = await oauthTokenController.handle(
    new Request("http://localhost:5001/api/auth/oauth2/token", {
      method: "OPTIONS",
      headers: { origin: "http://127.0.0.1:49999" },
    }),
  );

  const subjectBefore = await prisma.applicationSubject.findUniqueOrThrow({
    where: { applicationId_userId: { applicationId, userId } },
    select: { subject: true },
  });
  await prisma.applicationMember.delete({ where: { id: memberId } });
  await prisma.applicationMember.create({
    data: { id: memberId, applicationId, userId, status: "active" },
  });
  const subjectAfter = await prisma.applicationSubject.findUniqueOrThrow({
    where: { applicationId_userId: { applicationId, userId } },
    select: { subject: true },
  });

  const payload = access.payload as Record<string, unknown>;
  const idPayload = id.payload as Record<string, unknown>;
  console.log(JSON.stringify({
    preflight: preflight.status,
    preflightOrigin: preflight.headers.get("access-control-allow-origin"),
    preflightCredentials: preflight.headers.get("access-control-allow-credentials"),
    success: success.status,
    cacheControl: success.headers.get("cache-control"),
    accessClaims: {
      sub: payload.sub,
      aud: payload.aud,
      azp: payload.azp,
      scope: payload.scope,
      applicationId: payload.application_id,
      membershipId: payload.membership_id,
      authorizationVersion: payload.authorization_version,
      hasPlatformPermissions: "permissions" in payload || "roles" in payload,
    },
    idClaims: {
      sub: idPayload.sub,
      aud: idPayload.aud,
      nonce: idPayload.nonce,
      name: idPayload.name,
      email: idPayload.email,
      emailVerified: idPayload.email_verified,
      picture: idPayload.picture,
    },
    refreshTokenPresent: Boolean(tokens.refresh_token),
    resourceIndicator: resourceIndicator.status,
    concurrent: concurrent.map((response) => response.status).sort(),
    wrongVerifier: wrongVerifier.status,
    afterWrongVerifier: afterWrongVerifier.status,
    expired: expired.status,
    wrongRedirect: wrongRedirect.status,
    wrongClient: wrongClient.status,
    inactiveStatuses,
    unregisteredPreflight: unregisteredPreflight.status,
    pairwiseSubjectStable: subjectBefore.subject === subjectAfter.subject,
    jwks: {
      status: jwks.status,
      count: jwksBody.keys.length,
      hasPrivateMaterial: jwksBody.keys.some((key) => "d" in key),
      algorithms: jwksBody.keys.map((key) => key.alg),
    },
  }));
} finally {
  for (const requestId of requestIds) {
    await prisma.activityEvent.deleteMany({
      where: { metadata: { path: ["requestId"], equals: requestId } },
    });
  }
  await prisma.verification.deleteMany({ where: { id: { in: verificationIds } } });
  await prisma.application.deleteMany({ where: { id: applicationId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
