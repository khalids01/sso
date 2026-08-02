import type { SsoSignInContext } from "@skycanvasstudio/sso/server";
import type { DemoUser } from "./sso-types";

export function createDemoUser({ user, authorization }: SsoSignInContext): DemoUser {
  const claims = authorization.accessClaims;

  return {
    ...user,
    clientId: requiredClaim(claims.azp, "azp"),
    applicationId: requiredClaim(claims.application_id, "application_id"),
    membershipId: requiredClaim(claims.membership_id, "membership_id"),
    audience: authorization.metadata.audience,
    issuer: authorization.metadata.issuer,
    scope: requiredClaim(claims.scope, "scope"),
    authorizationVersion: numericClaim(
      claims.authorization_version,
      "authorization_version",
    ),
    issuedAt: numericClaim(claims.iat, "iat"),
  };
}

function requiredClaim(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`SSO token is missing ${name}`);
  }
  return value;
}

function numericClaim(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`SSO token is missing ${name}`);
  }
  return value;
}
