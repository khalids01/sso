import { Elysia } from "elysia";

import type { SsoUser } from "../index.js";
import type { SsoServer } from "../server/index.js";

export interface ElysiaSsoOptions {
  /** Route prefix containing the SSO server paths. Defaults to `/auth`. */
  prefix?: string;
}

/** Mounts an SsoServer on an Elysia application using native Web requests. */
export function createElysiaSso<TUser extends SsoUser = SsoUser>(
  sso: SsoServer<TUser>,
  options: ElysiaSsoOptions = {},
) {
  if (!sso?.handle) throw new Error("createElysiaSso requires an SsoServer");
  const prefix = normalizePrefix(options.prefix ?? "/auth");

  return new Elysia({ name: `skycanvas-sso:${prefix}` }).all(
    `${prefix}/*`,
    ({ request }) => sso.handle(request),
    { parse: "none" },
  );
}

function normalizePrefix(value: string) {
  const prefix = value.length > 1 ? value.replace(/\/$/, "") : value;
  if (!prefix.startsWith("/")) {
    throw new Error("Elysia SSO prefix must start with /");
  }
  return prefix;
}
