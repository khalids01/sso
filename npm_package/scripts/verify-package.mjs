import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "sso-consumer-"));

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
    },
  }, null, 2));
  exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], temporaryRoot);

  writeFileSync(join(temporaryRoot, "index.mjs"), `
import { getFreeSsoEndpoints } from "@skycanvasstudio/sso";
import { createFreeSsoClient } from "@skycanvasstudio/sso/client";
import { FreeSsoProvider, useFreeSso } from "@skycanvasstudio/sso/react";
import { createFreeSsoAuthorization, createFreeSsoBetterAuthProvider } from "@skycanvasstudio/sso/server";

const values = [getFreeSsoEndpoints, createFreeSsoClient, FreeSsoProvider, useFreeSso, createFreeSsoAuthorization, createFreeSsoBetterAuthProvider];
if (values.some((value) => typeof value !== "function")) throw new Error("A package export is missing");
console.log("Packed runtime imports passed");
`);
  exec("node", ["index.mjs"], temporaryRoot, true);

  writeFileSync(join(temporaryRoot, "consumer.ts"), `
import type { FreeSsoSession } from "@skycanvasstudio/sso";
import { createFreeSsoClient } from "@skycanvasstudio/sso/client";
import { createFreeSsoBetterAuthProvider } from "@skycanvasstudio/sso/server";

const session: FreeSsoSession = {
  user: { id: "1", name: "User", email: "user@example.com", emailVerified: true, image: null },
};
createFreeSsoClient().login("/dashboard");
createFreeSsoBetterAuthProvider({ clientId: "client_123" });
void session;
`);
  writeFileSync(join(temporaryRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: false,
      noEmit: true,
    },
    include: ["consumer.ts"],
  }, null, 2));
  exec("node", ["node_modules/@typescript/native/bin/tsc", "-p", "tsconfig.json"], temporaryRoot);
  console.log("Packed TypeScript 7 consumer passed");

  const manifest = JSON.parse(readFileSync(join(temporaryRoot, "node_modules/@skycanvasstudio/sso/package.json"), "utf8"));
  if (manifest.version !== "0.1.0") throw new Error("Installed package version is incorrect");
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
