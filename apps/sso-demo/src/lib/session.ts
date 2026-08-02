import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SsoSession } from "@skycanvasstudio/sso";
import type { DemoUser } from "./auth.server";

export type DemoSession = SsoSession<DemoUser>;

export const getDemoSession = createServerFn({ method: "GET" }).handler(async (): Promise<DemoSession | null> => {
  const request = getRequest();
  const { getSsoServer } = await import("./auth.server");
  try {
    return await getSsoServer(request).getSession(request);
  } catch {
    return null;
  }
});
