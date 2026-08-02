import type { SsoUser } from "@skycanvasstudio/sso";
import { createSsoServer, type SsoSignInContext } from "@skycanvasstudio/sso/server";

const CLIENT_COOKIE = "sso_demo_client";

export interface DemoUser extends SsoUser {
  clientId: string;
  applicationId: string;
  membershipId: string;
  audience: string;
  issuer: string;
  scope: string;
  authorizationVersion: number;
  issuedAt: number;
}

function getConfig() {
  const appUrl = new URL(
    process.env.BETTER_AUTH_URL ?? process.env.SSO_DEMO_ORIGIN ?? "http://localhost:5003",
  ).origin;
  const baseUrl = new URL(
    process.env.SSO_URL ?? process.env.SSO_API_ORIGIN ?? "http://localhost:5001",
  ).origin;
  const sessionSecret = process.env.BETTER_AUTH_SECRET ?? process.env.SSO_DEMO_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  return { appUrl, baseUrl, sessionSecret };
}

function readCookie(request: Request, name: string): string | undefined {
  return request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function clientIdFor(request: Request): string {
  const requested = new URL(request.url).searchParams.get("client_id");
  const clientId = requested
    ?? readCookie(request, CLIENT_COOKIE)
    ?? process.env.SSO_CLIENT_ID
    ?? process.env.SSO_DEMO_CLIENT_ID;
  if (!clientId) throw new Error("SSO_CLIENT_ID is not configured");
  return clientId;
}

function claim(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`SSO token is missing ${name}`);
  return value;
}

function mapDemoUser({ user, authorization }: SsoSignInContext): DemoUser {
  const access = authorization.accessClaims;
  return {
    ...user,
    clientId: claim(access.azp, "azp"),
    applicationId: claim(access.application_id, "application_id"),
    membershipId: claim(access.membership_id, "membership_id"),
    audience: authorization.metadata.audience,
    issuer: authorization.metadata.issuer,
    scope: claim(access.scope, "scope"),
    authorizationVersion: typeof access.authorization_version === "number"
      ? access.authorization_version
      : 0,
    issuedAt: access.iat ?? 0,
  };
}

export function getSsoServer(request: Request) {
  const config = getConfig();
  return createSsoServer<DemoUser>({
    clientId: clientIdFor(request),
    appUrl: config.appUrl,
    baseUrl: config.baseUrl,
    sessionSecret: config.sessionSecret,
    onSignIn: mapDemoUser,
    onError(error) {
      console.error("[sso-demo] SSO callback failed", error);
    },
  });
}

export async function handleSsoRequest(request: Request): Promise<Response> {
  try {
    const sso = getSsoServer(request);
    const response = await sso.handle(request);
    if (new URL(request.url).pathname !== sso.paths.login) return response;

    const clientId = clientIdFor(request);
    response.headers.append(
      "set-cookie",
      `${CLIENT_COOKIE}=${encodeURIComponent(clientId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    );
    return response;
  } catch (error) {
    const appUrl = process.env.BETTER_AUTH_URL
      ?? process.env.SSO_DEMO_ORIGIN
      ?? new URL(request.url).origin;
    const url = new URL("/", appUrl);
    url.searchParams.set("error", "client_not_configured");
    console.error("[sso-demo] SSO request failed", error);
    return Response.redirect(url, 303);
  }
}
