import { describe, expect, it } from "bun:test";

describe("application revocation integration", () => {
  it("fans out signed pairwise events and preserves monotonic access versions", async () => {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "--env-file",
        ".env",
        "tests/fixtures/application-revocation-integration.ts",
      ],
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        ALLOW_LOCAL_APPLICATION_WEBHOOKS: "true",
        ENABLE_APPLICATION_REVOCATION_DELIVERY: "false",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) throw new Error(stderr);

    const result = JSON.parse(stdout.trim().split("\n").at(-1)!);
    expect(result).toMatchObject({
      rollback: { failed: true, status: "active", version: 1 },
      pairwiseDistinct: true,
      banVersions: [2, 2],
      banDeliveryCount: 2,
      restoreVersions: [3, 3],
      membershipTransition: { suspended: 4, restored: 5 },
      terminal: { status: "dead", attemptCount: 1, lastHttpStatus: 400 },
      applicationWide: { subject: null, membershipId: null },
      expired: { status: "dead", lastErrorCode: "delivery_deadline_expired" },
    });
    expect(result.concurrentClaims.filter(Boolean)).toHaveLength(2);
    expect(result.signed).toHaveLength(2);
    for (const event of result.signed) {
      expect(event).toMatchObject({
        eventIdMatches: true,
        reason: "user_banned",
        version: 2,
        hasPlatformIdentity: false,
      });
      expect(event.audience).toBe(`urn:sso:application:${event.applicationId}`);
    }
    expect(result.signed[0].subject).not.toBe(result.signed[1].subject);
  }, 30_000);
});
