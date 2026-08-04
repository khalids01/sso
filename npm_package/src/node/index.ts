import type { SsoUser } from "../index.js";
import type { SsoServer } from "../server/index.js";

export type NodeHeaderValue = string | readonly string[] | number | undefined;

export interface NodeRequestLike {
  method?: string;
  url?: string;
  originalUrl?: string;
  protocol?: string;
  headers: Record<string, NodeHeaderValue>;
  get?: (name: string) => string | undefined;
  socket?: { encrypted?: boolean };
}

export interface NodeResponseLike {
  statusCode: number;
  setHeader: (name: string, value: string | readonly string[]) => unknown;
  end: (body?: Uint8Array) => unknown;
}

export function nodeRequestHeaders(request: NodeRequestLike): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, String(value));
    }
  }
  return headers;
}

export function toWebRequest(request: NodeRequestLike): Request {
  const headers = nodeRequestHeaders(request);
  const forwardedProtocol = headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const protocol = request.protocol ?? forwardedProtocol ?? (request.socket?.encrypted ? "https" : "http");
  const host = request.get?.("host") ?? headers.get("host");
  if (!host) throw new Error("SSO Node adapter requires the Host header");
  const path = request.originalUrl ?? request.url ?? "/";
  return new Request(new URL(path, `${protocol}://${host}`), {
    method: request.method ?? "GET",
    headers,
  });
}

export async function writeWebResponse(
  target: NodeResponseLike,
  response: Response,
): Promise<void> {
  target.statusCode = response.status;
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie?.call(response.headers) ?? [];
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") target.setHeader(name, value);
  });
  if (setCookies.length > 0) target.setHeader("set-cookie", setCookies);
  else {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) target.setHeader("set-cookie", setCookie);
  }
  const body = response.body ? new Uint8Array(await response.arrayBuffer()) : undefined;
  target.end(body);
}

export function createNodeSsoHandler<TUser extends SsoUser>(sso: SsoServer<TUser>) {
  if (!sso?.handle) throw new Error("createNodeSsoHandler requires an SsoServer");
  return async (request: NodeRequestLike, response: NodeResponseLike): Promise<void> => {
    await writeWebResponse(response, await sso.handle(toWebRequest(request)));
  };
}
