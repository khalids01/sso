import { Elysia } from "elysia";
import { hasPlatformOwner } from "@db/server/rbac/assignments";
import { env } from "@env/server";

export const ownerInfoGuard = new Elysia({ name: "ownerInfoGuard" })
    .onBeforeHandle(async ({ set }) => {
        if (!env.OWNER_SETUP_CHECK) {
            set.status = 404;
            return "Not Found";
        }

        if (await hasPlatformOwner()) {
            set.status = 404;
            return "Not Found";
        }
    });
