import { randomUUID } from "node:crypto";

function createRunId() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
}

const runId = process.env.E2E_RUN_ID || createRunId();
const child = Bun.spawn(["bunx", "playwright", "test", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, E2E_RUN_ID: runId },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await child.exited);
