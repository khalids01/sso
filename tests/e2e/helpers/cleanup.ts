import { e2eEnv } from "./environment";
import { readRunState } from "./run-state";

export async function cleanupRunOwnedResources() {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  const state = readRunState();
  if (state.runId !== e2eEnv.runId || state.runPrefix !== e2eEnv.runPrefix) {
    throw new Error("Run-state identity does not match the requested cleanup run");
  }

  try {
    const applications = await prisma.application.findMany({
      where: { slug: { startsWith: e2eEnv.runPrefix } },
      select: {
        id: true,
        slug: true,
        clients: { select: { id: true } },
        members: { select: { id: true } },
      },
    });

    for (const application of applications) {
      if (!application.slug.startsWith(e2eEnv.runPrefix)) {
        throw new Error(`Refusing cleanup for non-owned application ${application.id}`);
      }
    }

    const ids = applications.map((application) => application.id);
    if (ids.length > 0) {
      await prisma.application.deleteMany({
        where: { id: { in: ids }, slug: { startsWith: e2eEnv.runPrefix } },
      });
    }

    let signupUsers = 0;
    if (state.signupUserEmail) {
      const expectedMarker = `+${e2eEnv.runPrefix}signup@`;
      if (!state.signupUserEmail.includes(expectedMarker)) {
        throw new Error(`Refusing cleanup for non-owned signup identity ${state.signupUserEmail}`);
      }
      const result = await prisma.user.deleteMany({
        where: { email: state.signupUserEmail },
      });
      signupUsers = result.count;
    }

    return {
      applications: ids.length,
      clients: applications.flatMap((item) => item.clients).length,
      memberships: applications.flatMap((item) => item.members).length,
      signupUsers,
    };
  } finally {
    await prisma.$disconnect();
  }
}
