import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
      "@types/react": "^19.0.0",
      "@typescript/native": "npm:typescript@^7.0.2",
      react: "^19.0.0",
      typescript: "^5.9.3",
    },
  }, null, 2));
  exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], temporaryRoot);

  writeFileSync(join(temporaryRoot, "index.mjs"), `
import { createSsoBetterAuthIntegration, createSsoBetterAuthProvider as createRootBetterAuthProvider, getSsoEndpoints } from "@skycanvasstudio/sso";
import { createSsoClient } from "@skycanvasstudio/sso/client";
import { createSsoBetterAuthReact, SsoProvider, SsoSignInButton, SsoUserMenu, useSso } from "@skycanvasstudio/sso/react";
import { createSsoAuthorization, createSsoBetterAuthProvider as createServerBetterAuthProvider, createSsoServer } from "@skycanvasstudio/sso/server";
import { createSsoBetterAuthProvider as createSubpathBetterAuthProvider } from "@skycanvasstudio/sso/better-auth";
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node";

const values = [getSsoEndpoints, createSsoClient, createSsoBetterAuthIntegration, createSsoBetterAuthReact, SsoProvider, SsoSignInButton, SsoUserMenu, useSso, createSsoAuthorization, createSsoServer, createRootBetterAuthProvider, createServerBetterAuthProvider, createSubpathBetterAuthProvider, createNodeSsoHandler];
if (values.some((value) => typeof value !== "function")) throw new Error("A package export is missing");
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
      skipLibCheck: false,
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
      skipLibCheck: false,
      noEmit: true,
      jsx: "react-jsx",
    },
    include: ["consumer.ts", "demo.tsx"],
  }, null, 2));
  exec("node", ["node_modules/typescript/bin/tsc", "-p", "tsconfig.legacy.json"], temporaryRoot);
  console.log("Packed legacy TypeScript module resolution passed");

  const manifest = JSON.parse(readFileSync(join(temporaryRoot, "node_modules/@skycanvasstudio/sso/package.json"), "utf8"));
  if (manifest.version !== sourceManifest.version) throw new Error("Installed package version is incorrect");
  for (const subpath of ["./tanstack-start", "./next", "./node", "./types"]) {
    if (!manifest.exports?.[subpath]) throw new Error(`Missing package export: ${subpath}`);
  }
  if (!readFileSync(join(temporaryRoot, "node_modules/@skycanvasstudio/sso/dist/react/styles.css"), "utf8").includes(".sso-user-trigger")) {
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
