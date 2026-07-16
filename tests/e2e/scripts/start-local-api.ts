import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = path.resolve(e2eRoot, "../../apps/server");
const serverEntry = path.resolve(serverRoot, "dist/index.mjs");

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("Server build is missing. Run `bun run build` in apps/server before E2E.");
}

const server = Bun.spawn(["bun", "run", serverEntry], {
  cwd: serverRoot,
  env: { ...process.env, NODE_ENV: "development" },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
process.exit(await server.exited);
