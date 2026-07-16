import { describe, expect, test } from "bun:test";

import { stringifyRepeatedSearchParams } from "../../../apps/web/src/lib/search-params";

describe("authorization continuation query serialization", () => {
  test("preserves repeated Better Auth signature parameters", () => {
    const original =
      "?client_id=client-1&ba_param=client_id&ba_param=state&state=opaque";
    const parsed = {
      client_id: "client-1",
      ba_param: ["client_id", "state"],
      state: "opaque",
    };

    expect(stringifyRepeatedSearchParams(parsed)).toBe(original);
  });

  test("retains JSON encoding for structured application search values", () => {
    expect(
      stringifyRepeatedSearchParams({ page: 2, filter: { status: "active" } }),
    ).toBe("?page=2&filter=%7B%22status%22%3A%22active%22%7D");
  });
});
