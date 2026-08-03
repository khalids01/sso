import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { DemoSession } from "./sso-types";

export const getSsoSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<DemoSession | null> => {
    const request = getRequest();
    const { sso } = await import("./sso.server");
    return sso.getSession(request);
  },
);
