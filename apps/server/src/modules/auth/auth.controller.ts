import { Elysia } from "elysia";
import { auth } from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import {
  CheckEmailDto,
  MagicLinkLoginDto,
  MagicLinkSignupDto,
} from "./auth.dto";

function resolveCallbackURL(callbackURL?: string) {
  if (!callbackURL) {
    return env.CORS_ORIGIN;
  }

  try {
    const baseUrl = new URL(env.CORS_ORIGIN);
    const parsedUrl = new URL(callbackURL, env.CORS_ORIGIN);

    if (parsedUrl.origin !== baseUrl.origin) {
      return env.CORS_ORIGIN;
    }

    return parsedUrl.toString();
  } catch {
    return env.CORS_ORIGIN;
  }
}

export const authController = new Elysia({ prefix: "/auth" })
  .post(
    "/check-email",
    async ({ body }) => {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      return { exists: !!user };
    },
    {
      body: CheckEmailDto,
    },
  )
  .post(
    "/magic-link/login",
    async ({ body, request, set }) => {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (!user) {
        set.status = 400;
        return { message: "User not found" };
      }
      await auth.api.signInMagicLink({
        body: {
          email: body.email,
          callbackURL: resolveCallbackURL(body.callbackURL),
        },
        headers: request.headers,
      });
      return { success: true };
    },
    {
      body: MagicLinkLoginDto,
    },
  )
  .post(
    "/magic-link/signup",
    async ({ body, request, set }) => {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (user) {
        set.status = 400;
        return { message: "User already exists" };
      }
      await auth.api.signInMagicLink({
        body: {
          email: body.email,
          name: body.name,
          callbackURL: resolveCallbackURL(body.callbackURL),
        },
        headers: request.headers,
      });
      return { success: true };
    },
    {
      body: MagicLinkSignupDto,
    },
  );
