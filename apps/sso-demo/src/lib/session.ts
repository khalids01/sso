import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { DemoSession } from "./sso-types";

export const getDemoSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<DemoSession | null> => {
    const request = getRequest();
    const { createDemoSsoServer } = await import("./sso.server");

    try {
      return await createDemoSsoServer(request).getSession(request);
    } catch {
      return null;
    }
  },
);
