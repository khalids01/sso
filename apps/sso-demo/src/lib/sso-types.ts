import type { SsoSession, SsoUser } from "@skycanvasstudio/sso";

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

export type DemoSession = SsoSession<DemoUser>;
