function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return JSON.stringify(value);
    } catch {
      return value;
    }
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

export function stringifyRepeatedSearchParams(
  search: Record<string, unknown>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const item of value) params.append(key, stringifyValue(item));
      continue;
    }

    params.set(key, stringifyValue(value));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
