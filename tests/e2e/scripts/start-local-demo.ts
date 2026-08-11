import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { e2eEnv } from "../helpers/environment";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.resolve(e2eRoot, "../../apps/sso-demo");
const serverEntry = path.resolve(demoRoot, "dist/server/server.js");
const clientRoot = path.resolve(demoRoot, "dist/client");

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("SSO demo build is missing. Run `bun run build` in apps/sso-demo before E2E.");
}

if (e2eEnv.E2E_TARGET === "local") {
  const { default: prisma } = await import("../../../packages/db/src/client.server");
  const slug = `${e2eEnv.runPrefix}consumer-auth`;
  const standaloneClientId = `sso_client_${randomBytes(18).toString("base64url")}`;

  try {
    await prisma.application.deleteMany({ where: { slug } });
    await prisma.application.create({
      data: {
        slug,
        name: `E2E Consumer Auth ${e2eEnv.runId}`,
        description: "Run-owned Clerk-like package consumer fixture",
        signInMethods: ["password"],
        signUpMethods: ["password"],
        registrationMode: "open",
        passwordEmailVerificationRequired: false,
        clients: {
          create: [
            {
              clientId: standaloneClientId,
              name: `E2E Clerk-like Client ${e2eEnv.runId}`,
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
              metadata: { runId: e2eEnv.runId, integration: "standalone" },
              redirectUris: [`${e2eEnv.E2E_DEMO_ORIGIN}/auth/callback`],
              allowedOrigins: [e2eEnv.E2E_DEMO_ORIGIN],
            },
          ],
        },
      },
    });
    process.env.SSO_CLIENT_ID = standaloneClientId;
  } finally {
    await prisma.$disconnect();
  }
}

const startServer = (await import(pathToFileURL(serverEntry).href)).default as {
  fetch(request: Request): Promise<Response>;
};
const port = Number.parseInt(process.env.PORT ?? "5003", 10);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const assetPath = path.resolve(clientRoot, pathname.replace(/^\/+/, ""));
    if (assetPath.startsWith(`${clientRoot}${path.sep}`)) {
      const asset = Bun.file(assetPath);
      if (await asset.exists()) return new Response(asset);
    }
    return startServer.fetch(request);
  },
});

await new Promise<void>((resolve) => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.stop(true);
      resolve();
    });
  }
});
