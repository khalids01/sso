import { e2eEnv } from "./environment";
import { updateRunState } from "./run-state";

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

export async function trackApplication(slug: string) {
  if (!slug.startsWith(e2eEnv.runPrefix)) throw new Error("Refusing to track a non-owned application");
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  try {
    const application = await prisma.application.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    updateRunState((state) => pushUnique(state.applicationIds, application.id));
    return application.id;
  } finally {
    await prisma.$disconnect();
  }
}

export async function trackClient(applicationId: string, name: string) {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  try {
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      select: { slug: true },
    });
    if (!application.slug.startsWith(e2eEnv.runPrefix)) throw new Error("Refusing to track a client outside this run");
    const client = await prisma.applicationClient.findFirstOrThrow({
      where: { applicationId, name },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    updateRunState((state) => pushUnique(state.clientIds, client.id));
    return client.id;
  } finally {
    await prisma.$disconnect();
  }
}

export async function trackMembership(applicationId: string, email: string) {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  try {
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      select: { slug: true },
    });
    if (!application.slug.startsWith(e2eEnv.runPrefix)) throw new Error("Refusing to track a membership outside this run");
    const membership = await prisma.applicationMember.findFirstOrThrow({
      where: { applicationId, user: { email } },
      select: { id: true },
    });
    updateRunState((state) => pushUnique(state.membershipIds, membership.id));
    return membership.id;
  } finally {
    await prisma.$disconnect();
  }
}
