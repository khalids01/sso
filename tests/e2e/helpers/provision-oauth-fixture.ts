import { randomBytes } from "node:crypto";
import { e2eEnv } from "./environment";
import { updateRunState } from "./run-state";

export async function provisionOAuthFixture(actorId: string) {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  const slug = `${e2eEnv.runPrefix}oauth`;
  const clientId = `sso_client_${randomBytes(18).toString("base64url")}`;
  const redirectUri = `${e2eEnv.E2E_CALLBACK_ORIGIN}/callback`;

  try {
    const application = await prisma.application.create({
      data: {
        slug,
        name: `E2E OAuth ${e2eEnv.runId}`,
        description: "Run-owned OAuth browser fixture",
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
          create: { userId: actorId, status: "active" },
        },
        subjects: {
          create: {
            userId: actorId,
            subject: randomBytes(32).toString("base64url"),
          },
        },
      },
      select: {
        id: true,
        clients: { select: { id: true, clientId: true } },
        members: { select: { id: true } },
      },
    });
    const client = application.clients[0]!;
    const member = application.members[0]!;
    updateRunState((state) => {
      state.applicationIds.push(application.id);
      state.clientIds.push(client.id);
      state.membershipIds.push(member.id);
      state.oauthFixture = {
        applicationId: application.id,
        memberId: member.id,
        clientId: client.clientId,
        redirectUri,
      };
    });
  } finally {
    await prisma.$disconnect();
  }
}
