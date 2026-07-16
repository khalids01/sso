const port = Number(new URL(process.env.E2E_CALLBACK_ORIGIN ?? "http://127.0.0.1:5010").port || 5010);

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

Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch(request) {
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
    return new Response("Not Found", { status: 404 });
  },
});
