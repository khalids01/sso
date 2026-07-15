export {};

const runIdIndex = process.argv.indexOf("--run-id");
const inline = process.argv.find((argument) => argument.startsWith("--run-id="));
const requestedRunId = inline?.slice("--run-id=".length) ??
  (runIdIndex >= 0 ? process.argv[runIdIndex + 1] : undefined);

if (!requestedRunId) {
  throw new Error("Usage: bun e2e:cleanup --run-id <exact-run-id>");
}

process.env.E2E_RUN_ID = requestedRunId;

const [{ assertE2ESafety }, { cleanupRunOwnedResources }] = await Promise.all([
  import("../helpers/safety"),
  import("../helpers/cleanup"),
]);

assertE2ESafety();
const result = await cleanupRunOwnedResources();
console.log(
  `Cleaned run ${requestedRunId}: ${result.applications} applications, ${result.clients} clients, ${result.memberships} memberships`,
);
