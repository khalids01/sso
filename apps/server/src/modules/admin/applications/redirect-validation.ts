export class ApplicationUrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationUrlValidationError";
  }
}

function parseHttpUrl(value: string, label: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new ApplicationUrlValidationError(`${label} must be a valid URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApplicationUrlValidationError(`${label} must use http or https`);
  }

  return url;
}

export function normalizeRedirectUri(value: string) {
  const url = parseHttpUrl(value, "Redirect URI");

  if (url.hash) {
    throw new ApplicationUrlValidationError(
      "Redirect URI must not contain a fragment",
    );
  }

  return url.toString();
}

export function normalizeOrigin(value: string) {
  const url = parseHttpUrl(value, "Origin");
  return url.origin;
}

export function normalizeRedirectUris(values: readonly string[]) {
  return [...new Set(values.map(normalizeRedirectUri))];
}

export function normalizeOrigins(values: readonly string[]) {
  return [...new Set(values.map(normalizeOrigin))];
}

export function isExactRedirectUriAllowed(
  requestedRedirectUri: string,
  allowedRedirectUris: readonly string[],
) {
  return allowedRedirectUris.includes(normalizeRedirectUri(requestedRedirectUri));
}

export function isExactOriginAllowed(
  requestedOrigin: string,
  allowedOrigins: readonly string[],
) {
  return allowedOrigins.includes(normalizeOrigin(requestedOrigin));
}
