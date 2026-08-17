import { Elysia } from "elysia";

import { ProfileActionDto } from "./profile.dto";
import {
  authenticateProfileRequest,
  getUserProfile,
  ProfileAccessError,
  runProfileAction,
} from "./profile.service";
import { isOriginRegisteredForActiveClient } from "../oauth/oauth-token.service";

async function applyCors(request: Request, set: { headers: Record<string, string | number | string[]> }) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let normalizedOrigin: string;
  try {
    normalizedOrigin = new URL(origin).origin;
  } catch {
    return;
  }
  if (!(await isOriginRegisteredForActiveClient(normalizedOrigin))) return;
  set.headers["access-control-allow-origin"] = normalizedOrigin;
  set.headers["access-control-allow-credentials"] = "true";
  set.headers.vary = "Origin";
}

function handleError(error: unknown, set: { status?: number | string }) {
  if (error instanceof ProfileAccessError) {
    set.status = error.status;
    return { error: "profile_request_failed", message: error.message };
  }
  set.status = 500;
  return { error: "profile_request_failed", message: "Profile request failed" };
}

export const profileController = new Elysia({ prefix: "/auth/sdk/profile" })
  .get("/", async ({ request, set }) => {
    await applyCors(request, set);
    try {
      const context = await authenticateProfileRequest(request);
      set.headers["cache-control"] = "private, no-store";
      return await getUserProfile(context);
    } catch (error) {
      return handleError(error, set);
    }
  })
  .post("/", async ({ body, request, set }) => {
    await applyCors(request, set);
    try {
      const context = await authenticateProfileRequest(request);
      set.headers["cache-control"] = "private, no-store";
      return await runProfileAction(context, body);
    } catch (error) {
      return handleError(error, set);
    }
  }, { body: ProfileActionDto });
