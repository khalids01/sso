import { defineConfig, devices } from "@playwright/test";
import { e2eEnv } from "./helpers/environment";
import { assertE2ESafety } from "./helpers/safety";

assertE2ESafety();

const localWebServers = [
  {
    command: "bun run dev:server",
    cwd: e2eEnv.repoRoot,
    url: e2eEnv.E2E_API_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  {
    command: "bun run dev:web",
    cwd: e2eEnv.repoRoot,
    url: `${e2eEnv.E2E_WEB_ORIGIN}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
];

const callbackServer = {
  command: "bun run scripts/oauth-callback-server.ts",
  cwd: e2eEnv.e2eRoot,
  url: `${e2eEnv.E2E_CALLBACK_ORIGIN}/health`,
  reuseExistingServer: false,
  timeout: 30_000,
};

export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: e2eEnv.E2E_TARGET === "staging" ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: e2eEnv.E2E_WEB_ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: { slowMo: e2eEnv.E2E_SLOW_MO },
  },
  webServer:
    e2eEnv.E2E_TARGET === "local"
      ? [...localWebServers, callbackServer]
      : [callbackServer],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".state/auth.json",
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /cleanup\.teardown\.ts/],
    },
    {
      name: "cleanup",
      testMatch: /cleanup\.teardown\.ts/,
    },
  ],
});
