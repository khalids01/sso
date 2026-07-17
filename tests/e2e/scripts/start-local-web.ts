import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isConnectionClosedAbortError } from "../../../apps/web/src/lib/ssr-cancellation";

const reportError = console.error;
console.error = (...args: unknown[]) => {
  if (args.some(isConnectionClosedAbortError)) return;
  reportError(...args);
};

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.resolve(e2eRoot, "../../apps/web");
const webEntry = path.resolve(webRoot, "dist/server/server.js");
const clientRoot = path.resolve(webRoot, "dist/client");

if (!(await Bun.file(webEntry).exists())) {
  throw new Error("Web build is missing. Run `bun run build` in apps/web before E2E.");
}

const startServer = (await import(pathToFileURL(webEntry).href)).default as {
  fetch(request: Request): Promise<Response>;
};
const port = Number.parseInt(process.env.PORT ?? "5002", 10);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const relativePath = pathname.replace(/^\/+/, "");
    const assetPath = path.resolve(clientRoot, relativePath);

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
