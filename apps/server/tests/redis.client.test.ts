import { describe, expect, it } from "bun:test";

describe("Redis client", () => {
  it("throws when Redis cannot connect", async () => {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "-e",
        `
          const { connectRedis } = await import("@redis");

          try {
            await connectRedis();
            process.exit(0);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(message);
            process.exit(1);
          }
        `,
      ],
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        REDIS_URL: "redis://127.0.0.1:6399",
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stderr, exitCode] = await Promise.all([
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(exitCode).not.toBe(0);
    expect(stderr.length).toBeGreaterThan(0);
  });
});
