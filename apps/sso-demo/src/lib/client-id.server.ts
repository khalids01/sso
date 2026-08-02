const CLIENT_ID_COOKIE = "sso_demo_client_id";
const CLIENT_ID_TTL_SECONDS = 10 * 60;

export function resolveClientId(request: Request, configuredClientId?: string): string {
  const requestUrl = new URL(request.url);
  const clientId = requestUrl.searchParams.get("client_id")
    ?? readCookie(request, CLIENT_ID_COOKIE)
    ?? configuredClientId;

  if (!clientId) {
    throw new Error("SSO_CLIENT_ID is not configured");
  }

  return clientId;
}

export function serializeClientIdCookie(clientId: string, secure: boolean): string {
  return [
    `${CLIENT_ID_COOKIE}=${encodeURIComponent(clientId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CLIENT_ID_TTL_SECONDS}`,
    secure ? "Secure" : undefined,
  ].filter(Boolean).join("; ");
}

function readCookie(request: Request, name: string): string | undefined {
  const encoded = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

  if (!encoded) return undefined;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}
