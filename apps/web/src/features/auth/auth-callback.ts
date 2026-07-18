export function getAuthCallbackURLForLocation(origin: string, search: string) {
  const searchParams = new URLSearchParams(search);
  const isOAuthRequest =
    searchParams.has("client_id") &&
    searchParams.has("sig") &&
    searchParams.has("exp");

  if (!isOAuthRequest) {
    return `${origin}/dashboard`;
  }

  return `${origin}/authorize?${search.replace(/^\?/, "")}`;
}

export function getAuthCallbackURL() {
  return getAuthCallbackURLForLocation(
    window.location.origin,
    window.location.search,
  );
}

export function getApplicationAuthPath(pathname: string, search: string) {
  if (!search) return pathname;
  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
}
