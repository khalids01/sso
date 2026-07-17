type PolarError = Error & {
  statusCode?: number;
};

export function isMissingPolarCustomerError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const polarError = error as PolarError;
  return polarError.name === "ResourceNotFound" && polarError.statusCode === 404;
}
