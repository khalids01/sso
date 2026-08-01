export function getProviderRedirect(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const value = data as {
    redirect_uri?: unknown;
    uri?: unknown;
    url?: unknown;
  };
  if (typeof value.redirect_uri === "string") {
    return value.redirect_uri;
  }
  if (typeof value.uri === "string") {
    return value.uri;
  }
  return typeof value.url === "string" ? value.url : null;
}
