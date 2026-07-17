import { describe, expect, it } from "bun:test";

import {
  isConnectionClosedAbortError,
  isExpectedSsrCancellation,
} from "../../../apps/web/src/lib/ssr-cancellation";

describe("isExpectedSsrCancellation", () => {
  it("recognizes an AbortError only after the browser aborts the request", () => {
    const controller = new AbortController();
    const error = new DOMException("The connection was closed.", "AbortError");

    expect(isExpectedSsrCancellation(error, controller.signal)).toBe(false);

    controller.abort();
    expect(isExpectedSsrCancellation(error, controller.signal)).toBe(true);
  });

  it("recognizes Bun's closed-connection error for an aborted request", () => {
    const controller = new AbortController();
    controller.abort();

    expect(
      isExpectedSsrCancellation(
        new DOMException("The connection was closed.", "AbortError"),
        controller.signal,
      ),
    ).toBe(true);
  });

  it("does not swallow unrelated SSR failures", () => {
    const controller = new AbortController();
    controller.abort();

    expect(
      isExpectedSsrCancellation(
        new Error("Database unavailable"),
        controller.signal,
      ),
    ).toBe(false);
    expect(
      isConnectionClosedAbortError(
        new DOMException("The operation was aborted", "AbortError"),
      ),
    ).toBe(false);
  });
});
