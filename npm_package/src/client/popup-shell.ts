export function openPopupShell() {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - 520) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - 720) / 2));
  const popup = window.open(
    "",
    "skycanvas-sso",
    `popup=yes,width=520,height=720,left=${left},top=${top}`,
  );
  if (!popup) return null;

  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Connecting to SkyCanvas</title>
    <style>
      :root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#fafafa}
      main{text-align:center;padding:32px}.mark{width:48px;height:48px;margin:0 auto 22px;border-radius:14px;background:#fafafa;color:#0a0a0a;display:grid;place-items:center;font-weight:800;font-size:20px}
      h1{margin:0;font-size:21px;letter-spacing:-.02em}p{margin:10px 0 0;color:#a3a3a3;font-size:14px}.spinner{width:20px;height:20px;margin:24px auto 0;border:2px solid #404040;border-top-color:#fafafa;border-radius:999px;animation:spin .75s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
    </style>
  </head>
  <body><main><div class="mark">S</div><h1>Connecting securely</h1><p>Opening SkyCanvas sign-in…</p><div class="spinner" aria-label="Loading"></div></main></body>
</html>`);
    popup.document.close();
  } catch {
    // Navigation can still continue if a restrictive browser blocks painting.
  }
  return popup;
}
