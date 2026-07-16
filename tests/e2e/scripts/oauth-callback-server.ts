const port = Number(process.env.E2E_CALLBACK_LISTEN_PORT ?? 5010);

const callbackPage = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>SSO E2E Callback</title></head>
  <body>
    <main><h1>Authorization callback received</h1></main>
    <script>
      const params = new URLSearchParams(window.location.search);
      window.__oauthCallback = {
        code: params.get("code"),
        state: params.get("state"),
        error: params.get("error")
      };
      history.replaceState({}, "", "/callback");
    </script>
  </body>
</html>`;

const revocationEvents = new Map<string, string>();

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("OK");
    if (url.pathname === "/callback") {
      return new Response(callbackPage, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
        },
      });
    }
    if (url.pathname === "/revocations" && request.method === "POST") {
      const eventId = request.headers.get("x-sso-event-id");
      if (!eventId || request.headers.get("content-type") !== "application/jwt") {
        return new Response("Invalid event", { status: 400 });
      }
      revocationEvents.set(eventId, await request.text());
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/revocations" && request.method === "GET") {
      return Response.json(
        Array.from(revocationEvents, ([eventId, token]) => ({ eventId, token })),
        { headers: { "cache-control": "no-store" } },
      );
    }
    if (url.pathname === "/revocations" && request.method === "DELETE") {
      revocationEvents.clear();
      return new Response(null, { status: 204 });
    }
    return new Response("Not Found", { status: 404 });
  },
});
