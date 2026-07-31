import { Elysia } from "elysia";
import { Checkout } from "@polar-sh/elysia";
import { handleWebhookPayload } from "@polar-sh/adapter-utils";
import {
    validateEvent,
    WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { env, getRequiredPolarEnv } from "@sso/env/server";
import {
    handlePolarPayload,
    processPolarWebhookOnce,
} from "./polar.service";

export const PRODUCT_ID = "c9fe3a9c-1663-48ec-b7c5-75fdc6be91ca";

const disabledPolarController = new Elysia({ prefix: "/polar" })
    .get("/checkout", ({ set }) => {
        set.status = 404;
        return "Not Found";
    })
    .post("/webhooks", ({ set }) => {
        set.status = 404;
        return "Not Found";
    });

function buildPolarController() {
    const polarEnv = getRequiredPolarEnv();

    return new Elysia({ prefix: "/polar" })
    .get(
        "/checkout",
        Checkout({
            accessToken: polarEnv.POLAR_ACCESS_TOKEN,
            successUrl: polarEnv.POLAR_SUCCESS_URL,
            server: polarEnv.POLAR_MODE,
        }),
    )
    .post(
        "/webhooks",
        async ({ request, set }) => {
            const requestBody = await request.text();
            const eventId = request.headers.get("webhook-id") ?? "";
            const webhookHeaders = {
                "webhook-id": eventId,
                "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
                "webhook-signature": request.headers.get("webhook-signature") ?? "",
            };

            if (!eventId) {
                set.status = 400;
                return { received: false };
            }

            let payload: ReturnType<typeof validateEvent>;
            try {
                payload = validateEvent(
                    requestBody,
                    webhookHeaders,
                    polarEnv.POLAR_WEBHOOK_SECRET,
                );
            } catch (error) {
                console.log(error);
                set.status = error instanceof WebhookVerificationError ? 400 : 500;
                return error instanceof WebhookVerificationError
                    ? { received: false }
                    : { error: "Internal server error" };
            }

            try {
                await processPolarWebhookOnce({
                    eventId,
                    payload,
                    handler: async () => {
                        await handleWebhookPayload(payload, {
                            webhookSecret: polarEnv.POLAR_WEBHOOK_SECRET,
                            onPayload: handlePolarPayload,
                        });
                    },
                });
            } catch (error) {
                console.error("Error processing webhook:", error);
                set.status = 500;
                return { error: "Internal server error" };
            }

            return { received: true };
        },
    );
}

export const polarController = env.ENABLE_POLAR
    ? buildPolarController()
    : disabledPolarController;
