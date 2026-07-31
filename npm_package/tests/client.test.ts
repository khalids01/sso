import { expect, test } from "bun:test";
import { createFreeSsoClient } from "../src/client/index.js";

test("browser client uses local session endpoints with credentials", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const client = createFreeSsoClient({
    baseUrl: "https://app.example.com",
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), ...(init ? { init } : {}) });
      return Response.json({
        user: { id: "1", name: "Khalid", email: "k@example.com", emailVerified: true, image: null },
      });
    }) as typeof fetch,
  });

  const session = await client.getSession();
  expect(session?.user.id).toBe("1");
  expect(requests[0]?.input).toBe("https://app.example.com/auth/profile");
  expect(requests[0]?.init?.credentials).toBe("include");
});
