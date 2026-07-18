export function getMutationErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;

  const value = "value" in error ? error.value : undefined;
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "object" && value !== null && "message" in value) {
    const message = value.message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if ("message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}
