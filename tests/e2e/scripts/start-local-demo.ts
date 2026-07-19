import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.resolve(e2eRoot, "../../apps/sso-demo");
const serverEntry = path.resolve(demoRoot, "dist/server/server.js");
const clientRoot = path.resolve(demoRoot, "dist/client");

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("SSO demo build is missing. Run `bun run build` in apps/sso-demo before E2E.");
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
