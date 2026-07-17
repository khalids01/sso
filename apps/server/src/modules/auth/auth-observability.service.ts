import prisma from "@db/server";

type AuthFailureMethod = "magic_link" | "password";

type AuthFailureEvent = {
  type: "auth.login.denied" | "oauth.authorization.denied";
  severity: "warning";
  message: string;
  metadata: {
    requestId: string;
    reason: string;
    method?: AuthFailureMethod;
    status: number;
    clientId?: string;
  };
};

type AuthFailureWriter = (event: AuthFailureEvent) => Promise<unknown>;

const safeIdentifierPattern = /^[A-Za-z0-9._~-]+$/;

function normalizeReason(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 64 ||
    !safeIdentifierPattern.test(value)
  ) {
    return "request_rejected";
  }

  return value.toLowerCase();
}

function normalizeClientId(value: string | null) {
  if (!value || value.length > 128 || !safeIdentifierPattern.test(value)) {
    return undefined;
  }

  return value;
}

async function readFailureReason(response: Response) {
  try {
    const body: unknown = await response.clone().json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return "request_rejected";
    }

    const record = body as Record<string, unknown>;
    return normalizeReason(record.error ?? record.code);
  } catch {
    return "request_rejected";
  }
}

async function defaultWriter(event: AuthFailureEvent) {
  return prisma.activityEvent.create({ data: event });
}

async function writeFailure(
  event: AuthFailureEvent,
  writer: AuthFailureWriter,
) {
  try {
    await writer(event);
    return true;
  } catch (error) {
    console.error("Authentication activity recording failed", {
      requestId: event.metadata.requestId,
      error: error instanceof Error ? error.name : "unknown_error",
    });
    return true;
  }
}

export async function observeBetterAuthFailure(
  input: {
    request: Request;
    response: Response;
    requestId: string;
  },
  writer: AuthFailureWriter = defaultWriter,
) {
  if (input.response.status < 400) {
    return false;
  }

  const url = new URL(input.request.url);
  const reason = await readFailureReason(input.response);

  if (url.pathname === "/api/auth/sign-in/email") {
    return writeFailure(
      {
        type: "auth.login.denied",
        severity: "warning",
        message: "Login attempt denied",
        metadata: {
          requestId: input.requestId,
          reason,
          method: "password",
          status: input.response.status,
        },
      },
      writer,
    );
  }

  if (url.pathname === "/api/auth/oauth2/authorize") {
    return writeFailure(
      {
        type: "oauth.authorization.denied",
        severity: "warning",
        message: "OAuth authorization request denied",
        metadata: {
          requestId: input.requestId,
          reason,
          status: input.response.status,
          clientId: normalizeClientId(url.searchParams.get("client_id")),
        },
      },
      writer,
    );
  }

  return false;
}

export async function recordLoginDenied(
  input: {
    requestId: string;
    reason: string;
    method: AuthFailureMethod;
    status: number;
  },
  writer: AuthFailureWriter = defaultWriter,
) {
  return writeFailure(
    {
      type: "auth.login.denied",
      severity: "warning",
      message: "Login attempt denied",
      metadata: {
        requestId: input.requestId,
        reason: normalizeReason(input.reason),
        method: input.method,
        status: input.status,
      },
    },
    writer,
  );
}
