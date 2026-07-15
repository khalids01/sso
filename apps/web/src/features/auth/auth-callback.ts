export function getAuthCallbackURL() {
  const searchParams = new URLSearchParams(window.location.search);
  const isOAuthRequest =
    searchParams.has("client_id") &&
    searchParams.has("sig") &&
    searchParams.has("exp");

  if (!isOAuthRequest) {
    return `${window.location.origin}/dashboard`;
  }

  return `${window.location.origin}/authorize?${window.location.search.slice(1)}`;
}
