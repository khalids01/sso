import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Roles } from "../../../packages/rbac/src/index";

import { resolveActorRole } from "./actor-role";
import { e2eEnv } from "./environment";

export async function provisionE2EIdentities() {
  if (!e2eEnv.E2E_PROVISION_ACTOR) {
    throw new Error("Set E2E_PROVISION_ACTOR=true to provision dedicated E2E identities");
  }
  if (e2eEnv.E2E_ACTOR_EMAIL === e2eEnv.E2E_MEMBER_EMAIL) {
    throw new Error("E2E actor and member must use different dedicated identities");
  }

  const [{ default: prisma }, assignments, sessions] = await Promise.all([
    import("../../../packages/db/src/client.server"),
    import("../../../packages/db/src/rbac/assignments.server"),
    import("../../../packages/db/src/session-revocation.server"),
  ]);
  const role = resolveActorRole(e2eEnv.E2E_ACTOR_ROLE);

  try {
    let actor = await prisma.user.findUnique({
      where: { email: e2eEnv.E2E_ACTOR_EMAIL },
      select: { id: true },
    });

    if (role === Roles.PlatformOwner) {
      if (!actor || (await assignments.getPrimaryRoleSlug(actor.id)) !== role) {
        throw new Error(
          `Owner E2E actor is not bootstrapped. Run: OWNER_EMAIL=${e2eEnv.E2E_ACTOR_EMAIL} OWNER_NAME="${e2eEnv.E2E_ACTOR_NAME}" bun make-owner`,
        );
      }
      actor = await prisma.user.update({
        where: { id: actor.id },
        data: { emailVerified: true, banned: false, banReason: null, archived: false },
        select: { id: true },
      });
    } else {
      if (actor && (await assignments.getPrimaryRoleSlug(actor.id)) === Roles.PlatformOwner) {
        throw new Error("Refusing to change an existing platform.owner through E2E provisioning");
      }
      actor = await prisma.user.upsert({
        where: { email: e2eEnv.E2E_ACTOR_EMAIL },
        create: {
          id: randomUUID(),
          email: e2eEnv.E2E_ACTOR_EMAIL,
          name: e2eEnv.E2E_ACTOR_NAME,
          emailVerified: true,
          banned: false,
          archived: false,
        },
        update: {
          name: e2eEnv.E2E_ACTOR_NAME,
          emailVerified: true,
          banned: false,
          banReason: null,
          archived: false,
        },
        select: { id: true },
      });
      await assignments.assignUserRole(actor.id, role);
    }

    const passwordHash = await hashPassword(e2eEnv.E2E_ACTOR_PASSWORD);
    const credential = await prisma.account.findFirst({
      where: { userId: actor.id, providerId: "credential" },
      select: { id: true },
    });
    if (credential) {
      await prisma.account.update({
        where: { id: credential.id },
        data: { accountId: actor.id, password: passwordHash },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          userId: actor.id,
          accountId: actor.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }
    await sessions.revokeAllUserSessions(actor.id);

    const member = await prisma.user.findUnique({
      where: { email: e2eEnv.E2E_MEMBER_EMAIL },
      select: { id: true },
    });
    if (member && (await assignments.getPrimaryRoleSlug(member.id)) === Roles.PlatformOwner) {
      throw new Error("Refusing to repurpose a platform.owner as the E2E member identity");
    }
    const provisionedMember = await prisma.user.upsert({
      where: { email: e2eEnv.E2E_MEMBER_EMAIL },
      create: {
        id: randomUUID(),
        email: e2eEnv.E2E_MEMBER_EMAIL,
        name: e2eEnv.E2E_MEMBER_NAME,
        emailVerified: true,
        banned: false,
        archived: false,
      },
      update: {
        name: e2eEnv.E2E_MEMBER_NAME,
        emailVerified: true,
        banned: false,
        banReason: null,
        archived: false,
      },
      select: { id: true },
    });
    await assignments.assignUserRole(provisionedMember.id, Roles.PlatformUser);

    return { actorId: actor.id, memberId: provisionedMember.id, role };
  } finally {
    await prisma.$disconnect();
  }
}
