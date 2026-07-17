const CONNECTION_CLOSED_MESSAGES = new Set([
  "The connection was closed",
  "The connection was closed.",
]);

export function isExpectedSsrCancellation(
  error: unknown,
  signal: AbortSignal,
): boolean {
  return signal.aborted && isConnectionClosedAbortError(error);
}

export function isConnectionClosedAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return (
    error.name === "AbortError" && CONNECTION_CLOSED_MESSAGES.has(error.message)
  );
}
