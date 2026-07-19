import { randomBytes } from "node:crypto";
import { e2eEnv } from "./environment";
import { updateRunState } from "./run-state";

export async function provisionOAuthFixture(actorId: string, revocationUserId: string) {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  const slug = `${e2eEnv.runPrefix}oauth`;
  const clientId = `sso_client_${randomBytes(18).toString("base64url")}`;
  const redirectUri = `${e2eEnv.E2E_CALLBACK_ORIGIN}/callback`;
  const actorSubject = randomBytes(32).toString("base64url");
  const revocationSubject = randomBytes(32).toString("base64url");

  try {
    const application = await prisma.application.create({
      data: {
        slug,
        name: `E2E OAuth ${e2eEnv.runId}`,
        description: "Run-owned OAuth browser fixture",
        registrationMode: "open",
        clients: {
          create: {
            clientId,
            name: `E2E OAuth Client ${e2eEnv.runId}`,
            clientType: "public",
            status: "active",
            oauthDisabled: false,
            skipConsent: true,
            enableEndSession: false,
            scopes: ["openid"],
            tokenEndpointAuthMethod: "none",
            grantTypes: ["authorization_code"],
            responseTypes: ["code"],
            public: true,
            metadata: { runId: e2eEnv.runId },
            redirectUris: [redirectUri],
            allowedOrigins: [e2eEnv.E2E_CALLBACK_ORIGIN],
          },
        },
        members: {
          create: [
            { userId: actorId, status: "active" },
            { userId: revocationUserId, status: "active" },
          ],
        },
        subjects: {
          create: [
            { userId: actorId, subject: actorSubject },
            { userId: revocationUserId, subject: revocationSubject },
          ],
        },
      },
      select: {
        id: true,
        clients: { select: { id: true, clientId: true } },
        members: { select: { id: true, userId: true } },
      },
    });
    const client = application.clients[0]!;
    const member = application.members.find((item) => item.userId === actorId)!;
    const revocationMember = application.members.find(
      (item) => item.userId === revocationUserId,
    )!;
    updateRunState((state) => {
      state.applicationIds.push(application.id);
      state.clientIds.push(client.id);
      state.membershipIds.push(member.id, revocationMember.id);
      state.oauthFixture = {
        applicationId: application.id,
        memberId: member.id,
        clientId: client.clientId,
        redirectUri,
        revocationMemberId: revocationMember.id,
        revocationUserId,
        revocationSubject,
      };
    });
  } finally {
    await prisma.$disconnect();
  }
}
