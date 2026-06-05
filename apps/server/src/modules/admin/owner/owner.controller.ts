import { Elysia } from "elysia";
import { OwnerService } from "./owner.service";
import {
  CreateOwnerDto,
  SetupStatusResponseDto,
  OwnerCreatedResponseDto,
  ErrorResponseDto,
} from "./owner.dto";
import { env } from "@env/server";
import { ownerInfoGuard } from "@/guards/owner-info.guard";
import { hasPlatformOwner } from "@db/server/rbac/assignments";
import { auth } from "@auth/server";

const ownerService = new OwnerService();

export const ownerController = new Elysia({ prefix: "/owner" })
  .use(ownerInfoGuard)
  .get(
    "/setup-status",
    async () => {
      if (!env.OWNER_SETUP_CHECK) {
        return { hasOwner: true };
      }

      // Return the setup status without performing any redirects.
      // The frontend decides whether to expose the /setup UI. The
      // server will only redirect or return 404 for the POST /setup
      // endpoint via the ownerInfoGuard.
      const hasOwner = await ownerService.hasOwner();
      return { hasOwner };
    },
    {
      detail: {
        tags: ["Owner"],
        summary: "Check setup status",
        description:
          "Checks if the initial owner has been created. Redirects to /setup if not.",
        responses: {
          200: {
            description: "Setup status retrieved",
            content: {
              "application/json": {
                schema: SetupStatusResponseDto,
              },
            },
          },
        },
      },
    },
  )
  .post(
    "/setup",
    async ({ body, request, set }) => {
      if (!env.OWNER_SETUP_CHECK) {
        set.status = 404;
        return { error: "Not Found" };
      }

      if (await hasPlatformOwner()) {
        set.status = 404;
        return { error: "Not Found" };
      }

      try {
        const owner = await ownerService.createOwner(body);
        await auth.api.signInMagicLink({
          body: {
            email: body.email,
            name: body.name,
            callbackURL: env.CORS_ORIGIN,
          },
          headers: request.headers,
        });

        return {
          message: "Owner created successfully",
          user: {
            id: owner.id,
            name: owner.name,
            email: owner.email,
          },
        };
      } catch (error: any) {
        set.status = 400;
        return { error: error.message || "Failed to create owner" };
      }
    },
    {
      body: CreateOwnerDto,
      detail: {
        tags: ["Owner"],
        summary: "Create initial owner",
        description:
          "Creates the first owner account for the platform. Only accessible if no owner exists.",
        responses: {
          200: {
            description: "Owner created successfully",
            content: {
              "application/json": {
                schema: OwnerCreatedResponseDto,
              },
            },
          },
          400: {
            description: "Failed to create owner",
            content: {
              "application/json": {
                schema: ErrorResponseDto,
              },
            },
          },
          404: {
            description: "Route hidden because owner already exists",
          },
        },
      },
    },
  );
