export type ApplicationSocialProvider = "google" | "facebook" | "linkedin" | "github";

const providerNoncePattern = /^skycanvas-provider-(google|facebook|linkedin|github)-[A-Za-z0-9_-]{16,}$/;

/**
 * The OAuth provider preserves the signed OIDC nonce, unlike arbitrary query
 * parameters. Keep the legacy query fallback for central-web sign-in links.
 */
export function getRequestedApplicationSocialProvider(search: string): ApplicationSocialProvider | null {
  const params = new URLSearchParams(search);
  const legacyProvider = params.get("provider");
  if (legacyProvider && isApplicationSocialProvider(legacyProvider)) return legacyProvider;
  const match = params.get("nonce")?.match(providerNoncePattern);
  return match?.[1] as ApplicationSocialProvider | undefined ?? null;
}

function isApplicationSocialProvider(value: string): value is ApplicationSocialProvider {
  return value === "google" || value === "facebook" || value === "linkedin" || value === "github";
}
