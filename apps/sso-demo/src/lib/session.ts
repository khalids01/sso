import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type DemoSession = {
  subject: string;
  clientId: string;
  applicationId: string;
  membershipId: string;
  audience: string;
  issuer: string;
  scope: "openid";
  authorizationVersion: number;
  issuedAt: number;
  expiresAt: number;
};

export const getDemoSession = createServerFn({ method: "GET" }).handler(async (): Promise<DemoSession | null> => {
  const { readSession } = await import("./auth.server");
  return readSession(getRequestHeader("cookie") ?? null);
});
