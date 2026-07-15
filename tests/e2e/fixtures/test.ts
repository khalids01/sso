import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "failed"}`);
      });
      await use();
      if (consoleErrors.length > 0) {
        await testInfo.attach("browser-console-errors", {
          body: consoleErrors.join("\n"),
          contentType: "text/plain",
        });
      }
      if (failedRequests.length > 0) {
        await testInfo.attach("failed-network-requests", {
          body: failedRequests.join("\n"),
          contentType: "text/plain",
        });
      }
    },
    { auto: true },
  ],
});

export { expect };
