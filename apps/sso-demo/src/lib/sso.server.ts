import { createSsoServer } from "@skycanvasstudio/sso/server";
import { resolveClientId, serializeClientIdCookie } from "./client-id.server";
import { createDemoUser } from "./demo-user.server";
import { getDemoSsoConfig } from "./sso-config.server";
import type { DemoUser } from "./sso-types";

const CALLBACK_ERROR = "callback_failed";
const CONFIGURATION_ERROR = "configuration_error";

export function createDemoSsoServer(request: Request) {
  return createSsoContext(request).sso;
}

function createSsoContext(request: Request) {
  const config = getDemoSsoConfig();
  const clientId = resolveClientId(request, config.clientId);
  const sso = createSsoServer<DemoUser>({
    clientId,
    appUrl: config.appUrl,
    baseUrl: config.ssoUrl,
    sessionSecret: config.sessionSecret,
    onSignIn: createDemoUser,
    onError(error) {
      console.error("[sso-demo] SSO callback failed", error);
    },
  });

  return { config, clientId, sso };
}

export async function handleSsoRequest(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);

  try {
    const { config, clientId, sso } = createSsoContext(request);
    const response = await sso.handle(request);

    if (requestUrl.pathname === sso.paths.login) {
      response.headers.append(
        "set-cookie",
        serializeClientIdCookie(clientId, config.appUrl.startsWith("https:")),
      );
    }

    if (requestUrl.pathname === sso.paths.callback && response.status >= 400) {
      return errorRedirect(requestUrl.origin, CALLBACK_ERROR);
    }

    return response;
  } catch (error) {
    console.error("[sso-demo] SSO request failed", error);
    return errorRedirect(requestUrl.origin, CONFIGURATION_ERROR);
  }
}

function errorRedirect(origin: string, error: string): Response {
  const url = new URL("/", origin);
  url.searchParams.set("error", error);
  return Response.redirect(url, 303);
}
