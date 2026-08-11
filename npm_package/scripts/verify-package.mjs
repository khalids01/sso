import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "sso-consumer-"));
const sourceManifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

try {
  const packResult = JSON.parse(exec("npm", [
    "pack",
    "--json",
    "--pack-destination",
    temporaryRoot,
  ], packageRoot));
  const filename = packResult[0]?.filename;
  if (!filename) throw new Error("npm pack did not return an archive filename");
  const archive = join(temporaryRoot, filename);

  writeFileSync(join(temporaryRoot, "package.json"), JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      "@skycanvasstudio/sso": `file:${archive}`,
      "@tanstack/react-start": "^1.168.28",
      "@tanstack/react-router": "^1.168.28",
      elysia: "1.4.28",
      next: "^16.2.3",
      "@types/node": "^24.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "@typescript/native": "npm:typescript@^7.0.2",
      "@vitejs/plugin-react": "^6.0.0",
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      typescript: "^5.9.3",
      vite: "^8.0.0",
    },
  }, null, 2));
  exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], temporaryRoot);

  writeFileSync(join(temporaryRoot, "index.mjs"), `
import { createSsoBetterAuthIntegration, getSsoEndpoints } from "@skycanvasstudio/sso";
import { createSsoClient } from "@skycanvasstudio/sso/client";
import * as react from "@skycanvasstudio/sso/react";
const { createSsoBetterAuthReact, SsoProvider, SkyCanvasProvider, SignIn, SignUp, SsoSignInButton, SsoUserMenu } = react;
import { createSsoAuthorization, createSsoServer } from "@skycanvasstudio/sso/server";
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node";
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start";
import { createNextSso } from "@skycanvasstudio/sso/next";
import { createElysiaSso } from "@skycanvasstudio/sso/elysia";

const standalone = createTanStackSso({ publishableKey: "client_123", secretKey: "a-test-session-secret-that-is-at-least-32-bytes", ssoUrl: "https://api-sso.skycanvasstudio.com" });
const values = [getSsoEndpoints, createSsoClient, createSsoBetterAuthIntegration, createSsoBetterAuthReact, SsoProvider, SkyCanvasProvider, SignIn, SignUp, SsoSignInButton, SsoUserMenu, createSsoAuthorization, createSsoServer, createNodeSsoHandler, createTanStackSso, createNextSso, createElysiaSso, standalone.auth];
if (values.some((value) => typeof value !== "function")) throw new Error("A package export is missing");
if ("useSso" in react || "useSsoSession" in react) throw new Error("Standalone SSO hooks must not be exported");
console.log("Packed runtime imports passed");
`);
  exec("node", ["index.mjs"], temporaryRoot, true);

  writeFileSync(join(temporaryRoot, "consumer.ts"), `
import { createSsoBetterAuthIntegration } from "@skycanvasstudio/sso";
import { createSsoClient } from "@skycanvasstudio/sso/client";
import { createSsoBetterAuthReact } from "@skycanvasstudio/sso/react";
import type { SsoBetterAuthBootstrap, SsoSession, SsoUser } from "@skycanvasstudio/sso/types";

const session: SsoSession = {
  user: { id: "1", name: "User", email: "user@example.com", emailVerified: true, image: null },
  expiresAt: Date.now() + 60_000,
};
const user: SsoUser = session.user;
createSsoClient().login("/dashboard");
const integration = createSsoBetterAuthIntegration({
  clientId: "client_123",
  baseUrl: "https://api-sso.skycanvasstudio.com",
});
const bootstrap: SsoBetterAuthBootstrap<{ user: { id: string } }> = integration.createBootstrap({ user: { id: "1" } });
const authClient = {
  useSession: () => ({ data: bootstrap.session, isPending: false, error: null }),
  signIn: { oauth2: async () => ({}) },
  signOut: async () => ({}),
};
createSsoBetterAuthReact(authClient);
void session;
void user;
`);
  writeFileSync(join(temporaryRoot, "demo.tsx"), `
import { createElement } from "react";
import { SsoProvider } from "@skycanvasstudio/sso/react";
import { createSsoServer } from "@skycanvasstudio/sso/server";

const sso = createSsoServer({
  clientId: "client_123",
  baseUrl: "https://api-sso.skycanvasstudio.com",
  appUrl: "https://app.example.com",
  sessionSecret: "a-test-session-secret-that-is-at-least-32-bytes",
});
const bootstrap = await sso.getBootstrap(new Headers());
createElement(SsoProvider, { bootstrap }, "Demo application");
`);
  writeFileSync(join(temporaryRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      jsx: "react-jsx",
    },
    include: ["consumer.ts", "demo.tsx"],
  }, null, 2));
  exec("node", ["node_modules/@typescript/native/bin/tsc", "-p", "tsconfig.json"], temporaryRoot);
  console.log("Packed TypeScript 7 consumer passed");

  writeFileSync(join(temporaryRoot, "tsconfig.legacy.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Node10",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      jsx: "react-jsx",
    },
    include: ["consumer.ts", "demo.tsx"],
  }, null, 2));
  exec("node", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.legacy.json"], temporaryRoot);
  console.log("Packed legacy TypeScript module resolution passed");

  writeFileSync(join(temporaryRoot, "tanstack-consumer.ts"), `
import { createTanStackSso, createTanStackSsoMiddleware, type TanStackSsoAuth } from "@skycanvasstudio/sso/tanstack-start";

const standalone = createTanStackSso({
  publishableKey: "client_123",
  secretKey: "a-test-session-secret-that-is-at-least-32-bytes",
  interactionMode: "embedded",
  oauthMode: "popup",
});
const readAuth = async (): Promise<TanStackSsoAuth> => standalone.auth();
void standalone.middleware;
void createTanStackSsoMiddleware(async () => standalone);
void readAuth;
`);
  writeFileSync(join(temporaryRoot, "tsconfig.tanstack.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: ["node"],
    },
    include: ["tanstack-consumer.ts"],
  }, null, 2));
  exec("node", ["node_modules/@typescript/native/bin/tsc", "-p", "tsconfig.tanstack.json"], temporaryRoot);
  console.log("Packed TanStack standalone consumer passed");

  mkdirSync(join(temporaryRoot, "src/lib"), { recursive: true });
  mkdirSync(join(temporaryRoot, "src/routes"), { recursive: true });
  writeFileSync(join(temporaryRoot, "vite.config.ts"), `
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({ plugins: [tanstackStart(), viteReact()] });
`);
  writeFileSync(join(temporaryRoot, "src/lib/skycanvas.server.ts"), `
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start";
export const skycanvas = createTanStackSso({
  publishableKey: "client_123",
  secretKey: "a-test-session-secret-that-is-at-least-32-bytes",
  ssoUrl: "https://api-sso.skycanvasstudio.com",
});
`);
  writeFileSync(join(temporaryRoot, "src/start.ts"), `
import { createServerOnlyFn, createStart } from "@tanstack/react-start";
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start";
const loadSkycanvas = createServerOnlyFn(
  () => import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
);
const skycanvasMiddleware = createTanStackSsoMiddleware(
  loadSkycanvas,
);
export const startInstance = createStart(() => ({ requestMiddleware: [skycanvasMiddleware] }));
`);
  writeFileSync(join(temporaryRoot, "src/router.tsx"), `
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
export const getRouter = () => createRouter({ routeTree });
declare module "@tanstack/react-router" { interface Register { router: ReturnType<typeof getRouter> } }
`);
  writeFileSync(join(temporaryRoot, "src/routes/__root.tsx"), `
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
export const Route = createRootRoute({ component: () => <html><head><HeadContent /></head><body><Outlet /><Scripts /></body></html> });
`);
  writeFileSync(join(temporaryRoot, "src/routes/index.tsx"), `
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: () => <main>SkyCanvas consumer</main> });
`);
  exec("node", ["node_modules/vite/bin/vite.js", "build"], temporaryRoot, true);
  console.log("Packed TanStack Start production build passed");

  const manifest = JSON.parse(readFileSync(join(temporaryRoot, "node_modules/@skycanvasstudio/sso/package.json"), "utf8"));
  if (manifest.version !== sourceManifest.version) throw new Error("Installed package version is incorrect");
  for (const subpath of ["./tanstack-start", "./next", "./elysia", "./node", "./types"]) {
    if (!manifest.exports?.[subpath]) throw new Error(`Missing package export: ${subpath}`);
  }
  const packagedStyles = readFileSync(join(temporaryRoot, "node_modules/@skycanvasstudio/sso/dist/react/styles.css"), "utf8");
  if (!packagedStyles.includes(".sso-user-trigger") || !packagedStyles.includes(".sso-auth-card")) {
    throw new Error("Packaged React styles are missing");
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function exec(command, args, cwd, inherit = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : ["ignore", "pipe", "inherit"],
  });
}
