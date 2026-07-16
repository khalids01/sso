import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import { RolePermissionMap, Roles } from "@rbac";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { adminApplicationsService } from "../../src/modules/admin/applications/applications.service";
import { usersService } from "../../src/modules/admin/users/users.service";
import { processNextRevocationDelivery } from "../../src/modules/application-revocation/revocation.service";

const runId = randomUUID();
const actorId = `revocation-actor-${runId}`;
const userId = `revocation-user-${runId}`;
const applicationIds = [`revocation-app-a-${runId}`, `revocation-app-b-${runId}`];
const membershipIds = [`revocation-member-a-${runId}`, `revocation-member-b-${runId}`];
const subjects = [
  randomBytes(32).toString("base64url"),
  randomBytes(32).toString("base64url"),
];
const received: Array<{ eventId: string | null; token: string }> = [];
const receiver = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const token = await request.text();
    received.push({ eventId: request.headers.get("x-sso-event-id"), token });
    return new Response(null, { status: url.pathname === "/terminal" ? 400 : 204 });
  },
});
const receiverOrigin = `http://127.0.0.1:${receiver.port}`;

const actor = {
  id: actorId,
  permissions: new Set(RolePermissionMap[Roles.PlatformOwner]),
};

try {
  await prisma.user.createMany({
    data: [
      {
        id: actorId,
        name: "Revocation Test Actor",
        email: `revocation-actor-${runId}@example.test`,
        emailVerified: true,
      },
      {
        id: userId,
        name: "Revocation Test User",
        email: `revocation-user-${runId}@example.test`,
        emailVerified: true,
      },
    ],
  });

  for (const [index, applicationId] of applicationIds.entries()) {
    await prisma.application.create({
      data: {
        id: applicationId,
        slug: `revocation-${index}-${runId}`,
        name: `Revocation Application ${index}`,
        revocationEndpoint: {
          create: { url: `${receiverOrigin}/deliver`, enabled: true },
        },
        members: {
          create: {
            id: membershipIds[index]!,
            userId,
            status: "active",
          },
        },
        subjects: {
          create: { userId, subject: subjects[index]! },
        },
      },
    });
  }

  let rolledBack = false;
  try {
    await adminApplicationsService.suspendMember(
      applicationIds[0]!,
      membershipIds[0]!,
      { id: "missing-actor" },
    );
  } catch {
    rolledBack = true;
  }
  const afterRollback = await prisma.applicationMember.findUniqueOrThrow({
    where: { id: membershipIds[0] },
    select: { status: true, authorizationVersion: true },
  });

  await usersService.banUser(userId, "integration-test", actor);
  const afterBan = await prisma.applicationMember.findMany({
    where: { id: { in: membershipIds } },
    orderBy: { id: "asc" },
    select: { id: true, authorizationVersion: true },
  });
  const banDeliveries = await prisma.applicationRevocationDelivery.findMany({
    where: { applicationId: { in: applicationIds }, reason: "user_banned" },
    orderBy: { applicationId: "asc" },
  });

  const concurrentClaims = await Promise.all([
    processNextRevocationDelivery(),
    processNextRevocationDelivery(),
    processNextRevocationDelivery(),
  ]);

  const jwksResponse = await auth.handler(new Request("http://localhost:5001/api/auth/jwks"));
  const keySet = createLocalJWKSet((await jwksResponse.json()) as JSONWebKeySet);
  const verified = [];
  for (const item of received) {
    const applicationId = applicationIds.find((id) => item.eventId && banDeliveries.some((delivery) => delivery.id === item.eventId && delivery.applicationId === id));
    if (!applicationId) continue;
    const result = await jwtVerify(item.token, keySet, {
      issuer: env.SSO_ISSUER,
      audience: `urn:sso:application:${applicationId}`,
      algorithms: ["RS256"],
    });
    verified.push({ eventId: item.eventId, applicationId, payload: result.payload });
  }

  await usersService.unbanUser(userId, actor);
  const afterRestore = await prisma.applicationMember.findMany({
    where: { id: { in: membershipIds } },
    orderBy: { id: "asc" },
    select: { authorizationVersion: true },
  });

  await adminApplicationsService.suspendMember(
    applicationIds[0]!,
    membershipIds[0]!,
    { id: actorId },
  );
  const suspended = await prisma.applicationMember.findUniqueOrThrow({
    where: { id: membershipIds[0] },
    select: { authorizationVersion: true },
  });
  await processNextRevocationDelivery();
  await adminApplicationsService.restoreMember(
    applicationIds[0]!,
    membershipIds[0]!,
    { id: actorId },
  );
  const restored = await prisma.applicationMember.findUniqueOrThrow({
    where: { id: membershipIds[0] },
    select: { authorizationVersion: true },
  });

  await prisma.applicationRevocationEndpoint.update({
    where: { applicationId: applicationIds[0] },
    data: { url: `${receiverOrigin}/terminal` },
  });
  await adminApplicationsService.revokeMember(
    applicationIds[0]!,
    membershipIds[0]!,
    { id: actorId },
  );
  await processNextRevocationDelivery();
  const terminal = await prisma.applicationRevocationDelivery.findFirstOrThrow({
    where: { applicationId: applicationIds[0], reason: "membership_revoked" },
    orderBy: { createdAt: "desc" },
    select: { status: true, attemptCount: true, lastHttpStatus: true },
  });

  await adminApplicationsService.archive(applicationIds[1]!, { id: actorId });
  const applicationWide = await prisma.applicationRevocationDelivery.findFirstOrThrow({
    where: { applicationId: applicationIds[1], reason: "application_archived" },
    select: { subject: true, membershipId: true },
  });

  const endpointId = (
    await prisma.applicationRevocationEndpoint.findUniqueOrThrow({
      where: { applicationId: applicationIds[1] },
      select: { id: true },
    })
  ).id;
  const expiredDelivery = await prisma.applicationRevocationDelivery.create({
    data: {
      applicationId: applicationIds[1]!,
      endpointId,
      destinationUrl: `${receiverOrigin}/deliver`,
      reason: "application_archived",
      effectiveAt: new Date(Date.now() - 25 * 60 * 60_000),
      deadlineAt: new Date(Date.now() - 60_000),
    },
  });
  await processNextRevocationDelivery();
  const expired = await prisma.applicationRevocationDelivery.findUniqueOrThrow({
    where: { id: expiredDelivery.id },
    select: { status: true, lastErrorCode: true },
  });

  console.log(JSON.stringify({
    rollback: {
      failed: rolledBack,
      status: afterRollback.status,
      version: afterRollback.authorizationVersion,
    },
    pairwiseDistinct: subjects[0] !== subjects[1],
    banVersions: afterBan.map((item) => item.authorizationVersion),
    banDeliveryCount: banDeliveries.length,
    concurrentClaims,
    signed: verified.map((item) => ({
      eventIdMatches: item.eventId === item.payload.jti,
      applicationId: item.applicationId,
      audience: item.payload.aud,
      subject: item.payload.sub,
      reason: item.payload.reason,
      version: item.payload.authorization_version,
      hasPlatformIdentity:
        "user_id" in item.payload ||
        "email" in item.payload ||
        "permissions" in item.payload ||
        "roles" in item.payload,
    })),
    restoreVersions: afterRestore.map((item) => item.authorizationVersion),
    membershipTransition: {
      suspended: suspended.authorizationVersion,
      restored: restored.authorizationVersion,
    },
    terminal,
    applicationWide,
    expired,
  }));
} finally {
  receiver.stop(true);
  await prisma.activityEvent.deleteMany({
    where: {
      OR: [
        { actorUserId: actorId },
        { targetUserId: userId },
        ...applicationIds.map((applicationId) => ({
          metadata: { path: ["applicationId"], equals: applicationId },
        })),
      ],
    },
  });
  await prisma.application.deleteMany({ where: { id: { in: applicationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [actorId, userId] } } });
  await prisma.$disconnect();
}
