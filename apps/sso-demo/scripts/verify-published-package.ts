import { fileURLToPath } from "node:url";

const resolvedServerEntry = import.meta.resolve("@skycanvasstudio/sso/server");

if (resolvedServerEntry.includes("/npm_package/")) {
  throw new Error(
    "sso-demo resolved @skycanvasstudio/sso from the monorepo workspace; " +
    "it must test the package published to npm",
  );
}

const packageRoot = fileURLToPath(resolvedServerEntry).split("/dist/server/")[0];
const manifest = await Bun.file(`${packageRoot}/package.json`).json() as {
  name?: string;
  version?: string;
};

if (manifest.name !== "@skycanvasstudio/sso" || !manifest.version) {
  throw new Error("sso-demo could not verify the installed published SSO package");
}

const latestResponse = await fetch(
  "https://registry.npmjs.org/@skycanvasstudio%2Fsso/latest",
);
if (!latestResponse.ok) {
  throw new Error(`Could not read the npm latest tag (${latestResponse.status})`);
}
const latest = await latestResponse.json() as { version?: string };
if (!latest.version || manifest.version !== latest.version) {
  throw new Error(
    `sso-demo has @skycanvasstudio/sso@${manifest.version}, but npm latest is ` +
    `${latest.version ?? "unknown"}; run bun run --cwd apps/sso-demo update:sso`,
  );
}

console.log(`sso-demo uses published ${manifest.name}@${manifest.version}`);
