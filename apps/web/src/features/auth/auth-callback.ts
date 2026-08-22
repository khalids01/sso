export function getAuthCallbackURLForLocation(origin: string, search: string) {
  const oauthSearch = getOAuthSearch(search);
  const searchParams = new URLSearchParams(oauthSearch);
  const isOAuthRequest =
    searchParams.has("client_id") &&
    searchParams.has("sig") &&
    searchParams.has("exp");

  if (!isOAuthRequest) {
    return `${origin}/dashboard`;
  }

  return `${origin}/authorize?${oauthSearch.replace(/^\?/, "")}`;
}

export function getAuthCallbackURL() {
  return getAuthCallbackURLForLocation(
    window.location.origin,
    window.location.search,
  );
}

export function getApplicationAuthPath(pathname: string, search: string) {
  const oauthSearch = getOAuthSearch(search);
  if (!oauthSearch) return pathname;
  return `${pathname}${oauthSearch.startsWith("?") ? oauthSearch : `?${oauthSearch}`}`;
}

export function getSocialAuthCallbackURLForLocation(origin: string, search: string) {
  const oauthSearch = getOAuthSearch(search);
  const searchParams = new URLSearchParams(oauthSearch);
  const isOAuthRequest =
    searchParams.has("client_id") &&
    searchParams.has("sig") &&
    searchParams.has("exp");

  return isOAuthRequest
    ? `${origin}/application/login${oauthSearch}`
    : `${origin}/login`;
}

export function getSocialAuthCallbackURL() {
  return getSocialAuthCallbackURLForLocation(
    window.location.origin,
    window.location.search,
  );
}

export function getSocialAuthErrorMessage(search: string) {
  const error = new URLSearchParams(search).get("error")?.toLowerCase();
  if (error === "user_not_found" || error === "user not found") {
    return "No account is associated with this sign-in method. Contact your administrator or use another sign-in method.";
  }
  return null;
}

function getOAuthSearch(search: string) {
  const searchParams = new URLSearchParams(search);
  searchParams.delete("error");
  searchParams.delete("error_description");
  const value = searchParams.toString();
  return value ? `?${value}` : "";
}

export function requiresFreshAuthentication(search: string) {
  return new URLSearchParams(search).get("prompt") === "login";
}
